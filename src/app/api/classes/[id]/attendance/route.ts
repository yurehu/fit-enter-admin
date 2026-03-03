import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth-guard";

// 授業出席ステータスの変更
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    // 認証チェック
    const authResult = requireAuth(request);
    if (isAuthError(authResult)) return authResult.error;

    try {
        const body = await request.json();
        const { studentId, date, status } = body;

        if (!studentId || !date || !status) {
            return NextResponse.json(
                { error: "studentId, date, status は必須です" },
                { status: 400 }
            );
        }

        if (!["present", "absent"].includes(status)) {
            return NextResponse.json(
                { error: "status は 'present' または 'absent' で指定してください" },
                { status: 400 }
            );
        }

        const classId = params.id;

        // 既存の出席レコードを更新、なければ作成
        const classAttendance = await prisma.classAttendance.upsert({
            where: {
                weeklyClassId_studentId_date: {
                    weeklyClassId: classId,
                    studentId,
                    date,
                },
            },
            update: { status },
            create: {
                weeklyClassId: classId,
                studentId,
                date,
                status,
            },
        });

        return NextResponse.json(classAttendance);
    } catch (error) {
        console.error("Update class attendance error:", error);
        return NextResponse.json(
            { error: "出席ステータスの更新に失敗しました" },
            { status: 500 }
        );
    }
}
