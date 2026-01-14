<template>
  <div class="player-seat" :class="{ 
    'is-current': player.isCurrentPlayer, 
    'is-dealer': player.isDealer,
    'is-folded': player.folded,
    'is-winner': isWinner
  }">
    <div class="player-info">
      <div class="player-name">
        {{ player.name }}
        <span v-if="player.isDealer" class="dealer-badge">D</span>
      </div>
      <div class="player-chips">
        <span class="chip-icon">🪙</span>
        {{ player.chips }}
      </div>
    </div>
    
    <div class="player-cards">
      <PlayingCard 
        v-for="(card, index) in player.hand" 
        :key="index"
        :card="card"
        :show-face="showCards"
        class="player-card"
      />
    </div>

    <div v-if="player.bet > 0" class="player-bet">
      Aposta: {{ player.bet }}
    </div>

    <div v-if="player.handRank && showCards" class="hand-rank">
      {{ player.handRank.name }}
    </div>

    <div v-if="player.folded" class="folded-badge">
      FOLD
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Player } from '~/composables/usePoker'

const props = defineProps<{
  player: Player
  showCards?: boolean
  isWinner?: boolean
}>()
</script>

<style scoped>
.player-seat {
  background: linear-gradient(145deg, #2d3748, #1a202c);
  border-radius: 12px;
  padding: 15px;
  min-width: 180px;
  border: 3px solid transparent;
  transition: all 0.3s ease;
  position: relative;
}

.player-seat.is-current {
  border-color: #48bb78;
  box-shadow: 0 0 20px rgba(72, 187, 120, 0.4);
}

.player-seat.is-dealer {
  background: linear-gradient(145deg, #3d4a5c, #2a3444);
}

.player-seat.is-folded {
  opacity: 0.5;
}

.player-seat.is-winner {
  border-color: #f6e05e;
  box-shadow: 0 0 30px rgba(246, 224, 94, 0.5);
  animation: winner-glow 1s ease-in-out infinite alternate;
}

@keyframes winner-glow {
  from {
    box-shadow: 0 0 20px rgba(246, 224, 94, 0.3);
  }
  to {
    box-shadow: 0 0 40px rgba(246, 224, 94, 0.7);
  }
}

.player-info {
  text-align: center;
  margin-bottom: 10px;
}

.player-name {
  color: #e2e8f0;
  font-weight: bold;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.dealer-badge {
  background: #f6e05e;
  color: #1a202c;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

.player-chips {
  color: #68d391;
  font-size: 16px;
  font-weight: bold;
  margin-top: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.chip-icon {
  font-size: 18px;
}

.player-cards {
  display: flex;
  justify-content: center;
  gap: -10px;
  margin: 10px 0;
}

.player-card {
  margin: 0 -5px;
}

.player-card:nth-child(2) {
  transform: rotate(5deg);
}

.player-bet {
  background: #4a5568;
  color: #f6e05e;
  padding: 4px 10px;
  border-radius: 15px;
  font-size: 12px;
  text-align: center;
  margin-top: 8px;
}

.hand-rank {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  padding: 5px 10px;
  border-radius: 15px;
  font-size: 11px;
  text-align: center;
  margin-top: 8px;
  font-weight: bold;
}

.folded-badge {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-15deg);
  background: rgba(229, 62, 62, 0.9);
  color: white;
  padding: 5px 15px;
  border-radius: 5px;
  font-weight: bold;
  font-size: 18px;
}
</style>
