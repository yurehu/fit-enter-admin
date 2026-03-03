import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

function getJwtSecret(): Uint8Array {
    const secret = process.env.JWT_SECRET || "dev-only-fallback-secret-do-not-use-in-production";
    return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const response = NextResponse.next();

    // セキュリティヘッダーの追加
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("X-XSS-Protection", "1; mode=block");
    response.headers.set(
        "Permissions-Policy",
        "camera=(self), microphone=(), geolocation=()"
    );

    // /admin パスを保護
    if (pathname.startsWith("/admin")) {
        const token = request.cookies.get("auth-token")?.value;

        if (!token) {
            const loginUrl = new URL("/login", request.url);
            return NextResponse.redirect(loginUrl);
        }

        // JWT 署名を検証（jose は Edge Runtime 対応）
        try {
            await jwtVerify(token, getJwtSecret());
        } catch {
            // トークン無効 or 期限切れ → Cookie を削除してログイン画面へ
            const loginUrl = new URL("/login", request.url);
            const redirectResponse = NextResponse.redirect(loginUrl);
            redirectResponse.cookies.delete("auth-token");
            return redirectResponse;
        }
    }

    // /admin 以外のパスもセキュリティヘッダー付きで通す
    return response;
}

export const config = {
    matcher: ["/admin/:path*", "/api/:path*", "/login", "/checkin"],
};
