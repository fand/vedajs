import * as THREE from 'three';

interface ICache {
  name: string;
  img: HTMLImageElement;
  texture: THREE.Texture;
}

export default class GifLoader {
  private cache: { [url: string]: ICache | null } = {};

  update() {
    Object.keys(this.cache).forEach(k => {
      const cache = this.cache[k];
      if (cache) {
        cache.texture.needsUpdate = true;
      }
    });
  }

  load(name: string, url: string): THREE.Texture {
    const cache = this.cache[url];
    if (cache) {
      return cache.texture;
    }

    const img = document.createElement('img');
    (document.body as any).appendChild(img);

    img.classList.add('veda-video-source');
    img.style.position = 'fixed';
    img.style.top = '99.99999%';
    img.style.width = '1px';
    img.style.height = '1px';
    img.src = url;

    const texture = new THREE.Texture(img);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBFormat;

    this.cache[url] = { name, img, texture };

    return texture;
  }

  unload(url: string): void {
    const cache = this.cache[url];
    if (cache) {
      (document.body as any).removeChild(cache.img);
    }
    this.cache[url] = null;
  }
}
