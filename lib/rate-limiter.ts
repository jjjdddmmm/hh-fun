interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits = new Map<string, RateLimitEntry>();
  
  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 60 * 1000 // 1 minute
  ) {}

  isAllowed(key: string): boolean {
    const now = Date.now();
    const entry = this.limits.get(key);

    // If no entry exists or window has expired, create new entry
    if (!entry || now >= entry.resetTime) {
      this.limits.set(key, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return true;
    }

    // If under limit, increment and allow
    if (entry.count < this.maxRequests) {
      entry.count++;
      return true;
    }

    // Over limit
    return false;
  }

  getRemainingRequests(key: string): number {
    const entry = this.limits.get(key);
    if (!entry) {
      return this.maxRequests;
    }

    const now = Date.now();
    if (now >= entry.resetTime) {
      return this.maxRequests;
    }

    return Math.max(0, this.maxRequests - entry.count);
  }

  getResetTime(key: string): number {
    const entry = this.limits.get(key);
    if (!entry) {
      return Date.now() + this.windowMs;
    }

    return entry.resetTime;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now >= entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }
}

// Global rate limiters for different services
export const zillowRateLimiter = new RateLimiter(50, 60 * 1000); // 50 requests per minute
export const aiRateLimiter = new RateLimiter(20, 60 * 1000); // 20 requests per minute
export const generalRateLimiter = new RateLimiter(100, 60 * 1000); // 100 requests per minute

// Auto-cleanup every 5 minutes
setInterval(() => {
  zillowRateLimiter.cleanup();
  aiRateLimiter.cleanup();
  generalRateLimiter.cleanup();
}, 5 * 60 * 1000);