import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import { requireAuth, isAuthError } from "@/lib/auth-guard";
import { sanitizeString, validateEmail, validateGrade, validateName } from "@/lib/validate";
import { auditLog, getIpFromRequest } from "@/lib/audit-log";

// 生徒一覧取得
export async function GET(request: NextRequest) {
    // 認証チェック
    const authResult = requireAuth(request);
    if (isAuthError(authResult)) return authResult.error;

    try {
        const students = await prisma.student.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                attendances: {
                    orderBy: { timestamp: "desc" },
                    take: 1,
                },
            },
        });
        return NextResponse.json(students);
    } catch (error) {
        console.error("Get students error:", error);
        return NextResponse.json(
            { error: "生徒一覧の取得に失敗しました" },
            { status: 500 }
        );
    }
}

// 生徒登録
export async function POST(request: NextRequest) {
    // 認証チェック
    const authResult = requireAuth(request);
    if (isAuthError(authResult)) return authResult.error;
    const { payload } = authResult;

    try {
        const body = await request.json();
        const name = sanitizeString(body.name);
        const grade = sanitizeString(body.grade);
        const parentEmail = sanitizeString(body.parentEmail).toLowerCase();

        // バリデーション
        if (!name || !grade || !parentEmail) {
            return NextResponse.json(
                { error: "名前、学年、保護者メールアドレスは必須です" },
                { status: 400 }
            );
        }

        if (!validateName(name)) {
            return NextResponse.json(
                { error: "名前は1〜50文字で入力してください" },
                { status: 400 }
            );
        }

        if (!validateGrade(grade)) {
            return NextResponse.json(
                { error: "有効な学年を選択してください" },
                { status: 400 }
            );
        }

        if (!validateEmail(parentEmail)) {
            return NextResponse.json(
                { error: "メールアドレスの形式が正しくありません" },
                { status: 400 }
            );
        }

        const student = await prisma.student.create({
            data: {
                name,
                grade,
                parentEmail,
                qrToken: uuidv4(),
            },
        });

        auditLog({
            action: "STUDENT_CREATE",
            adminId: payload.adminId,
            adminEmail: payload.email,
            targetId: student.id,
            detail: `生徒「${name}」を登録`,
            ip: getIpFromRequest(request),
        });

        return NextResponse.json(student, { status: 201 });
    } catch (error) {
        console.error("Create student error:", error);
        return NextResponse.json(
            { error: "生徒の登録に失敗しました" },
            { status: 500 }
        );
    }
}
