/**
 * ScanCache — server-side TTL cache for DynamoDB full-table scans.
 *
 * Eliminates redundant scans when users sort, paginate, or filter
 * without data having changed. Write-through invalidation ensures
 * freshness after create/update/delete.
 *
 * Memory lives in the Node.js process only — never sent to the browser.
 * Each entity type gets its own cache instance (leads, members, users, locations).
 */

export interface ScanCacheOptions {
  /** Cache TTL in milliseconds. Default: 30 seconds. */
  ttlMs?: number;
  /** Label for debug logging. */
  label?: string;
}

export class ScanCache<T> {
  private items: T[] | null = null;
  private cachedAt = 0;
  private readonly ttlMs: number;
  private readonly label: string;
  /** Prevents concurrent scan requests from triggering duplicate DynamoDB calls. */
  private inflightScan: Promise<T[]> | null = null;

  constructor(options: ScanCacheOptions = {}) {
    this.ttlMs = options.ttlMs ?? 30_000;
    this.label = options.label ?? "ScanCache";
  }

  /**
   * Get cached items if fresh, otherwise execute the scan function.
   * Deduplicates concurrent calls — if two requests arrive while the cache
   * is stale, only one DynamoDB scan is performed.
   */
  async getOrScan(scanFn: () => Promise<T[]>): Promise<T[]> {
    const now = Date.now();

    // Cache hit
    if (this.items !== null && now - this.cachedAt < this.ttlMs) {
      return this.items;
    }

    // Deduplicate concurrent scans
    if (this.inflightScan) {
      return this.inflightScan;
    }

    this.inflightScan = scanFn()
      .then((results) => {
        this.items = results;
        this.cachedAt = Date.now();
        this.inflightScan = null;
        return results;
      })
      .catch((err) => {
        this.inflightScan = null;
        throw err;
      });

    return this.inflightScan;
  }

  /** Invalidate the cache. Next getOrScan() will re-scan DynamoDB. */
  invalidate(): void {
    this.items = null;
    this.cachedAt = 0;
  }
}
