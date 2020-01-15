import * as TYPE_ONLY_THREE from 'three/src/Three.d';
// import * as TYPE_ONLY_THREE from 'three';
import { PIXEL_RATIO } from './constants';
import { installer } from './install';
import { reflowWatcher } from './reflowWatcher';
import { LayoutObject } from './LayoutObject/LayoutObject';

declare module 'three' {
	export class PMREMGenerator {

		public constructor( renderer: TYPE_ONLY_THREE.WebGLRenderer );
		public fromEquirectangular( equirectangular: TYPE_ONLY_THREE.Texture ): TYPE_ONLY_THREE.WebGLRenderTargetCube;
		public dispose(): void;

	}
}

let THREE: any;
let _mat4: TYPE_ONLY_THREE.Matrix4;

installer.addEventListener( 'install', ( libs ) => {

	THREE = libs!.THREE;
	_mat4 = new THREE.Matrix4() as TYPE_ONLY_THREE.Matrix4;

} );

export class LayoutField {

	width = window.innerWidth;
	height = window.innerHeight;
	canvas: HTMLCanvasElement;
	renderer: TYPE_ONLY_THREE.WebGLRenderer;
	scene = new THREE.Scene() as TYPE_ONLY_THREE.Scene;
	camera = new THREE.PerspectiveCamera( 60, this.width / this.height, 1, 1000 ) as TYPE_ONLY_THREE.PerspectiveCamera;
	layoutObjects: LayoutObject[] = [];

	private _updated: boolean = false;
	private _clock = new THREE.Clock() as TYPE_ONLY_THREE.Clock;
	private _viewFrustum = new THREE.Frustum() as TYPE_ONLY_THREE.Frustum;

	constructor( canvas: HTMLCanvasElement ) {

		this._clock = new THREE.Clock();

		this.canvas = canvas || document.createElement( 'canvas' );
		this.renderer = new THREE.WebGLRenderer( {
			canvas: this.canvas,
			alpha: true
		} );
		this.renderer.setClearAlpha( 0 );
		this.renderer.setPixelRatio( PIXEL_RATIO );
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.renderer.outputEncoding = THREE.sRGBEncoding;
		document.body.appendChild( this.renderer.domElement );

		this.renderer.domElement.style.pointerEvents = 'none';
		this.renderer.domElement.style.position = 'fixed';
		this.renderer.domElement.style.top = '0';
		this.renderer.domElement.style.right = '0';
		this.renderer.domElement.style.bottom = '0';
		this.renderer.domElement.style.left = '0';
		this.renderer.domElement.style.display = 'block';

		const hemiLight = new THREE.HemisphereLight( 0xcccccc, 0x332222 ) as TYPE_ONLY_THREE.HemisphereLight;
		hemiLight.position.set( 0, 0, 1 );
		this.scene.add( hemiLight );

		this.updateSize();

		this.scroll = this.scroll.bind( this );
		this.reflow = this.reflow.bind( this );
		reflowWatcher.addEventListener( 'scroll', this.scroll );
		reflowWatcher.addEventListener( 'reflow', this.reflow );

		const animationLoop = () => {

			requestAnimationFrame( animationLoop );

			if ( ! this.needsRepaint ) return;

			const delta = this._clock.getDelta();
			this.layoutObjects.forEach( ( layoutObject ) => layoutObject.active && layoutObject.update( delta ) );
			// this._tweenGroup.update( delta );

			this.renderer.render( this.scene, this.camera );
			this._updated = false;

		};

		animationLoop();

	}

	get needsRepaint(): boolean {

		return (
			this._updated ||
			this.layoutObjects.some( ( layoutObject ) => layoutObject.active )
		);

	}

	scroll() {

		this._viewFrustum.setFromMatrix( _mat4.multiplyMatrices( this.camera.projectionMatrix, this.camera.matrixWorldInverse ) );

		this.layoutObjects.forEach( ( layoutObject ) => {

			const x = - this.width  * 0.5 + layoutObject.domPosition.x - window.scrollX;
			const y =   this.height * 0.5 - layoutObject.domPosition.y + window.scrollY;
			layoutObject.object.position.set( x, y, 0 );
			layoutObject.inView = this.inViewFrustum( layoutObject );

		} );

		this._updated = true;

	}

	reflow() {

		this.updateSize();
		this.layout();
		this.scroll();

	}

	throttledReflow() {}

	layout() {

		this.layoutObjects.forEach( ( layoutObject ) => {

			layoutObject.layout();
			const x = - this.width  * 0.5 + layoutObject.domPosition.x - window.scrollX;
			const y =   this.height * 0.5 - layoutObject.domPosition.y + window.scrollY;
			layoutObject.object.position.set( x, y, 0 );

		} );

	}

	add( layoutObject: LayoutObject ) {

		this.scene.add( layoutObject.object );
		this.layoutObjects.push( layoutObject );

		const x = - this.width  * 0.5 + layoutObject.domPosition.x - window.scrollX;
		const y =   this.height * 0.5 - layoutObject.domPosition.y + window.scrollY;
		layoutObject.object.position.set( x, y, 0 );

		this.renderer.render( this.scene, this.camera );

		layoutObject.addEventListener( 'loaded', () => {

			this._updated = true;

		} );

	}

	remove( layoutObject: LayoutObject ) {

		const index = this.layoutObjects.indexOf( layoutObject );

		if ( index === - 1 ) return;

		layoutObject.dispose();
		this.scene.remove( layoutObject.object );
		this.layoutObjects.splice( index, 1 );

		this._updated = true;

	}

	updateSize() {

		this.width = window.innerWidth;
		this.height = window.innerHeight;

		const fov = this.camera.getEffectiveFOV() * THREE.Math.DEG2RAD;
		const pixelPerfectDistance = this.height * 0.5 / Math.tan( fov * 0.5 );
		this.camera.position.z = pixelPerfectDistance;

		this.camera.aspect = this.width / this.height;
		this.camera.far = pixelPerfectDistance * 2;
		this.camera.updateProjectionMatrix();
		this._viewFrustum.setFromMatrix( _mat4.multiplyMatrices( this.camera.projectionMatrix, this.camera.matrixWorldInverse ) );

		this.renderer.setSize( this.width, this.height );

	}

	inViewFrustum( layoutObject: LayoutObject ) {

		if ( ! layoutObject.meshes.length ) return false;

		return layoutObject.meshes.some( ( mesh ) => this._viewFrustum.intersectsObject( mesh ) );

	}

	applyEnvMap( img: string | HTMLImageElement ) {

		return new Promise( ( resolve ) => {

			const hdirTexture = new THREE.Texture() as TYPE_ONLY_THREE.Texture;

			if ( typeof img === 'string' ) {

				hdirTexture.image = new Image();
				hdirTexture.image.src = img;

			} else {

				hdirTexture.image = img;

			}

			const onImgLoad = () => {

				hdirTexture.needsUpdate = true;

				const pmremGenerator = new THREE.PMREMGenerator( this.renderer ) as TYPE_ONLY_THREE.PMREMGenerator;
				const envMap = pmremGenerator.fromEquirectangular( hdirTexture ).texture;
				this.scene.environment = envMap;
				resolve( envMap );
				this._updated = true;

				pmremGenerator.dispose();
				return;

			};

			const imgLoaded = hdirTexture.image.naturalWidth !== 0;
			if ( imgLoaded ) {

				onImgLoad();

			} else {

				hdirTexture.image.onload = onImgLoad;

			}

		} );

	}

}
