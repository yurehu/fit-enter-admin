"use client";

import { useState, useEffect, useCallback } from "react";

interface Attendance {
    id: string;
    studentId: string;
    type: string;
    timestamp: string;
    student: {
        id: string;
        name: string;
        grade: string;
    };
}

interface CurrentStudent {
    student: {
        id: string;
        name: string;
        grade: string;
    };
    type: string;
    timestamp: string;
}

interface MonthlyRate {
    studentId: string;
    studentName: string;
    grade: string;
    attendanceDays: number;
    businessDays: number;
    rate: number;
}

export default function AdminDashboard() {
    const [attendances, setAttendances] = useState<Attendance[]>([]);
    const [currentlyCheckedIn, setCurrentlyCheckedIn] = useState<CurrentStudent[]>([]);
    const [selectedDate, setSelectedDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [selectedMonth, setSelectedMonth] = useState(
        new Date().toISOString().slice(0, 7)
    );
    const [monthlyData, setMonthlyData] = useState<{
        month: string;
        businessDays: number;
        students: MonthlyRate[];
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [showMonthly, setShowMonthly] = useState(false);

    const fetchAttendances = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/attendance?date=${selectedDate}`);
            const data = await res.json();
            setAttendances(data.attendances || []);
            setCurrentlyCheckedIn(data.currentlyCheckedIn || []);
        } catch (error) {
            console.error("Failed to fetch attendances:", error);
        }
        setLoading(false);
    }, [selectedDate]);

    const fetchMonthlyRate = useCallback(async () => {
        try {
            const res = await fetch(`/api/attendance?month=${selectedMonth}`);
            const data = await res.json();
            setMonthlyData(data);
        } catch (error) {
            console.error("Failed to fetch monthly data:", error);
        }
    }, [selectedMonth]);

    useEffect(() => {
        fetchAttendances();
    }, [fetchAttendances]);

    useEffect(() => {
        if (showMonthly) {
            fetchMonthlyRate();
        }
    }, [showMonthly, fetchMonthlyRate]);

    const handleCSVDownload = () => {
        window.open(`/api/attendance/csv?date=${selectedDate}`, "_blank");
    };

    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleTimeString("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    };

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1>📊 ダッシュボード</h1>
                <p>入退室状況をリアルタイムで確認</p>
            </div>
            <div className="orange-accent-line" />

            {/* 統計カード */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">🏫</div>
                    <div className="stat-label">現在入室中</div>
                    <div className="stat-value" style={{ color: "var(--accent-green)" }}>
                        {currentlyCheckedIn.length}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">📝</div>
                    <div className="stat-label">本日の記録数</div>
                    <div className="stat-value">{attendances.length}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">🚪</div>
                    <div className="stat-label">入室</div>
                    <div className="stat-value" style={{ color: "var(--fit-orange)" }}>
                        {attendances.filter((a) => a.type === "checkin").length}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">👋</div>
                    <div className="stat-label">退室</div>
                    <div className="stat-value" style={{ color: "var(--accent-purple)" }}>
                        {attendances.filter((a) => a.type === "checkout").length}
                    </div>
                </div>
            </div>

            {/* 現在入室中 */}
            {currentlyCheckedIn.length > 0 && (
                <div className="card" style={{ marginBottom: "24px" }}>
                    <h3 style={{ marginBottom: "16px", fontSize: "16px", fontWeight: 700 }}>
                        🟢 現在入室中の生徒
                    </h3>
                    <div className="flex flex-gap flex-wrap">
                        {currentlyCheckedIn.map((s) => (
                            <div
                                key={s.student.id}
                                style={{
                                    background: "var(--accent-green-bg)",
                                    border: "1px solid rgba(52, 179, 105, 0.2)",
                                    borderRadius: "var(--radius-sm)",
                                    padding: "10px 16px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                }}
                            >
                                <span style={{ fontWeight: 600 }}>{s.student.name}</span>
                                <span className="badge badge-grade">{s.student.grade}</span>
                                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                    {formatTime(s.timestamp)}〜
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 日付検索 + CSV */}
            <div className="card" style={{ marginBottom: "24px" }}>
                <div className="flex-between flex-wrap" style={{ gap: "12px" }}>
                    <div className="flex flex-gap" style={{ alignItems: "center" }}>
                        <label className="form-label" style={{ margin: 0, whiteSpace: "nowrap" }}>
                            📅 日付：
                        </label>
                        <input
                            type="date"
                            className="form-input"
                            style={{ width: "auto" }}
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-gap">
                        <button className="btn btn-outline btn-sm" onClick={handleCSVDownload}>
                            📥 CSV出力
                        </button>
                        <button
                            className="btn btn-outline btn-sm"
                            onClick={() => setShowMonthly(!showMonthly)}
                        >
                            📈 {showMonthly ? "閉じる" : "月間出席率"}
                        </button>
                    </div>
                </div>
            </div>

            {/* 月間出席率 */}
            {showMonthly && (
                <div className="card animate-slide-up" style={{ marginBottom: "24px" }}>
                    <div className="flex-between" style={{ marginBottom: "16px" }}>
                        <h3 style={{ fontSize: "16px", fontWeight: 700 }}>
                            📈 月間出席率
                        </h3>
                        <input
                            type="month"
                            className="form-input"
                            style={{ width: "auto" }}
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                        />
                    </div>

                    {monthlyData && monthlyData.students.length > 0 ? (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>生徒名</th>
                                        <th>学年</th>
                                        <th>出席日数</th>
                                        <th>営業日数</th>
                                        <th>出席率</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {monthlyData.students.map((s) => (
                                        <tr key={s.studentId}>
                                            <td style={{ fontWeight: 600 }}>{s.studentName}</td>
                                            <td>
                                                <span className="badge badge-grade">{s.grade}</span>
                                            </td>
                                            <td>{s.attendanceDays}日</td>
                                            <td>{s.businessDays}日</td>
                                            <td style={{ fontWeight: 700 }}>
                                                <span
                                                    style={{
                                                        color:
                                                            s.rate >= 80
                                                                ? "var(--accent-green)"
                                                                : s.rate >= 50
                                                                    ? "var(--accent-yellow)"
                                                                    : "var(--accent-red)",
                                                    }}
                                                >
                                                    {s.rate}%
                                                </span>
                                            </td>
                                            <td>
                                                <div className="rate-bar-container">
                                                    <div
                                                        className={`rate-bar ${s.rate >= 80
                                                                ? "high"
                                                                : s.rate >= 50
                                                                    ? "medium"
                                                                    : "low"
                                                            }`}
                                                        style={{ width: `${s.rate}%` }}
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
                            <p>この月のデータはありません</p>
                        </div>
                    )}
                </div>
            )}

            {/* 入退室一覧 */}
            <div className="card">
                <h3 style={{ marginBottom: "16px", fontSize: "16px", fontWeight: 700 }}>
                    📝 入退室記録
                </h3>

                {loading ? (
                    <div style={{ textAlign: "center", padding: "40px" }}>
                        <span className="loading-spinner" />
                    </div>
                ) : attendances.length > 0 ? (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>時刻</th>
                                    <th>生徒名</th>
                                    <th>学年</th>
                                    <th>種別</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attendances.map((a) => (
                                    <tr key={a.id}>
                                        <td>{formatTime(a.timestamp)}</td>
                                        <td style={{ fontWeight: 600 }}>{a.student.name}</td>
                                        <td>
                                            <span className="badge badge-grade">
                                                {a.student.grade}
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className={`badge ${a.type === "checkin"
                                                        ? "badge-checkin"
                                                        : "badge-checkout"
                                                    }`}
                                            >
                                                {a.type === "checkin" ? "🏫 入室" : "👋 退室"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon">📭</div>
                        <h3>記録がありません</h3>
                        <p>この日の入退室記録はまだありません</p>
                    </div>
                )}
            </div>
        </div>
    );
}
