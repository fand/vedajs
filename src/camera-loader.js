/* @flow */
import * as THREE from 'three';

export default class CameraLoader {
  _video: HTMLVideoElement;
  _stream: any;
  texture: THREE.VideoTexture;
  _willPlay: Promise<any>;

  constructor() {
    this._video = document.createElement('video');
    this._video.classList.add('veda-video-source');
    this._video.loop = true;
    this._video.muted = true;
    this._video.style.position = 'fixed';
    this._video.style.top = '99.99999%';
    this._video.style.width = '1px';
    this._video.style.height = '1px';

    (document.body: any).appendChild(this._video);

    this.texture = new THREE.VideoTexture(this._video);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.format = THREE.RGBFormat;
  }

  enable() {
    this._willPlay = new Promise((resolve, reject) => {
      (navigator: any).mediaDevices.getUserMedia({ video: true }).then(stream => {
        this._stream = stream;
        this._video.src = window.URL.createObjectURL(stream);
        this._video.play();
        resolve();
      }, err => {
        console.error(err);
        reject();
      });
    });
  }

  disable() {
    this.texture.dispose();
    if (this._willPlay) {
      this._willPlay.then(() => {
        this._stream.getTracks().forEach(t => t.stop());
      });
    }
  }
}
