type VedaOptions = {
    pixelRatio?: number;
    frameskip?: number;
    vertexMode?: string;
    vertexCount?: number;
}

type Pass = {
    TARGET?: string;
    vs?: string;
    fs?: string;
}

type Shader = Pass[];

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

export default class Veda {
    constructor(options: VedaOptions);
    setPixelRatio(pixelRatio: number): void;
    setFrameskip(frameskip: number): void;
    setVertexCount(vertexCount: number): void;
    setVertexMode(vertexMode: string): void;
    resetTime(): void;
    setUniform(name: string, type: UniformType, value: any): void;
    setCanvas(canvas: HTMLCanvasElement): void;
    setSoundMode(mode: string): void;
    setSoundLength(length: number): void;
    resize(width: number, height: number): void;
    loadShader(shader: Shader): void;
    loadSoundShader(shader: string): void;
    loadTexture(name: string, textureUrl: string, speed?: number): void;
    unloadTexture(name: string, textureUrl: string, remove: boolean): void;
    play(): void;
    stop(): void;
    playSound(): void;
    stopSound(): void;
    toggleAudio(flag: boolean): void;
    toggleMidi(flag: boolean): void;
    toggleCamera(flag: boolean): void;
    toggleKeyboard(flag: boolean): void;
    toggleGamepad(flag: boolean): void;
}
