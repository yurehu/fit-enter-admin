import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth-guard";
import { sanitizeString, validateTimeFormat } from "@/lib/validate";
import { auditLog, getIpFromRequest } from "@/lib/audit-log";

// 授業詳細取得
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    // 認証チェック
    const authResult = requireAuth(request);
    if (isAuthError(authResult)) return authResult.error;

    try {
        const weeklyClass = await prisma.weeklyClass.findUnique({
            where: { id: params.id },
            include: {
                enrollments: {
                    include: {
                        student: {
                            select: { id: true, name: true, grade: true },
                        },
                    },
                },
                attendances: {
                    include: {
                        student: {
                            select: { id: true, name: true, grade: true },
                        },
                    },
                    orderBy: { date: "desc" },
                },
            },
        });

        if (!weeklyClass) {
            return NextResponse.json(
                { error: "授業が見つかりません" },
                { status: 404 }
            );
        }

        return NextResponse.json(weeklyClass);
    } catch (error) {
        console.error("Get class detail error:", error);
        return NextResponse.json(
            { error: "授業詳細の取得に失敗しました" },
            { status: 500 }
        );
    }
}

// 授業編集
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    // 認証チェック
    const authResult = requireAuth(request);
    if (isAuthError(authResult)) return authResult.error;
    const { payload } = authResult;

    try {
        const body = await request.json();
        const title = sanitizeString(body.title);
        const { weekday, startTime, endTime, studentIds } = body;

        if (!title || weekday === undefined || !startTime || !endTime) {
            return NextResponse.json(
                { error: "タイトル、曜日、開始時間、終了時間は必須です" },
                { status: 400 }
            );
        }

        if (!validateTimeFormat(startTime) || !validateTimeFormat(endTime)) {
            return NextResponse.json(
                { error: "時間は HH:mm 形式で指定してください" },
                { status: 400 }
            );
        }

        if (startTime >= endTime) {
            return NextResponse.json(
                { error: "開始時間は終了時間より前に設定してください" },
                { status: 400 }
            );
        }

        // 既存のenrollmentsを削除してから再作成
        await prisma.classEnrollment.deleteMany({
            where: { weeklyClassId: params.id },
        });

        const weeklyClass = await prisma.weeklyClass.update({
            where: { id: params.id },
            data: {
                title,
                weekday: Number(weekday),
                startTime,
                endTime,
                enrollments: {
                    create: (studentIds || []).map((studentId: string) => ({
                        studentId,
                    })),
                },
            },
            include: {
                enrollments: {
                    include: {
                        student: {
                            select: { id: true, name: true, grade: true },
                        },
                    },
                },
            },
        });

        auditLog({
            action: "CLASS_UPDATE",
            adminId: payload.adminId,
            adminEmail: payload.email,
            targetId: params.id,
            detail: `授業「${title}」を更新`,
            ip: getIpFromRequest(request),
        });

        return NextResponse.json(weeklyClass);
    } catch (error) {
        console.error("Update class error:", error);
        return NextResponse.json(
            { error: "授業の更新に失敗しました" },
            { status: 500 }
        );
    }
}

// 授業削除
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    // 認証チェック
    const authResult = requireAuth(request);
    if (isAuthError(authResult)) return authResult.error;
    const { payload } = authResult;

    try {
        const existing = await prisma.weeklyClass.findUnique({
            where: { id: params.id },
        });

        if (!existing) {
            return NextResponse.json(
                { error: "授業が見つかりません" },
                { status: 404 }
            );
        }

        await prisma.weeklyClass.delete({
            where: { id: params.id },
        });

        auditLog({
            action: "CLASS_DELETE",
            adminId: payload.adminId,
            adminEmail: payload.email,
            targetId: params.id,
            detail: `授業「${existing.title}」を削除`,
            ip: getIpFromRequest(request),
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete class error:", error);
        return NextResponse.json(
            { error: "授業の削除に失敗しました" },
            { status: 500 }
        );
    }
}
