import { prisma } from "./prisma";

/**
 * 監査ログ記録ユーティリティ（DB ベース）
 * Vercel のサーバーレス環境でも動作します。
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
    | "PASSWORD_CHANGE"
    | "SCHOOL_CREATE"
    | "SCHOOL_UPDATE"
    | "SCHOOL_DELETE";

interface AuditLogInput {
    action: AuditAction;
    adminId?: string;
    adminEmail?: string;
    targetId?: string;
    detail?: string;
    ip?: string;
}

/**
 * 監査ログを DB に記録
 * ログの失敗はアプリ動作に影響させない
 */
export async function auditLog(entry: AuditLogInput) {
    try {
        await prisma.auditLog.create({
            data: {
                action: entry.action,
                adminId: entry.adminId,
                adminEmail: entry.adminEmail,
                targetId: entry.targetId,
                detail: entry.detail,
                ip: entry.ip,
            },
        });
    } catch (error) {
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
