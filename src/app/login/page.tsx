"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "ログインに失敗しました");
                return;
            }

            router.push("/admin");
        } catch {
            setError("サーバーへの接続に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-screen">
            <div className="login-card animate-slide-up">
                <div className="login-logo">
                    <div className="login-logo-badge">fit</div>
                </div>
                <h1>管理者ログイン</h1>
                <p className="login-subtitle">松山総合予備校 fit 入退室管理</p>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">メールアドレス</label>
                        <input
                            type="email"
                            className="form-input"
                            placeholder="admin@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">パスワード</label>
                        <input
                            type="password"
                            className="form-input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                        style={{ width: "100%", marginTop: "8px" }}
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="loading-spinner-white" />
                        ) : (
                            "ログイン"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
