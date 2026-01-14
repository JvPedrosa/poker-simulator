// Types
export interface Card {
  suit: "hearts" | "diamonds" | "clubs" | "spades";
  rank: string;
  value: number;
}

export interface Player {
  id: number;
  name: string;
  chips: number;
  hand: Card[];
  bet: number;
  folded: boolean;
  isDealer: boolean;
  isCurrentPlayer: boolean;
  handRank?: HandRank;
  personality?: "tight" | "loose" | "aggressive" | "passive";
}

export interface HandRank {
  rank: number;
  name: string;
  cards: Card[];
}

export type GamePhase =
  | "waiting"
  | "preflop"
  | "flop"
  | "turn"
  | "river"
  | "showdown";

export interface GameState {
  players: Player[];
  communityCards: Card[];
  pot: number;
  currentBet: number;
  phase: GamePhase;
  dealerIndex: number;
  currentPlayerIndex: number;
  deck: Card[];
  winner: Player | null;
  smallBlind: number;
  bigBlind: number;
}

const SUITS: Card["suit"][] = ["hearts", "diamonds", "clubs", "spades"];
const RANKS = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
];

export const usePoker = () => {
  const gameState = useState<GameState>("pokerGame", () => ({
    players: [],
    communityCards: [],
    pot: 0,
    currentBet: 0,
    phase: "waiting",
    dealerIndex: 0,
    currentPlayerIndex: 0,
    deck: [],
    winner: null,
    smallBlind: 10,
    bigBlind: 20,
  }));

  // Create a new deck
  const createDeck = (): Card[] => {
    const deck: Card[] = [];
    for (const suit of SUITS) {
      for (let i = 0; i < RANKS.length; i++) {
        const rank = RANKS[i];
        if (rank) {
          deck.push({
            suit,
            rank,
            value: i + 2,
          });
        }
      }
    }
    return shuffleDeck(deck);
  };

  // Shuffle deck using Fisher-Yates algorithm
  const shuffleDeck = (deck: Card[]): Card[] => {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i];
      const swapCard = shuffled[j];
      if (temp && swapCard) {
        shuffled[i] = swapCard;
        shuffled[j] = temp;
      }
    }
    return shuffled;
  };

  // Initialize game with players
  const initGame = (playerCount: number = 4, startingChips: number = 1000) => {
    const players: Player[] = [];
    const personalities: Array<"tight" | "loose" | "aggressive" | "passive"> = [
      "tight",
      "loose",
      "aggressive",
      "passive"
    ];
    
    for (let i = 0; i < playerCount; i++) {
      players.push({
        id: i,
        name: i === 0 ? "Você" : `Jogador ${i + 1}`,
        chips: startingChips,
        hand: [],
        bet: 0,
        folded: false,
        isDealer: i === 0,
        isCurrentPlayer: false,
        personality: i === 0 ? undefined : personalities[i % 4],
      });
    }

    gameState.value = {
      players,
      communityCards: [],
      pot: 0,
      currentBet: 0,
      phase: "waiting",
      dealerIndex: 0,
      currentPlayerIndex: 0,
      deck: createDeck(),
      winner: null,
      smallBlind: 10,
      bigBlind: 20,
    };
  };

  // Deal cards to players
  const dealCards = () => {
    const state = gameState.value;
    state.deck = createDeck();
    state.communityCards = [];
    state.pot = 0;
    state.currentBet = state.bigBlind;
    state.winner = null;

    // Reset players
    state.players.forEach((player, index) => {
      player.hand = [];
      player.bet = 0;
      player.folded = false;
      player.isDealer = index === state.dealerIndex;
      player.isCurrentPlayer = false;
      player.handRank = undefined;
    });

    // Deal 2 cards to each player
    for (let i = 0; i < 2; i++) {
      for (const player of state.players) {
        if (state.deck.length > 0) {
          player.hand.push(state.deck.pop()!);
        }
      }
    }

    // Post blinds
    const smallBlindIndex = (state.dealerIndex + 1) % state.players.length;
    const bigBlindIndex = (state.dealerIndex + 2) % state.players.length;

    const smallBlindPlayer = state.players[smallBlindIndex];
    const bigBlindPlayer = state.players[bigBlindIndex];

    if (smallBlindPlayer) {
      smallBlindPlayer.chips -= state.smallBlind;
      smallBlindPlayer.bet = state.smallBlind;
      state.pot += state.smallBlind;
    }

    if (bigBlindPlayer) {
      bigBlindPlayer.chips -= state.bigBlind;
      bigBlindPlayer.bet = state.bigBlind;
      state.pot += state.bigBlind;
    }

    // Set current player (after big blind)
    state.currentPlayerIndex = (bigBlindIndex + 1) % state.players.length;
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (currentPlayer) {
      currentPlayer.isCurrentPlayer = true;
    }
    state.phase = "preflop";
  };

  // Get next active player
  const getNextActivePlayer = (currentIndex: number): number => {
    const state = gameState.value;
    let nextIndex = (currentIndex + 1) % state.players.length;
    let attempts = 0;

    while (attempts < state.players.length) {
      const nextPlayer = state.players[nextIndex];
      if (nextPlayer && !nextPlayer.folded) {
        break;
      }
      nextIndex = (nextIndex + 1) % state.players.length;
      attempts++;
    }

    return nextIndex;
  };

  // Check if betting round is complete
  const isBettingRoundComplete = (): boolean => {
    const state = gameState.value;
    const activePlayers = state.players.filter((p) => !p.folded);

    if (activePlayers.length === 1) return true;

    // All active players must have same bet and have acted
    return activePlayers.every((p) => p.bet === state.currentBet);
  };

  // Move to next phase
  const nextPhase = () => {
    const state = gameState.value;

    // Reset bets for new round
    state.players.forEach((p) => (p.bet = 0));
    state.currentBet = 0;

    switch (state.phase) {
      case "preflop":
        // Deal flop (3 cards)
        for (let i = 0; i < 3; i++) {
          if (state.deck.length > 0) {
            state.communityCards.push(state.deck.pop()!);
          }
        }
        state.phase = "flop";
        break;
      case "flop":
        // Deal turn (1 card)
        if (state.deck.length > 0) {
          state.communityCards.push(state.deck.pop()!);
        }
        state.phase = "turn";
        break;
      case "turn":
        // Deal river (1 card)
        if (state.deck.length > 0) {
          state.communityCards.push(state.deck.pop()!);
        }
        state.phase = "river";
        break;
      case "river":
        state.phase = "showdown";
        determineWinner();
        return;
    }

    // Set first active player after dealer
    state.currentPlayerIndex = getNextActivePlayer(state.dealerIndex);
    state.players.forEach((p) => (p.isCurrentPlayer = false));
    const nextPlayer = state.players[state.currentPlayerIndex];
    if (nextPlayer) {
      nextPlayer.isCurrentPlayer = true;
    }
  };

  // Player actions
  const fold = () => {
    const state = gameState.value;
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer) return;
    
    currentPlayer.folded = true;
    currentPlayer.isCurrentPlayer = false;

    // Check if only one player remains
    const activePlayers = state.players.filter((p) => !p.folded);
    if (activePlayers.length === 1) {
      const winner = activePlayers[0];
      if (winner) {
        state.winner = winner;
        winner.chips += state.pot;
      }
      state.phase = "showdown";
      return;
    }

    moveToNextPlayer();
  };

  const call = () => {
    const state = gameState.value;
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer) return;
    
    const callAmount = state.currentBet - currentPlayer.bet;

    if (callAmount > 0) {
      const actualCall = Math.min(callAmount, currentPlayer.chips);
      currentPlayer.chips -= actualCall;
      currentPlayer.bet += actualCall;
      state.pot += actualCall;
    }

    currentPlayer.isCurrentPlayer = false;
    moveToNextPlayer();
  };

  const raise = (amount: number) => {
    const state = gameState.value;
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer) return;
    
    const totalBet = state.currentBet + amount;
    const toCall = totalBet - currentPlayer.bet;

    if (toCall <= currentPlayer.chips) {
      currentPlayer.chips -= toCall;
      currentPlayer.bet = totalBet;
      state.pot += toCall;
      state.currentBet = totalBet;
    }

    currentPlayer.isCurrentPlayer = false;
    moveToNextPlayer();
  };

  const check = () => {
    const state = gameState.value;
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer) return;

    if (currentPlayer.bet === state.currentBet) {
      currentPlayer.isCurrentPlayer = false;
      moveToNextPlayer();
    }
  };

  const allIn = () => {
    const state = gameState.value;
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer) return;
    
    const allInAmount = currentPlayer.chips;

    state.pot += allInAmount;
    currentPlayer.bet += allInAmount;
    currentPlayer.chips = 0;

    if (currentPlayer.bet > state.currentBet) {
      state.currentBet = currentPlayer.bet;
    }

    currentPlayer.isCurrentPlayer = false;
    moveToNextPlayer();
  };

  const moveToNextPlayer = () => {
    const state = gameState.value;

    // Check if round is complete
    const activePlayers = state.players.filter((p) => !p.folded);
    const allBetsEqual = activePlayers.every(
      (p) => p.bet === state.currentBet || p.chips === 0
    );

    // Check if we've gone around the table
    const nextIndex = getNextActivePlayer(state.currentPlayerIndex);

    if (allBetsEqual && nextIndex <= state.currentPlayerIndex) {
      nextPhase();
      return;
    }

    state.currentPlayerIndex = nextIndex;
    const nextPlayer = state.players[nextIndex];
    if (nextPlayer) {
      nextPlayer.isCurrentPlayer = true;
    }
  };

  // Evaluate hand rank
  const evaluateHand = (hand: Card[], communityCards: Card[]): HandRank => {
    const allCards = [...hand, ...communityCards];

    // Sort by value descending
    allCards.sort((a, b) => b.value - a.value);

    // Check for each hand type from highest to lowest
    const flush = checkFlush(allCards);
    const straight = checkStraight(allCards);
    const groups = getGroups(allCards);

    // Royal Flush
    if (flush && straight) {
      const firstCard = straight[0];
      if (firstCard && firstCard.value === 14) {
        return { rank: 10, name: "Royal Flush", cards: straight };
      }
    }

    // Straight Flush
    if (flush && straight) {
      const straightFlush = checkStraightFlush(allCards);
      if (straightFlush) {
        return { rank: 9, name: "Straight Flush", cards: straightFlush };
      }
    }

    // Four of a Kind
    if (groups.quads.length > 0) {
      const quads = groups.quads[0];
      if (quads) {
        return { rank: 8, name: "Quadra", cards: quads };
      }
    }

    // Full House
    if (groups.trips.length > 0 && groups.pairs.length > 0) {
      const trips = groups.trips[0];
      const pairs = groups.pairs[0];
      if (trips && pairs) {
        return {
          rank: 7,
          name: "Full House",
          cards: [...trips, ...pairs.slice(0, 2)],
        };
      }
    }

    // Flush
    if (flush) {
      return { rank: 6, name: "Flush", cards: flush };
    }

    // Straight
    if (straight) {
      return { rank: 5, name: "Sequência", cards: straight };
    }

    // Three of a Kind
    if (groups.trips.length > 0) {
      const trips = groups.trips[0];
      if (trips) {
        return { rank: 4, name: "Trinca", cards: trips };
      }
    }

    // Two Pair
    if (groups.pairs.length >= 2) {
      const pair1 = groups.pairs[0];
      const pair2 = groups.pairs[1];
      if (pair1 && pair2) {
        return {
          rank: 3,
          name: "Dois Pares",
          cards: [...pair1, ...pair2],
        };
      }
    }

    // One Pair
    if (groups.pairs.length === 1) {
      const pair = groups.pairs[0];
      if (pair) {
        return { rank: 2, name: "Um Par", cards: pair };
      }
    }

    // High Card
    const highCard = allCards[0];
    if (highCard) {
      return { rank: 1, name: "Carta Alta", cards: [highCard] };
    }
    
    // Fallback (should never happen)
    return { rank: 0, name: "Sem Cartas", cards: [] };
  };

  const checkFlush = (cards: Card[]): Card[] | null => {
    for (const suit of SUITS) {
      const suitCards = cards.filter((c) => c.suit === suit);
      if (suitCards.length >= 5) {
        return suitCards.slice(0, 5);
      }
    }
    return null;
  };

  const checkStraight = (cards: Card[]): Card[] | null => {
    const uniqueValues = [...new Set(cards.map((c) => c.value))].sort(
      (a, b) => b - a
    );

    // Check for Ace-low straight (A-2-3-4-5)
    if (
      uniqueValues.includes(14) &&
      uniqueValues.includes(2) &&
      uniqueValues.includes(3) &&
      uniqueValues.includes(4) &&
      uniqueValues.includes(5)
    ) {
      const straightCards: Card[] = [];
      for (const v of [5, 4, 3, 2, 14]) {
        const card = cards.find((c) => c.value === v);
        if (card) straightCards.push(card);
      }
      return straightCards;
    }

    for (let i = 0; i <= uniqueValues.length - 5; i++) {
      let isSequential = true;
      for (let j = 0; j < 4; j++) {
        const currentVal = uniqueValues[i + j];
        const nextVal = uniqueValues[i + j + 1];
        if (currentVal === undefined || nextVal === undefined || currentVal - nextVal !== 1) {
          isSequential = false;
          break;
        }
      }
      if (isSequential) {
        const straightCards: Card[] = [];
        for (let j = 0; j < 5; j++) {
          const targetValue = uniqueValues[i + j];
          if (targetValue !== undefined) {
            const card = cards.find((c) => c.value === targetValue);
            if (card) straightCards.push(card);
          }
        }
        return straightCards;
      }
    }
    return null;
  };

  const checkStraightFlush = (cards: Card[]): Card[] | null => {
    for (const suit of SUITS) {
      const suitCards = cards.filter((c) => c.suit === suit);
      if (suitCards.length >= 5) {
        const straight = checkStraight(suitCards);
        if (straight) return straight;
      }
    }
    return null;
  };

  const getGroups = (cards: Card[]) => {
    const valueGroups: { [key: number]: Card[] } = {};

    for (const card of cards) {
      if (!valueGroups[card.value]) {
        valueGroups[card.value] = [];
      }
      const group = valueGroups[card.value];
      if (group) {
        group.push(card);
      }
    }

    const quads: Card[][] = [];
    const trips: Card[][] = [];
    const pairs: Card[][] = [];

    for (const value in valueGroups) {
      const group = valueGroups[value];
      if (group) {
        if (group.length === 4) quads.push(group);
        else if (group.length === 3) trips.push(group);
        else if (group.length === 2) pairs.push(group);
      }
    }

    return { quads, trips, pairs };
  };

  // Determine winner
  const determineWinner = () => {
    const state = gameState.value;
    const activePlayers = state.players.filter((p) => !p.folded);

    if (activePlayers.length === 1) {
      const winner = activePlayers[0];
      if (winner) {
        state.winner = winner;
        winner.chips += state.pot;
      }
      return;
    }

    // Evaluate all hands
    for (const player of activePlayers) {
      player.handRank = evaluateHand(player.hand, state.communityCards);
    }

    // Sort by hand rank
    activePlayers.sort((a, b) => {
      if (!a.handRank || !b.handRank) return 0;
      if (b.handRank.rank !== a.handRank.rank) {
        return b.handRank.rank - a.handRank.rank;
      }
      // Compare high cards
      const aHighCard = a.handRank.cards[0]?.value || 0;
      const bHighCard = b.handRank.cards[0]?.value || 0;
      return bHighCard - aHighCard;
    });

    const winner = activePlayers[0];
    if (winner) {
      state.winner = winner;
      winner.chips += state.pot;
    }
  };

  // Start new round
  const newRound = () => {
    const state = gameState.value;
    state.dealerIndex = (state.dealerIndex + 1) % state.players.length;
    dealCards();
  };

  // AI player action
  const aiAction = () => {
    const state = gameState.value;
    const currentPlayer = state.players[state.currentPlayerIndex];

    if (!currentPlayer || currentPlayer.id === 0 || currentPlayer.folded) return;

    // Evaluate current hand strength
    const handRank = evaluateHand(currentPlayer.hand, state.communityCards);
    const handStrength = calculateHandStrength(handRank, state.phase);
    
    // Calculate pot odds
    const callAmount = state.currentBet - currentPlayer.bet;
    const potOdds = callAmount > 0 ? callAmount / (state.pot + callAmount) : 0;
    
    // Get personality modifiers
    const personality = currentPlayer.personality || "passive";
    const { aggression, tightness } = getPersonalityModifiers(personality);
    
    // Adjust thresholds based on personality
    const adjustedStrength = handStrength + (Math.random() - 0.5) * 0.2;
    const raiseThreshold = 0.65 - (aggression * 0.15);
    const callThreshold = 0.35 - (tightness * 0.15);
    const foldThreshold = 0.25 + (tightness * 0.1);
    
    // Decision making
    if (callAmount === 0) {
      // Can check for free
      if (adjustedStrength > raiseThreshold && currentPlayer.chips > state.bigBlind * 3) {
        const raiseSize = calculateRaiseSize(adjustedStrength, aggression, state);
        raise(raiseSize);
      } else {
        check();
      }
    } else if (callAmount >= currentPlayer.chips) {
      // All-in situation
      if (adjustedStrength > 0.75) {
        allIn();
      } else {
        fold();
      }
    } else {
      // Normal betting situation
      const callRatio = callAmount / currentPlayer.chips;
      
      if (adjustedStrength > raiseThreshold && callRatio < 0.3 && currentPlayer.chips > callAmount + state.bigBlind * 2) {
        // Strong hand, raise
        const raiseSize = calculateRaiseSize(adjustedStrength, aggression, state);
        raise(raiseSize);
      } else if (adjustedStrength > callThreshold || (potOdds < 0.3 && adjustedStrength > 0.3)) {
        // Decent hand or good pot odds, call
        call();
      } else if (adjustedStrength < foldThreshold || callRatio > 0.5) {
        // Weak hand or expensive call, fold
        fold();
      } else {
        // Marginal hand, sometimes call, sometimes fold
        if (Math.random() > 0.5) {
          call();
        } else {
          fold();
        }
      }
    }
  };

  // Calculate hand strength based on rank and phase
  const calculateHandStrength = (handRank: HandRank, phase: GamePhase): number => {
    // Base strength from hand rank (0-1 scale)
    let strength = handRank.rank / 10;
    
    // Adjust based on game phase
    const phaseMultipliers: Record<GamePhase, number> = {
      waiting: 1,
      preflop: 0.8,  // Less confident pre-flop
      flop: 0.9,
      turn: 0.95,
      river: 1,
      showdown: 1
    };
    
    strength *= phaseMultipliers[phase];
    
    // Add some variance for pairs and high cards based on actual card values
    if (handRank.rank === 2) { // One Pair
      const pairValue = handRank.cards[0]?.value || 2;
      strength += (pairValue / 14) * 0.1; // Bonus for high pairs
    } else if (handRank.rank === 1) { // High Card
      const highCard = handRank.cards[0]?.value || 2;
      strength += (highCard / 14) * 0.05; // Small bonus for high cards
    }
    
    return Math.min(strength, 1);
  };

  // Get personality modifiers
  const getPersonalityModifiers = (personality: "tight" | "loose" | "aggressive" | "passive") => {
    const modifiers = {
      tight: { aggression: 0.3, tightness: 0.7 },
      loose: { aggression: 0.5, tightness: 0.2 },
      aggressive: { aggression: 0.8, tightness: 0.4 },
      passive: { aggression: 0.2, tightness: 0.5 }
    };
    return modifiers[personality];
  };

  // Calculate raise size based on hand strength and personality
  const calculateRaiseSize = (handStrength: number, aggression: number, state: GameState): number => {
    const baseRaise = state.bigBlind * 2;
    const strengthMultiplier = 1 + (handStrength * 2);
    const aggressionMultiplier = 1 + aggression;
    
    const raiseSize = Math.floor(baseRaise * strengthMultiplier * aggressionMultiplier);
    
    // Random variation
    const variation = 1 + (Math.random() - 0.5) * 0.3;
    
    return Math.floor(raiseSize * variation);
  };

  return {
    gameState,
    initGame,
    dealCards,
    fold,
    call,
    raise,
    check,
    allIn,
    newRound,
    aiAction,
    evaluateHand,
  };
};
