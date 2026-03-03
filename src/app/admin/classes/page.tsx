"use client";

import { useState, useEffect, useCallback } from "react";
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

interface WeeklyClass {
    id: string;
    title: string;
    weekday: number;
    startTime: string;
    endTime: string;
    enrollments: Enrollment[];
    _count: { attendances: number };
}

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

export default function ClassesPage() {
    const [classes, setClasses] = useState<WeeklyClass[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingClass, setEditingClass] = useState<WeeklyClass | null>(null);

    // フォーム状態
    const [title, setTitle] = useState("");
    const [weekday, setWeekday] = useState(1);
    const [startTime, setStartTime] = useState("17:00");
    const [endTime, setEndTime] = useState("18:30");
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [formError, setFormError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const fetchClasses = useCallback(async () => {
        try {
            const res = await fetch("/api/classes");
            const data = await res.json();
            setClasses(data);
        } catch (error) {
            console.error("Failed to fetch classes:", error);
        }
        setLoading(false);
    }, []);

    const fetchStudents = useCallback(async () => {
        try {
            const res = await fetch("/api/students");
            const data = await res.json();
            setStudents(data);
        } catch (error) {
            console.error("Failed to fetch students:", error);
        }
    }, []);

    useEffect(() => {
        fetchClasses();
        fetchStudents();
    }, [fetchClasses, fetchStudents]);

    const resetForm = () => {
        setTitle("");
        setWeekday(1);
        setStartTime("17:00");
        setEndTime("18:30");
        setSelectedStudentIds([]);
        setFormError("");
        setEditingClass(null);
    };

    const openEditForm = (cls: WeeklyClass) => {
        setEditingClass(cls);
        setTitle(cls.title);
        setWeekday(cls.weekday);
        setStartTime(cls.startTime);
        setEndTime(cls.endTime);
        setSelectedStudentIds(cls.enrollments.map((e) => e.student.id));
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");
        setSubmitting(true);

        try {
            const payload = { title, weekday, startTime, endTime, studentIds: selectedStudentIds };
            const url = editingClass ? `/api/classes/${editingClass.id}` : "/api/classes";
            const method = editingClass ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                setFormError(data.error || "保存に失敗しました");
                return;
            }

            resetForm();
            setShowForm(false);
            fetchClasses();
        } catch {
            setFormError("サーバーへの接続に失敗しました");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string, classTitle: string) => {
        if (!confirm(`「${classTitle}」を削除しますか？\nこの操作は取り消せません。`)) {
            return;
        }

        try {
            await fetch(`/api/classes/${id}`, { method: "DELETE" });
            fetchClasses();
        } catch (error) {
            console.error("Failed to delete class:", error);
        }
    };

    const toggleStudent = (studentId: string) => {
        setSelectedStudentIds((prev) =>
            prev.includes(studentId)
                ? prev.filter((id) => id !== studentId)
                : [...prev, studentId]
        );
    };

    // 曜日ごとにグループ化
    const classesByWeekday = WEEKDAY_LABELS.map((label, index) => ({
        label,
        weekday: index,
        classes: classes.filter((c) => c.weekday === index),
    })).filter((group) => group.classes.length > 0);

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div className="flex-between">
                    <div>
                        <h1>📚 授業管理</h1>
                        <p>固定時間割の授業設定・生徒割当</p>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            if (showForm) {
                                setShowForm(false);
                                resetForm();
                            } else {
                                resetForm();
                                setShowForm(true);
                            }
                        }}
                    >
                        {showForm ? "✕ 閉じる" : "＋ 授業作成"}
                    </button>
                </div>
            </div>

            {/* 授業作成/編集フォーム */}
            {showForm && (
                <div className="card animate-slide-up" style={{ marginBottom: "24px" }}>
                    <h3 style={{ marginBottom: "16px", fontSize: "16px", fontWeight: 600 }}>
                        ✏️ {editingClass ? "授業編集" : "新規授業作成"}
                    </h3>

                    {formError && <div className="alert alert-error">{formError}</div>}

                    <form onSubmit={handleSubmit}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "16px" }}>
                            <div className="form-group">
                                <label className="form-label">授業名 *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="中3数学"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">曜日 *</label>
                                <select
                                    className="form-input"
                                    value={weekday}
                                    onChange={(e) => setWeekday(Number(e.target.value))}
                                    required
                                >
                                    {WEEKDAY_LABELS.map((label, index) => (
                                        <option key={index} value={index}>
                                            {label}曜日
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">開始時間 *</label>
                                <input
                                    type="time"
                                    className="form-input"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">終了時間 *</label>
                                <input
                                    type="time"
                                    className="form-input"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* 生徒割当 */}
                        <div className="form-group" style={{ marginTop: "8px" }}>
                            <label className="form-label">
                                👥 生徒割当（{selectedStudentIds.length}名選択中）
                            </label>
                            <div className="checkbox-grid">
                                {students.map((student) => (
                                    <label
                                        key={student.id}
                                        className={`checkbox-item ${selectedStudentIds.includes(student.id) ? "checked" : ""}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedStudentIds.includes(student.id)}
                                            onChange={() => toggleStudent(student.id)}
                                        />
                                        <span className="checkbox-name">{student.name}</span>
                                        <span className="badge badge-grade">{student.grade}</span>
                                    </label>
                                ))}
                            </div>
                            {students.length === 0 && (
                                <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                                    まだ生徒が登録されていません
                                </p>
                            )}
                        </div>

                        <button type="submit" className="btn btn-success" disabled={submitting}>
                            {submitting ? (
                                <span className="loading-spinner" />
                            ) : editingClass ? (
                                "更新する"
                            ) : (
                                "作成する"
                            )}
                        </button>
                    </form>
                </div>
            )}

            {/* 授業一覧 */}
            <div className="card">
                <h3 style={{ marginBottom: "16px", fontSize: "16px", fontWeight: 600 }}>
                    授業一覧（{classes.length}件）
                </h3>

                {loading ? (
                    <div style={{ textAlign: "center", padding: "40px" }}>
                        <span className="loading-spinner" />
                    </div>
                ) : classesByWeekday.length > 0 ? (
                    <div>
                        {classesByWeekday.map((group) => (
                            <div key={group.weekday} style={{ marginBottom: "24px" }}>
                                <div style={{ marginBottom: "12px" }}>
                                    <span className={`weekday-badge weekday-${group.weekday}`}>
                                        {group.label}曜日
                                    </span>
                                </div>
                                <div className="table-container">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>授業名</th>
                                                <th>時間帯</th>
                                                <th>登録生徒</th>
                                                <th>出席記録数</th>
                                                <th>操作</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {group.classes.map((cls) => (
                                                <tr key={cls.id}>
                                                    <td style={{ fontWeight: 600 }}>
                                                        <Link
                                                            href={`/admin/classes/${cls.id}`}
                                                            style={{ color: "var(--fit-orange)", textDecoration: "none" }}
                                                        >
                                                            {cls.title}
                                                        </Link>
                                                    </td>
                                                    <td>
                                                        {cls.startTime} 〜 {cls.endTime}
                                                    </td>
                                                    <td>
                                                        {cls.enrollments.length > 0 ? (
                                                            <div className="flex flex-gap flex-wrap">
                                                                {cls.enrollments.map((e) => (
                                                                    <span
                                                                        key={e.id}
                                                                        className="badge badge-grade"
                                                                        style={{ fontSize: "11px" }}
                                                                    >
                                                                        {e.student.name}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                                                                未割当
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td>{cls._count.attendances}件</td>
                                                    <td>
                                                        <div className="flex flex-gap">
                                                            <Link
                                                                href={`/admin/classes/${cls.id}`}
                                                                className="btn btn-outline btn-sm"
                                                            >
                                                                📊 詳細
                                                            </Link>
                                                            <button
                                                                className="btn btn-outline btn-sm"
                                                                onClick={() => openEditForm(cls)}
                                                            >
                                                                ✏️ 編集
                                                            </button>
                                                            <button
                                                                className="btn btn-danger btn-sm"
                                                                onClick={() => handleDelete(cls.id, cls.title)}
                                                            >
                                                                🗑
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon">📚</div>
                        <h3>授業が登録されていません</h3>
                        <p>「＋ 授業作成」ボタンから授業を追加してください</p>
                    </div>
                )}
            </div>
        </div>
    );
}
