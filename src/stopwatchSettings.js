export const DEFAULT_STOPWATCH_DELAY = 10;
export const MIN_STOPWATCH_DELAY = 1;
export const MAX_STOPWATCH_DELAY = 99;
export const STOPWATCH_DELAY_STORAGE_KEY = "fullscreen_stopwatch_delay";

export function isValidStopwatchDelay(value) {
  return Number.isInteger(value) && value >= MIN_STOPWATCH_DELAY && value <= MAX_STOPWATCH_DELAY;
}

export function getStopwatchDelay(storedValue) {
  const seconds = Number(storedValue);
  return isValidStopwatchDelay(seconds) ? seconds : DEFAULT_STOPWATCH_DELAY;
}
