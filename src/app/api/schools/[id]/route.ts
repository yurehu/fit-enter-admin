import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth-guard";
import { sanitizeString } from "@/lib/validate";
import { auditLog, getIpFromRequest } from "@/lib/audit-log";

// 学校編集
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
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

        const school = await prisma.school.update({
            where: { id: params.id },
            data: { name, type },
        });

        await auditLog({
            action: "SCHOOL_UPDATE",
            adminId: payload.adminId,
            adminEmail: payload.email,
            targetId: params.id,
            detail: `学校「${name}」を更新`,
            ip: getIpFromRequest(request),
        });

        return NextResponse.json(school);
    } catch (error) {
        console.error("Update school error:", error);
        return NextResponse.json(
            { error: "学校の更新に失敗しました" },
            { status: 500 }
        );
    }
}

// 学校削除
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const authResult = requireAuth(request);
    if (isAuthError(authResult)) return authResult.error;
    const { payload } = authResult;

    try {
        const existing = await prisma.school.findUnique({
            where: { id: params.id },
            include: { _count: { select: { students: true } } },
        });

        if (!existing) {
            return NextResponse.json(
                { error: "学校が見つかりません" },
                { status: 404 }
            );
        }

        if (existing._count.students > 0) {
            return NextResponse.json(
                { error: `この学校には${existing._count.students}名の生徒が所属しています。先に生徒の所属を変更してください。` },
                { status: 409 }
            );
        }

        await prisma.school.delete({ where: { id: params.id } });

        await auditLog({
            action: "SCHOOL_DELETE",
            adminId: payload.adminId,
            adminEmail: payload.email,
            targetId: params.id,
            detail: `学校「${existing.name}」を削除`,
            ip: getIpFromRequest(request),
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete school error:", error);
        return NextResponse.json(
            { error: "学校の削除に失敗しました" },
            { status: 500 }
        );
    }
}
