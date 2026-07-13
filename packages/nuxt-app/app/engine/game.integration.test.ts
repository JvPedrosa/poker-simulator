import { describe, expect, it } from "vitest";
import { applyAction, legalActions, startHand } from "./game";
import type { EngineState, PokerAction } from "./types";

const chipTotal = (state: EngineState) =>
  state.players.reduce((total, player) => total + player.chips, 0);

/**
 * Before showdown, contributed chips live in `pot`; at showdown they have
 * already been paid back out to the winning players.
 */
const expectConservation = (state: EngineState, initialTotal: number) => {
  const accountedChips = chipTotal(state) + (state.street === "showdown" ? 0 : state.pot);
  expect(accountedChips).toBe(initialTotal);
};

const act = (state: EngineState, action: PokerAction) => applyAction(state, action);

describe("fluxos integrados do motor", () => {
  it("does not reopen betting for players that acted before a short all-in", () => {
    const initialTotal = 1_030;
    let state = startHand([300, 130, 300, 300], { dealer: 0, seed: 41 });
    expect(state.turn).toBe(3);
    expectConservation(state, initialTotal);

    // Player 3 makes a full raise to 100; player 0 calls it.
    state = act(state, { type: "raiseTo", amount: 100 });
    expectConservation(state, initialTotal);
    state = act(state, { type: "call" });
    expectConservation(state, initialTotal);

    // The small blind can only raise from 100 to 130, below the full raise
    // size of 80. Player 2 has not acted and still retains raise rights.
    state = act(state, { type: "allIn" });
    expect(state.currentBet).toBe(130);
    expect(state.lastFullRaise).toBe(80);
    expect(state.turn).toBe(2);
    expect(legalActions(state).minRaiseTo).toBe(210);
    expectConservation(state, initialTotal);

    state = act(state, { type: "call" });
    expect(state.turn).toBe(3);

    // Player 3 raised before the short all-in, so the extra 30 only gives
    // them call/fold options. It may not be converted into an all-in re-raise.
    expect(legalActions(state)).toMatchObject({
      call: 30,
      minRaiseTo: null,
      allIn: false,
    });
    expect(() => act(state, { type: "raiseTo", amount: 210 })).toThrow("Raise ilegal");
    expect(() => act(state, { type: "allIn" })).toThrow("All-in ilegal");

    state = act(state, { type: "call" });
    expect(state.turn).toBe(0);
    expect(legalActions(state)).toMatchObject({ call: 30, minRaiseTo: null, allIn: false });
    state = act(state, { type: "call" });

    expect(state.street).toBe("flop");
    expect(state.board).toHaveLength(3);
    expect(state.turn).toBe(2);
    expectConservation(state, initialTotal);
  });

  it("creates every side pot through a complete multiple-all-in hand and conserves chips", () => {
    const initialTotal = 550;
    let state = startHand([50, 100, 200, 200], { dealer: 0, seed: 53 });
    expect(state.turn).toBe(3);
    expectConservation(state, initialTotal);

    // Final contributions are 50, 100, 200 and 200. This produces one main
    // pot and two genuinely contested side pots: 200, 150 and 200.
    for (const action of [
      { type: "allIn" },
      { type: "allIn" },
      { type: "allIn" },
      { type: "allIn" },
    ] as PokerAction[]) {
      state = act(state, action);
      expectConservation(state, initialTotal);
    }

    expect(state.street).toBe("showdown");
    expect(state.board).toHaveLength(5);
    expect(state.players.map((player) => player.contribution)).toEqual([50, 100, 200, 200]);
    expect(state.pot).toBe(550);
    expect(
      state.log
        .filter((entry) => entry.startsWith("Pote "))
        .map((entry) => Number(entry.match(/\((\d+)\)/)?.[1])),
    ).toEqual([200, 150, 200]);
    expect(chipTotal(state)).toBe(initialTotal);
    expect(state.winners.length).toBeGreaterThan(0);
  });

  it("uses the correct heads-up action order before and after every street", () => {
    const initialTotal = 400;
    let state = startHand([200, 200], { dealer: 0, seed: 67 });

    expect([state.dealer, state.smallBlindIndex, state.bigBlindIndex, state.turn]).toEqual([
      0,
      0,
      1,
      0,
    ]);
    expectConservation(state, initialTotal);

    // The dealer/small blind acts first preflop; the big blind acts first on
    // every postflop street.
    state = act(state, { type: "call" });
    expect(state.turn).toBe(1);
    state = act(state, { type: "check" });
    expect(state.street).toBe("flop");
    expect(state.turn).toBe(1);
    expect(state.board).toHaveLength(3);
    expectConservation(state, initialTotal);

    state = act(state, { type: "check" });
    expect(state.turn).toBe(0);
    state = act(state, { type: "check" });
    expect(state.street).toBe("turn");
    expect(state.turn).toBe(1);
    expect(state.board).toHaveLength(4);
    expectConservation(state, initialTotal);

    state = act(state, { type: "check" });
    expect(state.turn).toBe(0);
    state = act(state, { type: "check" });
    expect(state.street).toBe("river");
    expect(state.turn).toBe(1);
    expect(state.board).toHaveLength(5);
    expectConservation(state, initialTotal);

    state = act(state, { type: "check" });
    expect(state.turn).toBe(0);
    state = act(state, { type: "check" });
    expect(state.street).toBe("showdown");
    expect(state.dealer).toBe(0);
    expect(chipTotal(state)).toBe(initialTotal);
  });
});
