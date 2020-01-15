import * as TYPE_ONLY_THREE from 'three/src/Three.d';
import { deepDispose } from '../utils/deepDispose';
import { installer } from '../install';
import { EventDispatcher } from '../EventDispatcher';

let THREE: any;

installer.addEventListener( 'install', ( libs ) => {

	THREE = libs!.THREE;

} );

export class LayoutObject extends EventDispatcher {

	el: HTMLElement;
	object: TYPE_ONLY_THREE.Object3D;
	domPosition = new THREE.Vector2() as TYPE_ONLY_THREE.Vector2;
	domSize = new THREE.Vector2() as TYPE_ONLY_THREE.Vector2;
	meshes = [] as ( TYPE_ONLY_THREE.Mesh | TYPE_ONLY_THREE.Points )[];
	active = false;
	animated = false;

	private _inView = false;

	constructor( el: HTMLElement, object: TYPE_ONLY_THREE.Object3D | null = null ) {

		super();

		this.el = el;
		this.object = object || new THREE.Mesh(
			new THREE.SphereBufferGeometry( 0.5, 32, 32 ),
			new THREE.MeshNormalMaterial(),
		);

		this.layout();

	}

	get inView() {

		return this._inView;

	}

	set inView( inView: boolean ) {

		this._inView = inView;

	}

	layout() {

		const domRect = this.el.getBoundingClientRect();
		this.domPosition.set(
			domRect.left + window.scrollX + domRect.width  * 0.5,
			domRect.top  + window.scrollY + domRect.height * 0.5,
		);
		this.domSize.set( domRect.width, domRect.height );

	}

	update( _: number ) {}

	dispose() {

		deepDispose( this.object );

	}

}
