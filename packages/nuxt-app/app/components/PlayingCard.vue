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
</style>
