import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth-guard";
import { sanitizeString, validateEmail, validateGrade, validateName } from "@/lib/validate";
import { auditLog, getIpFromRequest } from "@/lib/audit-log";

// 生徒編集
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    // 認証チェック
    const authResult = requireAuth(request);
    if (isAuthError(authResult)) return authResult.error;
    const { payload } = authResult;

    try {
        const { id } = params;
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

        // 生徒が存在するか確認
        const existing = await prisma.student.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json(
                { error: "生徒が見つかりません" },
                { status: 404 }
            );
        }

        const student = await prisma.student.update({
            where: { id },
            data: { name, grade, parentEmail },
        });

        auditLog({
            action: "STUDENT_UPDATE",
            adminId: payload.adminId,
            adminEmail: payload.email,
            targetId: id,
            detail: `生徒「${name}」の情報を更新`,
            ip: getIpFromRequest(request),
        });

        return NextResponse.json(student);
    } catch (error) {
        console.error("Update student error:", error);
        return NextResponse.json(
            { error: "生徒情報の更新に失敗しました" },
            { status: 500 }
        );
    }
}

// 生徒削除
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    // 認証チェック
    const authResult = requireAuth(request);
    if (isAuthError(authResult)) return authResult.error;
    const { payload } = authResult;

    try {
        const { id } = params;

        // 生徒が存在するか確認
        const existing = await prisma.student.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json(
                { error: "生徒が見つかりません" },
                { status: 404 }
            );
        }

        await prisma.student.delete({
            where: { id },
        });

        auditLog({
            action: "STUDENT_DELETE",
            adminId: payload.adminId,
            adminEmail: payload.email,
            targetId: id,
            detail: `生徒「${existing.name}」を削除`,
            ip: getIpFromRequest(request),
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete student error:", error);
        return NextResponse.json(
            { error: "生徒の削除に失敗しました" },
            { status: 500 }
        );
    }
}
