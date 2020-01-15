import * as TYPE_ONLY_THREE from 'three/src/Three.d';
import { Tween } from 'tween-values';
import { PIXEL_RATIO } from '../constants';
import { installer } from '../install';
import { approxEqual } from '../MathUtils/approxEqual';
import {
	// exponentialInOut,
	// exponentialIn,
	exponentialOut,
} from "../MathUtils/easing";
import { inViewObserver, isInView } from '../inViewObserver';
import { LayoutObject } from './LayoutObject';

const DURATION = 0.6;
let _v2: TYPE_ONLY_THREE.Vector2;
let THREE: any;

installer.addEventListener( 'install', ( libs ) => {

	THREE = libs!.THREE;
	_v2 = new THREE.Vector2() as TYPE_ONLY_THREE.Vector2;

} );


export class LayoutParticleImageObject extends LayoutObject {

	object: TYPE_ONLY_THREE.Points;
	private _tween = new Tween( { progress: 0 }, { progress: 1 }, DURATION );

	constructor( el: HTMLElement, imgSrc: string | HTMLImageElement ) {

		super( el );

		const textureUrl = typeof imgSrc === 'string' ? imgSrc : imgSrc.src;

		const texture = new THREE.TextureLoader().load( textureUrl, () => {} ) as TYPE_ONLY_THREE.Texture;
		texture.magFilter = THREE.NearestFilter;
		texture.minFilter = THREE.NearestMipMapNearestFilter;

		const material = new THREE.ShaderMaterial( {
			uniforms: {
				opacity: { value: 0 },
				intensity: { value: 0 },
				map: { value: texture },
			},
			vertexShader: `
				attribute vec3 random;
				uniform float intensity;
				varying vec2 vUv;

				void main() {
					vec4 modelViewPosition = modelViewMatrix * vec4( position + ( random * intensity ), 1.0 );
					gl_Position = projectionMatrix * modelViewPosition;
					gl_PointSize = ${ PIXEL_RATIO.toFixed( 1 ) };
					vUv = uv;
				}
			`,
			fragmentShader: `
				uniform sampler2D map;
				uniform float opacity;
				varying vec2 vUv;

				void main() {
					vec4 color = texture2D( map, vec2( vUv ) );
					gl_FragColor = vec4( vec3( color.xyz ), color.w * opacity );
				}
			`,
		} ) as TYPE_ONLY_THREE.ShaderMaterial;
		material.transparent = true;

		this.object = new THREE.Points(
			new THREE.BufferGeometry() as TYPE_ONLY_THREE.BufferGeometry,
			material,
		) as TYPE_ONLY_THREE.Points;
		this.meshes.push( this.object );
		this._makeGeometry();
		this.progress = 0;

		this._tween.addEventListener( 'update', () => {

			this.progress = this._tween.currentValues.progress;

		} );
		this._tween.addEventListener( 'ended', () => {

			this.progress = 1;
			this.active = false;
			this.dispatchEvent( { type: 'animationend' } );

		} );

		if ( isInView( this.el ).partIn ) {

			this.onEnter();

		} else {

			inViewObserver.add( {
				el: this.el,
				onEnterStart: () => {

					this.onEnter();
					inViewObserver.remove( this.el );

				},
				onEnterEnd: () => {

					this.onEnter();
					inViewObserver.remove( this.el );

				},
			} );

		}

	}

	set progress( progress: number ) {

		// const intensity = exponentialInOut( 1 - progress );
		// const intensity = exponentialIn( 1 - progress );
		const intensity = 1 - progress;
		const opacity = exponentialOut( progress );
		( this.object.material as TYPE_ONLY_THREE.ShaderMaterial ).uniforms.intensity.value = intensity;
		( this.object.material as TYPE_ONLY_THREE.ShaderMaterial ).uniforms.opacity.value = opacity;
		// this.object.rotation.x = intensity * 160 * THREE.Math.DEG2RAD;

	}

	layout() {

		const oldDomSize = _v2.copy( this.domSize );

		super.layout();

		if (
			approxEqual( oldDomSize.x, this.domSize.x ) &&
			approxEqual( oldDomSize.y, this.domSize.y )
		) return;

		this._makeGeometry();

	}

	update( delta: number ) {

		this._tween.update( delta );

	}

	dispose() {

		const geometry = this.object.geometry;
		const material = this.object.material as TYPE_ONLY_THREE.ShaderMaterial;

		material.uniforms.map.value.dispose();
		material.dispose();
		geometry.dispose();

	}

	private onEnter() {

		this.active = true;
		this._tween.play();

	}

	private _makeGeometry() {

		const geometry = new THREE.PlaneBufferGeometry(
			this.domSize.width,
			this.domSize.height,
			this.domSize.width,
			this.domSize.height,
		) as TYPE_ONLY_THREE.PlaneBufferGeometry;
		const randArray = ( geometry.attributes.position.array as Float32Array ).map( ( _, i ) => {

			return (
				i === 0 ? Math.random() * this.domSize.width  * 8 - this.domSize.width  * 4 : // x
				i === 1 ? Math.random() * this.domSize.height * 4 - this.domSize.height * 2 : // y
				Math.random() * 300 - 150 // z
			);

		} );

		geometry.setAttribute(
			'random',
			new THREE.BufferAttribute( randArray, geometry.attributes.position.itemSize ) as TYPE_ONLY_THREE.BufferAttribute
		);

		this.object.geometry.dispose();
		this.object.geometry = geometry;
		this.object.geometry.computeBoundingSphere();

	}

}
