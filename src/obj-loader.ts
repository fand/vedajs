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
    obj: THREE.Object3D;
}

export default class ObjLoader {
    private cache: { [url: string]: ICache | null } = {};

    private objLoader = new THREE.OBJLoader();
    private mtlLoader = new MTLLoader();

    async load(model: IPassModel): Promise<THREE.Object3D> {
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

        const obj = await this.loadObj(model.PATH);

        let box: THREE.Box3;
        obj.traverse(o => {
            if (
                o instanceof THREE.Mesh &&
                o.geometry instanceof THREE.BufferGeometry
            ) {
                o.geometry.computeBoundingBox();

                if (!box) {
                    box = o.geometry.boundingBox;
                } else {
                    box.union(o.geometry.boundingBox);
                }
            }
        });

        const sphere = new THREE.Sphere();
        box!.getBoundingSphere(sphere);
        const scale = 1 / sphere.radius;
        const offset = sphere.center;

        obj.traverse(o => {
            if (
                o instanceof THREE.Mesh &&
                o.geometry instanceof THREE.BufferGeometry
            ) {
                o.geometry.translate(-offset.x, -offset.y, -offset.z);
                o.geometry.scale(scale, scale, scale);
                o.updateMatrix();
            }
        });

        this.cache[url] = { url, obj };

        return obj;
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
}
