import * as TYPE_ONLY_THREE from 'three/src/Three.d';
import { LayoutObject } from './LayoutObject';
export declare class LayoutParticleImageObject extends LayoutObject {
    object: TYPE_ONLY_THREE.Points;
    private _tween;
    constructor(el: HTMLElement, imgSrc: string | HTMLImageElement);
    set progress(progress: number);
    layout(): void;
    update(delta: number): void;
    dispose(): void;
    private onEnter;
    private _makeGeometry;
}
