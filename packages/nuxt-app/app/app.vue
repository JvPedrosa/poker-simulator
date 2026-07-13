<template>
  <div class="app">
    <header class="header">
      <h1><span aria-hidden="true">🃏 </span>Poker Simulator</h1>
    </header>
    <a class="skip-link" href="#main-content">Pular para o conteúdo principal</a>
    <main id="main-content" tabindex="-1">
      <PokerTable />
    </main>
  </div>
</template>

<script setup lang="ts">
useHead({
  htmlAttrs: { lang: 'pt-BR' },
  title: 'Poker Simulator'
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  overflow: hidden;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #1a1a2e;
  color: white;
}

.app {
  height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.skip-link {
  position: fixed;
  z-index: 1000;
  top: 8px;
  left: 8px;
  transform: translateY(-150%);
  padding: 10px 14px;
  border-radius: 6px;
  background: #f6e05e;
  color: #1a202c;
  font-weight: 700;
  text-decoration: none;
}

.skip-link:focus {
  transform: translateY(0);
  outline: 3px solid #fff;
  outline-offset: 2px;
}

:focus-visible {
  outline: 3px solid #f6e05e;
  outline-offset: 3px;
}

.header {
  background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
  padding: 15px;
  text-align: center;
  border-bottom: 2px solid #4a5568;
  flex-shrink: 0;
}

.header h1 {
  color: #f6e05e;
  font-size: 1.8rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

main {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

/* ===== VERSÃO MOBILE ===== */
@media (max-width: 768px) {
  .header {
    padding: 10px;
  }

  .header h1 {
    font-size: 1.3rem;
  }
}

@media (max-width: 480px) {
  .header {
    padding: 8px;
  }

  .header h1 {
    font-size: 1.1rem;
  }
}
</style>
