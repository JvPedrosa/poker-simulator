import type { GameState } from "../composables/usePoker";

export const GAME_STORAGE_KEY = "poker-game-v4";
const VERSION = 4;

export function serializeGame(state: GameState) {
  return JSON.stringify({ version: VERSION, state });
}

export function deserializeGame(raw: string | null): GameState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { version?: unknown; state?: unknown };
    if (parsed.version !== VERSION || !parsed.state || typeof parsed.state !== "object") return null;
    const state = parsed.state as Partial<GameState>;
    if (!Array.isArray(state.players) || !Array.isArray(state.handArchives) || typeof state.phase !== "string") return null;
    return state as GameState;
  } catch {
    return null;
  }
}
