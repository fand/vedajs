import * as THREE from 'three';

export default class GamepadLoader {
    texture: THREE.DataTexture;
    isEnabled: boolean = false;
    private array: Float32Array;
    private isConnected: boolean = false;

    constructor() {
        this.array = new Float32Array(128 * 2);
        this.texture = new THREE.DataTexture(
            this.array,
            128,
            2,
            THREE.LuminanceFormat,
            THREE.FloatType,
        );

        window.addEventListener('gamepadconnected', () => {
            this.isConnected = true;
        });
    }

    update(): void {
        if (!this.isConnected) {
            return;
        }

        Array.from(navigator.getGamepads()).forEach((gamepad: any) => {
            if (!gamepad) {
                return;
            }
            gamepad.buttons.forEach((button: any, i: number) => {
                this.array[i] = button.pressed ? 1 : 0;
            });
            gamepad.axes.forEach((axis: any, i: number) => {
                this.array[i + 128] = Math.max(-1, Math.min(1, axis));
            });
        });

        this.texture.needsUpdate = true;
    }

    enable() {
        this.isEnabled = true;
    }

    disable() {
        this.isEnabled = false;
        this.texture.dispose();
    }
}
