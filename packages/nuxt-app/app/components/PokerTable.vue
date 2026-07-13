<template>
  <section class="poker-table" aria-label="Simulador de poker">
    <p class="sr-only" role="status" aria-live="polite" aria-atomic="true">{{ gameStatusMessage }}</p>

    <div
      class="table-felt"
      role="region"
      :aria-label="`Mesa de poker. ${phaseLabel}${gameState.pot > 0 ? `. Pote de ${gameState.pot} fichas` : ''}`"
    >
      <div class="table-center">
        <div class="pot-display" v-if="gameState.pot > 0" aria-label="Pote atual">
          <span class="pot-label">Pote</span>
          <span class="pot-amount">🪙 {{ gameState.pot }}</span>
        </div>

        <div class="community-cards" v-if="gameState.communityCards.length > 0" role="group" aria-label="Cartas comunitárias">
          <PlayingCard 
            v-for="(card, index) in gameState.communityCards" 
            :key="index"
            :card="card"
            :show-face="true"
            class="community-card"
            :style="{ animationDelay: `${index * 0.1}s` }"
          />
        </div>

        <div class="phase-indicator" aria-hidden="true">
          {{ phaseLabel }}
        </div>
      </div>

      <div class="players-container" role="list" aria-label="Jogadores na mesa">
        <PlayerSeat 
          v-for="player in gameState.players" 
          :key="player.id"
          :player="player"
          :show-cards="player.id === 0 || gameState.phase === 'showdown'"
          :is-winner="gameState.winners.some(w => w.id === player.id)"
          class="player-position"
          :class="`position-${player.id}`"
          role="listitem"
        />
      </div>
    </div>

    <section
      v-if="gameState.phase !== 'waiting' && gameState.phase !== 'showdown'"
      id="game-actions"
      class="controls"
      aria-label="Ações da mão atual"
    >
      <template v-if="isPlayerTurn">
        <button 
          type="button"
          class="action-btn fold" 
          @click="fold"
          :disabled="!playerLegal.fold"
          aria-label="Desistir da mão"
        >
          Fold
        </button>
        
        <button 
          type="button"
          class="action-btn check" 
          @click="check"
          :disabled="!playerLegal.check"
          :aria-label="!playerLegal.check ? 'Check indisponível: há uma aposta para pagar' : 'Check: passar sem apostar'"
        >
          Check
        </button>
        
        <button 
          type="button"
          class="action-btn call" 
          @click="call"
          :disabled="playerLegal.call === 0"
          :aria-label="callAmount > 0 ? `Pagar ${callAmount} fichas` : 'Call indisponível: não há aposta para pagar'"
        >
          Call {{ callAmount > 0 ? `(${callAmount})` : '' }}
        </button>
        
        <div class="raise-controls">
          <label class="sr-only" for="raise-amount">Valor adicional para aumentar a aposta</label>
          <input 
            id="raise-amount"
            type="range" 
            v-model.number="raiseAmount" 
            :min="minRaise" 
            :max="maxRaise"
            :step="raiseStep"
            class="raise-slider"
            :disabled="minRaise <= 0 || minRaise > maxRaise"
            aria-describedby="raise-help"
          />
          <span id="raise-help" class="sr-only">Use as setas para definir o valor do aumento.</span>
          <button 
            type="button"
            class="action-btn raise" 
            @click="raiseAction"
            :disabled="raiseAmount <= 0 || minRaise <= 0 || minRaise > maxRaise"
            :aria-label="`Aumentar a aposta em ${raiseAmount} fichas`"
          >
            Raise ({{ raiseAmount }})
          </button>
        </div>
        
        <button 
          type="button"
          class="action-btn all-in" 
          @click="allIn"
          :disabled="!playerLegal.allIn"
          aria-label="Ir all-in com todas as suas fichas"
        >
          All-In
        </button>
      </template>
      <div v-else class="waiting-message" role="status" aria-live="polite" aria-atomic="true">
        Aguardando {{ currentPlayerName }}...
      </div>
    </section>

    <section id="game-controls" class="game-controls" aria-label="Configurações e controles do jogo">
      <fieldset v-if="gameState.phase === 'waiting'" class="setup-controls">
        <legend>Configurar nova mesa</legend>
        <label for="player-count">Jogadores <select id="player-count" v-model.number="settings.players"><option v-for="n in [2,3,4]" :key="n" :value="n">{{ n }}</option></select></label>
        <label for="initial-stack">Stack <input id="initial-stack" v-model.number="settings.stack" type="number" min="200" step="100"></label>
        <label for="big-blind">Big blind <input id="big-blind" v-model.number="settings.bigBlind" type="number" min="10" step="10"></label>
        <label for="game-mode">Modo <select id="game-mode" v-model="settings.mode"><option value="cash">Cash game</option><option value="tournament">Torneio</option></select></label>
        <label for="bot-speed">Velocidade <select id="bot-speed" v-model.number="settings.delay"><option :value="250">Rápida</option><option :value="800">Normal</option><option :value="1500">Lenta</option></select></label>
        <label class="checkbox-label" for="spectator-mode"><input id="spectator-mode" v-model="settings.spectator" type="checkbox"> Somente bots</label>
        <fieldset class="bot-config" v-for="index in settings.players - 1" :key="index">
          <legend>Bot {{ index }}</legend>
          <label :for="`bot-${index}-name`">Nome <input :id="`bot-${index}-name`" v-model="botSettings[index - 1].name" /></label>
          <label :for="`bot-${index}-profile`">Perfil <select :id="`bot-${index}-profile`" v-model="botSettings[index - 1].profile"><option v-for="profile in profiles" :key="profile" :value="profile">{{ profile.toUpperCase() }}</option></select></label>
          <label :for="`bot-${index}-difficulty`">Dificuldade <select :id="`bot-${index}-difficulty`" v-model="botSettings[index - 1].difficulty"><option value="easy">Fácil</option><option value="normal">Normal</option><option value="hard">Difícil</option></select></label>
          <label :for="`bot-${index}-stack`">Stack <input :id="`bot-${index}-stack`" v-model.number="botSettings[index - 1].stack" type="number" min="100" step="100" /></label>
        </fieldset>
      </fieldset>
      <button 
        v-if="gameState.phase === 'waiting'" 
        type="button"
        class="game-btn start" 
        @click="startGame"
      >
        🎴 Iniciar Jogo
      </button>
      <button v-if="gameState.phase !== 'waiting' && gameState.phase !== 'showdown'" type="button" class="game-btn" @click="gameState.paused=!gameState.paused" :aria-pressed="gameState.paused" :aria-label="gameState.paused ? 'Continuar a partida' : 'Pausar a partida'">{{ gameState.paused ? '▶ Continuar' : '⏸ Pausar' }}</button>
      <div v-if="gameState.phase === 'showdown' && gameState.mode === 'cash'" class="rebuy-controls" role="group" aria-label="Recompras e saídas"><button v-for="p in gameState.players.filter(p=>p.chips===0)" :key="p.id" type="button" class="game-btn" @click="rebuy(p.id)">Recomprar para {{ p.name }}</button><button v-for="p in gameState.players.filter(p=>p.chips>0)" :key="`cashout-${p.id}`" type="button" class="game-btn secondary" @click="cashOut(p.id)">Sair: {{ p.name }}</button></div>
      
      <button 
        v-if="gameState.phase === 'showdown'" 
        type="button"
        class="game-btn new-round" 
        @click="newRound"
      >
        🔄 Nova Rodada
      </button>
    </section>

    <section v-if="gameState.lastDecision || gameState.history.length" class="insights" aria-label="Informações da partida">
      <details v-if="gameState.lastDecision" open><summary>Explicação da IA</summary><p>{{ gameState.lastDecision }}</p></details>
      <details><summary>Histórico da mão ({{ gameState.history.length }})</summary><ol><li v-for="(event,index) in gameState.history" :key="index">{{ event }}</li></ol></details>
      <details><summary>Estatísticas</summary><div class="stats"><p v-for="p in gameState.players" :key="p.id"><strong>{{ p.name }}</strong> — VPIP {{ percent(p.stats.vpip,p.stats.hands) }} · PFR {{ percent(p.stats.pfr,p.stats.hands) }} · AF {{ aggression(p) }} · Fold {{ percent(p.stats.folds,p.stats.hands) }} · SD {{ percent(p.stats.showdowns,p.stats.hands) }}</p></div></details>
      <details v-if="selectedReplay" open><summary>Replay de mãos</summary><div class="replay"><label for="replay-hand">Mão arquivada</label><select id="replay-hand" v-model.number="replayHand" @change="replayStep = 0"><option v-for="hand in gameState.handArchives" :key="hand.handNumber" :value="hand.handNumber">Mão {{ hand.handNumber }}</option></select><div class="replay-board" role="group" aria-label="Cartas comunitárias no evento selecionado"><PlayingCard v-for="card in currentReplaySnapshot?.board || []" :key="`${card.rank}-${card.suit}`" :card="card" :show-face="true" /></div><p role="status" aria-live="polite" aria-atomic="true">{{ currentReplaySnapshot?.event || 'Início da mão' }}</p><ul v-if="currentReplaySnapshot" class="replay-stacks" aria-label="Stacks neste evento"><li v-for="player in currentReplaySnapshot.players" :key="player.id">{{ player.name }}: {{ player.chips }} <span v-if="player.bet">(aposta {{ player.bet }})</span><span v-if="player.folded"> · fold</span><span v-if="player.allIn"> · all-in</span></li></ul><div class="replay-navigation"><button type="button" @click="replayStep=Math.max(0,replayStep-1)" :disabled="replayStep === 0" aria-label="Voltar um evento no replay">← Voltar</button><output :aria-label="`Evento ${replayStep + 1} de ${selectedReplay.snapshots.length}`">{{ replayStep + 1 }}/{{ selectedReplay.snapshots.length }}</output><button type="button" @click="replayStep=Math.min(selectedReplay.snapshots.length-1,replayStep+1)" :disabled="replayStep >= selectedReplay.snapshots.length - 1" aria-label="Avançar um evento no replay">Avançar →</button></div></div></details>
      <details><summary>Tutorial e ranking</summary><p>Royal/Straight Flush › Quadra › Full House › Flush › Sequência › Trinca › Dois Pares › Par › Carta Alta. Check passa sem apostar; call iguala; raise aumenta; fold desiste; all-in aposta todo o stack.</p></details>
    </section>

    <!-- Indicador de Mão do Jogador -->
    <aside v-if="playerHandInfo && gameState.phase !== 'waiting'" class="hand-indicator" aria-label="Avaliação da sua mão">
      <div class="hand-indicator-content">
        <span class="hand-icon" aria-hidden="true">🃏</span>
        <div class="hand-details">
          <span class="hand-label">Sua Mão:</span>
          <span class="hand-name" :class="handStrengthClass">{{ playerHandInfo.name }}</span>
        </div>
        <div class="hand-strength-bar" role="progressbar" aria-label="Força da mão" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="handStrengthPercent">
          <div class="hand-strength-fill" :style="{ width: handStrengthPercent + '%' }"></div>
        </div>
      </div>
    </aside>

    <div v-if="gameState.winner && gameState.phase === 'showdown'" class="winner-announcement" role="dialog" aria-modal="true" aria-labelledby="winner-heading" aria-describedby="winner-details">
      <div class="winner-content">
        <span class="trophy" aria-hidden="true">🏆</span>
        <h2 id="winner-heading" class="winner-text">{{ gameState.winners.map(w => w.name).join(' e ') }} venceu!</h2>
        <div id="winner-details" class="winner-summary">
          <span v-if="gameState.winner.handRank" class="winner-hand">
            {{ gameState.winner.handRank.name }}
          </span>
          <span class="winner-pot">+{{ gameState.pot }} fichas</span>
        </div>
        <button ref="winnerNextButton" type="button" class="game-btn new-round winner-next" @click="newRound">Nova rodada</button>
      </div>
    </div>

    <section v-if="gameState.tournamentFinished" class="tournament-results" aria-live="polite" aria-labelledby="tournament-results-heading">
      <h2 id="tournament-results-heading">Classificação final</h2>
      <ol><li v-for="(id, index) in gameState.ranking" :key="id">{{ index + 1 }}. {{ gameState.players[id]?.name }} <span v-if="gameState.payouts[id]">— prêmio simulado: {{ gameState.payouts[id] }}</span></li></ol>
    </section>

    <footer class="game-footer" aria-label="Créditos e contatos">
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
  </section>
