import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth-guard";
import { validatePassword } from "@/lib/validate";
import { auditLog, getIpFromRequest } from "@/lib/audit-log";
import bcrypt from "bcryptjs";

// パスワード変更
export async function POST(request: NextRequest) {
    try {
        // 認証チェック
        const authResult = requireAuth(request);
        if (isAuthError(authResult)) return authResult.error;
        const { payload } = authResult;

        const body = await request.json();
        const { currentPassword, newPassword } = body;

        if (!currentPassword || !newPassword) {
            return NextResponse.json(
                { error: "現在のパスワードと新しいパスワードを入力してください" },
                { status: 400 }
            );
        }

        // パスワード強度チェック
        const passwordCheck = validatePassword(newPassword);
        if (!passwordCheck.valid) {
            return NextResponse.json(
                { error: passwordCheck.message },
                { status: 400 }
            );
        }

        // 管理者を取得
        const admin = await prisma.admin.findUnique({
            where: { id: payload.adminId },
        });

        if (!admin) {
            return NextResponse.json(
                { error: "管理者が見つかりません" },
                { status: 404 }
            );
        }

        // 現在のパスワードを確認
        const isCurrentValid = await bcrypt.compare(currentPassword, admin.password);
        if (!isCurrentValid) {
            return NextResponse.json(
                { error: "現在のパスワードが正しくありません" },
                { status: 401 }
            );
        }

        // 新しいパスワードをハッシュ化して保存
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await prisma.admin.update({
            where: { id: payload.adminId },
            data: { password: hashedPassword },
        });

        auditLog({
            action: "PASSWORD_CHANGE",
            adminId: payload.adminId,
            adminEmail: payload.email,
            ip: getIpFromRequest(request),
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Password change error:", error);
        return NextResponse.json(
            { error: "パスワードの変更に失敗しました" },
            { status: 500 }
        );
    }
}
