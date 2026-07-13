import { createDeck } from "./deck";
import { seededRng } from "./random";
import type {
  EnginePlayer,
  EngineState,
  LegalActions,
  PokerAction,
  Street,
} from "./types";
import { distributePots, settlePots } from "../utils/pots";

const live = (player: EnginePlayer) => !player.folded && !player.allIn;

function nextEligible(
  players: EnginePlayer[],
  from: number,
  predicate = (player: EnginePlayer) => player.chips > 0 && !player.folded,
) {
  for (let offset = 1; offset <= players.length; offset++) {
    const index = ((from + offset) % players.length + players.length) % players.length;
    if (predicate(players[index]!)) return index;
  }

  return ((from % players.length) + players.length) % players.length;
}

function take(player: EnginePlayer, amount: number) {
  const paid = Math.min(amount, player.chips);
  player.chips -= paid;
  player.bet += paid;
  player.contribution += paid;
  player.allIn = player.chips === 0;
  return paid;
}

export function startHand(
  stacks: number[],
  options: {
    dealer?: number;
    smallBlind?: number;
    bigBlind?: number;
    seed?: number;
    handNumber?: number;
  } = {},
): EngineState {
  if (stacks.filter((stack) => stack > 0).length < 2) {
    throw new Error("São necessários dois jogadores com fichas");
  }

  const players = stacks.map((chips, id) => ({
    id,
    chips,
    hand: [],
    bet: 0,
    contribution: 0,
    folded: chips === 0,
    allIn: false,
    acted: false,
  }));
  const requestedDealer = options.dealer ?? 0;
  const dealer = players[requestedDealer]?.chips
    ? requestedDealer
    : nextEligible(players, requestedDealer);
  const headsUp = players.filter((player) => player.chips > 0).length === 2;
  const smallBlindIndex = headsUp ? dealer : nextEligible(players, dealer);
  const bigBlindIndex = nextEligible(players, smallBlindIndex);
  const smallBlind = options.smallBlind ?? 10;
  const bigBlind = options.bigBlind ?? 20;
  const deck = createDeck(seededRng(options.seed ?? Date.now()));

  for (let round = 0; round < 2; round++) {
    for (const player of players.filter((candidate) => candidate.chips > 0)) {
      player.hand.push(deck.pop()!);
    }
  }

  take(players[smallBlindIndex]!, smallBlind);
  take(players[bigBlindIndex]!, bigBlind);

  return {
    players,
    deck,
    board: [],
    street: "preflop",
    dealer,
    smallBlindIndex,
    bigBlindIndex,
    turn: headsUp ? smallBlindIndex : nextEligible(players, bigBlindIndex, live),
    smallBlind,
    bigBlind,
    currentBet: players[bigBlindIndex]!.bet,
    lastFullRaise: bigBlind,
    pot: players.reduce((sum, player) => sum + player.contribution, 0),
    handNumber: options.handNumber ?? 1,
    winners: [],
    log: [`Blinds ${smallBlind}/${bigBlind}`],
  };
}

export function legalActions(state: EngineState, id = state.turn): LegalActions {
  const player = state.players[id];
  if (!player || id !== state.turn || state.street === "showdown" || !live(player)) {
    return {
      fold: false,
      check: false,
      call: 0,
      minRaiseTo: null,
      maxRaiseTo: 0,
      allIn: false,
    };
  }

  const call = Math.min(player.chips, Math.max(0, state.currentBet - player.bet));
  const maxRaiseTo = player.bet + player.chips;
  const minRaiseTo = state.currentBet + state.lastFullRaise;
  // `acted` is reset only after a full raise. A player who has already acted
  // may call a short all-in, but that incomplete raise cannot reopen betting.
  const canRaise = !player.acted;

  return {
    fold: true,
    check: call === 0,
    call,
    minRaiseTo: canRaise && maxRaiseTo >= minRaiseTo ? minRaiseTo : null,
    maxRaiseTo,
    allIn: player.chips > 0 && (canRaise || maxRaiseTo <= state.currentBet),
  };
}