</template>

<script setup lang="ts">
import { deserializeGame, GAME_STORAGE_KEY, serializeGame } from "../persistence/gamePersistence"

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
  evaluateHand,
  rebuy,
  cashOut,
  configurePlayer,
  archiveCurrentHand,
  getLegalActions
} = usePoker()

const raiseAmount = ref(20)
const settings = reactive({ players: 4, stack: 1000, bigBlind: 20, mode:'cash' as 'cash'|'tournament', delay:800, spectator:false })
const profiles=['tag','lag','adaptive','recreational','tight','loose','aggressive','passive'] as const
const botSettings=reactive(Array.from({length:3},(_,i)=>({name:`Jogador ${i+2}`,profile:profiles[i]!,difficulty:'normal' as 'easy'|'normal'|'hard',stack:1000})))
const replayHand=ref(0),replayStep=ref(0)
const selectedReplay=computed(()=>gameState.value.handArchives?.find(h=>h.handNumber===replayHand.value)||gameState.value.handArchives?.[0])
const currentReplaySnapshot=computed(()=>selectedReplay.value?.snapshots?.[replayStep.value])
const playerLegal = computed(() => getLegalActions())
const percent=(n:number,d:number)=>`${d?Math.round(n/d*100):0}%`
const aggression=(p:any)=>(p.stats.calls?p.stats.betsRaises/p.stats.calls:p.stats.betsRaises).toFixed(1)

