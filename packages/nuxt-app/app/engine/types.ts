import type { Card } from "../composables/usePoker";
export type Street="preflop"|"flop"|"turn"|"river"|"showdown";
export type PokerAction={type:"fold"|"check"|"call"|"allIn"}|{type:"raiseTo";amount:number};
export type EnginePlayer={id:number;chips:number;hand:Card[];bet:number;contribution:number;folded:boolean;allIn:boolean;acted:boolean};
export type EngineState={players:EnginePlayer[];deck:Card[];board:Card[];street:Street;dealer:number;smallBlindIndex:number;bigBlindIndex:number;turn:number;smallBlind:number;bigBlind:number;currentBet:number;lastFullRaise:number;pot:number;handNumber:number;winners:number[];log:string[]};
export type LegalActions={fold:boolean;check:boolean;call:number;minRaiseTo:number|null;maxRaiseTo:number;allIn:boolean};
