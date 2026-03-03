import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { auditLog, getIpFromRequest } from "@/lib/audit-log";
import QRCode from "qrcode";
import bcrypt from "bcryptjs";

const MASTER_QR_TOKEN = "MASTER_ADMIN_LOGIN";

// マスターQRコードのSVG画像生成
export async function GET(request: NextRequest) {
    try {
        // 認証チェック
        const token = request.cookies.get("auth-token")?.value;
        if (!token) {
            return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
        }
        const payload = verifyToken(token);
        if (!payload) {
            return NextResponse.json({ error: "認証が無効です" }, { status: 401 });
        }

        const svgString = await QRCode.toString(MASTER_QR_TOKEN, {
            type: "svg",
            width: 300,
            margin: 2,
            color: {
                dark: "#000000",
                light: "#FFFFFF",
            },
        });

        return new NextResponse(svgString, {
            headers: {
                "Content-Type": "image/svg+xml",
                "Content-Disposition": `inline; filename="master-admin-qr.svg"`,
                "Cache-Control": "private, no-store",
            },
        });
    } catch (error) {
        console.error("Master QR generation error:", error);
        return NextResponse.json(
            { error: "マスターQRコードの生成に失敗しました" },
            { status: 500 }
        );
    }
}

// PIN設定（bcryptハッシュ化して保存）
export async function POST(request: NextRequest) {
    try {
        // 認証チェック
        const token = request.cookies.get("auth-token")?.value;
        if (!token) {
            return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
        }
        const payload = verifyToken(token);
        if (!payload) {
            return NextResponse.json({ error: "認証が無効です" }, { status: 401 });
        }

        const body = await request.json();
        const { pin } = body;

        if (!pin || !/^\d{4}$/.test(pin)) {
            return NextResponse.json(
                { error: "PINは4桁の数字で指定してください" },
                { status: 400 }
            );
        }

        // PINをbcryptでハッシュ化
        const hashedPin = await bcrypt.hash(pin, 10);

        await prisma.admin.update({
            where: { id: payload.adminId },
            data: { pin: hashedPin },
        });

        auditLog({
            action: "PIN_CHANGE",
            adminId: payload.adminId,
            adminEmail: payload.email,
            ip: getIpFromRequest(request),
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("PIN update error:", error);
        return NextResponse.json(
            { error: "PINの設定に失敗しました" },
            { status: 500 }
        );
    }
}
