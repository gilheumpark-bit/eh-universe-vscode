// ============================================================
// ARI Engine + Circuit Breaker — Provider Health Tracking
// ============================================================
// Adaptive Reliability Index: tracks provider health scores
// with circuit breaker pattern for fault isolation.

// ============================================================
// PART 1 — Types
// ============================================================

interface ARIState {
  provider: string;
  score: number;
  circuitState: 'closed' | 'open' | 'half-open';
  errorStreak: number;
  lastErrorAt: number;
  totalRequests: number;
  totalFailures: number;
}

export interface ARIStatus {
  provider: string;
  score: number;
  circuit: 'closed' | 'open' | 'half-open';
}

// ============================================================
// PART 2 — Constants
// ============================================================

const INITIAL_SCORE = 100;
const MIN_SCORE = 0;
const MAX_SCORE = 100;

// Score adjustments
const SUCCESS_BOOST = 5;
const FAILURE_PENALTY = 15;

// Circuit breaker thresholds
const OPEN_THRESHOLD_STREAK = 5;
const OPEN_THRESHOLD_SCORE = 20;
const HALF_OPEN_COOLDOWN_MS = 30_000; // 30 seconds
const HALF_OPEN_SUCCESSES_TO_CLOSE = 3;

// ============================================================
// PART 3 — ARIEngine class
// ============================================================

export class ARIEngine {
  private states = new Map<string, ARIState>();
  private halfOpenSuccesses = new Map<string, number>();

  // ── State access ──

  private getOrCreate(provider: string): ARIState {
    let state = this.states.get(provider);
    if (!state) {
      state = {
        provider,
        score: INITIAL_SCORE,
        circuitState: 'closed',
        errorStreak: 0,
        lastErrorAt: 0,
        totalRequests: 0,
        totalFailures: 0,
      };
      this.states.set(provider, state);
    }
    return state;
  }

  // ── Record success ──

  recordSuccess(provider: string): void {
    const state = this.getOrCreate(provider);
    state.totalRequests++;
    state.errorStreak = 0;
    state.score = Math.min(MAX_SCORE, state.score + SUCCESS_BOOST);

    if (state.circuitState === 'half-open') {
      const count = (this.halfOpenSuccesses.get(provider) ?? 0) + 1;
      this.halfOpenSuccesses.set(provider, count);
      if (count >= HALF_OPEN_SUCCESSES_TO_CLOSE) {
        state.circuitState = 'closed';
        this.halfOpenSuccesses.delete(provider);
      }
    }
  }

  // ── Record failure ──

  recordFailure(provider: string, _error: string): void {
    const state = this.getOrCreate(provider);
    state.totalRequests++;
    state.totalFailures++;
    state.errorStreak++;
    state.lastErrorAt = Date.now();
    state.score = Math.max(MIN_SCORE, state.score - FAILURE_PENALTY);

    // Transition to open if thresholds breached
    if (
      state.circuitState === 'closed' &&
      (state.errorStreak >= OPEN_THRESHOLD_STREAK || state.score <= OPEN_THRESHOLD_SCORE)
    ) {
      state.circuitState = 'open';
      this.halfOpenSuccesses.delete(provider);
    }

    // Half-open fails again -> reopen
    if (state.circuitState === 'half-open') {
      state.circuitState = 'open';
      this.halfOpenSuccesses.delete(provider);
    }
  }

  // ── Health check (with half-open transition) ──

  isHealthy(provider: string): boolean {
    const state = this.states.get(provider);
    if (!state) return true; // unknown provider assumed healthy

    if (state.circuitState === 'closed') return true;

    if (state.circuitState === 'open') {
      const elapsed = Date.now() - state.lastErrorAt;
      if (elapsed >= HALF_OPEN_COOLDOWN_MS) {
        state.circuitState = 'half-open';
        this.halfOpenSuccesses.set(provider, 0);
        return true; // allow a probe request
      }
      return false;
    }

    // half-open: allow requests (probing)
    return true;
  }

  // ── Best provider selection ──

  getBestProvider(): string | null {
    let best: ARIState | null = null;
    for (const state of this.states.values()) {
      if (!this.isHealthy(state.provider)) continue;
      if (!best || state.score > best.score) {
        best = state;
      }
    }
    return best?.provider ?? null;
  }

  // ── Status report ──

  getStatus(): ARIStatus[] {
    const result: ARIStatus[] = [];
    for (const state of this.states.values()) {
      // Refresh half-open transitions on read
      this.isHealthy(state.provider);
      result.push({
        provider: state.provider,
        score: state.score,
        circuit: state.circuitState,
      });
    }
    return result;
  }

  // ── Score lookup ──

  getScore(provider: string): number {
    return this.states.get(provider)?.score ?? INITIAL_SCORE;
  }

  getCircuitState(provider: string): 'closed' | 'open' | 'half-open' {
    const state = this.states.get(provider);
    if (!state) return 'closed';
    // Refresh transition
    this.isHealthy(provider);
    return state.circuitState;
  }
}
