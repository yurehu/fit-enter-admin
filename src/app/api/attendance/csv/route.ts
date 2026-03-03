import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth-guard";

// CSV出力
export async function GET(request: NextRequest) {
    // 認証チェック
    const authResult = requireAuth(request);
    if (isAuthError(authResult)) return authResult.error;

    try {
        const { searchParams } = new URL(request.url);
        const dateStr = searchParams.get("date");

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
        }

        const attendances = await prisma.attendance.findMany({
            where: dateFilter,
            include: { student: true },
            orderBy: { timestamp: "asc" },
        });

        // CSV生成（値にカンマが含まれる場合のエスケープ対応）
        const BOM = "\uFEFF"; // Excel用BOM
        const header = "日時,生徒名,学年,種別\n";
        const escapeCSV = (val: string) => {
            if (val.includes(",") || val.includes('"') || val.includes("\n")) {
                return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
        };

        const rows = attendances
            .map((a) => {
                const timestamp = new Date(a.timestamp).toLocaleString("ja-JP", {
                    timeZone: "Asia/Tokyo",
                });
                const type = a.type === "checkin" ? "入室" : "退室";
                return `${escapeCSV(timestamp)},${escapeCSV(a.student.name)},${escapeCSV(a.student.grade)},${escapeCSV(type)}`;
            })
            .join("\n");

        const csv = BOM + header + rows;

        return new NextResponse(csv, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="attendance_${dateStr || "all"}.csv"`,
            },
        });
    } catch (error) {
        console.error("CSV export error:", error);
        return NextResponse.json(
            { error: "CSVの出力に失敗しました" },
            { status: 500 }
        );
    }
}
