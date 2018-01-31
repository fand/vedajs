/* @flow */
import * as THREE from 'three';
import AudioLoader from './audio-loader';
import MidiLoader from './midi-loader';
import VideoLoader from './video-loader';
import GifLoader from './gif-loader';
import CameraLoader from './camera-loader';
import GamepadLoader from './gamepad-loader';
import KeyLoader from './key-loader';
import SoundLoader from './sound-loader';
import SoundRenderer from './sound-renderer';
import isVideo from 'is-video';
import { DEFAULT_VERTEX_SHADER, DEFAULT_FRAGMENT_SHADER } from './constants';

// ref. https://github.com/mrdoob/three.js/wiki/Uniforms-types
type UniformType = (
  '1i' | '1f' | '2f' | '3f' |
  '1iv' | '3iv' | '1fv' | '2fv' | '3fv' | '4fv' |
  'Matrix3fv' | 'Matric4fv' |
  'i' | 'f' |
  'v2' | 'v3' | 'v4' |
  'c' | 'm4' | 't' |
  'iv1' | 'iv' | 'fv1' | 'fv' |
  'v2v' |'v3v' |'v4v' |'m4v' | 'tv'
);

type VedaOptions = {
  pixelRatio?: number;
  frameskip?: number;
  vertexMode?: string;
  vertexCount?: number;
  fftSize?: number;
  fftSmoothingTimeConstant?: number;
}

const DEFAULT_VEDA_OPTIONS = {
  pixelRatio: 1,
  frameskip: 1,
  vertexCount: 3000,
  vertexMode: 'TRIANGLES',
};

type RenderPassTarget = {
  name: string;
  targets: THREE.RenderTarget[];
}
type RenderPass = {
  scene: THREE.Scene;
  camera: THREE.Camera;
  target: ?RenderPassTarget;
}
type Pass = {
  TARGET?: string;
  vs?: string;
  fs?: string;
}
type Uniforms = {
  [key: string]: {
    type: string;
    value: any;
  }
}

type Shader = Pass | Pass[]

const isGif = file => file.match(/\.gif$/i);
const isSound = file => file.match(/\.(mp3|wav)$/i);

export default class Veda {
  _pixelRatio: number;
  _frameskip: number;
  _start: number;
  _isPlaying: boolean;
  _frame: number;

  _passes: RenderPass[];

  _plane: THREE.Mesh;
  _renderer: THREE.Renderer;
  _targets: THREE.RenderTarget[];
  _textureLoader: THREE.TextureLoader;
  _canvas: HTMLCanvasElement;

  _audioLoader: AudioLoader;
  _cameraLoader: CameraLoader;
  _gamepadLoader: GamepadLoader;
  _keyLoader: KeyLoader;
  _midiLoader: MidiLoader;
  _videoLoader: VideoLoader;
  _gifLoader: GifLoader;
  _soundLoader: SoundLoader;
  _uniforms: Uniforms;
  _soundRenderer: SoundRenderer;

  _vertexMode: string;

  constructor(_rc: VedaOptions) {
    const rc = {
      ...DEFAULT_VEDA_OPTIONS,
      ..._rc,
    };

    this._pixelRatio = rc.pixelRatio;
    this._frameskip = rc.frameskip;
    this._vertexMode = rc.vertexMode;

    this._passes = [];

    // Create a target for backbuffer
    this._targets = [
      new THREE.WebGLRenderTarget(
        0, 0,
        { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat }
      ),
      new THREE.WebGLRenderTarget(
        0, 0,
        { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat }
      ),
    ];

    // for TextureLoader & VideoLoader
    THREE.ImageUtils.crossOrigin = '*';

    this._audioLoader = new AudioLoader(rc);
    this._cameraLoader = new CameraLoader();
    this._gamepadLoader = new GamepadLoader();
    this._keyLoader = new KeyLoader();
    this._midiLoader = new MidiLoader();
    this._videoLoader = new VideoLoader();
    this._gifLoader = new GifLoader();
    this._soundLoader = new SoundLoader();

    // Prepare uniforms
    this._start = Date.now();
    this._uniforms = {
      backbuffer: { type: 't', value: new THREE.Texture() },
      mouse: { type: 'v2', value: new THREE.Vector2() },
      resolution: { type: 'v2', value: new THREE.Vector2() },
      time: { type: 'f', value: 0.0 },
      vertexCount: { type: 'f', value: rc.vertexCount },
      PASSINDEX: { type: 'i', value: 0 },
      FRAMEINDEX: { type: 'i', value: 0 },
    };

    this._soundRenderer = new SoundRenderer(this._uniforms);
    this._textureLoader = new THREE.TextureLoader();
  }

