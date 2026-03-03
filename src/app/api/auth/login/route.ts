import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { checkRateLimit, getClientIp, LOGIN_RATE_LIMIT } from "@/lib/rate-limit";
import { sanitizeString, validateEmail } from "@/lib/validate";
import { auditLog, getIpFromRequest } from "@/lib/audit-log";

export async function POST(request: NextRequest) {
    try {
        // レートリミットチェック
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`login:${ip}`, LOGIN_RATE_LIMIT);
        if (!rateLimitResult.allowed) {
            auditLog({
                action: "LOGIN_FAILED",
                detail: `レートリミット超過 (IP: ${ip})`,
                ip,
            });
            return NextResponse.json(
                { error: "ログイン試行回数が上限に達しました。しばらく待ってから再試行してください。" },
                { status: 429 }
            );
        }

        const body = await request.json();
        const email = sanitizeString(body.email).toLowerCase();
        const password = body.password;

        if (!email || !password) {
            return NextResponse.json(
                { error: "メールアドレスとパスワードを入力してください" },
                { status: 400 }
            );
        }

        if (!validateEmail(email)) {
            return NextResponse.json(
                { error: "メールアドレスの形式が正しくありません" },
                { status: 400 }
            );
        }

        const admin = await prisma.admin.findUnique({ where: { email } });

        if (!admin) {
            auditLog({
                action: "LOGIN_FAILED",
                detail: `存在しないメールアドレス: ${email}`,
                ip: getIpFromRequest(request),
            });
            return NextResponse.json(
                { error: "メールアドレスまたはパスワードが正しくありません" },
                { status: 401 }
            );
        }

        const isValid = await bcrypt.compare(password, admin.password);

        if (!isValid) {
            auditLog({
                action: "LOGIN_FAILED",
                adminId: admin.id,
                adminEmail: admin.email,
                detail: "パスワード不一致",
                ip: getIpFromRequest(request),
            });
            return NextResponse.json(
                { error: "メールアドレスまたはパスワードが正しくありません" },
                { status: 401 }
            );
        }

        const token = signToken({ adminId: admin.id, email: admin.email });

        auditLog({
            action: "LOGIN_SUCCESS",
            adminId: admin.id,
            adminEmail: admin.email,
            ip: getIpFromRequest(request),
        });

        const response = NextResponse.json({ success: true });
        response.cookies.set("auth-token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 8, // 8時間
            path: "/",
        });

        return response;
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json(
            { error: "サーバーエラーが発生しました" },
            { status: 500 }
        );
    }
}
