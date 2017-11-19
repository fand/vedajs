/* @flow */
import * as THREE from 'three';

interface ICache {
  video: HTMLVideoElement;
  texture: THREE.VideoTexture;
}

export default class VideoLoader {
  _cache: { [url: string]: ?ICache };

  constructor() {
    this._cache = {};
  }

  load(name: string, url: string, speed: number): THREE.VideoTexture {
    const cache = this._cache[url];
    if (cache) {
      cache.video.playbackRate = speed;
      return cache.texture;
    }

    const video = document.createElement('video');
    (document.body: any).appendChild(video);

    video.classList.add('veda-video-source');
    video.style.position = 'fixed';
    video.style.top = '-100%';
    video.src = url;
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playbackRate = speed;

    const texture = new THREE.VideoTexture(video);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBFormat;

    this._cache[url] = { video, texture };

    return texture;
  }

  unload(url: string): void {
    const cache = this._cache[url];
    if (cache) {
      (document.body: any).removeChild(cache.video);
    }
    this._cache[url] = null;
  }
}
