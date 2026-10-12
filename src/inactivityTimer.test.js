import test from "node:test";
import assert from "node:assert/strict";
import { createInactivityTimer } from "./inactivityTimer.js";

function setup(delaySeconds = 3) {
  let time = 1000;
  let visible = true;
  let nextId = 0;
  const tasks = new Map();
  const countdowns = [];
  let expiries = 0;
  const schedule = (callback, delay, repeat = false) => {
    const id = ++nextId;
    tasks.set(id, { callback, at: time + delay, delay, repeat });
    return id;
  };
  const timer = createInactivityTimer({
    delaySeconds,
    onCountdown: (remaining) => countdowns.push(remaining),
    onExpire: () => expiries++,
    isVisible: () => visible,
    now: () => time,
    scheduleTimeout: (callback, delay) => schedule(callback, delay),
    cancelTimeout: (id) => tasks.delete(id),
    scheduleInterval: (callback, delay) => schedule(callback, delay, true),
    cancelInterval: (id) => tasks.delete(id),
  });
  return {
    timer,
    countdowns,
    get countdown() { return countdowns.at(-1); },
    get expiries() { return expiries; },
    get pendingTasks() { return tasks.size; },
    setVisible(value) { visible = value; },
    freezeFor(milliseconds) { time += milliseconds; },
    advance(milliseconds) {
      const end = time + milliseconds;
      while (true) {
        const next = [...tasks.entries()].sort((a, b) => a[1].at - b[1].at)[0];
        if (!next || next[1].at > end) break;
        const [id, task] = next;
        time = Math.max(time, task.at);
        if (task.repeat) tasks.set(id, { ...task, at: time + task.delay });
        else tasks.delete(id);
        task.callback();
      }
      time = end;
    },
  };
}

test("an expiry while hidden is recovered immediately on return without a tap", () => {
  const state = setup();
  state.setVisible(false);
  state.advance(4000);
  assert.equal(state.expiries, 0);
  assert.equal(state.countdown, 0);
  state.setVisible(true);
  state.timer.resume();
  assert.equal(state.expiries, 1);
  assert.equal(state.countdown, 0);
  state.timer.resume();
  state.advance(1000);
  assert.equal(state.expiries, 1);
  state.timer.dispose();
});

test("returning before expiry preserves the remaining delay rather than restarting it", () => {
  const state = setup(10);
  state.advance(3000);
  state.setVisible(false);
  state.timer.resume();
  state.advance(2000);
  state.setVisible(true);
  state.timer.resume();
  assert.equal(state.countdown, 5);
  state.advance(4999);
  assert.equal(state.expiries, 0);
  state.advance(1);
  assert.equal(state.expiries, 1);
  state.timer.dispose();
});

test("resume uses elapsed wall time even if every background callback was suspended", () => {
  const state = setup();
  state.setVisible(false);
  state.freezeFor(10000);
  assert.equal(state.expiries, 0);
  state.setVisible(true);
  state.timer.resume();
  assert.equal(state.countdown, 0);
  assert.equal(state.expiries, 1);
  state.timer.dispose();
});

test("the periodic deadline check recovers expiry if no lifecycle event is delivered", () => {
  const state = setup();
  state.setVisible(false);
  state.advance(4000);
  state.setVisible(true);
  state.advance(250);
  assert.equal(state.expiries, 1);
  state.timer.dispose();
});

test("only actual activity resets the countdown and starts a fresh expiry", () => {
  const state = setup();
  state.advance(2000);
  assert.equal(state.countdown, 1);
  state.timer.reset();
  assert.equal(state.countdown, 3);
  state.advance(2000);
  assert.equal(state.expiries, 0);
  state.advance(1000);
  assert.equal(state.expiries, 1);
  state.timer.reset();
  state.advance(3000);
  assert.equal(state.expiries, 2);
  state.timer.dispose();
});

test("disposing prevents callbacks and clears timers, including on late lifecycle events", () => {
  const state = setup();
  state.timer.dispose();
  assert.equal(state.pendingTasks, 0);
  state.freezeFor(10000);
  state.timer.resume();
  state.timer.reset();
  state.advance(10000);
  assert.equal(state.expiries, 0);
  assert.equal(state.countdowns.length, 1);
});

test("reading the countdown for shared display ticks never changes the actual expiry deadline", () => {
  const state = setup(3);
  state.advance(350);
  state.timer.reset();
  assert.equal(state.timer.getRemainingSeconds(), 3);
  state.advance(650);
  assert.equal(state.timer.getRemainingSeconds(), 3);
  state.advance(1000);
  assert.equal(state.timer.getRemainingSeconds(), 2);
  state.advance(1000);
  assert.equal(state.timer.getRemainingSeconds(), 1);
  assert.equal(state.expiries, 0);
  state.advance(350);
  assert.equal(state.timer.getRemainingSeconds(), 0);
  assert.equal(state.expiries, 1);
  state.timer.dispose();
});
