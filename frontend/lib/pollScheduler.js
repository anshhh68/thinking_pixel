// Shared poll scheduler — one setInterval drives all consumers.
// Avoids thundering herd when multiple features poll independently.

const consumers = new Map(); // key → { intervalMs, fn, lastRun, consecutiveFails, currentInterval }
let schedulerInterval = null;
let paused = false;

const BASE_TICK = 5000; // 5s base tick

function tick() {
  if (paused) return;
  const now = Date.now();
  for (const [key, c] of consumers.entries()) {
    if (now - c.lastRun >= c.currentInterval) {
      c.lastRun = now;
      Promise.resolve(c.fn()).then(() => {
        // reset backoff on success
        c.consecutiveFails = 0;
        c.currentInterval = c.intervalMs;
      }).catch(() => {
        c.consecutiveFails = (c.consecutiveFails || 0) + 1;
        if (c.consecutiveFails >= 3) {
          c.currentInterval = Math.min(c.currentInterval * 2, 60000);
        }
      });
    }
  }
}

function start() {
  if (schedulerInterval) return;
  schedulerInterval = setInterval(tick, BASE_TICK);
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      paused = document.hidden;
      if (!paused) tick(); // immediate run on tab focus
    });
  }
}

export function register(key, intervalMs, fn) {
  consumers.set(key, { intervalMs, fn, lastRun: 0, consecutiveFails: 0, currentInterval: intervalMs });
  start();
  // run immediately on first register
  fn();
}

export function unregister(key) {
  consumers.delete(key);
  if (consumers.size === 0 && schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}
