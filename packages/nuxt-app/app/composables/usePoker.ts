import { applyAction, legalActions, startHand } from "../engine/game";
import type { EngineState, PokerAction } from "../engine/types";
import { decideBot } from "../utils/pokerAi";
import { evaluateBestHand } from "../utils/pokerEvaluator";

export interface Card {
  suit: "hearts" | "diamonds" | "clubs" | "spades";
  rank: string;
  value: number;
}

export interface HandRank { rank: number; name: string; cards: Card[] }
export type Personality = "tight" | "loose" | "aggressive" | "passive" | "tag" | "lag" | "recreational" | "adaptive";
export type Difficulty = "easy" | "normal" | "hard";
export interface PlayerStats { hands: number; vpip: number; pfr: number; betsRaises: number; calls: number; folds: number; showdowns: number; wins: number }
export interface Player {
  id: number; name: string; chips: number; hand: Card[]; bet: number; contribution: number;
  folded: boolean; isDealer: boolean; isCurrentPlayer: boolean; allIn?: boolean; difficulty?: Difficulty;
  handRank?: HandRank; personality?: Personality; hasActed?: boolean; stats: PlayerStats;
}
export type GamePhase = "waiting" | "preflop" | "flop" | "turn" | "river" | "showdown";
export interface HandSnapshot {
  step: number; event: string; phase: GamePhase; board: Card[]; pot: number;
  currentBet: number; currentPlayerIndex: number;
  players: Array<Pick<Player, "id" | "name" | "chips" | "bet" | "folded" | "allIn">>;
}
export interface HandArchive {
  handNumber: number; board: Card[]; events: string[]; winnerNames: string[]; pot: number; snapshots: HandSnapshot[];
}
export interface GameState {
  players: Player[]; communityCards: Card[]; pot: number; currentBet: number; phase: GamePhase;
  dealerIndex: number; currentPlayerIndex: number; deck: Card[]; winner: Player | null;
  smallBlind: number; bigBlind: number; minRaise: number; winners: Player[]; history: string[];
  handSnapshots: HandSnapshot[]; handArchives: HandArchive[]; lastDecision: string; handNumber: number;
  mode: "cash" | "tournament"; paused: boolean; spectator: boolean; actionDelay: number;
  engine: EngineState | null; startingStack: number; tournamentFinished: boolean; ranking: number[]; payouts: Record<number, number>;
}

const createStats = (): PlayerStats => ({ hands: 0, vpip: 0, pfr: 0, betsRaises: 0, calls: 0, folds: 0, showdowns: 0, wins: 0 });
const emptyState = (): GameState => ({
  players: [], communityCards: [], pot: 0, currentBet: 0, phase: "waiting", dealerIndex: 0, currentPlayerIndex: 0, deck: [], winner: null,
  smallBlind: 10, bigBlind: 20, minRaise: 20, winners: [], history: [], handSnapshots: [], handArchives: [], lastDecision: "", handNumber: 0,
  mode: "cash", paused: false, spectator: false, actionDelay: 800, engine: null, startingStack: 1000, tournamentFinished: false, ranking: [], payouts: {},
});

const profiles: Personality[] = ["tag", "lag", "adaptive", "recreational"];

