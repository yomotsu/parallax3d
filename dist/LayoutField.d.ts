import * as TYPE_ONLY_THREE from 'three/src/Three.d';
import { LayoutObject } from './LayoutObject/LayoutObject';
declare module 'three' {
    class PMREMGenerator {
        constructor(renderer: TYPE_ONLY_THREE.WebGLRenderer);
        fromEquirectangular(equirectangular: TYPE_ONLY_THREE.Texture): TYPE_ONLY_THREE.WebGLRenderTargetCube;
        dispose(): void;
    }
}
export declare class LayoutField {
    width: number;
    height: number;
    canvas: HTMLCanvasElement;
    renderer: TYPE_ONLY_THREE.WebGLRenderer;
    scene: TYPE_ONLY_THREE.Scene;
    camera: TYPE_ONLY_THREE.PerspectiveCamera;
    layoutObjects: LayoutObject[];
    private _updated;
    private _clock;
    private _viewFrustum;
    constructor(canvas: HTMLCanvasElement);
    get needsRepaint(): boolean;
    scroll(): void;
    reflow(): void;
    throttledReflow(): void;
    layout(): void;
    add(layoutObject: LayoutObject): void;
    remove(layoutObject: LayoutObject): void;
    updateSize(): void;
    inViewFrustum(layoutObject: LayoutObject): boolean;
    applyEnvMap(img: string | HTMLImageElement): Promise<unknown>;
}
