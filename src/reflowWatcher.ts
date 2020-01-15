import { throttle } from 'utils/throttle';
import { EventDispatcher } from './EventDispatcher';

export const reflowWatcher = new EventDispatcher();
const onLoadListeners = new WeakMap();
const onElementLoad = () => reflowWatcher.dispatchEvent( { type: 'reflow' } );

const callback = ( mutationsList: MutationRecord[], /* observe: MutationObserver */ ) => {

	for ( let mutation of mutationsList ) {

		if ( mutation.type === 'childList' ) {

			const isNodesAdded   = mutation.addedNodes.length   >= 1;
			const isNodesRemoved = mutation.removedNodes.length >= 1;

			if ( isNodesRemoved ) {

				reflowWatcher.dispatchEvent( { type: 'reflow' } );
				mutation.addedNodes.forEach( ( $node ) => {

					const onElementLoad = onLoadListeners.get( $node );
					onElementLoad && $node.removeEventListener( 'load', onElementLoad );

				} );

			}

			if ( isNodesAdded ) {

				reflowWatcher.dispatchEvent( { type: 'reflow' } );

				mutation.addedNodes.forEach( ( $node ) => {

					const isAsyncNode = $node.nodeName === 'IMG';

					if ( isAsyncNode ) {

						onLoadListeners.set( $node, onElementLoad );
						$node.addEventListener( 'load', onElementLoad );

					}

				} );

			}

		}

		// Watching `mutation.type === 'attributes'` then change the canvas size
		// causes an infinity loop.
		// DO NOT do this until found the solution.

		// else if ( mutation.type === 'attributes' ) {

		// 	reflowWatcher.dispatchEvent( { type: 'reflow' } );

		// }

	}

};

const observer = new MutationObserver( callback );
observer.observe(
	document.body,
	{
		// attributes: true,
		childList: true,
		characterData: true,
		subtree: true,
		// attributeFilter: [ 'class', 'style', 'width', 'height', 'src' ],
	}
);

Array.prototype.forEach.call(
	document.querySelectorAll( 'img' ),
	( $img ) => {

		const isLoaded = $img.naturalWidth !== 0;

		if ( isLoaded ) return;

		onLoadListeners.set( $img, onElementLoad );
		$img.addEventListener( 'load', onElementLoad );

	}
);

const throttled = throttle( () => reflowWatcher.dispatchEvent( { type: 'reflow' } ), 200 );
window.addEventListener( 'resize', throttled );

window.addEventListener( 'scroll', () => reflowWatcher.dispatchEvent( { type: 'scroll' } ) );
