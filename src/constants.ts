export const DEFAULT_VERTEX_SHADER = `
varying vec2 vUv;
void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const DEFAULT_FRAGMENT_SHADER = `
precision mediump float;
varying vec4 v_color;
void main() {
    gl_FragColor = v_color;
}
`;

export const SAMPLE_WIDTH = 1280;
export const SAMPLE_HEIGHT = 720;

// ref. https://github.com/mrdoob/three.js/wiki/Uniforms-types
export type UniformType =
    | '1i'
    | '1f'
    | '2f'
    | '3f'
    | '1iv'
    | '3iv'
    | '1fv'
    | '2fv'
    | '3fv'
    | '4fv'
    | 'Matrix3fv'
    | 'Matric4fv'
    | 'i'
    | 'f'
    | 'v2'
    | 'v3'
    | 'v4'
    | 'c'
    | 'm4'
    | 't'
    | 'iv1'
    | 'iv'
    | 'fv1'
    | 'fv'
    | 'v2v'
    | 'v3v'
    | 'v4v'
    | 'm4v'
    | 'tv';

export interface IVedaOptions {
    pixelRatio?: number;
    frameskip?: number;
    vertexMode?: string;
    vertexCount?: number;
    fftSize?: number;
    fftSmoothingTimeConstant?: number;
}

export const DEFAULT_VEDA_OPTIONS = {
    frameskip: 1,
    pixelRatio: 1,
    vertexCount: 3000,
    vertexMode: 'TRIANGLES',
};

export interface IPassModel {
    PATH: string;
    MATERIAL?: string;
}

export interface IPass {
    MODEL?: IPassModel;
    TARGET?: string;
    vs?: string;
    fs?: string;
    FLOAT?: boolean;
    WIDTH?: string;
    HEIGHT?: string;
}

export type IShader = IPass | IPass[];

export interface IUniforms {
    [key: string]: {
        type: string;
        value: any;
    };
}