const phaseLabels: Record<string, string> = {
  waiting: 'Aguardando...',
  preflop: 'Pre-Flop',
  flop: 'Flop',
  turn: 'Turn',
  river: 'River',
  showdown: 'Showdown'
}

const phaseLabel = computed(() => phaseLabels[gameState.value.phase] || '')

const gameStatusMessage = computed(() => {
  const state = gameState.value
  if (state.phase === 'waiting') return 'Configure a mesa e inicie uma nova partida.'
  if (state.paused) return 'Partida pausada.'
  if (state.phase === 'showdown' && state.winners.length) {
    return `Fim da mão. ${state.winners.map(player => player.name).join(' e ')} venceu.`
  }

  const currentPlayer = state.players[state.currentPlayerIndex]
  return currentPlayer ? `${phaseLabel.value}. Vez de ${currentPlayer.name}.` : phaseLabel.value
})

const winnerNextButton = ref<HTMLButtonElement | null>(null)

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

const callAmount = computed(() => playerLegal.value.call)

const minRaise = computed(() => playerLegal.value.minRaiseTo === null ? 0 : Math.max(0, playerLegal.value.minRaiseTo - gameState.value.currentBet))
const maxRaise = computed(() => Math.max(0, playerLegal.value.maxRaiseTo - gameState.value.currentBet))

