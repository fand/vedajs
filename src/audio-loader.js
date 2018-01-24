/* @flow */
import * as THREE from 'three';
import { getCtx } from './get-ctx';

type AudioOptions = {
  fftSize?: number;
  fftSmoothingTimeConstant?: number;
}

const DEFAULT_AUDIO_OPTIONS = {
  fftSize: 2048,
  fftSmoothingTimeConstant: 0.8,
};

export default class AudioLoader {
  _ctx: AudioContext;
  _gain: GainNode;
  _analyser: AnalyserNode;
  _input: MediaStreamAudioSourceNode;

  spectrum: THREE.DataTexture;
  samples: THREE.DataTexture;
  isPlaying: boolean = false;
  isEnabled: boolean = false;

  _spectrumArray: Uint8Array;
  _samplesArray: Uint8Array;
  _stream: any;

  _willPlay: Promise<any>;

  constructor(_rc: AudioOptions) {
    const rc = {
      ...DEFAULT_AUDIO_OPTIONS,
      ..._rc,
    };

    this._ctx = getCtx();
    this._gain = this._ctx.createGain();
    this._analyser = this._ctx.createAnalyser();
    this._analyser.connect(this._gain);
    this._gain.gain.setValueAtTime(0, this._ctx.currentTime);
    this._gain.connect(this._ctx.destination);

    this._analyser.fftSize = rc.fftSize;
    this._analyser.smoothingTimeConstant = rc.fftSmoothingTimeConstant;
    this._spectrumArray = new Uint8Array(this._analyser.frequencyBinCount);
    this._samplesArray = new Uint8Array(this._analyser.frequencyBinCount);

    this.spectrum = new THREE.DataTexture(
      this._spectrumArray,
      this._analyser.frequencyBinCount,
      1,
      THREE.LuminanceFormat,
      THREE.UnsignedByteType
    );
    this.samples = new THREE.DataTexture(
      this._samplesArray,
      this._analyser.frequencyBinCount,
      1,
      THREE.LuminanceFormat,
      THREE.UnsignedByteType
    );
  }

  enable(): void {
    this._willPlay = new Promise((resolve, reject) => {
      (navigator: any).mediaDevices.getUserMedia({ audio: true }).then(stream => {
        this._stream = stream;
        this._input = (this._ctx.createMediaStreamSource: (s: MediaStream) => MediaStreamAudioSourceNode)(stream);
        this._input.connect(this._analyser);
        this.isEnabled = true;
        resolve();
      }, err => {
        console.error(err);
        reject();
      });
    });
  }

  disable(): void {
    if (this.isEnabled && this._willPlay) {
      this._willPlay.then(() => {
        this.isEnabled = false;
        this._input.disconnect();
        this._stream.getTracks().forEach(t => t.stop());
      });
    }
  }

  update(): void {
    this._analyser.getByteFrequencyData(this._spectrumArray);
    this._analyser.getByteTimeDomainData(this._samplesArray);
    this.spectrum.needsUpdate = true;
    this.samples.needsUpdate = true;
  }

  getVolume(): number {
    return this._spectrumArray.reduce((x, y) => x + y, 0) / this._spectrumArray.length;
  }

  setFftSize(fftSize: number): void {
    this._analyser.fftSize = fftSize;
    this._spectrumArray = new Uint8Array(this._analyser.frequencyBinCount);
    this._samplesArray = new Uint8Array(this._analyser.frequencyBinCount);
    this.spectrum.image.data = this._spectrumArray;
    this.spectrum.image.width = this._analyser.frequencyBinCount;
    this.samples.image.data = this._samplesArray;
    this.samples.image.width = this._analyser.frequencyBinCount;
  }

  setFftSmoothingTimeConstant(fftSmoothingTimeConstant: number): void {
    this._analyser.smoothingTimeConstant = fftSmoothingTimeConstant;
  }
}
