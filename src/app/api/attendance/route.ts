import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth-guard";

// 出席履歴取得
export async function GET(request: NextRequest) {
    // 認証チェック
    const authResult = requireAuth(request);
    if (isAuthError(authResult)) return authResult.error;

    try {
        const { searchParams } = new URL(request.url);
        const dateStr = searchParams.get("date");
        const monthStr = searchParams.get("month"); // YYYY-MM 形式

        // 月間出席率の計算
        if (monthStr) {
            const [year, month] = monthStr.split("-").map(Number);
            if (!year || !month || month < 1 || month > 12) {
                return NextResponse.json(
                    { error: "月の形式が正しくありません (YYYY-MM)" },
                    { status: 400 }
                );
            }

            const startOfMonth = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

            const students = await prisma.student.findMany();
            const attendances = await prisma.attendance.findMany({
                where: {
                    timestamp: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                    type: "checkin",
                },
                include: { student: true },
            });

            // 営業日数を計算（月〜土）
            let businessDays = 0;
            const current = new Date(startOfMonth);
            const today = new Date();
            const endDate = endOfMonth < today ? endOfMonth : today;
            while (current <= endDate) {
                const day = current.getDay();
                if (day !== 0) { // 日曜以外
                    businessDays++;
                }
                current.setDate(current.getDate() + 1);
            }

            // 生徒ごとの出席日数を計算
            const studentAttendance = students.map((student) => {
                const studentCheckins = attendances.filter(
                    (a) => a.studentId === student.id
                );
                // ユニークな日付をカウント
                const uniqueDays = new Set(
                    studentCheckins.map((a) =>
                        a.timestamp.toISOString().split("T")[0]
                    )
                );
                const attendanceDays = uniqueDays.size;
                const rate = businessDays > 0
                    ? Math.round((attendanceDays / businessDays) * 100)
                    : 0;

                return {
                    studentId: student.id,
                    studentName: student.name,
                    grade: student.grade,
                    attendanceDays,
                    businessDays,
                    rate,
                };
            });

            return NextResponse.json({
                month: monthStr,
                businessDays,
                students: studentAttendance,
            });
        }

        // 日付指定の出席履歴
        let dateFilter = {};
        if (dateStr) {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) {
                return NextResponse.json(
                    { error: "日付の形式が正しくありません" },
                    { status: 400 }
                );
            }
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
            dateFilter = {
                timestamp: {
                    gte: date,
                    lt: nextDate,
                },
            };
        } else {
            // デフォルト：今日
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            dateFilter = {
                timestamp: {
                    gte: today,
                    lt: tomorrow,
                },
            };
        }

        const attendances = await prisma.attendance.findMany({
            where: dateFilter,
            include: { student: true },
            orderBy: { timestamp: "desc" },
        });

        // 現在入室中の生徒を計算
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayAttendances = await prisma.attendance.findMany({
            where: {
                timestamp: {
                    gte: today,
                    lt: tomorrow,
                },
            },
            include: { student: true },
            orderBy: { timestamp: "asc" },
        });

        // 各生徒の最新ステータスを計算
        const studentStatusMap = new Map<
            string,
            { student: { id: string; name: string; grade: string }; type: string; timestamp: Date }
        >();

        for (const att of todayAttendances) {
            studentStatusMap.set(att.studentId, {
                student: {
                    id: att.student.id,
                    name: att.student.name,
                    grade: att.student.grade,
                },
                type: att.type,
                timestamp: att.timestamp,
            });
        }

        const currentlyCheckedIn = Array.from(studentStatusMap.values()).filter(
            (s) => s.type === "checkin"
        );

        return NextResponse.json({
            attendances,
            currentlyCheckedIn,
        });
    } catch (error) {
        console.error("Get attendance error:", error);
        return NextResponse.json(
            { error: "出席履歴の取得に失敗しました" },
            { status: 500 }
        );
    }
}
