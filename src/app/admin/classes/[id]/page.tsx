"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Student {
    id: string;
    name: string;
    grade: string;
}

interface Enrollment {
    id: string;
    student: Student;
}

interface ClassAttendanceRecord {
    id: string;
    studentId: string;
    date: string;
    status: string;
    student: Student;
}

interface ClassDetail {
    id: string;
    title: string;
    weekday: number;
    startTime: string;
    endTime: string;
    createdAt: string;
    enrollments: Enrollment[];
    attendances: ClassAttendanceRecord[];
}

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

export default function ClassDetailPage() {
    const params = useParams();
    const classId = params.id as string;
    const [classDetail, setClassDetail] = useState<ClassDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

    const fetchClassDetail = useCallback(async () => {
        try {
            const res = await fetch(`/api/classes/${classId}`);
            const data = await res.json();
            setClassDetail(data);
        } catch (error) {
            console.error("Failed to fetch class detail:", error);
        }
        setLoading(false);
    }, [classId]);

    useEffect(() => {
        fetchClassDetail();
    }, [fetchClassDetail]);

    const toggleAttendanceStatus = async (studentId: string, date: string, currentStatus: string) => {
        const key = `${studentId}-${date}`;
        setUpdatingStatus(key);
        try {
            const newStatus = currentStatus === "present" ? "absent" : "present";
            const res = await fetch(`/api/classes/${classId}/attendance`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ studentId, date, status: newStatus }),
            });

            if (res.ok) {
                await fetchClassDetail();
            }
        } catch (error) {
            console.error("Failed to update attendance:", error);
        }
        setUpdatingStatus(null);
    };

    if (loading) {
        return (
            <div style={{ textAlign: "center", padding: "60px" }}>
                <span className="loading-spinner" />
            </div>
        );
    }

    if (!classDetail) {
        return (
            <div className="animate-fade-in">
                <div className="empty-state">
                    <div className="empty-icon">❌</div>
                    <h3>授業が見つかりません</h3>
                    <Link href="/admin/classes" className="btn btn-primary" style={{ marginTop: "16px" }}>
                        ← 授業一覧へ
                    </Link>
                </div>
            </div>
        );
    }

    // 今週の日付を取得
    const getThisWeekDates = () => {
        const today = new Date();
        const currentDay = today.getDay();
        const dates: { date: string; label: string; isToday: boolean }[] = [];

        for (let i = 0; i < 7; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() - currentDay + i);
            const dateStr = d.toISOString().split("T")[0];
            dates.push({
                date: dateStr,
                label: `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAY_LABELS[i]})`,
                isToday: dateStr === today.toISOString().split("T")[0],
            });
        }
        return dates;
    };

    const thisWeekDates = getThisWeekDates();
    // この授業の曜日に対応する今週の日付
    const thisWeekClassDate = thisWeekDates[classDetail.weekday]?.date;

    // 生徒ごとの出席統計を計算
    const studentStats = classDetail.enrollments.map((enrollment) => {
        const studentAttendances = classDetail.attendances.filter(
            (a) => a.studentId === enrollment.student.id
        );

        // 授業作成日から今日までの該当曜日の回数
        const classCreatedAt = new Date(classDetail.createdAt);
        const today = new Date();
        let totalExpectedClasses = 0;
        const current = new Date(classCreatedAt);
        current.setHours(0, 0, 0, 0);

        while (current <= today) {
            if (current.getDay() === classDetail.weekday) {
                totalExpectedClasses++;
            }
            current.setDate(current.getDate() + 1);
        }

        // status === "present" のみカウント
        const attendedCount = studentAttendances.filter(a => a.status === "present").length;
        const rate =
            totalExpectedClasses > 0
                ? Math.min(100, Math.round((attendedCount / totalExpectedClasses) * 100))
                : 0;

        // 今週の出席状況を取得
        const thisWeekAttendance = studentAttendances.find(
            (a) => a.date === thisWeekClassDate
        );
        const attendedThisWeek = thisWeekAttendance?.status === "present";

        return {
            student: enrollment.student,
            attendedCount,
            totalExpectedClasses,
            rate,
            attendedThisWeek,
            thisWeekAttendanceStatus: thisWeekAttendance?.status || null,
            recentAttendances: studentAttendances.slice(0, 5),
        };
    });

    // 全体の出席率
    const totalAttended = studentStats.reduce((sum, s) => sum + s.attendedCount, 0);
    const totalExpected = studentStats.reduce((sum, s) => sum + s.totalExpectedClasses, 0);
    const overallRate = totalExpected > 0 ? Math.min(100, Math.round((totalAttended / totalExpected) * 100)) : 0;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <Link
                    href="/admin/classes"
                    style={{
                        color: "var(--text-muted)",
                        textDecoration: "none",
                        fontSize: "13px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        marginBottom: "8px",
                    }}
                >
                    ← 授業一覧に戻る
                </Link>
                <h1>📚 {classDetail.title}</h1>
                <p>
                    <span className={`weekday-badge weekday-${classDetail.weekday}`}>
                        {WEEKDAY_LABELS[classDetail.weekday]}曜日
                    </span>
                    <span style={{ marginLeft: "12px", color: "var(--text-secondary)" }}>
                        {classDetail.startTime} 〜 {classDetail.endTime}
                    </span>
                </p>
            </div>

            {/* 統計カード */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-label">登録生徒数</div>
                    <div className="stat-value" style={{ color: "var(--fit-orange)" }}>
                        {classDetail.enrollments.length}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">📝</div>
                    <div className="stat-label">総出席記録</div>
                    <div className="stat-value">
                        {classDetail.attendances.filter(a => a.status === "present").length}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">📊</div>
                    <div className="stat-label">全体出席率</div>
                    <div
                        className="stat-value"
                        style={{
                            color:
                                overallRate >= 80
                                    ? "var(--accent-green)"
                                    : overallRate >= 50
                                        ? "var(--accent-yellow)"
                                        : "var(--accent-red)",
                        }}
                    >
                        {overallRate}%
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-label">今週出席</div>
                    <div className="stat-value" style={{ color: "var(--accent-green)" }}>
                        {studentStats.filter((s) => s.attendedThisWeek).length}/
                        {studentStats.length}
                    </div>
                </div>
            </div>

            {/* 今週の出席状況 */}
            <div className="card" style={{ marginBottom: "24px" }}>
                <h3 style={{ marginBottom: "16px", fontSize: "16px", fontWeight: 700 }}>
                    ✅ 今週の出席状況
                    <span style={{ fontSize: "13px", fontWeight: 400, color: "var(--text-muted)", marginLeft: "8px" }}>
                        {thisWeekClassDate && `(${thisWeekClassDate})`}
                    </span>
                </h3>
                {studentStats.length > 0 ? (
                    <div className="flex flex-gap flex-wrap">
                        {studentStats.map((stat) => {
                            const hasRecord = stat.thisWeekAttendanceStatus !== null;
                            const isPresent = stat.thisWeekAttendanceStatus === "present";
                            const isAbsent = stat.thisWeekAttendanceStatus === "absent";
                            const isUpdating = updatingStatus === `${stat.student.id}-${thisWeekClassDate}`;

                            return (
                                <div
                                    key={stat.student.id}
                                    style={{
                                        background: isPresent
                                            ? "var(--accent-green-bg)"
                                            : isAbsent
                                                ? "rgba(239, 68, 68, 0.08)"
                                                : "var(--bg-input)",
                                        border: `1px solid ${isPresent
                                            ? "rgba(52, 179, 105, 0.2)"
                                            : isAbsent
                                                ? "rgba(239, 68, 68, 0.2)"
                                                : "var(--border-color)"
                                            }`,
                                        borderRadius: "var(--radius-sm)",
                                        padding: "10px 16px",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                    }}
                                >
                                    <span style={{ fontSize: "16px" }}>
                                        {isPresent ? "✅" : isAbsent ? "❌" : "⬜"}
                                    </span>
                                    <span style={{
                                        fontWeight: 600,
                                        textDecoration: isAbsent ? "line-through" : "none",
                                        opacity: isAbsent ? 0.6 : 1,
                                    }}>
                                        {stat.student.name}
                                    </span>
                                    <span className="badge badge-grade">{stat.student.grade}</span>
                                    {hasRecord && thisWeekClassDate && (
                                        <button
                                            className={`btn btn-sm ${isPresent ? "btn-danger" : "btn-success"}`}
                                            style={{ marginLeft: "4px", fontSize: "11px", padding: "2px 8px" }}
                                            disabled={isUpdating}
                                            onClick={() =>
                                                toggleAttendanceStatus(
                                                    stat.student.id,
                                                    thisWeekClassDate,
                                                    stat.thisWeekAttendanceStatus!
                                                )
                                            }
                                        >
                                            {isUpdating
                                                ? "..."
                                                : isPresent
                                                    ? "未出席にする"
                                                    : "出席に戻す"
                                            }
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                        登録生徒がいません
                    </p>
                )}
            </div>

            {/* 登録生徒一覧と出席率 */}
            <div className="card">
                <h3 style={{ marginBottom: "16px", fontSize: "16px", fontWeight: 700 }}>
                    📊 生徒別出席率
                </h3>

                {studentStats.length > 0 ? (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>生徒名</th>
                                    <th>学年</th>
                                    <th>出席回数</th>
                                    <th>授業回数</th>
                                    <th>出席率</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {studentStats.map((stat) => (
                                    <tr key={stat.student.id}>
                                        <td style={{ fontWeight: 600 }}>{stat.student.name}</td>
                                        <td>
                                            <span className="badge badge-grade">
                                                {stat.student.grade}
                                            </span>
                                        </td>
                                        <td>{stat.attendedCount}回</td>
                                        <td>{stat.totalExpectedClasses}回</td>
                                        <td style={{ fontWeight: 700 }}>
                                            <span
                                                style={{
                                                    color:
                                                        stat.rate >= 80
                                                            ? "var(--accent-green)"
                                                            : stat.rate >= 50
                                                                ? "var(--accent-yellow)"
                                                                : "var(--accent-red)",
                                                }}
                                            >
                                                {stat.rate}%
                                            </span>
                                        </td>
                                        <td>
                                            <div className="rate-bar-container">
                                                <div
                                                    className={`rate-bar ${stat.rate >= 80
                                                        ? "high"
                                                        : stat.rate >= 50
                                                            ? "medium"
                                                            : "low"
                                                        }`}
                                                    style={{ width: `${stat.rate}%` }}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-state">
                        <p>登録生徒がいません</p>
                    </div>
                )}
            </div>
        </div>
    );
}
