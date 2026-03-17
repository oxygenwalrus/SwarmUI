/**
 * Performance Profiler
 * 
 * Core timing and measurement infrastructure for identifying performance bottlenecks.
 * Development-only - all methods no-op in production.
 */

const isDev = import.meta.env.DEV;

// Types
export interface TimerHandle {
    end: (metadata?: Record<string, unknown>) => number;
}

export interface Metric {
    name: string;
    duration: number;
    timestamp: number;
    metadata?: Record<string, unknown>;
}

export interface MetricStats {
    count: number;
    total: number;
    min: number;
    max: number;
    avg: number;
    p95: number;
    recent: number[];
}

type MetricListener = (metric: Metric) => void;

// Configuration
const CONFIG = {
    // Max entries per metric for rolling stats
    maxEntries: 100,
    // Default threshold for slow operation warnings (ms)
    defaultThreshold: 100,
    // Specific thresholds by prefix
    thresholds: {
        'api:': 500,
        'render:': 16, // 60fps frame budget
        'store:': 10,
        'effect:': 50,
        'ws:': 100,
    } as Record<string, number>,
};

// Storage
const metrics = new Map<string, number[]>();
const listeners = new Set<MetricListener>();
let recentMetrics: Metric[] = [];
const MAX_RECENT = 200;

/**
 * Get threshold for a metric name
 */
function getThreshold(name: string): number {
    for (const [prefix, threshold] of Object.entries(CONFIG.thresholds)) {
        if (name.startsWith(prefix)) {
            return threshold;
        }
    }
    return CONFIG.defaultThreshold;
}

/**
 * Record a metric
 */
function recordMetric(metric: Metric): void {
    if (!isDev) return;

    // Store in metrics map for stats
    if (!metrics.has(metric.name)) {
        metrics.set(metric.name, []);
    }
    const entries = metrics.get(metric.name)!;
    entries.push(metric.duration);
    if (entries.length > CONFIG.maxEntries) {
        entries.shift();
    }

    // Add to recent metrics
    recentMetrics.push(metric);
    if (recentMetrics.length > MAX_RECENT) {
        recentMetrics = recentMetrics.slice(-MAX_RECENT);
    }

    // Check threshold
    const threshold = getThreshold(metric.name);
    if (metric.duration > threshold) {
        console.warn(
            `[Perf] Slow operation: ${metric.name} took ${metric.duration.toFixed(2)}ms (threshold: ${threshold}ms)`,
            metric.metadata || ''
        );
    }

    // Notify listeners
    listeners.forEach(listener => listener(metric));
}

/**
 * Start a timer and return a handle to end it
 */
export function startTimer(name: string): TimerHandle {
    if (!isDev) {
        return { end: () => 0 };
    }

    const start = performance.now();
    return {
        end: (metadata?: Record<string, unknown>) => {
            const duration = performance.now() - start;
            recordMetric({
                name,
                duration,
                timestamp: Date.now(),
                metadata,
            });
            return duration;
        },
    };
}

/**
 * Measure an async operation
 */
export async function measure<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
): Promise<T> {
    if (!isDev) {
        return fn();
    }

    const timer = startTimer(name);
    try {
        const result = await fn();
        timer.end({ ...metadata, success: true });
        return result;
    } catch (error) {
        timer.end({ ...metadata, error: true });
        throw error;
    }
}

/**
 * Measure a sync operation
 */
export function measureSync<T>(
    name: string,
    fn: () => T,
    metadata?: Record<string, unknown>
): T {
    if (!isDev) {
        return fn();
    }

    const timer = startTimer(name);
    try {
        const result = fn();
        timer.end({ ...metadata, success: true });
        return result;
    } catch (error) {
        timer.end({ ...metadata, error: true });
        throw error;
    }
}

/**
 * Get stats for a specific metric
 */
export function getStats(name: string): MetricStats | null {
    const entries = metrics.get(name);
    if (!entries || entries.length === 0) return null;

    const sorted = [...entries].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);

    return {
        count: entries.length,
        total: entries.reduce((a, b) => a + b, 0),
        min: sorted[0],
        max: sorted[sorted.length - 1],
        avg: entries.reduce((a, b) => a + b, 0) / entries.length,
        p95: sorted[p95Index] || sorted[sorted.length - 1],
        recent: entries.slice(-10),
    };
}

/**
 * Get all recorded metric names
 */
export function getMetricNames(): string[] {
    return Array.from(metrics.keys());
}

/**
 * Get all stats
 */
export function getAllStats(): Record<string, MetricStats> {
    const result: Record<string, MetricStats> = {};
    for (const name of metrics.keys()) {
        const stats = getStats(name);
        if (stats) result[name] = stats;
    }
    return result;
}

/**
 * Get recent metrics
 */
export function getRecentMetrics(count: number = 50): Metric[] {
    return recentMetrics.slice(-count);
}

/**
 * Add a listener for new metrics
 */
export function addListener(listener: MetricListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/**
 * Clear all metrics (useful for testing)
 */
export function clearMetrics(): void {
    metrics.clear();
    recentMetrics = [];
}

/**
 * Export all metrics as JSON
 */
export function exportMetrics(): string {
    return JSON.stringify({
        timestamp: Date.now(),
        stats: getAllStats(),
        recent: recentMetrics,
    }, null, 2);
}

/**
 * Performance mark helper (uses native Performance API)
 */
export function mark(name: string): void {
    if (!isDev) return;
    performance.mark(name);
}

/**
 * Measure between two marks
 */
export function measureBetweenMarks(name: string, startMark: string, endMark: string): void {
    if (!isDev) return;
    try {
        performance.measure(name, startMark, endMark);
        const entries = performance.getEntriesByName(name, 'measure');
        if (entries.length > 0) {
            const entry = entries[entries.length - 1];
            recordMetric({
                name,
                duration: entry.duration,
                timestamp: Date.now(),
            });
        }
    } catch {
        // Marks might not exist yet
    }
}

// Export a convenient profiler object
export const profiler = {
    startTimer,
    measure,
    measureSync,
    getStats,
    getAllStats,
    getMetricNames,
    getRecentMetrics,
    addListener,
    clearMetrics,
    exportMetrics,
    mark,
    measureBetweenMarks,
    config: CONFIG,
};

export default profiler;
