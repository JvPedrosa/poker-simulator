<template>
  <article
    class="player-seat"
    :class="{
    'is-current': player.isCurrentPlayer, 
    'is-dealer': player.isDealer,
    'is-folded': player.folded,
    'is-winner': isWinner
    }"
    :aria-label="seatLabel"
    :aria-current="player.isCurrentPlayer ? 'true' : undefined"
  >
    <div class="player-info">
      <div class="player-name">
        {{ player.name }}
        <span v-if="player.isDealer" class="dealer-badge" aria-label="Dealer">D</span>
      </div>
      <div class="player-chips">
        <span class="chip-icon" aria-hidden="true">🪙</span>
        {{ player.chips }}
        <span class="sr-only">fichas</span>
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

    <div v-if="player.folded" class="folded-badge" aria-hidden="true">
      FOLD
    </div>
  </article>
</template>

<script setup lang="ts">
import type { Player } from '~/composables/usePoker'

const props = defineProps<{
  player: Player
  showCards?: boolean
  isWinner?: boolean
}>()

const seatLabel = computed(() => {
  const states = [
    `${props.player.name}, ${props.player.chips} fichas`,
    props.player.isDealer ? 'dealer' : '',
    props.player.isCurrentPlayer ? 'vez atual' : '',
    props.player.folded ? 'desistiu' : '',
    props.player.bet > 0 ? `aposta de ${props.player.bet}` : '',
    props.isWinner ? 'vencedor da mão' : '',
    props.player.handRank && props.showCards ? props.player.handRank.name : ''
  ].filter(Boolean)

  return states.join(', ')
})
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

.player-seat[aria-current='true'] {
  outline: 3px solid #f6e05e;
  outline-offset: 3px;
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

@media (prefers-reduced-motion: reduce) {
  .player-seat {
    transition: none;
  }

  .player-seat.is-winner {
    animation: none;
  }
}

/* ===== VERSÃO MOBILE ===== */
@media (max-width: 768px) {
  .player-seat {
    padding: 8px;
    min-width: 120px;
    border-width: 2px;
    border-radius: 8px;
  }

  .player-name {
    font-size: 11px;
  }

  .dealer-badge {
    width: 16px;
    height: 16px;
    font-size: 10px;
  }

  .player-chips {
    font-size: 12px;
    margin-top: 3px;
  }

  .chip-icon {
    font-size: 14px;
  }

  .player-cards {
    margin: 6px 0;
  }

  .player-bet {
    padding: 3px 8px;
    font-size: 10px;
    margin-top: 5px;
  }

  .hand-rank {
    padding: 3px 8px;
    font-size: 9px;
    margin-top: 5px;
  }

  .folded-badge {
    padding: 3px 10px;
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .player-seat {
    padding: 6px;
    min-width: 90px;
  }

  .player-name {
    font-size: 10px;
  }

  .player-chips {
    font-size: 11px;
  }

  .chip-icon {
    font-size: 12px;
  }
}

/* ===== LANDSCAPE MOBILE ===== */
@media (max-height: 500px) {
  .player-seat {
    padding: 5px;
    min-width: 80px;
    border-width: 2px;
  }

  .player-name {
    font-size: 9px;
  }

  .dealer-badge {
    width: 14px;
    height: 14px;
    font-size: 8px;
  }

  .player-chips {
    font-size: 10px;
  }

  .chip-icon {
    font-size: 11px;
  }

  .player-cards {
    margin: 4px 0;
  }

  .player-bet {
    padding: 2px 6px;
    font-size: 9px;
  }

  .hand-rank {
    padding: 2px 6px;
    font-size: 8px;
  }

  .folded-badge {
    padding: 2px 8px;
    font-size: 10px;
  }
}
</style>
