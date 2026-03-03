import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth-guard";
import { sanitizeString } from "@/lib/validate";

// 成績一覧取得
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const authResult = requireAuth(request);
    if (isAuthError(authResult)) return authResult.error;

    try {
        const results = await prisma.examResult.findMany({
            where: { studentId: params.id },
            orderBy: [{ examDate: "desc" }, { subject: "asc" }],
        });
        return NextResponse.json(results);
    } catch (error) {
        console.error("Get exam results error:", error);
        return NextResponse.json(
            { error: "成績の取得に失敗しました" },
            { status: 500 }
        );
    }
}

// 成績登録
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const authResult = requireAuth(request);
    if (isAuthError(authResult)) return authResult.error;

    try {
        const body = await request.json();
        const subject = sanitizeString(body.subject);
        const examName = sanitizeString(body.examName);
        const examDate = sanitizeString(body.examDate);
        const notes = body.notes ? sanitizeString(body.notes) : null;
        const score = Number(body.score);
        const maxScore = Number(body.maxScore) || 100;

        if (!subject || !examName || !examDate || isNaN(score)) {
            return NextResponse.json(
                { error: "科目名、試験名、日付、得点は必須です" },
                { status: 400 }
            );
        }

        if (score < 0 || score > maxScore) {
            return NextResponse.json(
                { error: `得点は0〜${maxScore}の範囲で指定してください` },
                { status: 400 }
            );
        }

        // 生徒が存在するか確認
        const student = await prisma.student.findUnique({ where: { id: params.id } });
        if (!student) {
            return NextResponse.json(
                { error: "生徒が見つかりません" },
                { status: 404 }
            );
        }

        const result = await prisma.examResult.create({
            data: {
                studentId: params.id,
                subject,
                score,
                maxScore,
                examName,
                examDate,
                notes,
            },
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error("Create exam result error:", error);
        return NextResponse.json(
            { error: "成績の登録に失敗しました" },
            { status: 500 }
        );
    }
}
