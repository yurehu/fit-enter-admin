import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth-guard";
import QRCode from "qrcode";

// QRコード画像生成（SVG形式）
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    // 認証チェック
    const authResult = requireAuth(request);
    if (isAuthError(authResult)) return authResult.error;

    try {
        const { id } = params;

        const student = await prisma.student.findUnique({
            where: { id },
        });

        if (!student) {
            return NextResponse.json(
                { error: "生徒が見つかりません" },
                { status: 404 }
            );
        }

        const svgString = await QRCode.toString(student.qrToken, {
            type: "svg",
            width: 300,
            margin: 2,
            color: {
                dark: "#000000",
                light: "#FFFFFF",
            },
        });

        const encodedName = encodeURIComponent(student.name);

        return new NextResponse(svgString, {
            headers: {
                "Content-Type": "image/svg+xml",
                "Content-Disposition": `inline; filename*=UTF-8''qr-${encodedName}.svg`,
            },
        });
    } catch (error) {
        console.error("QR code generation error:", error);
        return NextResponse.json(
            { error: "QRコードの生成に失敗しました" },
            { status: 500 }
        );
    }
}


