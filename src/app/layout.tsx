import type { Metadata } from "next";
import { Shippori_Mincho, Zen_Kaku_Gothic_New } from "next/font/google";
import "./globals.css";

const mincho = Shippori_Mincho({
  variable: "--font-mincho",
  subsets: ["latin"],
  weight: ["500", "700", "800"],
});

const gothic = Zen_Kaku_Gothic_New({
  variable: "--font-gothic",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "はじめ先生の将棋プリント工房",
  description:
    "詰将棋・駒の動かし方・反則・囲い のプリントをA4で生成できる、将棋教室向けプリント作成ツール",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${mincho.variable} ${gothic.variable}`}>
      <body>{children}</body>
    </html>
  );
}
