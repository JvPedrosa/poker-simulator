import type { Card, Personality, Player, PlayerStats } from "../composables/usePoker";
import { compareScores, evaluateBestHand } from "./pokerEvaluator";

const suits: Card["suit"][] = ["hearts", "diamonds", "clubs", "spades"];
const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const key = (card: Card) => `${card.value}-${card.suit}`;

export interface AiContext {
  board: Card[];
  pot: number;
  currentBet: number;
  opponents: number;
  bigBlind: number;
  position: number;
  tableSize: number;
  averageOpponent?: Partial<PlayerStats>;
  mode?: "cash" | "tournament";
  playersRemaining?: number;
  initialPlayers?: number;
  rng?: () => number;
}

type Profile = { range: number; aggression: number; bluff: number; potFraction: number; risk: number };

const profiles: Record<Personality, Profile> = {
  tight: { range: 0.2, aggression: 0.35, bluff: 0.03, potFraction: 0.55, risk: 0.3 },
  loose: { range: 0.48, aggression: 0.45, bluff: 0.12, potFraction: 0.6, risk: 0.65 },
  aggressive: { range: 0.36, aggression: 0.8, bluff: 0.16, potFraction: 0.75, risk: 0.65 },
  passive: { range: 0.4, aggression: 0.2, bluff: 0.02, potFraction: 0.4, risk: 0.45 },
  tag: { range: 0.24, aggression: 0.7, bluff: 0.08, potFraction: 0.65, risk: 0.42 },
  lag: { range: 0.52, aggression: 0.85, bluff: 0.2, potFraction: 0.8, risk: 0.75 },
  recreational: { range: 0.6, aggression: 0.3, bluff: 0.1, potFraction: 0.5, risk: 0.8 },
  adaptive: { range: 0.34, aggression: 0.55, bluff: 0.09, potFraction: 0.62, risk: 0.5 },
};

const difficulty = {
  easy: { iterations: 120, noise: 0.14 },
  normal: { iterations: 360, noise: 0.045 },
  hard: { iterations: 700, noise: 0.015 },
} as const;

function preflopStrength(first: Card, second: Card) {
  const high = Math.max(first.value, second.value) / 14;
  const low = Math.min(first.value, second.value) / 14;
  const pair = first.value === second.value ? 0.42 + high * 0.45 : 0;
  const suited = first.suit === second.suit ? 0.08 : 0;
  const connected = Math.abs(first.value - second.value) <= 2 ? 0.08 : 0;
  return Math.min(1, pair || high * 0.62 + low * 0.2 + suited + connected);
}

function drawWeightedHoleCards(pool: Card[], range: number, rng: () => number) {
  const threshold = Math.max(0, 1 - range * 1.15);
  const candidates: Array<{ first: number; second: number; weight: number }> = [];
  let totalWeight = 0;
  for (let first = 0; first < pool.length - 1; first++) {
    for (let second = first + 1; second < pool.length; second++) {
      const strength = preflopStrength(pool[first]!, pool[second]!);
      const inclusion = 1 / (1 + Math.exp(-(strength - threshold) * 18));
      const weight = 0.001 + inclusion;
      totalWeight += weight;
      candidates.push({ first, second, weight });
    }
  }
  let target = rng() * totalWeight;
  const selected = candidates.find(candidate => (target -= candidate.weight) <= 0) || candidates[candidates.length - 1]!;
  const second = pool.splice(selected.second, 1)[0]!;
  const first = pool.splice(selected.first, 1)[0]!;
  return [first, second] as [Card, Card];
}

export function estimateEquity(hand: Card[], board: Card[], opponents: number, iterations = 350, rng = Math.random, opponentRange = 0.38) {
  const known = new Set([...hand, ...board].map(key));
  const deck = suits
    .flatMap(suit => ranks.map((rank, index) => ({ suit, rank, value: index + 2 })))
    .filter(card => !known.has(key(card)));
  let wins = 0;

  for (let run = 0; run < iterations; run++) {
    const pool = [...deck];
    for (let index = pool.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(rng() * (index + 1));
      [pool[index], pool[swapIndex]] = [pool[swapIndex]!, pool[index]!];
    }

    const opponentHands = Array.from({ length: opponents }, () => drawWeightedHoleCards(pool, opponentRange, rng));
    const fullBoard = [...board, ...pool.splice(0, 5 - board.length)];
    const hero = evaluateBestHand([...hand, ...fullBoard]);
    let share = 1;
    let ties = 1;
    for (const opponentHand of opponentHands) {
      const comparison = compareScores(hero.score, evaluateBestHand([...opponentHand, ...fullBoard]).score);
      if (comparison < 0) {
        share = 0;
        break;
      }
      if (comparison === 0) ties++;
    }
    wins += share / ties;
  }
  return wins / iterations;
}

