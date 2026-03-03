import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth-guard";
import { sanitizeString } from "@/lib/validate";
import { auditLog, getIpFromRequest } from "@/lib/audit-log";

// 学校一覧取得
export async function GET(request: NextRequest) {
    const authResult = requireAuth(request);
    if (isAuthError(authResult)) return authResult.error;

    try {
        const schools = await prisma.school.findMany({
            orderBy: [{ type: "asc" }, { name: "asc" }],
            include: {
                _count: { select: { students: true } },
            },
        });
        return NextResponse.json(schools);
    } catch (error) {
        console.error("Get schools error:", error);
        return NextResponse.json(
            { error: "学校一覧の取得に失敗しました" },
            { status: 500 }
        );
    }
}

// 学校登録
export async function POST(request: NextRequest) {
    const authResult = requireAuth(request);
    if (isAuthError(authResult)) return authResult.error;
    const { payload } = authResult;

    try {
        const body = await request.json();
        const name = sanitizeString(body.name);
        const type = sanitizeString(body.type);

        if (!name || !type) {
            return NextResponse.json(
                { error: "学校名と種別は必須です" },
                { status: 400 }
            );
        }

        const validTypes = ["小学校", "中学校", "高校", "その他"];
        if (!validTypes.includes(type)) {
            return NextResponse.json(
                { error: "種別は小学校・中学校・高校・その他のいずれかを指定してください" },
                { status: 400 }
            );
        }

        // 重複チェック
        const existing = await prisma.school.findUnique({ where: { name } });
        if (existing) {
            return NextResponse.json(
                { error: "同じ名前の学校が既に登録されています" },
                { status: 409 }
            );
        }

        const school = await prisma.school.create({
            data: { name, type },
        });

        await auditLog({
            action: "SCHOOL_CREATE",
            adminId: payload.adminId,
            adminEmail: payload.email,
            targetId: school.id,
            detail: `学校「${name}」を登録`,
            ip: getIpFromRequest(request),
        });

        return NextResponse.json(school, { status: 201 });
    } catch (error) {
        console.error("Create school error:", error);
        return NextResponse.json(
            { error: "学校の登録に失敗しました" },
            { status: 500 }
        );
    }
}
