import jwt from "jsonwebtoken";

function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret === "your-super-secret-jwt-key-change-this-in-production") {
        console.warn(
            "⚠️  JWT_SECRET が未設定またはデフォルト値です。本番環境では必ず強力なシークレットを設定してください。"
        );
        // 開発環境でも動作させるためフォールバック（本番では .env を必ず設定）
        return "dev-only-fallback-secret-do-not-use-in-production";
    }
    return secret;
}

export interface JwtPayload {
    adminId: string;
    email: string;
}

export function signToken(payload: JwtPayload): string {
    return jwt.sign(payload, getJwtSecret(), { expiresIn: "8h" });
}

export function verifyToken(token: string): JwtPayload | null {
    try {
        return jwt.verify(token, getJwtSecret()) as JwtPayload;
    } catch {
        return null;
    }
}

/**
 * jose 用の JWT シークレットをエクスポート（Middleware の Edge Runtime 用）
 */
export function getJwtSecretForEdge(): string {
    return getJwtSecret();
}
