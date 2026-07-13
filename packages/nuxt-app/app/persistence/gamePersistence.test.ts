import { describe, expect, it } from "vitest";
import { deserializeGame, serializeGame } from "./gamePersistence";
import type { GameState } from "../composables/usePoker";

const state = {
  players: [], handArchives: [], phase: "waiting", mode: "cash", handNumber: 0,
} as unknown as GameState;

describe("persistência de partida", () => {
  it("serializa e restaura um estado compatível", () => {
    expect(deserializeGame(serializeGame(state))).toEqual(state);
  });

  it("rejeita estado corrompido ou de versão incompatível", () => {
    expect(deserializeGame("{")) .toBeNull();
    expect(deserializeGame(JSON.stringify({ version: 3, state }))).toBeNull();
  });
});
