import * as THREE from 'three';
import AudioLoader from './audio-loader';
import CameraLoader from './camera-loader';
import GamepadLoader from './gamepad-loader';
import GifLoader from './gif-loader';
import KeyLoader from './key-loader';
import MidiLoader from './midi-loader';
import ObjLoader from './obj-loader';
import SoundLoader from './sound-loader';
import SoundRenderer from './sound-renderer';
import VideoLoader from './video-loader';

declare var require: any;
const isVideo = require('is-video');

import {
    DEFAULT_FRAGMENT_SHADER,
    DEFAULT_VERTEX_SHADER,
    DEFAULT_VEDA_OPTIONS,
    IVedaOptions,
    UniformType,
    IUniforms,
    IPass,
    IShader,
} from './constants';

interface IRenderPassTarget {
    name: string;
    targets: THREE.WebGLRenderTarget[];
    getWidth: ($WIDTH: number, $HEIGHT: number) => any;
    getHeight: ($WIDTH: number, $HEIGHT: number) => any;
}

interface IRenderPass {
    scene: THREE.Scene;
    camera: THREE.Camera;
    target: IRenderPassTarget | null;
}

const isGif = (file: string) => file.match(/\.gif$/i);
const isSound = (file: string) => file.match(/\.(mp3|wav)$/i);

const createTarget = (
    width: number,
    height: number,
    textureType: THREE.TextureDataType,
) => {
    return new THREE.WebGLRenderTarget(width, height, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: textureType,
    });
};

type WidthHeightFunc = (w: number, _: number) => number;

export default class Veda {
    private pixelRatio: number;
    private frameskip: number;
    private start: number;
    private isPlaying: boolean = false;
    private frame: number = 0;

    private passes: IRenderPass[];

    private renderer: THREE.WebGLRenderer | null = null;
    private canvas: HTMLCanvasElement | null = null;
    private targets: THREE.WebGLRenderTarget[];
    private textureLoader: THREE.TextureLoader;

    private audioLoader: AudioLoader;
    private cameraLoader: CameraLoader;
    private gamepadLoader: GamepadLoader;
    private keyLoader: KeyLoader;
    private midiLoader: MidiLoader;
    private videoLoader: VideoLoader;
    private gifLoader: GifLoader;
    private soundLoader: SoundLoader;
    private objLoader: ObjLoader;
    private uniforms: IUniforms;
    private soundRenderer: SoundRenderer;

    private vertexMode: string;

    constructor(rcOpt: IVedaOptions) {
        const rc = {
            ...DEFAULT_VEDA_OPTIONS,
            ...rcOpt,
        };

        this.pixelRatio = rc.pixelRatio;
        this.frameskip = rc.frameskip;
        this.vertexMode = rc.vertexMode;

        this.passes = [];

        // Create a target for backbuffer
        this.targets = [
            new THREE.WebGLRenderTarget(0, 0, {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.NearestFilter,
                format: THREE.RGBAFormat,
            }),
            new THREE.WebGLRenderTarget(0, 0, {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.NearestFilter,
                format: THREE.RGBAFormat,
            }),
        ];

        // for TextureLoader & VideoLoader
        THREE.ImageUtils.crossOrigin = '*';

        this.audioLoader = new AudioLoader(rc);
        this.cameraLoader = new CameraLoader();
        this.gamepadLoader = new GamepadLoader();
        this.keyLoader = new KeyLoader();
        this.midiLoader = new MidiLoader();
        this.videoLoader = new VideoLoader();
        this.gifLoader = new GifLoader();
        this.soundLoader = new SoundLoader();
        this.objLoader = new ObjLoader();

        // Prepare uniforms
        this.start = Date.now();
        this.uniforms = {
            FRAMEINDEX: { type: 'i', value: 0 },
            PASSINDEX: { type: 'i', value: 0 },
            backbuffer: { type: 't', value: new THREE.Texture() },
            mouse: { type: 'v2', value: new THREE.Vector2() },
            mouseButtons: { type: 'v3', value: new THREE.Vector3() },
            resolution: { type: 'v2', value: new THREE.Vector2() },
            time: { type: 'f', value: 0.0 },
            vertexCount: { type: 'f', value: rc.vertexCount },
        };

        this.soundRenderer = new SoundRenderer(this.uniforms);
        this.textureLoader = new THREE.TextureLoader();
    }

