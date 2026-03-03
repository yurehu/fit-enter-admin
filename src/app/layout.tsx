import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "入退室管理システム | 学習塾",
    description: "学習塾向け入退室管理システム - QRコードでかんたん打刻",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ja">
            <body>{children}</body>
        </html>
    );
}