const observed = (value?: number, hands?: number) => (hands && value !== undefined ? value / hands : 0);

export function estimateOpponentRange(stats?: Partial<PlayerStats>) {
  if (!stats) return 0.38;
  const vpip = observed(stats.vpip, stats.hands);
  const pfr = observed(stats.pfr, stats.hands);
  const aggression = (stats.betsRaises || 0) / Math.max(1, stats.calls || 0);
  return Math.min(0.8, Math.max(0.12, vpip || 0.38) + (pfr > 0.25 ? 0.05 : 0) + (aggression > 2 ? 0.04 : 0));
}

export function decideBot(player: Player, context: AiContext) {
  const rng = context.rng || Math.random;
  const profile = profiles[player.personality || "passive"];
  const level = difficulty[player.difficulty || "normal"];
  const opponentRange = estimateOpponentRange(context.averageOpponent);
  const latePosition = context.position / Math.max(1, context.tableSize - 1);
  const equity = estimateEquity(player.hand, context.board, context.opponents, context.board.length ? level.iterations + 80 : level.iterations, rng, opponentRange);
  const call = Math.max(0, context.currentBet - player.bet);
  const potOdds = call / (context.pot + call || 1);
  const spr = player.chips / Math.max(context.pot, context.bigBlind);
  const impliedOdds = Math.min(0.08, Math.max(0, (player.chips - call) / Math.max(context.pot, 1) * 0.012));
  const blindPressure = Math.min(0.12, context.bigBlind / Math.max(player.chips, 1) * 2);
  const bubblePressure = context.mode === "tournament" && context.playersRemaining && context.initialPlayers
    ? Math.max(0, (context.initialPlayers - context.playersRemaining) / context.initialPlayers) * 0.08
    : 0;
  const foldRate = observed(context.averageOpponent?.folds, context.averageOpponent?.hands);
  const adaptiveAdjustment = player.personality === "adaptive" ? (foldRate - 0.35) * 0.16 : 0;
  const adjustedEquity = equity + (latePosition - 0.5) * 0.06 + (profile.range - 0.35) * 0.12 + impliedOdds - blindPressure - bubblePressure + adaptiveAdjustment + (rng() - 0.5) * level.noise;
  const edge = adjustedEquity - potOdds;
  const bluffChance = profile.bluff * (0.6 + latePosition) * (foldRate > 0.45 ? 1.4 : 1);
  const canRaise = player.chips > call + context.bigBlind;
  let action: "fold" | "check" | "call" | "raise" | "allIn" = call ? "call" : "check";

  if (call && edge < -(0.05 + profile.risk * 0.06)) action = "fold";
  else if (canRaise && (edge > 0.2 + (1 - profile.aggression) * 0.18 || rng() < bluffChance)) action = "raise";
  else if (call >= player.chips) action = edge > -(spr < 1.5 ? 0.02 : 0.08) ? "allIn" : "fold";
  else if (!call && adjustedEquity > 0.58 && canRaise) action = "raise";

  const raiseBy = Math.min(Math.max(0, player.chips - call), Math.max(context.bigBlind, Math.round(context.pot * profile.potFraction / context.bigBlind) * context.bigBlind));
  return {
    action, raiseBy, equity, potOdds, impliedOdds, spr, opponentRange, blindPressure, bubblePressure,
    profile: player.personality || "passive", difficulty: player.difficulty || "normal",
    reasons: [
      `equity ${(equity * 100).toFixed(0)}% vs pot odds ${(potOdds * 100).toFixed(0)}%`,
      `SPR ${spr.toFixed(1)}`,
      `range rival ponderado ${(opponentRange * 100).toFixed(0)}%`,
      latePosition > 0.6 ? "posição final" : "posição inicial/média",
      bubblePressure ? "pressão de eliminação" : "sem pressão de eliminação",
      `dificuldade ${player.difficulty || "normal"}`,
    ],
  };
}