// Incremento do raise (múltiplos do big blind)
const raiseStep = computed(() => gameState.value.bigBlind)

watch([minRaise, maxRaise], ([minimum, maximum]) => {
  if (minimum <= 0 || minimum > maximum) return
  raiseAmount.value = Math.min(Math.max(raiseAmount.value, minimum), maximum)
}, { immediate: true })

const startGame = () => {
  if (import.meta.client) localStorage.setItem('poker-settings', JSON.stringify(settings))
  initGame(settings.players, settings.stack)
  botSettings.slice(0,settings.players-1).forEach((bot,index)=>configurePlayer(index+1,{name:bot.name,personality:bot.profile,difficulty:bot.difficulty,chips:bot.stack}))
  gameState.value.bigBlind = settings.bigBlind
  gameState.value.smallBlind = Math.max(1, Math.floor(settings.bigBlind / 2))
  gameState.value.mode=settings.mode;gameState.value.actionDelay=settings.delay;gameState.value.spectator=settings.spectator
  dealCards()
}

const raiseAction = () => {
  raise(raiseAmount.value)
}

// Watch for AI turns
watch([() => gameState.value.currentPlayerIndex, () => gameState.value.phase,()=>gameState.value.paused], async ([newIndex, newPhase]) => {
  if (newPhase === 'waiting' || newPhase === 'showdown') return;
  
  const currentPlayer = gameState.value.players[newIndex]
  if (currentPlayer && (currentPlayer.id !== 0 || gameState.value.spectator) && !currentPlayer.folded && !gameState.value.paused) {
    // Add delay for AI action
    await new Promise(resolve => setTimeout(resolve, gameState.value.actionDelay))
    aiAction()
  }
}, { immediate: true })

// Initialize game on mount
onMounted(() => {
  const saved=localStorage.getItem('poker-settings');if(saved)Object.assign(settings,JSON.parse(saved))
  const savedGame=deserializeGame(localStorage.getItem(GAME_STORAGE_KEY));if(savedGame)gameState.value=savedGame;else initGame(4, 1000)
})
watch(()=>gameState.value.phase,phase=>{if(phase==='showdown')archiveCurrentHand()})
watch(() => gameState.value.phase, async phase => {
  if (phase !== 'showdown') return
  await nextTick()
  winnerNextButton.value?.focus()
})
watch(gameState,state=>{if(import.meta.client)localStorage.setItem(GAME_STORAGE_KEY,serializeGame(state))},{deep:true})
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
  overflow-y: auto;
  overflow-x: hidden;
}

