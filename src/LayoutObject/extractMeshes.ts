import * as TYPE_ONLY_THREE from 'three/src/Three.d';

export function extractMeshes( object: TYPE_ONLY_THREE.Object3D ) {

	const meshes: TYPE_ONLY_THREE.Mesh[] = [];

	object.traverse( ( node ) => {

		const mesh = node as TYPE_ONLY_THREE.Mesh;

		if ( mesh.geometry ) {

			mesh.geometry.computeBoundingSphere();
			meshes.push( mesh );

		}

	} );

	return meshes;

}