    setPixelRatio(pixelRatio: number): void {
        if (!this.canvas || !this.renderer) {
            return;
        }
        this.pixelRatio = pixelRatio;
        this.renderer.setPixelRatio(1 / pixelRatio);
        this.resize(this.canvas.offsetWidth, this.canvas.offsetHeight);
    }

    setFrameskip(frameskip: number): void {
        this.frameskip = frameskip;
    }

    setVertexCount(count: number): void {
        this.uniforms.vertexCount.value = count;
    }

    setVertexMode(mode: string): void {
        this.vertexMode = mode;
    }

    setFftSize(fftSize: number): void {
        this.audioLoader.setFftSize(fftSize);
    }

    setFftSmoothingTimeConstant(fftSmoothingTimeConstant: number): void {
        this.audioLoader.setFftSmoothingTimeConstant(fftSmoothingTimeConstant);
    }

    setSoundLength(length: number): void {
        this.soundRenderer.setLength(length);
    }

    resetTime(): void {
        this.start = Date.now();
    }

    setCanvas(canvas: HTMLCanvasElement): void {
        if (this.canvas) {
            window.removeEventListener('mousemove', this.mousemove);
            window.removeEventListener('mousedown', this.mousedown);
            window.removeEventListener('mouseup', this.mouseup);
        }

        this.canvas = canvas;
        this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
        this.renderer.setPixelRatio(1 / this.pixelRatio);
        this.resize(canvas.offsetWidth, canvas.offsetHeight);
        window.addEventListener('mousemove', this.mousemove);
        window.addEventListener('mousedown', this.mousedown);
        window.addEventListener('mouseup', this.mouseup);

        this.frame = 0;
        this.animate();
    }

    private createPlane(fs?: string, vs?: string) {
        let plane;
        if (vs) {
            // Create an object for vertexMode
            const geometry = new THREE.BufferGeometry();
            const vertices = new Float32Array(
                this.uniforms.vertexCount.value * 3,
            );
            geometry.addAttribute(
                'position',
                new THREE.BufferAttribute(vertices, 3),
            );
            const vertexIds = new Float32Array(this.uniforms.vertexCount.value);
            vertexIds.forEach((_, i) => {
                vertexIds[i] = i;
            });
            geometry.addAttribute(
                'vertexId',
                new THREE.BufferAttribute(vertexIds, 1),
            );

            const material = new THREE.ShaderMaterial({
                vertexShader: vs,
                fragmentShader: fs || DEFAULT_FRAGMENT_SHADER,
                blending: THREE.AdditiveBlending,
                depthTest: true,
                transparent: true,
                uniforms: this.uniforms,
            });
            material.side = THREE.DoubleSide;
            material.extensions = {
                derivatives: false,
                drawBuffers: false,
                fragDepth: false,
                shaderTextureLOD: false,
            };

            if (this.vertexMode === 'POINTS') {
                plane = new THREE.Points(geometry, material);
            } else if (this.vertexMode === 'LINE_LOOP') {
                plane = new (THREE as any).LineLoop(geometry, material);
            } else if (this.vertexMode === 'LINE_STRIP') {
                plane = new THREE.Line(geometry, material);
            } else if (this.vertexMode === 'LINES') {
                plane = new THREE.LineSegments(geometry, material);
            } else if (this.vertexMode === 'TRI_STRIP') {
                plane = new THREE.Mesh(geometry, material);
                plane.setDrawMode(THREE.TriangleStripDrawMode);
            } else if (this.vertexMode === 'TRI_FAN') {
                plane = new THREE.Mesh(geometry, material);
                plane.setDrawMode(THREE.TriangleFanDrawMode);
            } else {
                plane = new THREE.Mesh(geometry, material);
            }
        } else {
            // Create plane
            const geometry = new THREE.PlaneGeometry(2, 2);
            const material = new THREE.ShaderMaterial({
                vertexShader: DEFAULT_VERTEX_SHADER,
                fragmentShader: fs,
                uniforms: this.uniforms,
            });
            material.extensions = {
                derivatives: true,
                drawBuffers: false,
                fragDepth: false,
                shaderTextureLOD: false,
            };
            plane = new THREE.Mesh(geometry, material);
        }

        return plane;
    }

