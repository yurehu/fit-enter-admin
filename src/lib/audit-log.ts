import fs from "fs";
import path from "path";

/**
 * 監査ログ記録ユーティリティ
 * ファイルベースで重要操作を記録します。
 */

export type AuditAction =
    | "LOGIN_SUCCESS"
    | "LOGIN_FAILED"
    | "PIN_LOGIN_SUCCESS"
    | "PIN_LOGIN_FAILED"
    | "LOGOUT"
    | "STUDENT_CREATE"
    | "STUDENT_UPDATE"
    | "STUDENT_DELETE"
    | "CLASS_CREATE"
    | "CLASS_UPDATE"
    | "CLASS_DELETE"
    | "PIN_CHANGE"
    | "PASSWORD_CHANGE";

interface AuditLogEntry {
    timestamp: string;
    action: AuditAction;
    adminId?: string;
    adminEmail?: string;
    targetId?: string;
    detail?: string;
    ip?: string;
}

const LOG_DIR = path.join(process.cwd(), "logs");
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB

function ensureLogDir() {
    try {
        if (!fs.existsSync(LOG_DIR)) {
            fs.mkdirSync(LOG_DIR, { recursive: true });
        }
    } catch {
        // ログディレクトリ作成失敗は無視（ログ自体は諦める）
    }
}

function getLogFilePath(): string {
    const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    return path.join(LOG_DIR, `audit-${date}.log`);
}

/**
 * 監査ログを記録
 * ログの失敗はアプリ動作に影響させない
 */
export function auditLog(entry: Omit<AuditLogEntry, "timestamp">) {
    try {
        ensureLogDir();

        const logPath = getLogFilePath();
        const logEntry: AuditLogEntry = {
            timestamp: new Date().toISOString(),
            ...entry,
        };

        const line = JSON.stringify(logEntry) + "\n";

        // ファイルサイズチェック
        try {
            const stats = fs.statSync(logPath);
            if (stats.size > MAX_LOG_SIZE) {
                // ログローテーション: 古いファイルをリネーム
                const rotatedPath = logPath.replace(".log", `-${Date.now()}.log.bak`);
                fs.renameSync(logPath, rotatedPath);
            }
        } catch {
            // ファイルが存在しない場合は無視
        }

        fs.appendFileSync(logPath, line, "utf-8");
    } catch (error) {
        // ログ記録自体の失敗はコンソールに出力するのみ
        console.error("Audit log write failed:", error);
    }
}

/**
 * リクエストからIPアドレスを取得（監査ログ用）
 */
export function getIpFromRequest(request: Request): string {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
        return forwarded.split(",")[0].trim();
    }
    return request.headers.get("x-real-ip") || "unknown";
}
