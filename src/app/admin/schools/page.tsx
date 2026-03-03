"use client";

import { useState, useEffect, useCallback } from "react";

interface School {
    id: string;
    name: string;
    type: string;
    createdAt: string;
    _count: { students: number };
}

const schoolTypes = ["小学校", "中学校", "高校", "その他"];

export default function SchoolsPage() {
    const [schools, setSchools] = useState<School[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState("");
    const [type, setType] = useState("");
    const [formError, setFormError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // 編集
    const [editingSchool, setEditingSchool] = useState<School | null>(null);
    const [editName, setEditName] = useState("");
    const [editType, setEditType] = useState("");
    const [editError, setEditError] = useState("");
    const [editSubmitting, setEditSubmitting] = useState(false);

    const fetchSchools = useCallback(async () => {
        try {
            const res = await fetch("/api/schools");
            const data = await res.json();
            setSchools(data);
        } catch (error) {
            console.error("Failed to fetch schools:", error);
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchSchools(); }, [fetchSchools]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");
        setSubmitting(true);
        try {
            const res = await fetch("/api/schools", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, type }),
            });
            const data = await res.json();
            if (!res.ok) { setFormError(data.error || "登録に失敗しました"); return; }
            setName(""); setType(""); setShowForm(false);
            fetchSchools();
        } catch { setFormError("サーバーへの接続に失敗しました"); }
        finally { setSubmitting(false); }
    };

    const openEdit = (school: School) => {
        setEditingSchool(school);
        setEditName(school.name);
        setEditType(school.type);
        setEditError("");
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSchool) return;
        setEditError("");
        setEditSubmitting(true);
        try {
            const res = await fetch(`/api/schools/${editingSchool.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: editName, type: editType }),
            });
            const data = await res.json();
            if (!res.ok) { setEditError(data.error || "更新に失敗しました"); return; }
            setEditingSchool(null);
            fetchSchools();
        } catch { setEditError("サーバーへの接続に失敗しました"); }
        finally { setEditSubmitting(false); }
    };

    const handleDelete = async (id: string, schoolName: string) => {
        if (!confirm(`「${schoolName}」を削除しますか？`)) return;
        try {
            const res = await fetch(`/api/schools/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) { alert(data.error || "削除に失敗しました"); return; }
            fetchSchools();
        } catch { alert("サーバーへの接続に失敗しました"); }
    };

    const typeEmoji = (t: string) => {
        switch (t) {
            case "小学校": return "🏫";
            case "中学校": return "🏫";
            case "高校": return "🎓";
            default: return "📍";
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div className="flex-between">
                    <div>
                        <h1>🏫 学校管理</h1>
                        <p>学校マスタの登録・管理</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                        {showForm ? "✕ 閉じる" : "＋ 学校登録"}
                    </button>
                </div>
            </div>

            {showForm && (
                <div className="card animate-slide-up" style={{ marginBottom: "24px" }}>
                    <h3 style={{ marginBottom: "16px", fontSize: "16px", fontWeight: 600 }}>✏️ 新規学校登録</h3>
                    {formError && <div className="alert alert-error">{formError}</div>}
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px" }}>
                            <div className="form-group">
                                <label className="form-label">学校名 *</label>
                                <input type="text" className="form-input" placeholder="松山東高校" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">種別 *</label>
                                <select className="form-input" value={type} onChange={(e) => setType(e.target.value)} required>
                                    <option value="">選択</option>
                                    {schoolTypes.map((t) => (<option key={t} value={t}>{t}</option>))}
                                </select>
                            </div>
                        </div>
                        <button type="submit" className="btn btn-success" disabled={submitting}>
                            {submitting ? <span className="loading-spinner" /> : "登録する"}
                        </button>
                    </form>
                </div>
            )}

            <div className="card">
                <h3 style={{ marginBottom: "16px", fontSize: "16px", fontWeight: 600 }}>
                    学校一覧（{schools.length}校）
                </h3>

                {loading ? (
                    <div style={{ textAlign: "center", padding: "40px" }}><span className="loading-spinner" /></div>
                ) : schools.length > 0 ? (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>学校名</th>
                                    <th>種別</th>
                                    <th>所属生徒数</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {schools.map((school) => (
                                    <tr key={school.id}>
                                        <td style={{ fontWeight: 500 }}>{typeEmoji(school.type)} {school.name}</td>
                                        <td><span className="badge badge-grade">{school.type}</span></td>
                                        <td>{school._count.students}名</td>
                                        <td>
                                            <div className="flex flex-gap">
                                                <button className="btn btn-outline btn-sm" onClick={() => openEdit(school)}>✏️ 編集</button>
                                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(school.id, school.name)}>🗑</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon">🏫</div>
                        <h3>学校が登録されていません</h3>
                        <p>「＋ 学校登録」ボタンから学校を追加してください</p>
                    </div>
                )}
            </div>

            {editingSchool && (
                <div className="modal-overlay" onClick={() => setEditingSchool(null)}>
                    <div className="modal animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "450px" }}>
                        <h3>✏️ 学校情報の編集</h3>
                        {editError && <div className="alert alert-error" style={{ marginBottom: "12px" }}>{editError}</div>}
                        <form onSubmit={handleEditSubmit}>
                            <div className="form-group">
                                <label className="form-label">学校名 *</label>
                                <input type="text" className="form-input" value={editName} onChange={(e) => setEditName(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">種別 *</label>
                                <select className="form-input" value={editType} onChange={(e) => setEditType(e.target.value)} required>
                                    {schoolTypes.map((t) => (<option key={t} value={t}>{t}</option>))}
                                </select>
                            </div>
                            <div className="flex flex-gap" style={{ justifyContent: "flex-end" }}>
                                <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditingSchool(null)}>キャンセル</button>
                                <button type="submit" className="btn btn-primary btn-sm" disabled={editSubmitting}>
                                    {editSubmitting ? <span className="loading-spinner" /> : "保存する"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
