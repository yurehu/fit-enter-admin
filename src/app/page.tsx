import Link from "next/link";

export default function HomePage() {
    return (
        <div className="landing-screen">
            <div className="landing-logo">fit</div>
            <p className="landing-school">松山総合予備校 fit</p>
            <h1 className="landing-title">入退室管理システム</h1>
            <p className="landing-subtitle">QRコードでかんたん打刻 📱</p>

            <div className="landing-actions">
                <Link href="/checkin" className="landing-card">
                    <div className="card-icon">📷</div>
                    <h3>打刻する</h3>
                    <p>QRコードをカメラにかざして<br />入室・退室を記録します</p>
                </Link>

                <Link href="/login" className="landing-card">
                    <div className="card-icon">🔐</div>
                    <h3>管理画面</h3>
                    <p>生徒管理、出席履歴の確認、<br />CSVダウンロード</p>
                </Link>
            </div>
        </div>
    );
}
