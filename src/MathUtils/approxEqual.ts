const EPSILON = 1e-5;

export function approxEqual( a: number, b: number ) {

	return Math.abs( a - b ) < EPSILON;

}
