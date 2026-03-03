"use client";

import { useState, useEffect, useCallback } from "react";

export default function SettingsPage() {
    const [pin, setPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");
    const [pinError, setPinError] = useState("");
    const [pinSuccess, setPinSuccess] = useState("");
    const [saving, setSaving] = useState(false);
    const [qrSvg, setQrSvg] = useState<string | null>(null);
    const [loadingQr, setLoadingQr] = useState(false);

    // パスワード変更
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [pwError, setPwError] = useState("");
    const [pwSuccess, setPwSuccess] = useState("");
    const [pwSaving, setPwSaving] = useState(false);

    const fetchMasterQr = useCallback(async () => {
        setLoadingQr(true);
        try {
            const res = await fetch("/api/admin/master-qr");
            if (res.ok) {
                const svg = await res.text();
                setQrSvg(svg);
            }
        } catch (error) {
            console.error("Failed to fetch master QR:", error);
        }
        setLoadingQr(false);
    }, []);

    useEffect(() => {
        fetchMasterQr();
    }, [fetchMasterQr]);

    const handlePinSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPinError("");
        setPinSuccess("");

        if (!/^\d{4}$/.test(pin)) {
            setPinError("PINは4桁の数字で入力してください");
            return;
        }

        if (pin !== confirmPin) {
            setPinError("PINが一致しません");
            return;
        }

        setSaving(true);
        try {
            const res = await fetch("/api/admin/master-qr", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pin }),
            });

            const data = await res.json();

            if (!res.ok) {
                setPinError(data.error || "設定に失敗しました");
                return;
            }

            setPinSuccess("PINコードを設定しました");
            setPin("");
            setConfirmPin("");
            setTimeout(() => setPinSuccess(""), 3000);
        } catch {
            setPinError("サーバーへの接続に失敗しました");
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPwError("");
        setPwSuccess("");

        if (newPassword.length < 8) {
            setPwError("新しいパスワードは8文字以上で設定してください");
            return;
        }

        if (newPassword !== confirmPassword) {
            setPwError("新しいパスワードが一致しません");
            return;
        }

        setPwSaving(true);
        try {
            const res = await fetch("/api/auth/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword }),
            });

            const data = await res.json();

            if (!res.ok) {
                setPwError(data.error || "パスワードの変更に失敗しました");
                return;
            }

            setPwSuccess("パスワードを変更しました");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setTimeout(() => setPwSuccess(""), 3000);
        } catch {
            setPwError("サーバーへの接続に失敗しました");
        } finally {
            setPwSaving(false);
        }
    };

    const handlePrint = () => {
        if (!qrSvg) return;
        const printWindow = window.open("", "_blank");
        if (printWindow) {
            printWindow.document.write(`
                <html>
                <head><title>マスターQRコード</title></head>
                <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;">
                    <h1 style="margin-bottom:8px;">管理者用 マスターQRコード</h1>
                    <p style="color:#888;margin-bottom:24px;">このQRコードを打刻画面でスキャンして、PINでログインできます</p>
                    <div style="width:300px;height:300px;">${qrSvg}</div>
                    <p style="margin-top:24px;color:#999;font-size:12px;">松山総合予備校 fit</p>
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1>⚙️ 設定</h1>
                <p>管理者設定・セキュリティ</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                {/* PIN設定 */}
                <div className="card">
                    <h3 style={{ marginBottom: "16px", fontSize: "16px", fontWeight: 700 }}>
                        🔐 PINコード設定
                    </h3>
                    <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "16px" }}>
                        マスターQRコードスキャン後に入力する4桁のPINコードを設定します。
                    </p>

                    {pinError && <div className="alert alert-error" style={{ marginBottom: "12px" }}>{pinError}</div>}
                    {pinSuccess && <div className="alert alert-success" style={{
                        marginBottom: "12px",
                        background: "rgba(52,179,105,0.1)",
                        border: "1px solid rgba(52,179,105,0.2)",
                        color: "var(--accent-green)",
                        padding: "10px 14px",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "13px",
                    }}>{pinSuccess}</div>}

                    <form onSubmit={handlePinSubmit}>
                        <div className="form-group">
                            <label className="form-label">新しいPINコード（4桁）</label>
                            <input
                                type="tel"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={4}
                                className="form-input"
                                placeholder="●●●●"
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                                style={{ letterSpacing: "8px", textAlign: "center", fontSize: "20px", fontWeight: 700 }}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">PINコード確認</label>
                            <input
                                type="tel"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={4}
                                className="form-input"
                                placeholder="●●●●"
                                value={confirmPin}
                                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                                style={{ letterSpacing: "8px", textAlign: "center", fontSize: "20px", fontWeight: 700 }}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={saving || pin.length !== 4 || confirmPin.length !== 4}
                            style={{ width: "100%" }}
                        >
                            {saving ? <span className="loading-spinner" /> : "PINを設定する"}
                        </button>
                    </form>
                </div>

                {/* マスターQRコード */}
                <div className="card">
                    <h3 style={{ marginBottom: "16px", fontSize: "16px", fontWeight: 700 }}>
                        📱 マスターQRコード
                    </h3>
                    <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "16px" }}>
                        このQRコードを打刻画面でスキャンすると、PINコードで管理画面にログインできます。
                    </p>

                    <div style={{
                        background: "#fff",
                        borderRadius: "var(--radius-sm)",
                        padding: "20px",
                        display: "flex",
                        justifyContent: "center",
                        marginBottom: "16px",
                    }}>
                        {loadingQr ? (
                            <div style={{ padding: "40px" }}>
                                <span className="loading-spinner" />
                            </div>
                        ) : qrSvg ? (
                            <div
                                dangerouslySetInnerHTML={{ __html: qrSvg }}
                                style={{ width: "250px", height: "250px" }}
                            />
                        ) : (
                            <p style={{ color: "#999", padding: "40px" }}>読み込みに失敗しました</p>
                        )}
                    </div>

                    <button
                        className="btn btn-outline"
                        onClick={handlePrint}
                        disabled={!qrSvg}
                        style={{ width: "100%" }}
                    >
                        🖨️ 印刷する
                    </button>
                </div>
            </div>

            {/* パスワード変更 */}
            <div className="card" style={{ marginTop: "24px" }}>
                <h3 style={{ marginBottom: "16px", fontSize: "16px", fontWeight: 700 }}>
                    🔑 パスワード変更
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "16px" }}>
                    管理者ログインパスワードを変更します。新しいパスワードは8文字以上で設定してください。
                </p>

                {pwError && <div className="alert alert-error" style={{ marginBottom: "12px" }}>{pwError}</div>}
                {pwSuccess && <div className="alert alert-success" style={{
                    marginBottom: "12px",
                    background: "rgba(52,179,105,0.1)",
                    border: "1px solid rgba(52,179,105,0.2)",
                    color: "var(--accent-green)",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "13px",
                }}>{pwSuccess}</div>}

                <form onSubmit={handlePasswordSubmit}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                        <div className="form-group">
                            <label className="form-label">現在のパスワード</label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="••••••••"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">新しいパスワード</label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="8文字以上"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={8}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">新しいパスワード（確認）</label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={pwSaving || !currentPassword || newPassword.length < 8}
                    >
                        {pwSaving ? <span className="loading-spinner" /> : "パスワードを変更する"}
                    </button>
                </form>
            </div>

            {/* 使い方説明 */}
            <div className="card" style={{ marginTop: "24px" }}>
                <h3 style={{ marginBottom: "12px", fontSize: "16px", fontWeight: 700 }}>
                    📖 使い方
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "36px", marginBottom: "8px" }}>1️⃣</div>
                        <p style={{ fontWeight: 600, marginBottom: "4px" }}>PINを設定</p>
                        <p style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                            上のフォームで4桁のPINコードを設定
                        </p>
                    </div>
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "36px", marginBottom: "8px" }}>2️⃣</div>
                        <p style={{ fontWeight: 600, marginBottom: "4px" }}>QRをスキャン</p>
                        <p style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                            打刻画面でマスターQRコードをスキャン
                        </p>
                    </div>
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "36px", marginBottom: "8px" }}>3️⃣</div>
                        <p style={{ fontWeight: 600, marginBottom: "4px" }}>PINを入力</p>
                        <p style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                            4桁PINを入力して管理画面にログイン
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
