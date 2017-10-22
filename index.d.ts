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

export default class Veda {
    constructor(options: VedaOptions);
    setPixelRatio(pixelRatio: number): void;
    setFrameskip(frameskip: number): void;
    setVertexCount(vertexCount: number): void;
    setVertexMode(vertexMode: string): void;
    setCanvas(canvas: HTMLCanvasElement): void;
    resize(width: number, height: number): void;
    loadShader(shader: Shader): void;
    loadTexture(name: string, textureUrl: string): void;
    unloadTexture(name: string, textureUrl: string, remove: boolean): void;
    play(): void;
    stop(): void;
    toggleAudio(flag: boolean): void;
    toggleMidi(flag: boolean): void;
    toggleCamera(flag: boolean): void;
    toggleKeyboard(flag: boolean): void;
    toggleGamepad(flag: boolean): void;
}