    private createRenderPass(pass: IPass): IRenderPass {
        if (!this.canvas) {
            throw new Error('Call setCanvas() before loading shaders');
        }

        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        camera.position.set(0, 0, 1);
        camera.lookAt(scene.position);

        const plane = this.createPlane(pass.fs, pass.vs);
        scene.add(plane);

        let target: IRenderPassTarget | null = null;
        if (pass.TARGET) {
            const targetName = pass.TARGET;
            const textureType = pass.FLOAT
                ? THREE.FloatType
                : THREE.UnsignedByteType;

            let getWidth = ($WIDTH: number, _: number) => $WIDTH;
            let getHeight = (_: number, $HEIGHT: number) => $HEIGHT;
            if (pass.WIDTH) {
                try {
                    // eslint-disable-next-line no-new-func
                    getWidth = new Function(
                        '$WIDTH',
                        '$HEIGHT',
                        `return ${pass.WIDTH}`,
                    ) as WidthHeightFunc;
                } catch (e) {}
            }
            if (pass.HEIGHT) {
                try {
                    // eslint-disable-next-line no-new-func
                    getHeight = new Function(
                        '$WIDTH',
                        '$HEIGHT',
                        `return ${pass.HEIGHT}`,
                    ) as WidthHeightFunc;
                } catch (e) {}
            }

            const w = this.canvas.offsetWidth / this.pixelRatio;
            const h = this.canvas.offsetHeight / this.pixelRatio;

            target = {
                name: targetName,
                getWidth,
                getHeight,
                targets: [
                    createTarget(w, h, textureType),
                    createTarget(w, h, textureType),
                ],
            };
            this.uniforms[targetName] = {
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

    loadShader(shader: IShader): void {
        let passes;
        if (shader instanceof Array) {
            passes = shader;
        } else {
            passes = [shader];
        }

        // Dispose old targets
        this.passes.forEach(pass => {
            const target = pass.target;
            if (target) {
                target.targets[0].texture.dispose();
                target.targets[1].texture.dispose();
            }
        });

        // Create new Passes
        this.passes = passes.map(pass => {
            if (!pass.fs && !pass.vs) {
                throw new TypeError(
                    'Veda.loadShader: Invalid argument. Shaders must have fs or vs property.',
                );
            }
            return this.createRenderPass(pass);
        });

        this.uniforms.FRAMEINDEX.value = 0;
    }

    async loadTexture(
        name: string,
        textureUrl: string,
        speed: number = 1,
    ): Promise<void> {
        let texture;
        if (isVideo(textureUrl)) {
            texture = this.videoLoader.load(name, textureUrl, speed);
        } else if (isGif(textureUrl)) {
            texture = this.gifLoader.load(name, textureUrl);
        } else if (isSound(textureUrl)) {
            texture = await this.soundLoader.load(textureUrl);
        } else {
            texture = this.textureLoader.load(textureUrl);
        }

        this.uniforms[name] = {
            type: 't',
            value: texture,
        };
    }

    unloadTexture(name: string, textureUrl: string, remove: boolean): void {
        const texture = this.uniforms[name];
        texture.value.dispose();

        if (remove && isVideo(textureUrl)) {
            this.videoLoader.unload(textureUrl);
        }
        if (remove && isGif(textureUrl)) {
            this.gifLoader.unload(textureUrl);
        }
        if (remove && isSound(textureUrl)) {
            this.soundLoader.unload(textureUrl);
        }
    }

    setUniform(name: string, type: UniformType, value: any) {
        this.uniforms[name] = { type, value };
    }

    private mousemove = (e: MouseEvent) => {
        if (!this.canvas) {
            return;
        }
        const rect = this.canvas.getBoundingClientRect();
        const root = document.documentElement;
        if (root) {
            const left = rect.top + root.scrollLeft;
            const top = rect.top + root.scrollTop;
            this.uniforms.mouse.value.x =
                (e.pageX - left) / this.canvas.offsetWidth;
            this.uniforms.mouse.value.y =
                1 - (e.pageY - top) / this.canvas.offsetHeight;
        }
    };

    private mousedown = (e: MouseEvent) => {
        const b = e.buttons;
        this.uniforms.mouseButtons.value = new THREE.Vector3(
            (b >> 0) & 1,
            (b >> 1) & 1,
            (b >> 2) & 1,
        );
    };

    private mouseup = this.mousedown;

    resize = (width: number, height: number) => {
        if (!this.renderer) {
            return;
        }
        this.renderer.setSize(width, height);

        const [bufferWidth, bufferHeight] = [
            width / this.pixelRatio,
            height / this.pixelRatio,
        ];
        this.passes.forEach(p => {
            if (p.target) {
                p.target.targets.forEach(t =>
                    t.setSize(bufferWidth, bufferHeight),
                );
            }
        });
        this.targets.forEach(t => t.setSize(bufferWidth, bufferHeight));
        this.uniforms.resolution.value.x = bufferWidth;
        this.uniforms.resolution.value.y = bufferHeight;
    };

    animate = () => {
        this.frame++;
        if (!this.isPlaying) {
            return;
        }

        requestAnimationFrame(this.animate);
        if (this.frame % this.frameskip === 0) {
            this.render();
        }
    };

    loadSoundShader(fs: string): void {
        this.soundRenderer.loadShader(fs);
    }

    playSound(): void {
        this.soundRenderer.play();
    }

    stopSound(): void {
        this.soundRenderer.stop();
    }

    play(): void {
        this.isPlaying = true;
        this.animate();
    }

    stop(): void {
        this.isPlaying = false;
        this.audioLoader.disable();
        this.cameraLoader.disable();
        this.keyLoader.disable();
        this.midiLoader.disable();
        this.gamepadLoader.disable();
    }

    private render(): void {
        if (!this.canvas || !this.renderer) {
            return;
        }
        const canvas = this.canvas;
        const renderer = this.renderer;

        this.uniforms.time.value = (Date.now() - this.start) / 1000;
        this.targets = [this.targets[1], this.targets[0]];
        this.uniforms.backbuffer.value = this.targets[0].texture;

        this.gifLoader.update();

        if (this.audioLoader.isEnabled) {
            this.audioLoader.update();
            this.uniforms.volume.value = this.audioLoader.getVolume();
        }

        if (this.gamepadLoader.isEnabled) {
            this.gamepadLoader.update();
        }

        this.passes.forEach((pass: IRenderPass, i: number) => {
            this.uniforms.PASSINDEX.value = i;

            const target = pass.target;
            if (target) {
                const $width = canvas.offsetWidth / this.pixelRatio;
                const $height = canvas.offsetHeight / this.pixelRatio;
                target.targets[1].setSize(
                    target.getWidth($width, $height),
                    target.getHeight($width, $height),
                );
                renderer.render(
                    pass.scene,
                    pass.camera,
                    target.targets[1],
                    true,
                );

                // Swap buffers after render so that we can use the buffer in latter passes
                target.targets = [target.targets[1], target.targets[0]];
                this.uniforms[target.name].value = target.targets[0].texture;
            } else {
                renderer.render(pass.scene, pass.camera, undefined);
            }
        });

        const lastPass = this.passes[this.passes.length - 1];

        // Render last pass to canvas even if target is specified
        if (lastPass.target) {
            renderer.render(lastPass.scene, lastPass.camera, undefined);
        }

        // Render result to backbuffer
        renderer.render(lastPass.scene, lastPass.camera, this.targets[1], true);

        this.uniforms.FRAMEINDEX.value++;
    }

    toggleAudio(flag: boolean): void {
        if (flag) {
            this.audioLoader.enable();
            this.uniforms = {
                ...this.uniforms,
                volume: { type: 'f', value: 0 },
                spectrum: { type: 't', value: this.audioLoader.spectrum },
                samples: { type: 't', value: this.audioLoader.samples },
            };
        } else if (this.uniforms.spectrum) {
            this.uniforms.spectrum.value.dispose();
            this.uniforms.samples.value.dispose();
            this.audioLoader.disable();
        }
    }

    toggleMidi(flag: boolean): void {
        if (flag) {
            this.midiLoader.enable();
            this.uniforms = {
                ...this.uniforms,
                midi: { type: 't', value: this.midiLoader.midiTexture },
                note: { type: 't', value: this.midiLoader.noteTexture },
            };
        } else if (this.uniforms.midi) {
            this.uniforms.midi.value.dispose();
            this.uniforms.note.value.dispose();
            this.midiLoader.disable();
        }
    }

    toggleCamera(flag: boolean): void {
        if (flag) {
            this.cameraLoader.enable();
            this.uniforms = {
                ...this.uniforms,
                camera: { type: 't', value: this.cameraLoader.texture },
            };
        } else {
            this.cameraLoader.disable();
        }
    }

    toggleKeyboard(flag: boolean): void {
        if (flag) {
            this.keyLoader.enable();
            this.uniforms = {
                ...this.uniforms,
                key: { type: 't', value: this.keyLoader.texture },
            };
        } else {
            this.keyLoader.disable();
        }
    }

    toggleGamepad(flag: boolean): void {
        if (flag) {
            this.gamepadLoader.enable();
            this.uniforms = {
                ...this.uniforms,
                gamepad: { type: 't', value: this.gamepadLoader.texture },
            };
        } else {
            this.gamepadLoader.disable();
        }
    }
}
