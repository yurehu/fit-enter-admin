import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth-guard";

// 監査ログ一覧取得
export async function GET(request: NextRequest) {
    const authResult = requireAuth(request);
    if (isAuthError(authResult)) return authResult.error;

    try {
        const { searchParams } = new URL(request.url);
        const page = Math.max(1, Number(searchParams.get("page")) || 1);
        const limit = Math.min(100, Math.max(10, Number(searchParams.get("limit")) || 50));
        const action = searchParams.get("action");

        const where = action ? { action } : {};

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.auditLog.count({ where }),
        ]);

        return NextResponse.json({
            logs,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error("Get audit logs error:", error);
        return NextResponse.json(
            { error: "監査ログの取得に失敗しました" },
            { status: 500 }
        );
    }
}