  setPixelRatio(pixelRatio: number): void {
    if (!this._canvas) {
      return;
    }
    this._pixelRatio = pixelRatio;
    this._renderer.setPixelRatio(1 / pixelRatio);
    this.resize(this._canvas.offsetWidth, this._canvas.offsetHeight);
  }

  setFrameskip(frameskip: number): void {
    this._frameskip = frameskip;
  }

  setVertexCount(count: number): void {
    this._uniforms.vertexCount.value = count;
  }

  setVertexMode(mode: string): void {
    this._vertexMode = mode;
  }

  setFftSize(fftSize: number): void {
    this._audioLoader.setFftSize(fftSize);
  }

  setFftSmoothingTimeConstant(fftSmoothingTimeConstant: number): void {
    this._audioLoader.setFftSmoothingTimeConstant(fftSmoothingTimeConstant);
  }

  setSoundLength(length: number): void {
    this._soundRenderer.setLength(length);
  }

  resetTime(): void {
    this._start = Date.now();
  }

  setCanvas(canvas: HTMLCanvasElement): void {
    if (this._canvas) {
      window.removeEventListener('mousemove', this._mousemove);
    }

    this._canvas = canvas;
    this._renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
    this._renderer.setPixelRatio(1 / this._pixelRatio);
    this.resize(canvas.offsetWidth, canvas.offsetHeight);
    window.addEventListener('mousemove', this._mousemove);

    this._frame = 0;
    this.animate();
  }

  _createPlane(fs: ?string, vs: ?string) {
    let plane;
    if (vs) {
      // Create an object for vertexMode
      const geometry = new THREE.BufferGeometry();
      var vertices = new Float32Array(this._uniforms.vertexCount.value * 3);
      geometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3));
      const vertexIds = new Float32Array(this._uniforms.vertexCount.value);
      vertexIds.forEach((v, i) => {
        vertexIds[i] = i;
      });
      geometry.addAttribute('vertexId', new THREE.BufferAttribute(vertexIds, 1));

      const material = new THREE.ShaderMaterial({
        uniforms: this._uniforms,
        vertexShader: vs,
        fragmentShader: fs || DEFAULT_FRAGMENT_SHADER,
        extensions: {
          derivatives: true,
          drawBuffers: false,
          fragDepth: false,
          shaderTextureLOD: false,
        },
      });
      material.side = THREE.DoubleSide;

