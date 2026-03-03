"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();

    const navItems = [
        { href: "/admin", label: "ダッシュボード", icon: "📊" },
        { href: "/admin/students", label: "生徒管理", icon: "👥" },
        { href: "/admin/classes", label: "授業管理", icon: "📚" },
        { href: "/admin/settings", label: "設定", icon: "⚙️" },
    ];

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
    };

    return (
        <div className="admin-layout">
            {/* モバイルナビ */}
            <div className="mobile-nav">
                <h2>fit 管理画面</h2>
                <button className="btn btn-sm btn-outline" style={{ color: "#fff", borderColor: "rgba(255,255,255,0.3)" }} onClick={handleLogout}>
                    ログアウト
                </button>
            </div>

            {/* サイドバー */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">fit</div>
                    <div className="sidebar-logo-text">
                        <h2>松山総合予備校 fit</h2>
                        <p>入退室管理システム</p>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) => {
                        const isActive = item.href === "/admin"
                            ? pathname === "/admin"
                            : pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`sidebar-link ${isActive ? "active" : ""}`}
                            >
                                <span className="link-icon">{item.icon}</span>
                                {item.label}
                            </Link>
                        );
                    })}

                    <Link href="/checkin" className="sidebar-link">
                        <span className="link-icon">📷</span>
                        打刻画面
                    </Link>

                    <Link href="/" className="sidebar-link">
                        <span className="link-icon">🏠</span>
                        トップページ
                    </Link>
                </nav>

                <div className="sidebar-footer">
                    <button
                        className="btn btn-outline btn-sm"
                        style={{ width: "100%", color: "rgba(250,248,245,0.7)", borderColor: "rgba(250,248,245,0.15)" }}
                        onClick={handleLogout}
                    >
                        🚪 ログアウト
                    </button>
                </div>
            </aside>

            {/* メインコンテンツ */}
            <main className="admin-content">{children}</main>
        </div>
    );
}