export const usePoker = () => {
  const gameState = useState<GameState>("pokerGame", emptyState);
  const metadata = new Map<number, { name: string; personality?: Personality; difficulty?: Difficulty; stats: PlayerStats }>();

  const ensureMetadata = () => gameState.value.players.forEach(player => metadata.set(player.id, {
    name: player.name,
    personality: player.personality,
    difficulty: player.difficulty,
    stats: player.stats || createStats(),
  }));

  const projectPlayers = (engine: EngineState): Player[] => engine.players.map(enginePlayer => {
    const meta = metadata.get(enginePlayer.id) || {
      name: enginePlayer.id === 0 ? "Você" : `Jogador ${enginePlayer.id + 1}`,
      personality: enginePlayer.id ? "passive" as Personality : undefined,
      difficulty: enginePlayer.id ? "normal" as Difficulty : undefined,
      stats: createStats(),
    };
    return {
      id: enginePlayer.id,
      name: meta.name,
      personality: meta.personality,
      difficulty: meta.difficulty,
      stats: meta.stats,
      chips: enginePlayer.chips,
      hand: enginePlayer.hand,
      bet: enginePlayer.bet,
      contribution: enginePlayer.contribution,
      folded: enginePlayer.folded,
      allIn: enginePlayer.allIn,
      isDealer: enginePlayer.id === engine.dealer,
      isCurrentPlayer: enginePlayer.id === engine.turn && engine.street !== "showdown",
      hasActed: enginePlayer.acted,
      handRank: engine.street === "showdown" && !enginePlayer.folded ? evaluateBestHand([...enginePlayer.hand, ...engine.board]) : undefined,
    };
  });

  const sync = (engine: EngineState, actionLog?: string) => {
    const state = gameState.value;
    ensureMetadata();
    state.engine = engine;
    state.communityCards = [...engine.board];
    state.pot = engine.pot;
    state.currentBet = engine.currentBet;
    state.phase = engine.street;
    state.dealerIndex = engine.dealer;
    state.currentPlayerIndex = engine.turn;
    state.deck = engine.deck;
    state.smallBlind = engine.smallBlind;
    state.bigBlind = engine.bigBlind;
    state.minRaise = engine.lastFullRaise;
    state.handNumber = engine.handNumber;
    state.players = projectPlayers(engine);
    state.winners = engine.winners.map(id => state.players[id]).filter((player): player is Player => Boolean(player));
    state.winner = state.winners[0] || null;
    if (actionLog) state.history.push(actionLog);
  };

  const recordSnapshot = (event: string) => {
    const state = gameState.value;
    state.handSnapshots.push({
      step: state.handSnapshots.length,
      event,
      phase: state.phase,
      board: [...state.communityCards],
      pot: state.pot,
      currentBet: state.currentBet,
      currentPlayerIndex: state.currentPlayerIndex,
      players: state.players.map(player => ({
        id: player.id, name: player.name, chips: player.chips, bet: player.bet, folded: player.folded, allIn: player.allIn,
      })),
    });
  };

  const archiveCurrentHand = () => {
    const state = gameState.value;
    if (state.phase !== "showdown" || state.handArchives.some(hand => hand.handNumber === state.handNumber)) return;
    const pot = state.engine?.players.reduce((total, player) => total + player.contribution, 0) || state.pot;
    state.handArchives.unshift({
      handNumber: state.handNumber,
      board: [...state.communityCards],
      events: [...state.history],
      winnerNames: state.winners.map(player => player.name),
      pot,
      snapshots: structuredClone(state.handSnapshots),
    });
  };

  const initGame = (count = 4, startingChips = 1000) => {
    const state = emptyState();
    state.startingStack = startingChips;
    state.players = Array.from({ length: count }, (_, id): Player => ({
      id, name: id === 0 ? "Você" : `Jogador ${id + 1}`, chips: startingChips, hand: [], bet: 0, contribution: 0,
      folded: false, isDealer: id === 0, isCurrentPlayer: false, personality: id ? profiles[(id - 1) % profiles.length] : undefined, difficulty: id ? "normal" : undefined, stats: createStats(),
    }));
    gameState.value = state;
    metadata.clear();
    ensureMetadata();
  };

  const beginHand = (dealer: number, handNumber: number) => {
    const state = gameState.value;
    if (state.players.filter(player => player.chips > 0).length < 2) return false;
    let smallBlind = state.smallBlind;
    let bigBlind = state.bigBlind;
    if (state.mode === "tournament" && handNumber > 1 && (handNumber - 1) % 5 === 0) {
      smallBlind *= 2;
      bigBlind *= 2;
    }
    state.history = [`Mão ${handNumber} — blinds ${smallBlind}/${bigBlind}`];
    state.handSnapshots = [];
    const engine = startHand(state.players.map(player => player.chips), { dealer, smallBlind, bigBlind, seed: Date.now(), handNumber });
    sync(engine);
    state.players.filter(player => player.chips > 0).forEach(player => player.stats.hands++);
    recordSnapshot(state.history[0]!);
    return true;
  };

  const dealCards = () => beginHand(gameState.value.dealerIndex, gameState.value.handNumber + 1);

  const updateStatsForAction = (actor: Player, action: PokerAction, previousStreet: GamePhase) => {
    if (action.type === "fold") actor.stats.folds++;
    if (action.type === "call") {
      actor.stats.calls++;
      if (previousStreet === "preflop") actor.stats.vpip++;
    }
    if (action.type === "raiseTo" || action.type === "allIn") {
      actor.stats.betsRaises++;
      if (previousStreet === "preflop") {
        actor.stats.pfr++;
        actor.stats.vpip++;
      }
    }
  };

  const perform = (action: PokerAction, label: string) => {
    const state = gameState.value;
    if (!state.engine || state.paused) return;
    const actor = state.players[state.currentPlayerIndex];
    if (!actor) return;
    try {
      const previousStreet = state.phase;
      const next = applyAction(state.engine, action);
      updateStatsForAction(actor, action, previousStreet);
      if (next.street === "showdown" && previousStreet !== "showdown") {
        next.players.filter(player => !player.folded).forEach(player => {
          const meta = metadata.get(player.id);
          if (meta) meta.stats.showdowns++;
        });
      }
      sync(next, `${actor.name}: ${label}`);
      if (next.street === "showdown" && previousStreet !== "showdown") {
        state.winners.forEach(player => player.stats.wins++);
      }
      recordSnapshot(`${actor.name}: ${label}`);
      archiveCurrentHand();
    } catch (error) {
      state.history.push(error instanceof Error ? error.message : "Ação ilegal");
    }
  };

  const fold = () => perform({ type: "fold" }, "fold");
  const check = () => perform({ type: "check" }, "check");
  const call = () => {
    const amount = gameState.value.engine ? legalActions(gameState.value.engine).call : 0;
    perform({ type: "call" }, `call ${amount}`);
  };
  const raise = (increment: number) => {
    const engine = gameState.value.engine;
    if (engine) perform({ type: "raiseTo", amount: engine.currentBet + increment }, `raise ${engine.currentBet + increment}`);
  };
  const allIn = () => perform({ type: "allIn" }, "all-in");

  const getLegalActions = () => gameState.value.engine
    ? legalActions(gameState.value.engine)
    : { fold: false, check: false, call: 0, minRaiseTo: null, maxRaiseTo: 0, allIn: false };

  const rebuy = (playerId: number, amount = gameState.value.startingStack) => {
    const state = gameState.value;
    const player = state.players[playerId];
    if (state.mode !== "cash" || state.phase !== "showdown" || !player || amount <= 0) return;
    player.chips += amount;
    ensureMetadata();
    state.history.push(`${player.name}: recompra ${amount}`);
  };

  const configurePlayer = (id: number, changes: Partial<Pick<Player, "name" | "personality" | "difficulty" | "chips">>) => {
    const state = gameState.value;
    const player = state.players[id];
    if (!player || state.phase !== "waiting") return;
    Object.assign(player, changes);
    ensureMetadata();
  };

  const cashOut = (playerId: number) => {
    const state = gameState.value;
    const player = state.players[playerId];
    if (state.mode !== "cash" || state.phase !== "showdown" || !player) return;
    player.chips = 0;
    ensureMetadata();
    state.history.push(`${player.name}: saiu da mesa`);
  };

  const finishTournament = () => {
    const state = gameState.value;
    state.tournamentFinished = true;
    state.ranking = [...state.players].sort((a, b) => b.chips - a.chips).map(player => player.id);
    const total = state.players.reduce((sum, player) => sum + player.chips, 0);
    const shares = [0.5, 0.3, 0.2];
    state.payouts = Object.fromEntries(state.ranking.slice(0, 3).map((id, index) => [id, Math.floor(total * shares[index]!)]));
  };

  const newRound = () => {
    const state = gameState.value;
    archiveCurrentHand();
    if (state.players.filter(player => player.chips > 0).length < 2) {
      if (state.mode === "tournament") finishTournament();
      return;
    }
    let dealer = state.dealerIndex;
    do dealer = (dealer + 1) % state.players.length;
    while (!state.players[dealer]?.chips);
    beginHand(dealer, state.handNumber + 1);
  };

  const aiAction = () => {
    const state = gameState.value;
    const player = state.players[state.currentPlayerIndex];
    if (!player || !state.engine || state.paused || (player.id === 0 && !state.spectator)) return;
    const rivals = state.players.filter(rival => !rival.folded && rival.id !== player.id);
    const average = rivals.reduce<PlayerStats>((aggregate, rival) => ({
      hands: aggregate.hands + rival.stats.hands, vpip: aggregate.vpip + rival.stats.vpip, pfr: aggregate.pfr + rival.stats.pfr,
      betsRaises: aggregate.betsRaises + rival.stats.betsRaises, calls: aggregate.calls + rival.stats.calls,
      folds: aggregate.folds + rival.stats.folds, showdowns: aggregate.showdowns + rival.stats.showdowns, wins: aggregate.wins + rival.stats.wins,
    }), createStats());
    const decision = decideBot(player, {
      board: state.communityCards, pot: state.pot, currentBet: state.currentBet, opponents: rivals.length, bigBlind: state.bigBlind,
      position: player.id, tableSize: state.players.length, averageOpponent: average, mode: state.mode,
      playersRemaining: state.players.filter(rival => rival.chips > 0).length, initialPlayers: state.players.length,
    });
    state.lastDecision = `${player.name} (${decision.profile}): ${decision.reasons.join(" · ")} → ${decision.action}`;
    const legal = legalActions(state.engine);
    if (decision.action === "fold") fold();
    else if (decision.action === "check") {
      if (legal.check) check();
      else if (legal.call) call();
      else fold();
    } else if (decision.action === "call") {
      if (legal.call) call();
      else if (legal.check) check();
      else fold();
    } else if (decision.action === "allIn") {
      if (legal.allIn) allIn();
      else if (legal.call) call();
      else if (legal.check) check();
      else fold();
    } else if (legal.minRaiseTo !== null) {
      raise(Math.min(
        legal.maxRaiseTo - state.currentBet,
        Math.max(legal.minRaiseTo - state.currentBet, decision.raiseBy),
      ));
    } else if (legal.call) {
      call();
    } else if (legal.check) {
      check();
    } else {
      fold();
    }
  };

  return { gameState, initGame, dealCards, fold, call, raise, check, allIn, newRound, aiAction, rebuy, configurePlayer, cashOut, archiveCurrentHand, finishTournament, getLegalActions, evaluateHand: (hand: Card[], board: Card[]) => evaluateBestHand([...hand, ...board]) };
};
