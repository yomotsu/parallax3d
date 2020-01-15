import { LayoutObject } from './LayoutObject';
export declare class LayoutGLTFObject extends LayoutObject {
    private _mixer?;
    constructor(el: HTMLElement, url: string);
    update(delta: number): void;
}
