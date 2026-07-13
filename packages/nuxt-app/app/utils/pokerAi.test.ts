import { describe, expect, it } from "vitest";
import { decideBot, estimateEquity, estimateOpponentRange } from "./pokerAi";
import { seededRng } from "../engine/random";
import type { Card, Personality, Player } from "../composables/usePoker";

const c = (value: number, suit: Card["suit"]): Card => ({ value, suit, rank: String(value) });
const stats = { hands: 100, vpip: 25, pfr: 18, betsRaises: 30, calls: 15, folds: 45, showdowns: 20, wins: 10 };
const player = (personality: Personality, hand = [c(14, "spades"), c(14, "hearts")]): Player => ({ id: 1, name: "Bot", chips: 1000, hand, bet: 0, folded: false, isDealer: false, isCurrentPlayer: true, personality, contribution: 0, stats });
const context = { board: [] as Card[], pot: 30, currentBet: 20, opponents: 2, bigBlind: 20, position: 2, tableSize: 3, averageOpponent: stats, mode: "cash" as const, playersRemaining: 3, initialPlayers: 3 };

describe("IA estratégica", () => {
  it("produz decisão reproduzível quando recebe RNG com seed", () => {
    expect(decideBot(player("tag"), { ...context, rng: seededRng(42) })).toEqual(decideBot(player("tag"), { ...context, rng: seededRng(42) }));
  });

  it("estima ranges mais largos para jogadores loose observados", () => {
    expect(estimateOpponentRange({ ...stats, vpip: 60, pfr: 35 })).toBeGreaterThan(estimateOpponentRange({ ...stats, vpip: 18, pfr: 12 }));
  });

  it("pondera a equity por range, sem precisar conhecer cartas rivais", () => {
    const hand = [c(14, "spades"), c(9, "hearts")];
    const versusTight = estimateEquity(hand, [], 1, 300, seededRng(8), 0.18);
    const versusLoose = estimateEquity(hand, [], 1, 300, seededRng(8), 0.6);
    expect(versusTight).toBeLessThan(versusLoose);
  });

  it("expõe métricas explicáveis sem cartas ocultas", () => {
    const d = decideBot({ ...player("adaptive"), difficulty: "hard" }, { ...context, rng: seededRng(9) });
    expect(d.equity).toBeGreaterThan(0);
    expect(d.spr).toBeGreaterThan(0);
    expect(d.reasons.some(x => x.includes("range rival"))).toBe(true);
    expect(d.reasons.some(x => x.includes("dificuldade hard"))).toBe(true);
  });
});
