// ============================================================
// PART 1 — Speed Optimizations: debounce, throttle, memoize
// ============================================================

import { logger } from "@/lib/logger";

/**
 * Creates a debounced version of `fn` that delays execution
 * until `ms` milliseconds have elapsed since the last call.
 * The returned function has a `.cancel()` method.
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  ms: number,
): T & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const debounced = ((...args: unknown[]) => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, ms);
  }) as T & { cancel: () => void };

  debounced.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return debounced;
}

/**
 * Creates a throttled version of `fn` that executes at most
 * once per `ms` milliseconds. First call executes immediately.
 */
export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  ms: number,
): T {
  let last = 0;

  return ((...args: unknown[]) => {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn(...args);
    }
  }) as T;
}

/**
 * Creates a memoized version of `fn` with an LRU-style cache.
 * Uses JSON.stringify of the first argument as cache key.
 * @param maxSize Maximum number of cached entries (default 100).
 */
export function memoize<A, R>(
  fn: (arg: A) => R,
  maxSize = 100,
): (arg: A) => R {
  const cache = new Map<string, R>();

  return (arg: A): R => {
    const key = JSON.stringify(arg);
    if (cache.has(key)) return cache.get(key)!;

    const result = fn(arg);

    if (cache.size >= maxSize) {
      // Evict oldest (first inserted) entry
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) cache.delete(firstKey);
    }

    cache.set(key, result);
    return result;
  };
}

// IDENTITY_SEAL: PART-1 | role=perf-utils | inputs=fn,ms | outputs=debounced,throttled,memoized
