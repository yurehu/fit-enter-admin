import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth-guard";
import { sanitizeString, validateTimeFormat } from "@/lib/validate";
import { auditLog, getIpFromRequest } from "@/lib/audit-log";

// 授業一覧取得
export async function GET(request: NextRequest) {
    // 認証チェック
    const authResult = requireAuth(request);
    if (isAuthError(authResult)) return authResult.error;

    try {
        const classes = await prisma.weeklyClass.findMany({
            orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
            include: {
                enrollments: {
                    include: {
                        student: {
                            select: { id: true, name: true, grade: true },
                        },
                    },
                },
                _count: {
                    select: { attendances: true },
                },
            },
        });
        return NextResponse.json(classes);
    } catch (error) {
        console.error("Get classes error:", error);
        return NextResponse.json(
            { error: "授業一覧の取得に失敗しました" },
            { status: 500 }
        );
    }
}

// 授業作成
export async function POST(request: NextRequest) {
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

        if (weekday < 0 || weekday > 6) {
            return NextResponse.json(
                { error: "曜日は0（日）〜6（土）で指定してください" },
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

        const weeklyClass = await prisma.weeklyClass.create({
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
            action: "CLASS_CREATE",
            adminId: payload.adminId,
            adminEmail: payload.email,
            targetId: weeklyClass.id,
            detail: `授業「${title}」を作成`,
            ip: getIpFromRequest(request),
        });

        return NextResponse.json(weeklyClass, { status: 201 });
    } catch (error) {
        console.error("Create class error:", error);
        return NextResponse.json(
            { error: "授業の作成に失敗しました" },
            { status: 500 }
        );
    }
}