      if (this._vertexMode === 'POINTS') {
        plane = new THREE.Points(geometry, material);
      } else if (this._vertexMode === 'LINE_LOOP') {
        plane = new THREE.LineLoop(geometry, material);
      } else if (this._vertexMode === 'LINE_STRIP') {
        plane = new THREE.Line(geometry, material);
      } else if (this._vertexMode === 'LINES') {
        plane = new THREE.LineSegments(geometry, material);
      } else if (this._vertexMode === 'TRI_STRIP') {
        plane = new THREE.Mesh(geometry, material);
        plane.setDrawMode(THREE.TrianglesStripDrawMode);
      } else if (this._vertexMode === 'TRI_FAN') {
        plane = new THREE.Mesh(geometry, material);
        plane.setDrawMode(THREE.TrianglesFanDrawMode);
      } else {
        plane = new THREE.Mesh(geometry, material);
      }
    } else {
      // Create plane
      const geometry = new THREE.PlaneGeometry(2, 2);
      const material = new THREE.ShaderMaterial({
        uniforms: this._uniforms,
        vertexShader: DEFAULT_VERTEX_SHADER,
        fragmentShader: fs,
        extensions: {
          derivatives: true,
          drawBuffers: false,
          fragDepth: false,
          shaderTextureLOD: false,
        },
      });
      plane = new THREE.Mesh(geometry, material);
    }

    return plane;
  }

  _createRenderPass(pass: Pass): RenderPass {
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.set(0, 0, 1);
    camera.lookAt(scene.position);

    const plane = this._createPlane(pass.fs, pass.vs);
    scene.add(plane);

    let target: RenderPassTarget;
    if (pass.TARGET) {
      const targetName = pass.TARGET;
      const textureType = pass.FLOAT ? THREE.FloatType : THREE.UnsignedByteType;
      target = {
        name: targetName,
        targets: [
          new THREE.WebGLRenderTarget(
            this._canvas.offsetWidth / this._pixelRatio, this._canvas.offsetHeight / this._pixelRatio,
            { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat, type: textureType }
          ),
          new THREE.WebGLRenderTarget(
            this._canvas.offsetWidth / this._pixelRatio, this._canvas.offsetHeight / this._pixelRatio,
            { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat, type: textureType }
          ),
        ],
      };
      this._uniforms[targetName] = {
        type: 't',
        value: target.targets[0].texture,
      };
    }

    return { scene, camera, target };
  }

  loadFragmentShader(fs: string): void {
    this.loadShader([{ fs }]);
  }

  loadVertexShader(vs: string): void {
    this.loadShader([{ vs }]);
  }

  loadShader(shader: Shader): void {
    let passes;
    if (shader instanceof Array) {
      passes = shader;
    } else {
      passes = [shader];
    }

    // Dispose old targets
    this._passes.forEach(pass => {
      const target = pass.target;
      if (target) {
        target.targets[0].texture.dispose();
        target.targets[1].texture.dispose();
      }
    });

    // Create new Passes
    this._passes = passes.map(pass => {
      if (!pass.fs && !pass.vs) {
        throw new TypeError('Veda.loadShader: Invalid argument. Shaders must have fs or vs property.');
      }
      return this._createRenderPass(pass);
    });

    this._uniforms.FRAMEINDEX.value = 0;
  }

  async loadTexture(name: string, textureUrl: string, speed?: number = 1): Promise<void> {
    let texture;
    if (isVideo(textureUrl)) {
      texture = this._videoLoader.load(name, textureUrl, speed);
    } else if (isGif(textureUrl)) {
      texture = this._gifLoader.load(name, textureUrl);
    } else if (isSound(textureUrl)) {
      texture = await this._soundLoader.load(textureUrl);
    } else {
      texture = this._textureLoader.load(textureUrl);
    }

    this._uniforms[name] = {
      type: 't',
      value: texture,
    };
  }

  unloadTexture(name: string, textureUrl: string, remove: boolean): void {
    const texture = this._uniforms[name];
    texture.value.dispose();

    if (remove && isVideo(textureUrl)) {
      this._videoLoader.unload(textureUrl);
    }
    if (remove && isGif(textureUrl)) {
      this._gifLoader.unload(textureUrl);
    }
    if (remove && isSound(textureUrl)) {
      this._soundLoader.unload(textureUrl);
    }
  }

  setUniform(name: string, type: UniformType, value: any) {
    this._uniforms[name] = { type, value };
  }

  _mousemove = (e: MouseEvent) => {
    const rect = this._canvas.getBoundingClientRect();
    const root = document.documentElement;
    if (root) {
      const left = rect.top + root.scrollLeft;
      const top = rect.top + root.scrollTop;
      this._uniforms.mouse.value.x = (e.pageX - left) / this._canvas.offsetWidth;
      this._uniforms.mouse.value.y = 1 - (e.pageY - top) / this._canvas.offsetHeight;
    }
  }

  resize = (width: number, height: number) => {
    this._renderer.setSize(width, height);

    const [bufferWidth, bufferHeight] = [width / this._pixelRatio, height / this._pixelRatio];
    this._passes.forEach(p => {
      if (p.target) {
        p.target.targets.forEach(t => t.setSize(bufferWidth, bufferHeight));
      }
    });
    this._targets.forEach(t => t.setSize(bufferWidth, bufferHeight));
    this._uniforms.resolution.value.x = bufferWidth;
    this._uniforms.resolution.value.y = bufferHeight;
  }

  animate = () => {
    this._frame++;
    if (!this._isPlaying) {
      return;
    }

    requestAnimationFrame(this.animate);
    if (this._frame % this._frameskip === 0) {
      this._render();
    }
  }

  loadSoundShader(fs: string): void {
    this._soundRenderer.loadShader(fs);
  }

  playSound(): void {
    this._soundRenderer.play();
  }

  stopSound(): void {
    this._soundRenderer.stop();
  }

  play(): void {
    this._isPlaying = true;
    this.animate();
  }

  stop(): void {
    this._isPlaying = false;
    this._audioLoader.disable();
    this._cameraLoader.disable();
    this._keyLoader.disable();
    this._midiLoader.disable();
    this._gamepadLoader.disable();
  }

  _render(): void {
    this._uniforms.time.value = (Date.now() - this._start) / 1000;
    this._targets = [this._targets[1], this._targets[0]];
    this._uniforms.backbuffer.value = this._targets[0].texture;

    this._gifLoader.update();

    if (this._audioLoader.isEnabled) {
      this._audioLoader.update();
      this._uniforms.volume.value = this._audioLoader.getVolume();
    }

    if (this._gamepadLoader.isEnabled) {
      this._gamepadLoader.update();
    }

    this._passes.forEach((pass: RenderPass, i: number) => {
      this._uniforms.PASSINDEX.value = i;

      const target = pass.target;
      if (target) {
        this._renderer.render(pass.scene, pass.camera, target.targets[1], true);

        // Swap buffers after render so that we can use the buffer in latter passes
        target.targets = [target.targets[1], target.targets[0]];
        this._uniforms[target.name].value = target.targets[0].texture;
      } else {
        this._renderer.render(pass.scene, pass.camera, null);
      }
    });

    const lastPass = this._passes[this._passes.length - 1];

    // Render last pass to canvas even if target is specified
    if (lastPass.target) {
      this._renderer.render(lastPass.scene, lastPass.camera, null);
    }

    // Render result to backbuffer
    this._renderer.render(lastPass.scene, lastPass.camera, this._targets[1], true);

    this._uniforms.FRAMEINDEX.value++;
  }

  toggleAudio(flag: boolean): void {
    if (flag) {
      this._audioLoader.enable();
      this._uniforms = {
        ...this._uniforms,
        volume: { type: 'f', value: 0 },
        spectrum: { type: 't', value: this._audioLoader.spectrum },
        samples: { type: 't', value: this._audioLoader.samples },
      };
    } else if (this._uniforms.spectrum) {
      this._uniforms.spectrum.value.dispose();
      this._uniforms.samples.value.dispose();
      this._audioLoader.disable();
    }
  }

  toggleMidi(flag: boolean): void {
    if (flag) {
      this._midiLoader.enable();
      this._uniforms = {
        ...this._uniforms,
        midi: { type: 't', value: this._midiLoader.midiTexture },
        note: { type: 't', value: this._midiLoader.noteTexture },
      };
    } else if (this._uniforms.midi) {
      this._uniforms.midi.value.dispose();
      this._uniforms.note.value.dispose();
      this._midiLoader.disable();
    }
  }

  toggleCamera(flag: boolean): void {
    if (flag) {
      this._cameraLoader.enable();
      this._uniforms = {
        ...this._uniforms,
        camera: { type: 't', value: this._cameraLoader.texture },
      };
    } else {
      this._cameraLoader.disable();
    }
  }

  toggleKeyboard(flag: boolean): void {
    if (flag) {
      this._keyLoader.enable();
      this._uniforms = {
        ...this._uniforms,
        key: { type: 't', value: this._keyLoader.texture },
      };
    } else {
      this._keyLoader.disable();
    }
  }

  toggleGamepad(flag: boolean): void {
    if (flag) {
      this._gamepadLoader.enable();
      this._uniforms = {
        ...this._uniforms,
        gamepad: { type: 't', value: this._gamepadLoader.texture },
      };
    } else {
      this._gamepadLoader.disable();
    }
  }
}
