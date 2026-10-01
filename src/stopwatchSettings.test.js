import test from "node:test";
import assert from "node:assert/strict";
import { getStopwatchDelay, isValidStopwatchDelay } from "./stopwatchSettings.js";

test("stored stopwatch delay accepts whole seconds including both limits", () => {
  for (const value of [1, 10, 37, 99]) {
    assert.equal(getStopwatchDelay(String(value)), value);
    assert.equal(isValidStopwatchDelay(value), true);
  }
});

test("missing, corrupt, fractional and out-of-range delays use the ten second default", () => {
  for (const value of [null, undefined, "", "broken", "NaN", "Infinity", "0", "-1", "100", "10.5"]) {
    assert.equal(getStopwatchDelay(value), 10);
    assert.equal(isValidStopwatchDelay(Number(value)), false);
  }
});
