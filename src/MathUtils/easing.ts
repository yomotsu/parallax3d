const PI_HALF  = Math.PI / 2;

export function elasticOut( t: number ) {

	return Math.sin( - 13.0 * ( t + 1.0 ) * PI_HALF ) * Math.pow( 2.0, - 10.0 * t ) + 1.0;

}

export function exponentialIn( t: number ) {

	return t === 0.0 ? t : Math.pow( 2.0, 10.0 * ( t - 1.0 ) );

}

export function exponentialOut( t: number ) {

	return t === 1.0 ? t : 1.0 - Math.pow( 2.0, - 10.0 * t );

}

export function exponentialInOut( t: number ) {

	return t === 0.0 || t === 1.0
		? t
		: t < 0.5
			? + 0.5 * Math.pow( 2.0, ( 20.0 * t ) - 10.0 )
			: - 0.5 * Math.pow( 2.0, 10.0 - ( t * 20.0 ) ) + 1.0;

}

export function easeInOutBack( t: number ): number {

	const f = t < 0.5 ? 2 * t : 1 - ( 2 * t - 1 );
	const g = Math.pow( f, 3 ) - f * Math.sin( f * Math.PI );

	return t < 0.5 ? 0.5 * g : 0.5 * ( 1 - g ) + 0.5;

}
