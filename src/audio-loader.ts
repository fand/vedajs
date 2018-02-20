import * as THREE from 'three';
import { getCtx } from './get-ctx';

export type AudioOptions = {
    fftSize?: number;
    fftSmoothingTimeConstant?: number;
}

const DEFAULT_AUDIO_OPTIONS = {
    fftSize: 2048,
    fftSmoothingTimeConstant: 0.8,
};

export default class AudioLoader {
    private ctx: AudioContext;
    private gain: GainNode;
    private analyser: AnalyserNode;
    private input: MediaStreamAudioSourceNode | null = null;

    spectrum: THREE.DataTexture;
    samples: THREE.DataTexture;
    isPlaying: boolean = false;
    isEnabled: boolean = false;

    private spectrumArray: Uint8ClampedArray;
    private samplesArray: Uint8ClampedArray;
    private stream: any;

    private willPlay: Promise<any> | null = null;

    constructor(_rc: AudioOptions) {
        const rc = {
            ...DEFAULT_AUDIO_OPTIONS,
            ..._rc,
        };

        this.ctx = getCtx();
        this.gain = this.ctx.createGain();
        this.analyser = this.ctx.createAnalyser();
        this.analyser.connect(this.gain);
        this.gain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.gain.connect(this.ctx.destination);

        this.analyser.fftSize = rc.fftSize;
        this.analyser.smoothingTimeConstant = rc.fftSmoothingTimeConstant;
        this.spectrumArray = new Uint8ClampedArray(this.analyser.frequencyBinCount);
        this.samplesArray = new Uint8ClampedArray(this.analyser.frequencyBinCount);

        this.spectrum = new THREE.DataTexture(
            this.spectrumArray,
            this.analyser.frequencyBinCount,
            1,
            THREE.LuminanceFormat,
            THREE.UnsignedByteType
        );
        this.samples = new THREE.DataTexture(
            this.samplesArray,
            this.analyser.frequencyBinCount,
            1,
            THREE.LuminanceFormat,
            THREE.UnsignedByteType
        );
    }

    enable(): void {
        this.willPlay = new Promise<void>((resolve, reject) => {
            navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                this.stream = stream;
                this.input = (this.ctx.createMediaStreamSource as (s: MediaStream) => MediaStreamAudioSourceNode)(stream);
                this.input.connect(this.analyser);
                this.isEnabled = true;
                resolve();
            }, err => {
                console.error(err);
                reject();
            });
        });
    }

    disable(): void {
        if (this.isEnabled && this.willPlay) {
            this.willPlay.then(() => {
                this.isEnabled = false;
                this.input && this.input.disconnect();
                this.stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
            });
        }
    }

    update(): void {
        this.analyser.getByteFrequencyData(new Uint8Array(this.spectrumArray));
        this.analyser.getByteTimeDomainData(new Uint8Array(this.samplesArray));
        this.spectrum.needsUpdate = true;
        this.samples.needsUpdate = true;
    }

    getVolume(): number {
        return this.spectrumArray.reduce((x, y) => x + y, 0) / this.spectrumArray.length;
    }

    setFftSize(fftSize: number): void {
        this.analyser.fftSize = fftSize;
        this.spectrumArray = new Uint8ClampedArray(this.analyser.frequencyBinCount);
        this.samplesArray = new Uint8ClampedArray(this.analyser.frequencyBinCount);
        this.spectrum.image.data = this.spectrumArray;
        (this.spectrum.image as any).width = this.analyser.frequencyBinCount;
        this.samples.image.data = this.samplesArray;
        (this.samples.image as any).width = this.analyser.frequencyBinCount;
    }

    setFftSmoothingTimeConstant(fftSmoothingTimeConstant: number): void {
        this.analyser.smoothingTimeConstant = fftSmoothingTimeConstant;
    }
}
