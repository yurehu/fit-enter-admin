import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth-guard";

// 生徒の授業出席履歴取得
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    // 認証チェック
    const authResult = requireAuth(request);
    if (isAuthError(authResult)) return authResult.error;
    try {
        const student = await prisma.student.findUnique({
            where: { id: params.id },
            include: {
                enrollments: {
                    include: {
                        weeklyClass: true,
                    },
                },
                classAttendances: {
                    include: {
                        weeklyClass: true,
                    },
                    orderBy: { date: "desc" },
                },
            },
        });

        if (!student) {
            return NextResponse.json(
                { error: "生徒が見つかりません" },
                { status: 404 }
            );
        }

        // 授業ごとの出席率を計算
        const classStats = student.enrollments.map((enrollment) => {
            const cls = enrollment.weeklyClass;
            const attendances = student.classAttendances.filter(
                (a) => a.weeklyClassId === cls.id
            );

            // その授業の開始日から今日までの該当曜日の回数を計算
            const classCreatedAt = new Date(cls.createdAt);
            const today = new Date();
            let totalExpectedClasses = 0;
            const current = new Date(classCreatedAt);
            current.setHours(0, 0, 0, 0);

            while (current <= today) {
                if (current.getDay() === cls.weekday) {
                    totalExpectedClasses++;
                }
                current.setDate(current.getDate() + 1);
            }

            const attendedCount = attendances.filter(a => a.status === "present").length;
            const rate =
                totalExpectedClasses > 0
                    ? Math.min(100, Math.round((attendedCount / totalExpectedClasses) * 100))
                    : 0;

            return {
                classId: cls.id,
                classTitle: cls.title,
                weekday: cls.weekday,
                startTime: cls.startTime,
                endTime: cls.endTime,
                attendedCount,
                totalExpectedClasses,
                rate,
                recentAttendances: attendances.slice(0, 10),
            };
        });

        // 全体の出席率
        const totalAttended = classStats.reduce(
            (sum, s) => sum + s.attendedCount,
            0
        );
        const totalExpected = classStats.reduce(
            (sum, s) => sum + s.totalExpectedClasses,
            0
        );
        const overallRate =
            totalExpected > 0
                ? Math.min(100, Math.round((totalAttended / totalExpected) * 100))
                : 0;

        return NextResponse.json({
            studentId: student.id,
            studentName: student.name,
            overallRate,
            classStats,
        });
    } catch (error) {
        console.error("Get student class attendance error:", error);
        return NextResponse.json(
            { error: "授業出席履歴の取得に失敗しました" },
            { status: 500 }
        );
    }
}
