# 🃏 Poker Simulator

Simulador de poker Texas Hold'em desenvolvido com Nuxt 4.

## 🎮 Funcionalidades

- Mesa de poker visual com 4 jogadores
- Cartas com design estilizado (frente e verso)
- Fases completas do jogo: Pre-Flop, Flop, Turn, River e Showdown
- Ações do jogador: Fold, Check, Call, Raise, All-In
- Sistema de blinds (Small/Big Blind)
- Avaliação automática de mãos (Royal Flush até Carta Alta)
- IA para jogadores adversários
- Sistema de apostas e pote
- Animações e efeitos visuais
- Anúncio do vencedor com ranking de mão

## 🚀 Como executar

```bash
# Navegar até a pasta do projeto
cd nuxt-app

# Instalar dependências (se necessário)
npm install

# Executar em modo desenvolvimento
npm run dev
```

O simulador estará disponível em `http://localhost:3000`

## 📁 Estrutura do Projeto

```
nuxt-app/
├── app/
│   ├── components/
│   │   ├── PlayingCard.vue      # Componente de carta
│   │   ├── PlayerSeat.vue       # Assento do jogador
│   │   └── PokerTable.vue       # Mesa de poker principal
│   ├── composables/
│   │   └── usePoker.ts          # Lógica do jogo
│   └── app.vue                  # Layout principal
├── nuxt.config.ts               # Configuração do Nuxt
└── package.json
```

## 🎯 Como Jogar

1. Clique em "Iniciar Jogo" para começar
2. Você é o "Jogador 1" (posição inferior)
3. Use os botões de ação quando for sua vez:
   - **Fold**: Desistir da mão
   - **Check**: Passar (quando não há aposta)
   - **Call**: Igualar a aposta atual
   - **Raise**: Aumentar a aposta
   - **All-In**: Apostar todas as fichas
4. Os adversários são controlados pela IA
5. Após o showdown, clique em "Nova Rodada" para continuar

## 🃏 Rankings de Mãos

1. Royal Flush
2. Straight Flush
3. Quadra (Four of a Kind)
4. Full House
5. Flush
6. Sequência (Straight)
7. Trinca (Three of a Kind)
8. Dois Pares (Two Pair)
9. Um Par (One Pair)
10. Carta Alta (High Card)

## 🛠️ Tecnologias

- **Nuxt 4.2.2** - Framework Vue.js
- **Vue 3.5.26** - Framework JavaScript reativo
- **TypeScript** - Tipagem estática
- **Vite** - Build tool