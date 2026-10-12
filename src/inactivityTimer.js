export function createInactivityTimer({
  delaySeconds,
  onCountdown = () => {},
  onExpire,
  isVisible = () => true,
  now = Date.now,
  scheduleTimeout = setTimeout,
  cancelTimeout = clearTimeout,
  scheduleInterval = setInterval,
  cancelInterval = clearInterval,
}) {
  let deadline;
  let timeout;
  let disposed = false;
  let expiryReported = false;

  const update = () => {
    if (disposed) return;
    const remaining = Math.max(0, deadline - now());
    onCountdown(Math.ceil(remaining / 1000));
    if (remaining === 0 && isVisible() && !expiryReported) {
      expiryReported = true;
      onExpire();
    }
  };

  // Resume checks the original deadline; only user activity starts a new delay.
  const resume = () => {
    if (disposed) return;
    cancelTimeout(timeout);
    update();
    if (!expiryReported && isVisible() && deadline > now()) {
      timeout = scheduleTimeout(update, deadline - now());
    }
  };

  const reset = () => {
    if (disposed) return;
    deadline = now() + delaySeconds * 1000;
    expiryReported = false;
    resume();
  };

  const interval = scheduleInterval(update, 250);
  reset();
  return {
    reset,
    resume,
    getRemainingSeconds(currentTime = now()) {
      return Math.max(0, Math.ceil((deadline - currentTime) / 1000));
    },
    dispose() {
      disposed = true;
      cancelTimeout(timeout);
      cancelInterval(interval);
    },
  };
}