function roundComplete(state: EngineState) {
  return state.players
    .filter(live)
    .every((player) => player.acted && player.bet === state.currentBet);
}

function settle(state: EngineState) {
  state.street = "showdown";
  const awards = settlePots(state.players, state.board, state.dealer);
  distributePots(state.players, awards);
  state.winners = [...new Set(awards.flatMap((pot) => pot.winnerIds))];
  state.log.push(
    ...awards.map((pot, index) => `Pote ${index + 1} (${pot.amount}): ${pot.winnerIds.join(",")}`),
  );
}

function advance(state: EngineState) {
  const contenders = state.players.filter((player) => !player.folded);
  if (contenders.length === 1) {
    const winner = contenders[0]!;
    winner.chips += state.pot;
    state.winners = [winner.id];
    state.street = "showdown";
    state.log.push(`Vitória por fold: ${winner.id}`);
    return;
  }

  state.players.forEach((player) => {
    player.bet = 0;
    player.acted = false;
  });
  state.currentBet = 0;
  state.lastFullRaise = state.bigBlind;

  if (state.street === "river") {
    settle(state);
    return;
  }

  const cardsToDeal = state.street === "preflop" ? 3 : 1;
  for (let index = 0; index < cardsToDeal; index++) {
    state.board.push(state.deck.pop()!);
  }

  state.street = ({
    preflop: "flop",
    flop: "turn",
    turn: "river",
  } as Record<string, Street>)[state.street]!;

  const capablePlayers = state.players.filter(live);
  if (capablePlayers.length < 2) {
    advance(state);
    return;
  }

  state.turn = nextEligible(state.players, state.dealer, live);
  state.log.push(state.street);
}

export function applyAction(input: EngineState, action: PokerAction): EngineState {
  const state = structuredClone(input);
  const player = state.players[state.turn]!;
  const legal = legalActions(state);
  const contributionBeforeAction = player.contribution;

  if (!legal.fold) throw new Error("Jogador não pode agir");

  if (action.type === "fold") {
    player.folded = true;
    state.log.push(`${player.id}: fold`);
  } else if (action.type === "check") {
    if (!legal.check) throw new Error("Check ilegal");
    state.log.push(`${player.id}: check`);
  } else if (action.type === "call") {
    if (!legal.call) throw new Error("Call ilegal");
    take(player, legal.call);
    state.log.push(`${player.id}: call`);
  } else if (action.type === "raiseTo") {
    if (action.amount > legal.maxRaiseTo || action.amount < (legal.minRaiseTo ?? Infinity)) {
      throw new Error("Raise ilegal");
    }

    const previousBet = state.currentBet;
    take(player, action.amount - player.bet);
    state.currentBet = player.bet;
    state.lastFullRaise = state.currentBet - previousBet;
    state.players
      .filter((candidate) => candidate.id !== player.id && live(candidate))
      .forEach((candidate) => {
        candidate.acted = false;
      });
    state.log.push(`${player.id}: raise ${action.amount}`);
  } else {
    if (!legal.allIn) throw new Error("All-in ilegal");

    const previousBet = state.currentBet;
    take(player, player.chips);
    if (player.bet > state.currentBet) {
      const increment = player.bet - state.currentBet;
      state.currentBet = player.bet;
      if (increment >= state.lastFullRaise) {
        state.lastFullRaise = increment;
        state.players
          .filter((candidate) => candidate.id !== player.id && live(candidate))
          .forEach((candidate) => {
            candidate.acted = false;
          });
      }
    }
    state.log.push(`${player.id}: all-in`);
  }

  state.pot += player.contribution - contributionBeforeAction;
  player.acted = true;

  if (state.players.filter((candidate) => !candidate.folded).length === 1 || roundComplete(state)) {
    advance(state);
  } else {
    state.turn = nextEligible(state.players, player.id, live);
  }

  return state;
}
