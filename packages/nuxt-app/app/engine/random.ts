export type Rng=()=>number;export function seededRng(seed:number):Rng{let x=seed>>>0;return()=>((x=(Math.imul(x,1664525)+1013904223)>>>0)/4294967296)}
