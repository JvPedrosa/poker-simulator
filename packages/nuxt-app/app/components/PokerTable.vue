<template>
  <div class="poker-table">
    <div class="table-felt">
      <div class="table-center">
        <div class="pot-display" v-if="gameState.pot > 0">
          <span class="pot-label">Pote</span>
          <span class="pot-amount">🪙 {{ gameState.pot }}</span>
        </div>

        <div class="community-cards" v-if="gameState.communityCards.length > 0">
          <PlayingCard 
            v-for="(card, index) in gameState.communityCards" 
            :key="index"
            :card="card"
            :show-face="true"
            class="community-card"
            :style="{ animationDelay: `${index * 0.1}s` }"
          />
        </div>

        <div class="phase-indicator">
          {{ phaseLabel }}
        </div>
      </div>

      <div class="players-container">
        <PlayerSeat 
          v-for="player in gameState.players" 
          :key="player.id"
          :player="player"
          :show-cards="player.id === 0 || gameState.phase === 'showdown'"
          :is-winner="gameState.winner?.id === player.id"
          class="player-position"
          :class="`position-${player.id}`"
        />
      </div>
    </div>

    <div class="controls" v-if="gameState.phase !== 'waiting' && gameState.phase !== 'showdown'">
      <template v-if="isPlayerTurn">
        <button 
          class="action-btn fold" 
          @click="fold"
        >
          Fold
        </button>
        
        <button 
          class="action-btn check" 
          @click="check"
          :disabled="cannotCheck"
        >
          Check
        </button>
        
        <button 
          class="action-btn call" 
          @click="call"
          :disabled="callAmount === 0"
        >
          Call {{ callAmount > 0 ? `(${callAmount})` : '' }}
        </button>
        
        <div class="raise-controls">
          <input 
            type="range" 
            v-model.number="raiseAmount" 
            :min="minRaise" 
            :max="maxRaise"
            class="raise-slider"
          />
          <button 
            class="action-btn raise" 
            @click="raiseAction"
            :disabled="raiseAmount <= 0"
          >
            Raise ({{ raiseAmount }})
          </button>
        </div>
        
        <button 
          class="action-btn all-in" 
          @click="allIn"
        >
          All-In
        </button>
      </template>
      <div v-else class="waiting-message">
        Aguardando {{ currentPlayerName }}...
      </div>
    </div>

    <div class="game-controls">
      <button 
        v-if="gameState.phase === 'waiting'" 
        class="game-btn start" 
        @click="startGame"
      >
        🎴 Iniciar Jogo
      </button>
      
      <button 
        v-if="gameState.phase === 'showdown'" 
        class="game-btn new-round" 
        @click="newRound"
      >
        🔄 Nova Rodada
      </button>
    </div>

    <div v-if="gameState.winner && gameState.phase === 'showdown'" class="winner-announcement">
      <div class="winner-content">
        <span class="trophy">🏆</span>
        <span class="winner-text">{{ gameState.winner.name }} venceu!</span>
        <span v-if="gameState.winner.handRank" class="winner-hand">
          {{ gameState.winner.handRank.name }}
        </span>
        <span class="winner-pot">+{{ gameState.pot }} fichas</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { 
  gameState, 
  initGame, 
  dealCards, 
  fold, 
  call, 
  raise, 
  check, 
  allIn, 
  newRound,
  aiAction 
} = usePoker()

const raiseAmount = ref(20)

const phaseLabels: Record<string, string> = {
  waiting: 'Aguardando...',
  preflop: 'Pre-Flop',
  flop: 'Flop',
  turn: 'Turn',
  river: 'River',
  showdown: 'Showdown'
}

const phaseLabel = computed(() => phaseLabels[gameState.value.phase] || '')

const isPlayerTurn = computed(() => {
  const currentPlayer = gameState.value.players[gameState.value.currentPlayerIndex]
  return currentPlayer?.id === 0 && !currentPlayer.folded
})

const currentPlayerName = computed(() => {
  return gameState.value.players[gameState.value.currentPlayerIndex]?.name || ''
})

const callAmount = computed(() => {
  const player = gameState.value.players[0]
  if (!player) return 0
  return gameState.value.currentBet - player.bet
})

const cannotCheck = computed(() => {
  const player = gameState.value.players[0]
  if (!player) return true
  return player.bet < gameState.value.currentBet
})

const minRaise = computed(() => gameState.value.bigBlind)
const maxRaise = computed(() => {
  const player = gameState.value.players[0]
  if (!player) return 0
  return player.chips
})

const startGame = () => {
  initGame(4, 1000)
  dealCards()
}

const raiseAction = () => {
  raise(raiseAmount.value)
}

