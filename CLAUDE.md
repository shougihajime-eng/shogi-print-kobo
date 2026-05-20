# shogi-print-kobo（はじめ先生の将棋プリント工房）

将棋教室向け A4 プリント生成ツール。詰将棋・駒の動かし方・反則・玉の囲い をブラウザで作成して印刷できる。

---

## 📍 進捗（いまここ）

- ✅ 試作 HTML プロトタイプを Next.js 16 (App Router) + TypeScript + Tailwind に移植
- ✅ 問題ライブラリ・盤面エディタ・4種類のプリント生成・教室設定が動く
- 🟡 ローカルで動作確認 → GitHub 公開 → Vercel デプロイ までを通す
- 🔜 AI 出題アシスタント（現在「準備中」表示）の実装

---

## 🌐 本番 URL

- 本番（Vercel）: 未デプロイ（このファイルにあとで追記）
- GitHub: 未作成（このファイルにあとで追記）

---

## 🛠️ 主要ドキュメント

| ファイル | 内容 |
| --- | --- |
| `src/app/page.tsx` | 単一クライアントコンポーネントに全機能を実装 |
| `src/app/layout.tsx` | フォント（Shippori Mincho / Zen Kaku Gothic New）と HTML 言語属性 |
| `src/app/globals.css` | 和風配色＋A4印刷用スタイル（@page A4・@media print） |

---

## 🧱 技術構成

- **フレームワーク**: Next.js 16 (App Router) + React 19
- **言語**: TypeScript
- **スタイル**: Tailwind v4 + プロジェクト固有 CSS（globals.css）
- **データ保存**: `localStorage`（キー `shogi_print_v1`）。問題・教室設定をブラウザ単位で保存
- **印刷**: ブラウザ標準の `window.print()` + `@page A4` + `@media print`
- **デプロイ**: Vercel（GitHub `main` への push で自動デプロイ）
- **Supabase**: 未使用（個人ツールのためブラウザ保存で十分）

---

## ▶️ ローカル開発

```powershell
# 開発サーバー
npm run dev

# 本番ビルド検証
npm run build
npm run start

# Lint
npm run lint
```

開発サーバーは http://localhost:3000

---

## 🧪 検証コマンド

| 目的 | コマンド |
| --- | --- |
| 型・ビルド検証 | `npm run build` |
| Lint | `npm run lint` |
| 開発サーバー | `npm run dev` |

ビルドが通れば本番デプロイ可能。

---

## 🚀 デプロイ手順

1. `git push origin main` で Vercel が自動デプロイ
2. 環境変数は不要（localStorage のため）
3. 本番URLは Vercel ダッシュボードで確認

---

## 🎨 デザイン方針

- 和風（蘇芳・墨・金・象牙）配色をベースに、印刷物として「教室のプリント」に馴染む
- 明朝体（Shippori Mincho）と角ゴシック（Zen Kaku Gothic New）の使い分け
- A4 印刷時は左サイドバー・操作ボタンを非表示、本文だけ印刷

---

## 🧭 将来の予定（メモ）

- AI 出題アシスタント（手数・テーマを指定して詰将棋案を自動生成）
  - Vercel AI Gateway 経由で Claude を呼ぶ想定
  - 生成案は必ず「未検証」として保存し、講師が解いて確認してから配布
- 問題のクラウド同期（Supabase）が必要になれば、共有 Supabase の `shogi_print_kobo` スキーマを切る
