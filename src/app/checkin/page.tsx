"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Scanner } from "@yudiel/react-qr-scanner";

const MASTER_QR_TOKEN = "MASTER_ADMIN_LOGIN";

interface CheckinResult {
    studentName: string;
    type: "checkin" | "checkout";
    timestamp: string;
}

export default function CheckinPage() {
    const router = useRouter();
    const [result, setResult] = useState<CheckinResult | null>(null);
    const [error, setError] = useState("");
    const isLockedRef = useRef(false);

    // PIN入力モード
    const [showPinInput, setShowPinInput] = useState(false);
    const [pin, setPin] = useState("");
    const [pinError, setPinError] = useState("");
    const [pinLoading, setPinLoading] = useState(false);

    const handleScan = useCallback(
        async (detectedCodes: { rawValue: string }[]) => {
            if (isLockedRef.current) return;
            if (!detectedCodes || detectedCodes.length === 0) return;

            const qrToken = detectedCodes[0].rawValue;
            if (!qrToken) return;

            // マスターQRコード検出 → PIN入力モードへ
            if (qrToken === MASTER_QR_TOKEN) {
                isLockedRef.current = true;
                setShowPinInput(true);
                setPin("");
                setPinError("");
                return;
            }

            // 3秒間ロック
            isLockedRef.current = true;

            try {
                const res = await fetch("/api/checkin", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ qrToken }),
                });

                const data = await res.json();

                if (!res.ok) {
                    setError(data.error || "打刻に失敗しました");
                    setTimeout(() => {
                        setError("");
                        isLockedRef.current = false;
                    }, 3000);
                    return;
                }

                setResult({
                    studentName: data.studentName,
                    type: data.type,
                    timestamp: data.timestamp,
                });

                // 2秒後にリセット
                setTimeout(() => {
                    setResult(null);
                    setTimeout(() => {
                        isLockedRef.current = false;
                    }, 1000);
                }, 2000);
            } catch {
                setError("サーバーへの接続に失敗しました");
                setTimeout(() => {
                    setError("");
                    isLockedRef.current = false;
                }, 3000);
            }
        },
        []
    );

    const handlePinSubmit = async () => {
        if (pin.length !== 4) {
            setPinError("4桁のPINを入力してください");
            return;
        }

        setPinLoading(true);
        setPinError("");

        try {
            const res = await fetch("/api/auth/pin-login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pin }),
            });

            const data = await res.json();

            if (!res.ok) {
                setPinError(data.error || "ログインに失敗しました");
                setPin("");
                return;
            }

            // ログイン成功 → 管理画面へ
            router.push("/admin");
        } catch {
            setPinError("サーバーへの接続に失敗しました");
        } finally {
            setPinLoading(false);
        }
    };

    const handlePinKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handlePinSubmit();
        }
    };

    const closePinInput = () => {
        setShowPinInput(false);
        setPin("");
        setPinError("");
        isLockedRef.current = false;
    };

    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleTimeString("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <div className="checkin-screen">
            {/* 成功メッセージ表示 */}
            {result && (
                <div
                    className={`checkin-result ${result.type === "checkin" ? "checkin-type" : "checkout-type"
                        }`}
                >
                    <div className="result-icon">
                        {result.type === "checkin" ? "🏫" : "👋"}
                    </div>
                    <div className="result-name">{result.studentName}</div>
                    <div className="result-type">
                        {result.type === "checkin" ? "入室しました" : "退室しました"}
                    </div>
                    <div className="result-time">{formatTime(result.timestamp)}</div>
                </div>
            )}

            {/* PIN入力モーダル */}
            {showPinInput && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "rgba(0,0,0,0.7)",
                        backdropFilter: "blur(8px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 1000,
                    }}
                >
                    <div
                        className="animate-slide-up"
                        style={{
                            background: "var(--bg-card)",
                            borderRadius: "var(--radius-lg)",
                            padding: "40px",
                            width: "100%",
                            maxWidth: "380px",
                            textAlign: "center",
                            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
                        }}
                    >
                        <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔐</div>
                        <h2 style={{ marginBottom: "4px", fontSize: "20px", fontWeight: 700, color: "var(--text-primary)" }}>
                            管理者ログイン
                        </h2>
                        <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "24px" }}>
                            4桁のPINコードを入力してください
                        </p>

                        {pinError && (
                            <div className="alert alert-error" style={{ marginBottom: "16px", fontSize: "13px" }}>
                                {pinError}
                            </div>
                        )}

                        <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "24px" }}>
                            {[0, 1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    style={{
                                        width: "52px",
                                        height: "60px",
                                        border: `2px solid ${pin.length > i ? "var(--fit-orange)" : "var(--border-color)"}`,
                                        borderRadius: "var(--radius-sm)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "28px",
                                        fontWeight: 700,
                                        color: "var(--text-primary)",
                                        background: pin.length > i ? "rgba(243, 116, 33, 0.06)" : "var(--bg-input)",
                                        transition: "all 0.2s ease",
                                    }}
                                >
                                    {pin[i] ? "●" : ""}
                                </div>
                            ))}
                        </div>

                        <input
                            type="tel"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={4}
                            value={pin}
                            onChange={(e) => {
                                const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                                setPin(v);
                            }}
                            onKeyDown={handlePinKeyDown}
                            style={{
                                position: "absolute",
                                opacity: 0,
                                pointerEvents: "none",
                            }}
                            autoFocus
                            id="pin-hidden-input"
                        />

                        {/* テンキー */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "20px" }}>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() => {
                                        if (pin.length < 4) setPin((p) => p + n);
                                    }}
                                    style={{
                                        padding: "14px",
                                        fontSize: "22px",
                                        fontWeight: 600,
                                        border: "1px solid var(--border-color)",
                                        borderRadius: "var(--radius-sm)",
                                        background: "var(--bg-input)",
                                        color: "var(--text-primary)",
                                        cursor: "pointer",
                                        transition: "all 0.15s ease",
                                    }}
                                >
                                    {n}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={closePinInput}
                                style={{
                                    padding: "14px",
                                    fontSize: "16px",
                                    fontWeight: 600,
                                    border: "1px solid var(--border-color)",
                                    borderRadius: "var(--radius-sm)",
                                    background: "var(--bg-input)",
                                    color: "var(--accent-red)",
                                    cursor: "pointer",
                                }}
                            >
                                ✕
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (pin.length < 4) setPin((p) => p + "0");
                                }}
                                style={{
                                    padding: "14px",
                                    fontSize: "22px",
                                    fontWeight: 600,
                                    border: "1px solid var(--border-color)",
                                    borderRadius: "var(--radius-sm)",
                                    background: "var(--bg-input)",
                                    color: "var(--text-primary)",
                                    cursor: "pointer",
                                }}
                            >
                                0
                            </button>
                            <button
                                type="button"
                                onClick={() => setPin((p) => p.slice(0, -1))}
                                style={{
                                    padding: "14px",
                                    fontSize: "16px",
                                    fontWeight: 600,
                                    border: "1px solid var(--border-color)",
                                    borderRadius: "var(--radius-sm)",
                                    background: "var(--bg-input)",
                                    color: "var(--text-muted)",
                                    cursor: "pointer",
                                }}
                            >
                                ←
                            </button>
                        </div>

                        <button
                            className="btn btn-primary btn-lg"
                            style={{ width: "100%", marginBottom: "8px" }}
                            disabled={pin.length !== 4 || pinLoading}
                            onClick={handlePinSubmit}
                        >
                            {pinLoading ? <span className="loading-spinner-white" /> : "ログイン"}
                        </button>

                        <button
                            type="button"
                            onClick={closePinInput}
                            style={{
                                background: "none",
                                border: "none",
                                color: "var(--text-muted)",
                                fontSize: "13px",
                                cursor: "pointer",
                                padding: "8px",
                            }}
                        >
                            キャンセル
                        </button>
                    </div>
                </div>
            )}

            <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                    width: "50px", height: "50px", background: "rgba(255,255,255,0.2)",
                    borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "20px", fontWeight: 800, color: "#fff", backdropFilter: "blur(8px)",
                    border: "1px solid rgba(255,255,255,0.3)"
                }}>fit</div>
                <div>
                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>松山総合予備校 fit</div>
                </div>
            </div>

            <h1 className="checkin-title">QRコード打刻</h1>
            <p className="checkin-subtitle">QRコードをカメラにかざしてください</p>

            {error && (
                <div className="alert alert-error" style={{ marginBottom: "20px", maxWidth: "400px" }}>
                    {error}
                </div>
            )}

            <div className="scanner-container">
                <Scanner
                    onScan={handleScan}
                    formats={["qr_code"]}
                    components={{
                        finder: true,
                    }}
                    styles={{
                        container: {
                            width: "100%",
                            height: "100%",
                        },
                        video: {
                            width: "100%",
                            height: "100%",
                            objectFit: "cover" as const,
                        },
                    }}
                />
            </div>
        </div>
    );
}
