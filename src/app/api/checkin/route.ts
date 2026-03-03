import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 打刻処理
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { qrToken } = body;

        if (!qrToken) {
            return NextResponse.json(
                { error: "QRトークンが必要です" },
                { status: 400 }
            );
        }

        // qrTokenから生徒を検索
        const student = await prisma.student.findUnique({
            where: { qrToken },
        });

        if (!student) {
            return NextResponse.json(
                { error: "生徒が見つかりません。QRコードを確認してください。" },
                { status: 404 }
            );
        }

        // 今日の最新の打刻記録を取得
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const lastAttendance = await prisma.attendance.findFirst({
            where: {
                studentId: student.id,
                timestamp: { gte: today },
            },
            orderBy: { timestamp: "desc" },
        });

        // 入室/退室を自動判定
        const type = !lastAttendance || lastAttendance.type === "checkout"
            ? "checkin"
            : "checkout";

        // 打刻記録を保存
        const attendance = await prisma.attendance.create({
            data: {
                studentId: student.id,
                type,
            },
        });

        // ===== 授業出席自動記録（追加処理） =====
        let classAttendances: { classTitle: string; classId: string }[] = [];

        if (type === "checkin") {
            try {
                const now = new Date();
                const weekday = now.getDay(); // 0=日曜 ... 6=土曜
                const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
                const todayStr = now.toISOString().split("T")[0]; // "YYYY-MM-DD"

                // 現在の曜日に該当する授業を取得
                const weeklyClasses = await prisma.weeklyClass.findMany({
                    where: { weekday },
                    include: {
                        enrollments: true,
                    },
                });

                // startTime <= nowTime <= endTime の授業をフィルタ
                const matchingClasses = weeklyClasses.filter(
                    (cls) => cls.startTime <= nowTime && nowTime <= cls.endTime
                );

                for (const cls of matchingClasses) {
                    // この生徒がenrollmentに登録されているか確認
                    const isEnrolled = cls.enrollments.some(
                        (e) => e.studentId === student.id
                    );

                    if (isEnrolled) {
                        // 重複防止のupsert
                        await prisma.classAttendance.upsert({
                            where: {
                                weeklyClassId_studentId_date: {
                                    weeklyClassId: cls.id,
                                    studentId: student.id,
                                    date: todayStr,
                                },
                            },
                            update: {},
                            create: {
                                weeklyClassId: cls.id,
                                studentId: student.id,
                                date: todayStr,
                                status: "present",
                            },
                        });

                        classAttendances.push({
                            classTitle: cls.title,
                            classId: cls.id,
                        });
                    }
                }
            } catch (classError) {
                // 授業出席記録の失敗は入退室記録に影響させない
                console.error("Class attendance recording error:", classError);
            }
        }

        return NextResponse.json({
            success: true,
            studentName: student.name,
            type,
            timestamp: attendance.timestamp,
            classAttendances,
        });
    } catch (error) {
        console.error("Checkin error:", error);
        return NextResponse.json(
            { error: "打刻処理に失敗しました" },
            { status: 500 }
        );
    }
}
