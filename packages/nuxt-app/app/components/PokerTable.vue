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
            :step="raiseStep"
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

    <!-- Indicador de Mão do Jogador -->
    <div v-if="playerHandInfo && gameState.phase !== 'waiting'" class="hand-indicator">
      <div class="hand-indicator-content">
        <span class="hand-icon">🃏</span>
        <div class="hand-details">
          <span class="hand-label">Sua Mão:</span>
          <span class="hand-name" :class="handStrengthClass">{{ playerHandInfo.name }}</span>
        </div>
        <div class="hand-strength-bar">
          <div class="hand-strength-fill" :style="{ width: handStrengthPercent + '%' }"></div>
        </div>
      </div>
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

    <footer class="game-footer">
      <p class="developer">Desenvolvido por <strong>João Victor Pedrosa Cândido</strong></p>
      <div class="contact-links">
        <a href="https://www.linkedin.com/in/joao-victor-pedrosa-candido/" target="_blank" rel="noopener noreferrer" class="contact-link">
          <span class="icon">💼</span> LinkedIn
        </a>
        <a href="https://github.com/JvPedrosa" target="_blank" rel="noopener noreferrer" class="contact-link">
          <span class="icon">💻</span> GitHub
        </a>
        <a href="https://my-portfolio-liart-one-93.vercel.app/" target="_blank" rel="noopener noreferrer" class="contact-link">
          <span class="icon">🌐</span> Portfólio
        </a>
      </div>
    </footer>
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
  aiAction,
  evaluateHand
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

// Avaliação da mão do jogador em tempo real
const playerHandInfo = computed(() => {
  const player = gameState.value.players[0]
  if (!player || player.hand.length === 0) return null
  
  return evaluateHand(player.hand, gameState.value.communityCards)
})

const handStrengthPercent = computed(() => {
  if (!playerHandInfo.value) return 0
  return (playerHandInfo.value.rank / 10) * 100
})

const handStrengthClass = computed(() => {
  if (!playerHandInfo.value) return ''
  const rank = playerHandInfo.value.rank
  if (rank >= 8) return 'strength-legendary'
  if (rank >= 6) return 'strength-strong'
  if (rank >= 4) return 'strength-medium'
  if (rank >= 2) return 'strength-weak'
  return 'strength-low'
})

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

// Incremento do raise (múltiplos do big blind)
const raiseStep = computed(() => gameState.value.bigBlind)

const startGame = () => {
  initGame(4, 1000)
  dealCards()
}

const raiseAction = () => {
  raise(raiseAmount.value)
}

// Watch for AI turns
watch([() => gameState.value.currentPlayerIndex, () => gameState.value.phase], async ([newIndex, newPhase]) => {
  if (newPhase === 'waiting' || newPhase === 'showdown') return;
  
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
  height: 100%;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  padding: 15px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  overflow: hidden;
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
  margin-top: 100px;
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
  bottom: -50px;
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

.game-footer {
  width: 100%;
  padding: 10px 20px;
  background: rgba(0, 0, 0, 0.3);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
  flex-shrink: 0;
  margin-top: auto;
}

.developer {
  color: #a0aec0;
  font-size: 12px;
  margin-bottom: 8px;
}

.developer strong {
  color: #e2e8f0;
  font-weight: 600;
}

.contact-links {
  display: flex;
  gap: 15px;
  justify-content: center;
  flex-wrap: wrap;
}

.contact-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #cbd5e0;
  text-decoration: none;
  font-size: 12px;
  transition: all 0.3s ease;
}

.contact-link:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
  color: #e2e8f0;
  transform: translateY(-2px);
}

.contact-link .icon {
  font-size: 16px;
}

/* Indicador de Mão */
.hand-indicator {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: linear-gradient(145deg, #2d3748, #1a202c);
  border: 2px solid #4a5568;
  border-radius: 15px;
  padding: 15px 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  z-index: 50;
  min-width: 180px;
}

.hand-indicator-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.hand-icon {
  font-size: 28px;
}

.hand-details {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.hand-label {
  color: #a0aec0;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.hand-name {
  font-size: 18px;
  font-weight: bold;
  text-align: center;
}

.hand-name.strength-legendary {
  color: #f6e05e;
  text-shadow: 0 0 10px rgba(246, 224, 94, 0.5);
}

.hand-name.strength-strong {
  color: #68d391;
}

.hand-name.strength-medium {
  color: #4299e1;
}

.hand-name.strength-weak {
  color: #ed8936;
}

.hand-name.strength-low {
  color: #a0aec0;
}

.hand-strength-bar {
  width: 100%;
  height: 6px;
  background: #2d3748;
  border-radius: 3px;
  overflow: hidden;
  margin-top: 5px;
}

.hand-strength-fill {
  height: 100%;
  background: linear-gradient(90deg, #e53e3e 0%, #ed8936 25%, #ecc94b 50%, #68d391 75%, #38b2ac 100%);
  border-radius: 3px;
  transition: width 0.5s ease;
}
</style>
