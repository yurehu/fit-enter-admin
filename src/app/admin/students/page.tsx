"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

interface Student {
    id: string;
    name: string;
    grade: string;
    parentEmail: string;
    qrToken: string;
    createdAt: string;
    attendances: { type: string }[];
}

interface ClassStat {
    classId: string;
    classTitle: string;
    weekday: number;
    startTime: string;
    endTime: string;
    attendedCount: number;
    totalExpectedClasses: number;
    rate: number;
}

interface StudentClassData {
    overallRate: number;
    classStats: ClassStat[];
}

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

const gradeOptions = [
    "小1", "小2", "小3", "小4", "小5", "小6",
    "中1", "中2", "中3",
    "高1", "高2", "高3",
    "その他",
];

export default function StudentsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showQR, setShowQR] = useState<string | null>(null);
    const [showClassModal, setShowClassModal] = useState<string | null>(null);
    const [classData, setClassData] = useState<StudentClassData | null>(null);
    const [classDataLoading, setClassDataLoading] = useState(false);

    // 検索・フィルター
    const [searchQuery, setSearchQuery] = useState("");
    const [gradeFilter, setGradeFilter] = useState("");

    // 編集モーダル
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [editName, setEditName] = useState("");
    const [editGrade, setEditGrade] = useState("");
    const [editParentEmail, setEditParentEmail] = useState("");
    const [editError, setEditError] = useState("");
    const [editSubmitting, setEditSubmitting] = useState(false);

    // 新規登録フォームの状態
    const [name, setName] = useState("");
    const [grade, setGrade] = useState("");
    const [parentEmail, setParentEmail] = useState("");
    const [formError, setFormError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const fetchStudents = useCallback(async () => {
        try {
            const res = await fetch("/api/students");
            const data = await res.json();
            setStudents(data);
        } catch (error) {
            console.error("Failed to fetch students:", error);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);

    // 検索・フィルター適用
    const filteredStudents = useMemo(() => {
        return students.filter((student) => {
            const matchesSearch = searchQuery === "" ||
                student.name.includes(searchQuery) ||
                student.parentEmail.includes(searchQuery);
            const matchesGrade = gradeFilter === "" || student.grade === gradeFilter;
            return matchesSearch && matchesGrade;
        });
    }, [students, searchQuery, gradeFilter]);

    const fetchClassData = useCallback(async (studentId: string) => {
        setClassDataLoading(true);
        try {
            const res = await fetch(`/api/students/${studentId}/class-attendance`);
            const data = await res.json();
            setClassData(data);
        } catch (error) {
            console.error("Failed to fetch class data:", error);
        }
        setClassDataLoading(false);
    }, []);

    const handleShowClassModal = (studentId: string) => {
        setShowClassModal(studentId);
        fetchClassData(studentId);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");
        setSubmitting(true);

        try {
            const res = await fetch("/api/students", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, grade, parentEmail }),
            });

            const data = await res.json();

            if (!res.ok) {
                setFormError(data.error || "登録に失敗しました");
                return;
            }

            // フォームリセット
            setName("");
            setGrade("");
            setParentEmail("");
            setShowForm(false);
            fetchStudents();
        } catch {
            setFormError("サーバーへの接続に失敗しました");
        } finally {
            setSubmitting(false);
        }
    };

    // 編集処理
    const openEditModal = (student: Student) => {
        setEditingStudent(student);
        setEditName(student.name);
        setEditGrade(student.grade);
        setEditParentEmail(student.parentEmail);
        setEditError("");
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStudent) return;
        setEditError("");
        setEditSubmitting(true);

        try {
            const res = await fetch(`/api/students/${editingStudent.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: editName,
                    grade: editGrade,
                    parentEmail: editParentEmail,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setEditError(data.error || "更新に失敗しました");
                return;
            }

            setEditingStudent(null);
            fetchStudents();
        } catch {
            setEditError("サーバーへの接続に失敗しました");
        } finally {
            setEditSubmitting(false);
        }
    };

    const handleDelete = async (id: string, studentName: string) => {
        if (!confirm(`「${studentName}」を削除しますか？\nこの操作は取り消せません。`)) {
            return;
        }

        try {
            await fetch(`/api/students/${id}`, { method: "DELETE" });
            fetchStudents();
        } catch (error) {
            console.error("Failed to delete student:", error);
        }
    };

    const handleDownloadQR = (id: string, studentName: string) => {
        const link = document.createElement("a");
        link.href = `/api/students/${id}/qrcode`;
        link.download = `QR_${studentName}.svg`;
        link.click();
    };

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div className="flex-between">
                    <div>
                        <h1>👥 生徒管理</h1>
                        <p>生徒の登録・QRコード管理</p>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowForm(!showForm)}
                    >
                        {showForm ? "✕ 閉じる" : "＋ 生徒登録"}
                    </button>
                </div>
            </div>

            {/* 生徒登録フォーム */}
            {showForm && (
                <div className="card animate-slide-up" style={{ marginBottom: "24px" }}>
                    <h3 style={{ marginBottom: "16px", fontSize: "16px", fontWeight: 600 }}>
                        ✏️ 新規生徒登録
                    </h3>

                    {formError && <div className="alert alert-error">{formError}</div>}

                    <form onSubmit={handleSubmit}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                            <div className="form-group">
                                <label className="form-label">氏名 *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="山田 太郎"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    maxLength={50}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">学年 *</label>
                                <select
                                    className="form-input"
                                    value={grade}
                                    onChange={(e) => setGrade(e.target.value)}
                                    required
                                >
                                    <option value="">選択してください</option>
                                    {gradeOptions.map((g) => (
                                        <option key={g} value={g}>
                                            {g}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">保護者メール *</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    placeholder="parent@example.com"
                                    value={parentEmail}
                                    onChange={(e) => setParentEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-success"
                            disabled={submitting}
                        >
                            {submitting ? (
                                <span className="loading-spinner" />
                            ) : (
                                "登録する"
                            )}
                        </button>
                    </form>
                </div>
            )}

            {/* 検索・フィルター */}
            <div className="card" style={{ marginBottom: "24px" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: "200px" }}>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="🔍 名前・メールで検索..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ margin: 0 }}
                        />
                    </div>
                    <div style={{ minWidth: "140px" }}>
                        <select
                            className="form-input"
                            value={gradeFilter}
                            onChange={(e) => setGradeFilter(e.target.value)}
                            style={{ margin: 0 }}
                        >
                            <option value="">全学年</option>
                            {gradeOptions.map((g) => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                        </select>
                    </div>
                    {(searchQuery || gradeFilter) && (
                        <button
                            className="btn btn-outline btn-sm"
                            onClick={() => { setSearchQuery(""); setGradeFilter(""); }}
                        >
                            ✕ クリア
                        </button>
                    )}
                    <span style={{ color: "var(--text-muted)", fontSize: "13px", whiteSpace: "nowrap" }}>
                        {filteredStudents.length}/{students.length}名表示
                    </span>
                </div>
            </div>

            {/* 生徒一覧 */}
            <div className="card">
                <div className="flex-between" style={{ marginBottom: "16px" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: 600 }}>
                        生徒一覧（{students.length}名）
                    </h3>
                </div>

                {loading ? (
                    <div style={{ textAlign: "center", padding: "40px" }}>
                        <span className="loading-spinner" />
                    </div>
                ) : filteredStudents.length > 0 ? (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>氏名</th>
                                    <th>学年</th>
                                    <th>保護者メール</th>
                                    <th>ステータス</th>
                                    <th>登録日</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.map((student) => {
                                    const lastAtt = student.attendances?.[0];
                                    const isCheckedIn = lastAtt?.type === "checkin";

                                    return (
                                        <tr key={student.id}>
                                            <td style={{ fontWeight: 500 }}>{student.name}</td>
                                            <td>
                                                <span className="badge badge-grade">
                                                    {student.grade}
                                                </span>
                                            </td>
                                            <td style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                                                {student.parentEmail}
                                            </td>
                                            <td>
                                                {lastAtt ? (
                                                    <span
                                                        className={`badge ${isCheckedIn ? "badge-checkin" : "badge-checkout"
                                                            }`}
                                                    >
                                                        {isCheckedIn ? "入室中" : "退室済"}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                                                        未打刻
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                                                {new Date(student.createdAt).toLocaleDateString("ja-JP")}
                                            </td>
                                            <td>
                                                <div className="flex flex-gap">
                                                    <button
                                                        className="btn btn-outline btn-sm"
                                                        onClick={() => openEditModal(student)}
                                                    >
                                                        ✏️ 編集
                                                    </button>
                                                    <button
                                                        className="btn btn-outline btn-sm"
                                                        onClick={() => handleShowClassModal(student.id)}
                                                    >
                                                        📚 授業
                                                    </button>
                                                    <button
                                                        className="btn btn-outline btn-sm"
                                                        onClick={() =>
                                                            setShowQR(showQR === student.id ? null : student.id)
                                                        }
                                                    >
                                                        📱 QR
                                                    </button>
                                                    <button
                                                        className="btn btn-outline btn-sm"
                                                        onClick={() =>
                                                            handleDownloadQR(student.id, student.name)
                                                        }
                                                    >
                                                        📥
                                                    </button>
                                                    <button
                                                        className="btn btn-danger btn-sm"
                                                        onClick={() =>
                                                            handleDelete(student.id, student.name)
                                                        }
                                                    >
                                                        🗑
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : students.length > 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">🔍</div>
                        <h3>検索結果がありません</h3>
                        <p>検索条件を変更してください</p>
                    </div>
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon">👥</div>
                        <h3>生徒が登録されていません</h3>
                        <p>「＋ 生徒登録」ボタンから生徒を追加してください</p>
                    </div>
                )}
            </div>

            {/* 編集モーダル */}
            {editingStudent && (
                <div className="modal-overlay" onClick={() => setEditingStudent(null)}>
                    <div
                        className="modal animate-slide-up"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: "500px" }}
                    >
                        <h3>✏️ 生徒情報の編集</h3>
                        <p style={{ color: "var(--text-secondary)", marginBottom: "20px", fontSize: "14px" }}>
                            {editingStudent.name} の情報を編集
                        </p>

                        {editError && <div className="alert alert-error" style={{ marginBottom: "12px" }}>{editError}</div>}

                        <form onSubmit={handleEditSubmit}>
                            <div className="form-group">
                                <label className="form-label">氏名 *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    required
                                    maxLength={50}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">学年 *</label>
                                <select
                                    className="form-input"
                                    value={editGrade}
                                    onChange={(e) => setEditGrade(e.target.value)}
                                    required
                                >
                                    {gradeOptions.map((g) => (
                                        <option key={g} value={g}>{g}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">保護者メール *</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    value={editParentEmail}
                                    onChange={(e) => setEditParentEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="flex flex-gap" style={{ justifyContent: "flex-end", marginTop: "16px" }}>
                                <button
                                    type="button"
                                    className="btn btn-outline btn-sm"
                                    onClick={() => setEditingStudent(null)}
                                >
                                    キャンセル
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary btn-sm"
                                    disabled={editSubmitting}
                                >
                                    {editSubmitting ? <span className="loading-spinner" /> : "保存する"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* QRコードモーダル */}
            {showQR && (
                <div className="modal-overlay" onClick={() => setShowQR(null)}>
                    <div
                        className="modal"
                        onClick={(e) => e.stopPropagation()}
                        style={{ textAlign: "center" }}
                    >
                        <h3>📱 QRコード</h3>
                        <p style={{ color: "var(--text-secondary)", marginBottom: "20px", fontSize: "14px" }}>
                            {students.find((s) => s.id === showQR)?.name}
                        </p>
                        <div className="qr-container" style={{ marginBottom: "20px" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={`/api/students/${showQR}/qrcode`}
                                alt="QRコード"
                                width={250}
                                height={250}
                            />
                        </div>
                        <div className="flex flex-gap" style={{ justifyContent: "center" }}>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={() => {
                                    const student = students.find((s) => s.id === showQR);
                                    if (student) handleDownloadQR(student.id, student.name);
                                }}
                            >
                                📥 ダウンロード
                            </button>
                            <button
                                className="btn btn-outline btn-sm"
                                onClick={() => setShowQR(null)}
                            >
                                閉じる
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 授業出席モーダル */}
            {showClassModal && (
                <div className="modal-overlay" onClick={() => { setShowClassModal(null); setClassData(null); }}>
                    <div
                        className="modal"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: "600px" }}
                    >
                        <h3>📚 授業出席履歴</h3>
                        <p style={{ color: "var(--text-secondary)", marginBottom: "20px", fontSize: "14px" }}>
                            {students.find((s) => s.id === showClassModal)?.name}
                        </p>

                        {classDataLoading ? (
                            <div style={{ textAlign: "center", padding: "30px" }}>
                                <span className="loading-spinner" />
                            </div>
                        ) : classData ? (
                            <div>
                                {/* 全体出席率 */}
                                <div
                                    style={{
                                        background: "var(--fit-orange-bg)",
                                        borderRadius: "var(--radius-sm)",
                                        padding: "16px",
                                        marginBottom: "16px",
                                        textAlign: "center",
                                    }}
                                >
                                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                                        全体出席率
                                    </div>
                                    <div
                                        style={{
                                            fontSize: "32px",
                                            fontWeight: 800,
                                            color:
                                                classData.overallRate >= 80
                                                    ? "var(--accent-green)"
                                                    : classData.overallRate >= 50
                                                        ? "var(--accent-yellow)"
                                                        : "var(--accent-red)",
                                        }}
                                    >
                                        {classData.overallRate}%
                                    </div>
                                </div>

                                {/* 授業別出席率 */}
                                {classData.classStats.length > 0 ? (
                                    <div className="table-container">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>授業名</th>
                                                    <th>曜日・時間</th>
                                                    <th>出席</th>
                                                    <th>出席率</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {classData.classStats.map((stat) => (
                                                    <tr key={stat.classId}>
                                                        <td style={{ fontWeight: 600 }}>{stat.classTitle}</td>
                                                        <td style={{ fontSize: "13px" }}>
                                                            <span className={`weekday-badge weekday-${stat.weekday}`} style={{ fontSize: "10px", padding: "2px 6px" }}>
                                                                {WEEKDAY_LABELS[stat.weekday]}
                                                            </span>
                                                            <span style={{ marginLeft: "4px" }}>
                                                                {stat.startTime}〜{stat.endTime}
                                                            </span>
                                                        </td>
                                                        <td style={{ fontSize: "13px" }}>
                                                            {stat.attendedCount}/{stat.totalExpectedClasses}
                                                        </td>
                                                        <td>
                                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                                <span
                                                                    style={{
                                                                        fontWeight: 700,
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
                                                                <div className="rate-bar-container" style={{ width: "60px" }}>
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
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p style={{ color: "var(--text-muted)", fontSize: "13px", textAlign: "center" }}>
                                        授業に登録されていません
                                    </p>
                                )}
                            </div>
                        ) : (
                            <p style={{ color: "var(--text-muted)", fontSize: "13px", textAlign: "center" }}>
                                データの取得に失敗しました
                            </p>
                        )}

                        <div style={{ textAlign: "center", marginTop: "20px" }}>
                            <button
                                className="btn btn-outline btn-sm"
                                onClick={() => { setShowClassModal(null); setClassData(null); }}
                            >
                                閉じる
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
