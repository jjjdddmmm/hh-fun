/**
 * Simple file-based cache for LlamaParse results
 * Local development and testing only
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { logger } from "@/lib/utils/logger";

export interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
  fileHash: string;
  fileName: string;
}

export class FileCache {
  private static readonly CACHE_DIR = path.join(process.cwd(), '.cache', 'llamaparse');
  private static readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Initialize cache directory
   */
  static async init(): Promise<void> {
    try {
      await fs.mkdir(this.CACHE_DIR, { recursive: true });
      logger.debug('Cache directory initialized', { cacheDir: this.CACHE_DIR });
    } catch (error) {
      logger.warn('Failed to initialize cache directory', { error });
    }
  }

  /**
   * Generate cache key from file buffer
   */
  static generateFileHash(fileBuffer: Buffer): string {
    return crypto
      .createHash('sha256')
      .update(fileBuffer)
      .digest('hex')
      .substring(0, 16); // First 16 chars for shorter filenames
  }

  /**
   * Generate cache filename
   */
  private static getCacheFilePath(fileHash: string, fileSize: number): string {
    const cacheKey = `${fileHash}_${fileSize}`;
    return path.join(this.CACHE_DIR, `${cacheKey}.json`);
  }

  /**
   * Check if cached result exists and is valid
   */
  static async get(fileBuffer: Buffer, originalFileName: string): Promise<any | null> {
    try {
      const fileHash = this.generateFileHash(fileBuffer);
      const cacheFilePath = this.getCacheFilePath(fileHash, fileBuffer.length);

      // Check if cache file exists
      const exists = await fs.access(cacheFilePath).then(() => true).catch(() => false);
      if (!exists) {
        logger.debug('Cache miss - file not found', { fileHash, originalFileName });
        return null;
      }

      // Read and parse cache file
      const cacheContent = await fs.readFile(cacheFilePath, 'utf-8');
      const cacheEntry: CacheEntry = JSON.parse(cacheContent);

      // Check if cache is expired
      const now = Date.now();
      if (now > cacheEntry.expiresAt) {
        logger.debug('Cache expired, removing', { fileHash, originalFileName });
        await this.delete(fileHash, fileBuffer.length).catch(() => {});
        return null;
      }

      logger.info('Cache hit - returning cached result', {
        fileHash,
        originalFileName,
        cachedFileName: cacheEntry.fileName,
        ageMinutes: Math.round((now - cacheEntry.timestamp) / (60 * 1000))
      });

      return cacheEntry.data;

    } catch (error) {
      logger.warn('Cache get failed', { error, originalFileName });
      return null;
    }
  }

  /**
   * Store result in cache
   */
  static async set(
    fileBuffer: Buffer, 
    originalFileName: string, 
    data: any, 
    ttlMs: number = this.DEFAULT_TTL
  ): Promise<void> {
    try {
      await this.init(); // Ensure cache dir exists

      const fileHash = this.generateFileHash(fileBuffer);
      const cacheFilePath = this.getCacheFilePath(fileHash, fileBuffer.length);
      const now = Date.now();

      const cacheEntry: CacheEntry = {
        data,
        timestamp: now,
        expiresAt: now + ttlMs,
        fileHash,
        fileName: originalFileName
      };

      await fs.writeFile(cacheFilePath, JSON.stringify(cacheEntry, null, 2));

      logger.info('Cached LlamaParse result', {
        fileHash,
        originalFileName,
        cacheFile: path.basename(cacheFilePath),
        expiresInHours: Math.round(ttlMs / (60 * 60 * 1000))
      });

    } catch (error) {
      logger.warn('Cache set failed', { error, originalFileName });
      // Don't throw - caching is optional
    }
  }

  /**
   * Delete specific cache entry
   */
  static async delete(fileHash: string, fileSize: number): Promise<void> {
    try {
      const cacheFilePath = this.getCacheFilePath(fileHash, fileSize);
      await fs.unlink(cacheFilePath);
      logger.debug('Cache entry deleted', { fileHash });
    } catch (error) {
      // Ignore errors - file might not exist
    }
  }

  /**
   * Clear all expired cache entries
   */
  static async cleanup(): Promise<void> {
    try {
      await this.init();
      const files = await fs.readdir(this.CACHE_DIR);
      const now = Date.now();
      let cleanedCount = 0;

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        try {
          const filePath = path.join(this.CACHE_DIR, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const cacheEntry: CacheEntry = JSON.parse(content);

          if (now > cacheEntry.expiresAt) {
            await fs.unlink(filePath);
            cleanedCount++;
          }
        } catch (error) {
          // Remove corrupted cache files
          await fs.unlink(path.join(this.CACHE_DIR, file)).catch(() => {});
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        logger.info('Cache cleanup completed', { 
          cleanedCount, 
          remainingFiles: files.length - cleanedCount 
        });
      }

    } catch (error) {
      logger.warn('Cache cleanup failed', { error });
    }
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<{
    totalEntries: number;
    totalSizeBytes: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  }> {
    try {
      await this.init();
      const files = await fs.readdir(this.CACHE_DIR);
      let totalSizeBytes = 0;
      let oldestEntry: number | null = null;
      let newestEntry: number | null = null;
      let validEntries = 0;

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        try {
          const filePath = path.join(this.CACHE_DIR, file);
          const stats = await fs.stat(filePath);
          totalSizeBytes += stats.size;

          const content = await fs.readFile(filePath, 'utf-8');
          const cacheEntry: CacheEntry = JSON.parse(content);
          
          validEntries++;
          
          if (!oldestEntry || cacheEntry.timestamp < oldestEntry) {
            oldestEntry = cacheEntry.timestamp;
          }
          if (!newestEntry || cacheEntry.timestamp > newestEntry) {
            newestEntry = cacheEntry.timestamp;
          }
        } catch (error) {
          // Skip corrupted entries
        }
      }

      return {
        totalEntries: validEntries,
        totalSizeBytes,
        oldestEntry,
        newestEntry
      };

    } catch (error) {
      return {
        totalEntries: 0,
        totalSizeBytes: 0,
        oldestEntry: null,
        newestEntry: null
      };
    }
  }
}