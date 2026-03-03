import { NextRequest, NextResponse } from "next/server";
import { verifyToken, JwtPayload } from "./auth";

/**
 * API ルート用の認証ガード
 * Cookie の auth-token を検証し、有効な場合はペイロードを返す
 * 無効な場合は 401 レスポンスを返す
 */
export function requireAuth(
    request: NextRequest
): { payload: JwtPayload } | { error: NextResponse } {
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
        return {
            error: NextResponse.json(
                { error: "認証が必要です" },
                { status: 401 }
            ),
        };
    }

    const payload = verifyToken(token);
    if (!payload) {
        return {
            error: NextResponse.json(
                { error: "認証が無効または期限切れです。再ログインしてください。" },
                { status: 401 }
            ),
        };
    }

    return { payload };
}

/**
 * 認証結果がエラーかどうかを判定するタイプガード
 */
export function isAuthError(
    result: { payload: JwtPayload } | { error: NextResponse }
): result is { error: NextResponse } {
    return "error" in result;
}
