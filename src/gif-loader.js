/* @flow */
import * as THREE from 'three';

interface ICache {
  img: HTMLImageElement;
  texture: THREE.Texture;
}

export default class GifLoader {
  _cache: { [url: string]: ?ICache };

  constructor() {
    this._cache = {};
  }

  update() {
    Object.keys(this._cache).forEach(k => {
      const cache = this._cache[k];
      if (cache) {
        cache.texture.needsUpdate = true;
      }
    });
  }

  load(name: string, url: string): THREE.Texture {
    const cache = this._cache[url];
    if (cache) {
      return cache.texture;
    }

    const img = document.createElement('img');
    (document.body: any).appendChild(img);

    img.classList.add('veda-video-source');
    img.style.position = 'absolute';
    img.src = url;

    const texture = new THREE.Texture(img);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBFormat;

    this._cache[url] = { img, texture };

    return texture;
  }

  unload(url: string): void {
    const cache = this._cache[url];
    if (cache) {
      (document.body: any).removeChild(cache.img);
    }
    this._cache[url] = null;
  }
}
