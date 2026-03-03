/**
 * メモリベースのレートリミッター（スライディングウィンドウ方式）
 * サーバー再起動時にリセットされますが、塾用途では十分です。
 */

interface RateLimitEntry {
    timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// 定期的に古いエントリをクリーンアップ（メモリリーク防止）
const CLEANUP_INTERVAL = 60 * 1000; // 1分
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL) return;
    lastCleanup = now;

    const keysToDelete: string[] = [];
    store.forEach((entry, key) => {
        entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
        if (entry.timestamps.length === 0) {
            keysToDelete.push(key);
        }
    });
    keysToDelete.forEach((key) => store.delete(key));
}

export interface RateLimitConfig {
    /** ウィンドウ時間（ミリ秒） */
    windowMs: number;
    /** ウィンドウ内の最大リクエスト数 */
    maxRequests: number;
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    retryAfterMs?: number;
}

/**
 * レートリミットをチェック
 * @param key 識別キー（通常はIPアドレス）
 * @param config レートリミット設定
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    cleanup(config.windowMs);

    let entry = store.get(key);
    if (!entry) {
        entry = { timestamps: [] };
        store.set(key, entry);
    }

    // ウィンドウ外のタイムスタンプを除去
    entry.timestamps = entry.timestamps.filter((t) => now - t < config.windowMs);

    if (entry.timestamps.length >= config.maxRequests) {
        const oldestInWindow = entry.timestamps[0];
        const retryAfterMs = config.windowMs - (now - oldestInWindow);
        return {
            allowed: false,
            remaining: 0,
            retryAfterMs,
        };
    }

    entry.timestamps.push(now);
    return {
        allowed: true,
        remaining: config.maxRequests - entry.timestamps.length,
    };
}

/**
 * リクエストからIPアドレスを取得
 */
export function getClientIp(request: Request): string {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
        return forwarded.split(",")[0].trim();
    }
    return request.headers.get("x-real-ip") || "unknown";
}

// ログイン用のデフォルト設定: 1分間に5回まで
export const LOGIN_RATE_LIMIT: RateLimitConfig = {
    windowMs: 60 * 1000,
    maxRequests: 5,
};
