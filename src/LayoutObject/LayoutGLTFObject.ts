import * as TYPE_ONLY_THREE from 'three/src/Three.d';
import {
	GLTF as TYPE_ONLY_GLTF,
	GLTFLoader as TYPE_ONLY_GLTFLoader,
} from 'three/examples/jsm/loaders/GLTFLoader';
import { installer } from '../install';
import { inViewObserver, isInView } from '../inViewObserver';
import { LayoutObject } from './LayoutObject';
import { extractMeshes } from './extractMeshes';

let THREE: any;
let GLTFLoader: any;

installer.addEventListener( 'install', ( libs ) => {

	THREE = libs!.THREE;
	GLTFLoader = libs!.GLTFLoader;

} );

export class LayoutGLTFObject extends LayoutObject {

	// private _actions: THREE.AnimationAction[] = [];
	private _mixer?: THREE.AnimationMixer;
	// private _loaded = false;

	constructor( el: HTMLElement, url: string ) {

		super( el, new THREE.Object3D() );

		const loader = new GLTFLoader() as TYPE_ONLY_GLTFLoader;
		loader.load(
			url,
			( gltf: TYPE_ONLY_GLTF ) => {

				this.object.add( ...gltf.scene.children );
				this.meshes.push( ...extractMeshes( this.object ) );

				const mixer = new THREE.AnimationMixer( this.object ) as TYPE_ONLY_THREE.AnimationMixer;
				const actions = gltf.animations.map( ( animation ) => mixer.clipAction( animation ) );

				if ( actions.length >= 1 ) {

					actions[ 0 ].play();

					this._mixer = mixer;
					this.animated = true;

					const inView = isInView( this.el );

					if ( inView.partIn || inView.wholeIn ) this.active = true;

					inViewObserver.add( {
						el: this.el,
						onEnterStart: () => this.active = true,
						onEnterEnd: () => this.active = true,
						onLeaveEnd: () => this.active = false,
					} );

				}

				// this._loaded = true;
				this.dispatchEvent( { type: 'loaded' } );

			},
		);

	}

	// get loaded() {

	// 	return this._loaded;

	// }

	update( delta: number ) {

		if ( this._mixer ) this._mixer.update( delta );

	}

}
