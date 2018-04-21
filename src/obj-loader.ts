import * as THREE from 'three';
import { IPassModel } from './constants';

declare const require: any;
require('three-obj-loader')(THREE); // tslint:disable-line

interface IConstructable<T> {
    new (): T;
}
const MTLLoader: IConstructable<THREE.MTLLoader> = require('three-mtl-loader'); // tslint:disable-line

interface ICache {
    url: string;
    obj: THREE.Mesh;
}

export default class ObjLoader {
    private cache: { [url: string]: ICache | null } = {};

    private objLoader = new THREE.OBJLoader();
    private mtlLoader = new MTLLoader();

    async load(model: IPassModel): Promise<THREE.Mesh> {
        const url = model.PATH;
        const key = `${model.PATH}:${model.MATERIAL || '_'}`;

        const cache = this.cache[key];
        if (cache) {
            return Promise.resolve(cache.obj);
        }

        if (model.MATERIAL) {
            const materials = await this.loadMtl(model.MATERIAL);
            console.log(materials);
            materials.preload();
            this.objLoader.setMaterials(materials);
        } else {
            this.objLoader.setMaterials(null as any);
        }

        return this.loadObj(model.PATH).then((group: any) => {
            let obj: any = group.children[0];
            obj.geometry = this.fixObj(obj.geometry);
            this.cache[url] = { url, obj };
            return obj;
        });
    }

    private loadMtl(url: string): Promise<THREE.MaterialCreator> {
        const match = url.match(/^(.*\\)(.*)$/) || url.match(/^(.*\/)(.*)\/?$/); // windows local file // other
        if (!match) {
            return Promise.reject(new TypeError('Invalid URL: ' + url));
        }

        const [_, path, basename] = match;
        this.mtlLoader.setPath(path);
        return new Promise((resolve, reject) => {
            this.mtlLoader.load(basename, resolve, undefined, reject);
        });
    }

    private loadObj(url: string): Promise<THREE.Group> {
        return new Promise((resolve, reject) => {
            this.objLoader.load(url, resolve, undefined, reject);
        });
    }

    private fixObj(obj: THREE.BufferGeometry): THREE.BufferGeometry {
        obj.computeBoundingSphere();
        const offset = obj.boundingSphere.center;
        const scale = 1 / obj.boundingSphere.radius;
        obj.scale(scale, scale, scale);
        obj.translate(-offset.x, -offset.y, -offset.z);
        return obj;
    }
}
