import { EventDispatcher } from './EventDispatcher';

let THREE: any;
let GLTFLoader: any;

export const installer = new EventDispatcher();

export function install( libs: any ) {

	THREE = libs.THREE;
	GLTFLoader = libs.GLTFLoader;

	installer.dispatchEvent( { type: 'install', THREE, GLTFLoader } );

}
