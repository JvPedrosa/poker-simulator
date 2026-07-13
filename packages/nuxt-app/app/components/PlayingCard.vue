<template>
  <div class="card" :class="[suitClass, { 'face-down': !showFace }]">
    <template v-if="showFace && card">
      <div class="card-corner top-left">
        <span class="rank">{{ card.rank }}</span>
        <span class="suit-symbol">{{ suitSymbol }}</span>
      </div>
      <div class="card-center">
        <span class="suit-symbol large">{{ suitSymbol }}</span>
      </div>
      <div class="card-corner bottom-right">
        <span class="rank">{{ card.rank }}</span>
        <span class="suit-symbol">{{ suitSymbol }}</span>
      </div>
    </template>
    <template v-else>
      <div class="card-back">
        <div class="pattern"></div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Card } from '~/composables/usePoker'

const props = defineProps<{
  card?: Card
  showFace?: boolean
}>()

const suitSymbols: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠'
}

const suitSymbol = computed(() => props.card ? suitSymbols[props.card.suit] : '')

const suitClass = computed(() => {
  if (!props.card || !props.showFace) return ''
  return props.card.suit === 'hearts' || props.card.suit === 'diamonds' ? 'red' : 'black'
})
</script>

<style scoped>
.card {
  width: 70px;
  height: 100px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Georgia', serif;
  transition: transform 0.2s;
}

.card:hover {
  transform: translateY(-5px);
}

.card.red {
  color: #e53935;
}

.card.black {
  color: #212121;
}

.card-corner {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 12px;
  line-height: 1;
}

.top-left {
  top: 5px;
  left: 5px;
}

.bottom-right {
  bottom: 5px;
  right: 5px;
  transform: rotate(180deg);
}

.rank {
  font-weight: bold;
  font-size: 16px;
}

.card-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.suit-symbol.large {
  font-size: 32px;
}

.card.face-down {
  background: linear-gradient(135deg, #1a237e 0%, #283593 100%);
}

.card-back {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  overflow: hidden;
}

.pattern {
  width: 50px;
  height: 80px;
  background: repeating-linear-gradient(
    45deg,
    #3949ab,
    #3949ab 2px,
    #1a237e 2px,
    #1a237e 8px
  );
  border: 2px solid #5c6bc0;
  border-radius: 4px;
}

/* ===== VERSÃO MOBILE ===== */
@media (max-width: 768px) {
  .card {
    width: 50px;
    height: 72px;
    border-radius: 6px;
  }

  .card-corner {
    font-size: 9px;
  }

  .top-left {
    top: 3px;
    left: 3px;
  }

  .bottom-right {
    bottom: 3px;
    right: 3px;
  }

  .rank {
    font-size: 12px;
  }

  .suit-symbol.large {
    font-size: 22px;
  }

  .pattern {
    width: 35px;
    height: 55px;
  }
}

@media (max-width: 480px) {
  .card {
    width: 40px;
    height: 58px;
    border-radius: 4px;
  }

  .card-corner {
    font-size: 8px;
  }

  .top-left {
    top: 2px;
    left: 2px;
  }

  .bottom-right {
    bottom: 2px;
    right: 2px;
  }

  .rank {
    font-size: 10px;
  }

  .suit-symbol.large {
    font-size: 18px;
  }

  .pattern {
    width: 28px;
    height: 45px;
  }
}

/* ===== LANDSCAPE MOBILE ===== */
@media (max-height: 500px) {
  .card {
    width: 35px;
    height: 50px;
    border-radius: 4px;
  }

  .card-corner {
    font-size: 7px;
  }

  .top-left {
    top: 2px;
    left: 2px;
  }

  .bottom-right {
    bottom: 2px;
    right: 2px;
  }

  .rank {
    font-size: 9px;
  }

  .suit-symbol.large {
    font-size: 16px;
  }

  .pattern {
    width: 24px;
    height: 38px;
  }
}
</style>