// Watch for AI turns
watch(() => gameState.value.currentPlayerIndex, async (newIndex) => {
  if (gameState.value.phase === 'waiting' || gameState.value.phase === 'showdown') return
  
  const currentPlayer = gameState.value.players[newIndex]
  if (currentPlayer && currentPlayer.id !== 0 && !currentPlayer.folded) {
    // Add delay for AI action
    await new Promise(resolve => setTimeout(resolve, 800))
    aiAction()
  }
}, { immediate: true })

// Initialize game on mount
onMounted(() => {
  initGame(4, 1000)
})
</script>

<style scoped>
.poker-table {
  min-height: 100vh;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 80px;
}

.table-felt {
  width: 100%;
  max-width: 900px;
  height: 500px;
  background: radial-gradient(ellipse at center, #2d5a3d 0%, #1e3d2a 70%, #0f1f15 100%);
  border-radius: 200px;
  border: 15px solid #4a3728;
  box-shadow: 
    inset 0 0 50px rgba(0, 0, 0, 0.5),
    0 10px 30px rgba(0, 0, 0, 0.5);
  position: relative;
  margin: 20px 0;
}

.table-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.pot-display {
  background: rgba(0, 0, 0, 0.6);
  padding: 10px 25px;
  border-radius: 25px;
  margin-bottom: 15px;
  display: inline-block;
}

.pot-label {
  color: #a0aec0;
  font-size: 12px;
  display: block;
}

.pot-amount {
  color: #f6e05e;
  font-size: 24px;
  font-weight: bold;
}

.community-cards {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin: 15px 0;
}

.community-card {
  animation: dealCard 0.3s ease-out forwards;
  opacity: 0;
  transform: translateY(-20px);
}

@keyframes dealCard {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.phase-indicator {
  color: #e2e8f0;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-top: 10px;
}

.players-container {
  position: absolute;
  width: 100%;
  height: 100%;
}

.player-position {
  position: absolute;
}

.position-0 {
  bottom: -80px;
  left: 50%;
  transform: translateX(-50%);
}

.position-1 {
  left: -100px;
  top: 50%;
  transform: translateY(-50%);
}

.position-2 {
  top: -80px;
  left: 50%;
  transform: translateX(-50%);
}

.position-3 {
  right: -100px;
  top: 50%;
  transform: translateY(-50%);
}

.controls {
  display: flex;
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 20px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 15px;
}

.action-btn {
  padding: 12px 25px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  text-transform: uppercase;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.fold {
  background: linear-gradient(135deg, #e53e3e, #c53030);
  color: white;
}

.action-btn.fold:hover:not(:disabled) {
  background: linear-gradient(135deg, #fc8181, #e53e3e);
}

.action-btn.check {
  background: linear-gradient(135deg, #4299e1, #3182ce);
  color: white;
}

.action-btn.check:hover:not(:disabled) {
  background: linear-gradient(135deg, #63b3ed, #4299e1);
}

.action-btn.call {
  background: linear-gradient(135deg, #48bb78, #38a169);
  color: white;
}

.action-btn.call:hover:not(:disabled) {
  background: linear-gradient(135deg, #68d391, #48bb78);
}

.action-btn.raise {
  background: linear-gradient(135deg, #ed8936, #dd6b20);
  color: white;
}

.action-btn.raise:hover:not(:disabled) {
  background: linear-gradient(135deg, #f6ad55, #ed8936);
}

.action-btn.all-in {
  background: linear-gradient(135deg, #9f7aea, #805ad5);
  color: white;
}

.action-btn.all-in:hover:not(:disabled) {
  background: linear-gradient(135deg, #b794f4, #9f7aea);
}

.raise-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.raise-slider {
  width: 120px;
  accent-color: #ed8936;
}

.waiting-message {
  color: #a0aec0;
  font-style: italic;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.game-controls {
  margin-top: 20px;
}

.game-btn {
  padding: 15px 40px;
  border: none;
  border-radius: 10px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.game-btn.start {
  background: linear-gradient(135deg, #48bb78, #38a169);
  color: white;
}

.game-btn.start:hover {
  transform: scale(1.05);
  box-shadow: 0 5px 20px rgba(72, 187, 120, 0.4);
}

.game-btn.new-round {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.game-btn.new-round:hover {
  transform: scale(1.05);
  box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
}

.winner-announcement {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.9);
  padding: 40px 60px;
  border-radius: 20px;
  border: 3px solid #f6e05e;
  animation: popIn 0.5s ease-out;
  z-index: 100;
}

@keyframes popIn {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 0;
  }
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
}

.winner-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.trophy {
  font-size: 60px;
  animation: bounce 1s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.winner-text {
  color: #f6e05e;
  font-size: 28px;
  font-weight: bold;
}

.winner-hand {
  color: #68d391;
  font-size: 20px;
}

.winner-pot {
  color: #48bb78;
  font-size: 24px;
  font-weight: bold;
}
</style>
