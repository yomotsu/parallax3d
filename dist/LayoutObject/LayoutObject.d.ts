import * as TYPE_ONLY_THREE from 'three/src/Three.d';
import { EventDispatcher } from '../EventDispatcher';
export declare class LayoutObject extends EventDispatcher {
    el: HTMLElement;
    object: TYPE_ONLY_THREE.Object3D;
    domPosition: TYPE_ONLY_THREE.Vector2;
    domSize: TYPE_ONLY_THREE.Vector2;
    meshes: (TYPE_ONLY_THREE.Mesh | TYPE_ONLY_THREE.Points)[];
    active: boolean;
    animated: boolean;
    private _inView;
    constructor(el: HTMLElement, object?: TYPE_ONLY_THREE.Object3D | null);
    get inView(): boolean;
    set inView(inView: boolean);
    layout(): void;
    update(_: number): void;
    dispose(): void;
}
