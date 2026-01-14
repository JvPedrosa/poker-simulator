<template>
  <div class="app">
    <header class="header">
      <h1>🃏 Poker Simulator</h1>
    </header>
    <main>
      <PokerTable />
    </main>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #1a1a2e;
  color: white;
  overflow-x: hidden;
}

.app {
  min-height: 100vh;
}

.header {
  background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
  padding: 20px;
  text-align: center;
  border-bottom: 2px solid #4a5568;
}

.header h1 {
  color: #f6e05e;
  font-size: 2rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

main {
  padding: 20px;
}
</style>
