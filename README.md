# 🃏 Poker Simulator

Simulador de poker Texas Hold'em desenvolvido com Nuxt 4.

## 🎮 Funcionalidades

- Mesa Texas Hold'em para 2 a 4 jogadores
- Cartas com design estilizado (frente e verso)
- Fases completas do jogo: Pre-Flop, Flop, Turn, River e Showdown
- Ações do jogador: Fold, Check, Call, Raise, All-In
- Sistema de blinds (Small/Big Blind)
- Avaliação automática de mãos (Royal Flush até Carta Alta)
- Motor determinístico com ações validadas, heads-up, short all-ins, side pots e empates
- IA local baseada em equity Monte Carlo, pot odds, SPR, posição, ranges estatísticos e perfis
- Perfis TAG, LAG, recreativo, adaptativo, tight, loose, agressivo e passivo
- Cash game com recompra e saída de mesa
- Torneio com blinds progressivos, eliminação, classificação e premiação simulada
- Histórico persistente, snapshots e replay passo a passo
- Estatísticas por jogador: VPIP, PFR, agressividade, folds, showdowns e vitórias
- Animações e efeitos visuais
- Anúncio do vencedor com ranking de mão

## 🚀 Como executar

```bash
# Na raiz do repositório
npm install
npm run dev
```

O simulador estará disponível em `http://localhost:3000`

## 📁 Estrutura do Projeto

```
nuxt-app/
├── packages/nuxt-app/app/
│   ├── components/
│   │   ├── PlayingCard.vue      # Componente de carta
│   │   ├── PlayerSeat.vue       # Assento do jogador
│   │   └── PokerTable.vue       # Mesa de poker principal
│   ├── engine/                  # Motor puro de regras e apostas
│   ├── composables/             # Adaptador entre motor e interface
│   ├── persistence/             # Persistência versionada
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

- **Nuxt 4** - Framework Vue.js
- **Vue 3.5** - Framework JavaScript reativo
- **TypeScript** - Tipagem estática
- **Vite** - Build tool

## Arquitetura e qualidade

- `engine/game.ts`: regras, turnos, blinds, ações legais e progressão
- `usePoker.ts`: estado, estatísticas e adaptação do motor à interface
- `pokerEvaluator.ts`: melhor combinação de 5 entre até 7 cartas e desempate completo
- `pokerAi.ts`: simulação Monte Carlo apenas com cartas disponíveis ao bot
- Testes reproduzíveis do avaliador com Vitest
- `engine/`: motor puro e determinístico, regras de turnos, blinds e apostas legais

```bash
npm test
npm run build
```

## Qualidade

Os testes cobrem avaliação de mãos, desempates, potes laterais, empates, seed reproduzível, heads-up, ações ilegais, short all-ins, mudança de streets, persistência e IA. O projeto também inclui suporte a teclado, regiões anunciadas para leitor de tela e redução de movimento.
