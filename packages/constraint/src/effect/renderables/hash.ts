export function hash(val: number): number {
    const value = Math.sin( val ) * 43758.5453123;
    return value - Math.floor( value );
}