.setup-controls,.insights{display:flex;gap:12px;flex-wrap:wrap;background:rgba(0,0,0,.35);padding:12px 16px;border-radius:12px;color:#e2e8f0}.setup-controls label{display:grid;gap:4px;font-size:12px}.setup-controls input,.setup-controls select,.bot-config input,.bot-config select,.replay select{background:#1a202c;color:white;border:1px solid #4a5568;border-radius:6px;padding:6px}.bot-config{display:grid;grid-template-columns:auto 1fr 1fr 90px;gap:6px;align-items:center;width:100%}.insights{width:min(900px,100%)}.insights details{flex:1;min-width:250px}.insights summary{cursor:pointer;color:#f6e05e;font-weight:700}.insights p,.insights ol{margin-top:8px;font-size:13px;line-height:1.5;max-height:130px;overflow:auto}.insights li{margin-left:18px}.stats{max-height:140px;overflow:auto}.replay{display:grid;gap:10px;margin-top:10px}.replay-board{display:flex;gap:5px}.replay>div:last-child{display:flex;align-items:center;justify-content:space-between}.replay button{padding:6px 10px;border-radius:6px;background:#4a5568;color:white;border:0}

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

/* ===== VERSÃO MOBILE ===== */
@media (max-width: 768px) {
  .poker-table {
    padding: 10px;
    gap: 10px;
    overflow-y: auto;
  }

  .table-felt {
    max-width: 100%;
    height: 300px;
    border-radius: 120px;
    border-width: 8px;
    margin-top: 70px;
  }

  .pot-display {
    padding: 6px 15px;
  }

  .pot-amount {
    font-size: 18px;
  }

  .community-cards {
    gap: 5px;
  }

  .phase-indicator {
    font-size: 12px;
  }

  /* Posições dos jogadores mobile */
  .position-0 {
    bottom: -55px;
  }

  .position-1 {
    left: -60px;
  }

  .position-2 {
    top: -55px;
  }

  .position-3 {
    right: -60px;
  }

  /* Controles */
  .controls {
    padding: 10px;
    gap: 8px;
    flex-wrap: wrap;
  }

  .action-btn {
    padding: 10px 15px;
    font-size: 12px;
  }

  .raise-controls {
    width: 100%;
    flex-direction: row;
    gap: 10px;
  }

  .raise-slider {
    flex: 1;
    width: auto;
  }

  .game-btn {
    padding: 12px 25px;
    font-size: 14px;
  }

  /* Winner announcement */
  .winner-announcement {
    padding: 25px 30px;
  }

  .trophy {
    font-size: 40px;
  }

  .winner-text {
    font-size: 20px;
  }

  .winner-hand {
    font-size: 16px;
  }

  .winner-pot {
    font-size: 18px;
  }

  /* Footer */
  .game-footer {
    padding: 8px 15px;
  }

  .developer {
    font-size: 11px;
    margin-bottom: 5px;
  }

  .contact-links {
    gap: 8px;
  }

  .contact-link {
    padding: 4px 8px;
    font-size: 10px;
    gap: 3px;
  }

  .contact-link .icon {
    font-size: 12px;
  }

  /* Hand indicator */
  .hand-indicator {
    bottom: 10px;
    right: 10px;
    padding: 10px 15px;
    min-width: 140px;
  }

  .hand-icon {
    font-size: 20px;
  }

  .hand-label {
    font-size: 10px;
  }

  .hand-name {
    font-size: 14px;
  }
}

/* ===== VERSÃO MOBILE PEQUENO ===== */
@media (max-width: 480px) {
  .table-felt {
    height: 250px;
    border-radius: 100px;
    border-width: 6px;
    margin-top: 60px;
  }

  .position-0 {
    bottom: -45px;
  }

  .position-1 {
    left: -45px;
  }

  .position-2 {
    top: -45px;
  }

  .position-3 {
    right: -45px;
  }

  .controls {
    padding: 8px;
  }

  .action-btn {
    padding: 8px 12px;
    font-size: 11px;
  }

  .action-btn.all-in {
    width: 100%;
  }

  .hand-indicator {
    bottom: auto;
    top: 10px;
    right: 10px;
  }
}

/* ===== LANDSCAPE MOBILE ===== */
@media (max-height: 500px) {
  .poker-table {
    overflow-y: auto;
    padding: 10px;
  }

  .table-felt {
    height: 280px;
    border-radius: 100px;
    border-width: 8px;
    margin-top: 50px;
    flex-shrink: 0;
  }

  .position-0 {
    bottom: -40px;
  }

  .position-1 {
    left: -50px;
  }

  .position-2 {
    top: -40px;
  }

  .position-3 {
    right: -50px;
  }

  .controls {
    padding: 8px;
    gap: 6px;
  }

  .action-btn {
    padding: 8px 12px;
    font-size: 11px;
  }

  .game-footer {
    display: none;
  }

  .hand-indicator {
    bottom: 5px;
    right: 5px;
    padding: 8px 12px;
    min-width: 120px;
  }

  .hand-icon {
    font-size: 16px;
  }

  .hand-name {
    font-size: 12px;
  }
}

/* Accessibility and small-screen refinements */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.setup-controls {
  width: min(900px, 100%);
  min-inline-size: 0;
  border: 0;
}

.setup-controls > legend {
  padding: 0 4px;
  color: #f6e05e;
  font-weight: 700;
}

.setup-controls label,
.bot-config label {
  min-width: 0;
}

.setup-controls input,
.setup-controls select,
.bot-config input,
.bot-config select,
.replay select {
  min-height: 38px;
  max-width: 100%;
}

.checkbox-label {
  display: flex !important;
  align-items: center;
  gap: 8px;
}

.checkbox-label input {
  min-height: auto;
}

.bot-config {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  min-inline-size: 0;
  border: 1px solid rgba(246, 224, 94, 0.35);
  border-radius: 8px;
  padding: 8px;
}

.bot-config legend {
  padding: 0 4px;
  color: #f6e05e;
  font-size: 12px;
  font-weight: 700;
}

.bot-config label {
  display: grid;
  gap: 4px;
  font-size: 12px;
}

.game-controls {
  width: min(900px, 100%);
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
}

.rebuy-controls {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

.action-btn,
.game-btn,
.replay button {
  min-height: 44px;
}

.action-btn:focus-visible,
.game-btn:focus-visible,
.replay button:focus-visible,
.raise-slider:focus-visible,
.setup-controls input:focus-visible,
.setup-controls select:focus-visible,
.bot-config input:focus-visible,
.bot-config select:focus-visible,
.replay select:focus-visible,
.contact-link:focus-visible,
.insights summary:focus-visible {
  outline: 3px solid #f6e05e;
  outline-offset: 3px;
}

.replay button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.winner-announcement {
  max-width: calc(100vw - 32px);
  max-height: calc(100dvh - 32px);
  overflow: auto;
}

.winner-text {
  text-align: center;
}

.winner-summary {
  display: grid;
  gap: 6px;
  text-align: center;
}

.winner-next {
  margin-top: 8px;
}

.replay-stacks {
  display: grid;
  gap: 0.25rem;
  margin: 0;
  padding: 0.65rem;
  list-style: none;
  border-radius: 0.5rem;
  background: rgba(15, 23, 42, 0.55);
  font-size: 0.8rem;
}

.secondary {
  background: #475569;
}

.tournament-results {
  width: min(900px, 100%);
  padding: 1.25rem;
  border: 1px solid rgba(246, 224, 94, 0.5);
  border-radius: 0.85rem;
  background: rgba(246, 224, 94, 0.1);
  color: #fefce8;
}

.tournament-results h2 {
  margin-bottom: 0.5rem;
}

.tournament-results ol {
  display: grid;
  gap: 0.35rem;
  margin: 0;
  padding-left: 1.5rem;
}

@media (max-width: 768px) {
  .table-felt {
    width: calc(100% - 120px);
    max-width: 900px;
  }

  .bot-config {
    grid-template-columns: 1fr;
  }

  .game-controls {
    margin-top: 10px;
  }
}

@media (max-width: 480px) {
  .table-felt {
    width: calc(100% - 90px);
  }

  .hand-indicator {
    position: static;
    width: min(100%, 320px);
    margin: 0 auto;
  }

  .winner-announcement {
    padding: 24px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .poker-table *,
  .poker-table *::before,
  .poker-table *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
