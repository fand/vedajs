import * as THREE from 'three';
import { IPassModel } from './constants';

declare const require: any;
require('three-obj-loader')(THREE); // tslint:disable-line

interface ICache {
    url: string;
    obj: THREE.BufferGeometry;
}

export default class ObjLoader {
    private cache: { [url: string]: ICache | null } = {};

    private loader = new THREE.OBJLoader();

    load(model: IPassModel): Promise<THREE.BufferGeometry> {
        const url = model.PATH;

        const cache = this.cache[url];
        if (cache) {
            return Promise.resolve(cache.obj);
        }

        return new Promise((resolve, reject) => {
            this.loader.load(
                url,
                (group: any) => {
                    let obj: any = group.children[0].geometry;
                    obj = this.fixObj(obj);
                    this.cache[url] = { url, obj };
                    resolve(obj);
                },
                undefined,
                reject,
            );
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
