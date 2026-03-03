import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { checkRateLimit, getClientIp, LOGIN_RATE_LIMIT } from "@/lib/rate-limit";
import { auditLog, getIpFromRequest } from "@/lib/audit-log";

// PINログイン処理
export async function POST(request: NextRequest) {
    try {
        // レートリミットチェック
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`pin-login:${ip}`, LOGIN_RATE_LIMIT);
        if (!rateLimitResult.allowed) {
            auditLog({
                action: "PIN_LOGIN_FAILED",
                detail: `レートリミット超過 (IP: ${ip})`,
                ip,
            });
            return NextResponse.json(
                { error: "ログイン試行回数が上限に達しました。しばらく待ってから再試行してください。" },
                { status: 429 }
            );
        }

        const body = await request.json();
        const { pin } = body;

        if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
            return NextResponse.json(
                { error: "4桁のPINコードを入力してください" },
                { status: 400 }
            );
        }

        // PINがハッシュ化されている管理者を検索
        const admins = await prisma.admin.findMany({
            where: { pin: { not: null } },
        });

        let matchedAdmin = null;
        for (const admin of admins) {
            if (!admin.pin) continue;

            // bcrypt ハッシュ化されたPIN と比較
            // ハッシュ化されていない旧データにも対応（平文の場合は直接比較）
            const isHashed = admin.pin.startsWith("$2");
            const isMatch = isHashed
                ? await bcrypt.compare(pin, admin.pin)
                : admin.pin === pin;

            if (isMatch) {
                matchedAdmin = admin;
                break;
            }
        }

        if (!matchedAdmin) {
            auditLog({
                action: "PIN_LOGIN_FAILED",
                detail: "PIN不一致",
                ip: getIpFromRequest(request),
            });
            return NextResponse.json(
                { error: "PINコードが正しくありません" },
                { status: 401 }
            );
        }

        const token = signToken({ adminId: matchedAdmin.id, email: matchedAdmin.email });

        auditLog({
            action: "PIN_LOGIN_SUCCESS",
            adminId: matchedAdmin.id,
            adminEmail: matchedAdmin.email,
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
        console.error("PIN login error:", error);
        return NextResponse.json(
            { error: "サーバーエラーが発生しました" },
            { status: 500 }
        );
    }
}
