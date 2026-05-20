"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/* ============================================================
   Types
   ============================================================ */
type Side = "sente" | "gote";
type Cell = { side: Side; piece: string } | null;
type Board = Cell[][];
type Mochigoma = { sente: Record<string, number>; gote: Record<string, number> };
type Problem = {
  id: string;
  title: string;
  tesuu: 1 | 3 | 5;
  author: string;
  source: string;
  answer: string;
  verified: boolean;
  board: Board;
  mochigoma: Mochigoma;
  createdAt: number;
};
type Settings = { school: string; subtitle: string; teacher: string };
type ViewName =
  | "tsume"
  | "editor"
  | "library"
  | "komano"
  | "hansoku"
  | "kakoi"
  | "settings"
  | "print";
type PrintKind = "tsume" | "komano" | "hansoku" | "kakoi";
type EditorState = {
  board: Board;
  mochigoma: Mochigoma;
  side: Side;
  piece: string | null;
};

/* ============================================================
   Constants
   ============================================================ */
const STORAGE_KEY = "shogi_print_v1";
const PROMOTED = new Set(["龍", "馬", "と", "全", "圭", "杏"]);
const isPromoted = (p: string) => PROMOTED.has(p);
const COL_LABELS = ["９", "８", "７", "６", "５", "４", "３", "２", "１"];
const ROW_LABELS = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];

const DEFAULT_SETTINGS: Settings = {
  school: "はじめ先生 将棋教室",
  subtitle: "女性のための将棋クラス",
  teacher: "鈴木 肇（元奨励会三段・第72期アマ名人）",
};

const PIECE_PALETTE: string[] = [
  "王",
  "飛",
  "角",
  "金",
  "銀",
  "桂",
  "香",
  "歩",
  "龍",
  "馬",
  "全",
  "圭",
  "杏",
  "と",
];

const MOCHI_KINDS = ["飛", "角", "金", "銀", "桂", "香", "歩"];

/* ============================================================
   Helpers
   ============================================================ */
const makeEmptyBoard = (): Board =>
  Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => null));

const uid = () =>
  "p_" +
  Math.random().toString(36).slice(2, 9) +
  Date.now().toString(36).slice(-4);

function cloneBoard(b: Board): Board {
  return b.map((row) => row.map((c) => (c ? { ...c } : null)));
}
function cloneMochi(m: Mochigoma): Mochigoma {
  return {
    sente: { ...m.sente },
    gote: { ...m.gote },
  };
}

function seedClassicProblems(): Problem[] {
  // 頭金: 後手玉 2一・先手持駒 金 → ▲2二金
  const b1 = makeEmptyBoard();
  b1[0][7] = { side: "gote", piece: "王" };
  // 腹銀: 後手玉 2一・後手香 1一・先手持駒 銀 → ▲3二銀
  const b2 = makeEmptyBoard();
  b2[0][7] = { side: "gote", piece: "王" };
  b2[0][8] = { side: "gote", piece: "香" };
  const now = Date.now();
  return [
    {
      id: uid(),
      title: "頭金の基本",
      tesuu: 1,
      author: "基本問題（教科書的形）",
      source: "オリジナル",
      answer: "▲2二金（まで1手詰）",
      verified: true,
      board: b1,
      mochigoma: { sente: { 金: 1 }, gote: {} },
      createdAt: now,
    },
    {
      id: uid(),
      title: "腹銀",
      tesuu: 1,
      author: "基本問題（教科書的形）",
      source: "オリジナル",
      answer: "▲3二銀（まで1手詰）",
      verified: true,
      board: b2,
      mochigoma: { sente: { 銀: 1 }, gote: {} },
      createdAt: now + 1,
    },
  ];
}

function boardSummary(p: Problem): string {
  const out: string[] = [];
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++) {
      const cell = p.board[r][c];
      if (cell) {
        const file = 9 - c;
        const rank = r + 1;
        out.push(
          `${cell.side === "sente" ? "▲" : "△"}${file}${rank}${cell.piece}`,
        );
      }
    }
  const m: string[] = [];
  Object.entries(p.mochigoma.sente).forEach(([k, v]) =>
    m.push(`▲${k}${v > 1 ? v : ""}`),
  );
  Object.entries(p.mochigoma.gote).forEach(([k, v]) =>
    m.push(`△${k}${v > 1 ? v : ""}`),
  );
  return out.join(" ") + (m.length ? "  持駒:" + m.join(" ") : "");
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/* ============================================================
   Reusable: Mini Board (for print preview)
   ============================================================ */
function MiniBoard({ board }: { board: Board }) {
  return (
    <div className="pp-board">
      <div className="mini-board">
        <div className="mini-cols">
          {COL_LABELS.map((n, i) => (
            <div key={i}>{n}</div>
          ))}
        </div>
        <div className="mini-board-with-labels">
          <div className="mini-grid">
            {board.flatMap((row, r) =>
              row.map((cell, c) => (
                <div key={`${r}-${c}`} className="mini-cell">
                  {cell && (
                    <div
                      className={`mp ${cell.side}${
                        isPromoted(cell.piece) ? " promoted" : ""
                      }`}
                    >
                      {cell.piece}
                    </div>
                  )}
                </div>
              )),
            )}
          </div>
          <div className="mini-rows">
            {ROW_LABELS.map((n, i) => (
              <div key={i}>{n}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Print: Tsume
   ============================================================ */
function PrintTsume({
  problems,
  settings,
}: {
  problems: Problem[];
  settings: Settings;
}) {
  if (problems.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#888" }}>
        問題が選択されていません
      </div>
    );
  }
  const tesuuLabel = problems.every((p) => p.tesuu === problems[0].tesuu)
    ? `${problems[0].tesuu}手詰`
    : "詰将棋";
  return (
    <>
      <div className="ph-header">
        <div>
          <div className="ph-title">
            <span className="shu">詰</span>将棋プリント
          </div>
          <div
            style={{
              fontFamily: "var(--font-mincho), serif",
              fontSize: 11,
              color: "#666",
              marginTop: 2,
              letterSpacing: ".15em",
            }}
          >
            {tesuuLabel} ／ 全{problems.length}問
          </div>
        </div>
        <div className="ph-meta">
          <div className="school">{settings.school}</div>
          <div>{settings.subtitle}</div>
          <div style={{ marginTop: 3 }}>{todayStr()}</div>
        </div>
      </div>
      <div className="ph-intro">
        下の図は全て「あなたが▲を持っています」。{problems[0].tesuu}
        手で相手の玉を詰ましてください。
        <br />
        考え方のコツ：① まず玉の逃げ道を確認 ② 自分の駒（盤上＋持駒）で詰ます手を探す
        ③ 王手をかけても逃げられない手を選ぶ。
        　★ 答えは盤の下の「こたえ」のらんに書いてみよう。
      </div>
      <div className={`pp-grid${problems.length >= 5 ? " dense" : ""}`}>
        {problems.map((p, i) => {
          const mochi =
            Object.entries(p.mochigoma.sente)
              .map(([k, v]) => (v > 1 ? `${k}${v}` : k))
              .join("・") || "なし";
          return (
            <div className="pp-item" key={p.id}>
              <span className="pp-num">第 {i + 1} 問</span>
              <span className="pp-tag">{p.tesuu}手詰</span>
              <MiniBoard board={p.board} />
              <div className="pp-mochigoma">
                <span className="label">▲持駒:</span>
                {mochi}
              </div>
              <div className="pp-answer">
                <div className="pp-answer-label">こたえ</div>
                <div className="pp-answer-line" />
                <div className="pp-answer-line" />
                {p.answer && (
                  <div className="pp-answer-key">{p.answer}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="ph-footer">
        <div>監修: {settings.teacher}</div>
        <div>{settings.school}</div>
      </div>
    </>
  );
}

/* ============================================================
   Print: Komano
   ============================================================ */
function PrintKomano({ settings }: { settings: Settings }) {
  const pieces: {
    k: string;
    name: string;
    reading: string;
    desc: string;
    move: number[][];
  }[] = [
    {
      k: "王",
      name: "王将・玉将",
      reading: "おうしょう / ぎょくしょう",
      desc: "前後左右斜めの全方向に１マスだけ動ける。取られたら負け。",
      move: [
        [1, 1, 1],
        [1, 0, 1],
        [1, 1, 1],
      ],
    },
    {
      k: "飛",
      name: "飛車",
      reading: "ひしゃ",
      desc: "縦と横に何マスでも進める。間に駒があるとそこで止まる。",
      move: [
        [0, 2, 0],
        [2, 0, 2],
        [0, 2, 0],
      ],
    },
    {
      k: "角",
      name: "角行",
      reading: "かくぎょう",
      desc: "斜めに何マスでも進める。縦横には動けない。",
      move: [
        [2, 0, 2],
        [0, 0, 0],
        [2, 0, 2],
      ],
    },
    {
      k: "金",
      name: "金将",
      reading: "きんしょう",
      desc: "前後左右と斜め前の合計６方向に１マス。斜め後ろには動けない。",
      move: [
        [1, 1, 1],
        [1, 0, 1],
        [0, 1, 0],
      ],
    },
    {
      k: "銀",
      name: "銀将",
      reading: "ぎんしょう",
      desc: "前と斜め前後の合計５方向に１マス。真横と真後ろには動けない。",
      move: [
        [1, 1, 1],
        [0, 0, 0],
        [1, 0, 1],
      ],
    },
    {
      k: "桂",
      name: "桂馬",
      reading: "けいま",
      desc: "前方の左右に飛び越えて進む。間に駒があっても飛び越えられる。",
      move: [
        [1, 0, 1],
        [0, 0, 0],
        [0, 0, 0],
      ],
    },
    {
      k: "香",
      name: "香車",
      reading: "きょうしゃ",
      desc: "前方にだけ何マスでも進める。後ろや横には動けない。",
      move: [
        [0, 2, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
    },
    {
      k: "歩",
      name: "歩兵",
      reading: "ふひょう",
      desc: "前に１マスだけ進める。すべての駒の基本。",
      move: [
        [0, 1, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
    },
  ];

  return (
    <>
      <div className="ph-header">
        <div>
          <div className="ph-title">
            <span className="shu">駒</span>の動かし方
          </div>
          <div
            style={{
              fontFamily: "var(--font-mincho), serif",
              fontSize: 11,
              color: "#666",
              marginTop: 2,
              letterSpacing: ".15em",
            }}
          >
            将棋を始める方へ／基本の８種
          </div>
        </div>
        <div className="ph-meta">
          <div className="school">{settings.school}</div>
          <div>{settings.subtitle}</div>
          <div style={{ marginTop: 3 }}>{todayStr()}</div>
        </div>
      </div>
      <div className="ph-intro">
        将棋の駒は８種類。それぞれ動き方が違います。● は「動ける場所」、↕ や ↔
        は「その方向にどこまでも進める」を表します。
        <br />
        まずは「歩」と「金」「玉」の動きを覚えると、すぐに対局が始められます。
      </div>
      <div className="komano-grid">
        {pieces.map((p) => (
          <div className="komano-item" key={p.k}>
            <div className="komano-head">
              <div className="komano-piece">{p.k}</div>
              <div className="komano-info">
                <div className="name">{p.name}</div>
                <div className="reading">{p.reading}</div>
              </div>
              <div className="komano-move">
                {p.move.flatMap((row, r) =>
                  row.map((v, c) => {
                    if (r === 1 && c === 1) {
                      return (
                        <div
                          key={`${r}-${c}`}
                          className="komano-move-cell center"
                        >
                          {p.k}
                        </div>
                      );
                    }
                    if (v === 2) {
                      return (
                        <div
                          key={`${r}-${c}`}
                          className="komano-move-cell line"
                        >
                          ↕
                        </div>
                      );
                    }
                    if (v === 1) {
                      return (
                        <div
                          key={`${r}-${c}`}
                          className="komano-move-cell target"
                        >
                          ●
                        </div>
                      );
                    }
                    return (
                      <div key={`${r}-${c}`} className="komano-move-cell"></div>
                    );
                  }),
                )}
              </div>
            </div>
            <div className="komano-desc">{p.desc}</div>
          </div>
        ))}
      </div>
      <div
        style={{
          fontSize: 10,
          color: "#444",
          lineHeight: 1.7,
          background: "#faf6ef",
          borderLeft: "3px solid var(--shu)",
          padding: "4mm 5mm",
          marginTop: "4mm",
          fontFamily: "var(--font-mincho), serif",
        }}
      >
        <strong>※ 駒が「成る」と動きが変わります。</strong>
        <br />
        飛 → 龍王（飛＋斜め１マス）／ 角 → 龍馬（角＋縦横１マス）／
        銀・桂・香・歩は成ると金と同じ動き（と金など）になります。
      </div>
      <div className="ph-footer">
        <div>監修: {settings.teacher}</div>
        <div>{settings.school}</div>
      </div>
    </>
  );
}

/* ============================================================
   Print: Hansoku
   ============================================================ */
function PrintHansoku({ settings }: { settings: Settings }) {
  const list = [
    {
      name: "二歩（にふ）",
      desc:
        "同じ筋（縦の列）に自分の歩が２枚並ぶように歩を打つこと。盤上の歩はOKだが、持駒の歩を打って二歩になると反則負け。プロでも稀に出る、最も多い反則。",
    },
    {
      name: "打ち歩詰め（うちふづめ）",
      desc:
        "持駒の歩を打って相手の玉を詰ますこと。盤上の歩を進めて詰ますのはOK。歩「打ち」だけが禁止。",
    },
    {
      name: "行き所のない駒",
      desc:
        "動けない場所に駒を打つ・進めること。例：歩・香を１段目（相手陣の最奥）に成らずに進める、桂を１・２段目に成らずに進める。",
    },
    {
      name: "連続王手の千日手",
      desc:
        "同じ局面が４回出現すると千日手だが、王手をかけ続けて千日手にした場合は、王手をかけ続けた側の反則負け。",
    },
    {
      name: "二手指し（にてざし）",
      desc: "自分の手番で２手連続で指してしまうこと。",
    },
    {
      name: "王手放置",
      desc:
        "自分の玉に王手がかかっているのに、玉を逃がす・受けるなどせず別の手を指すこと。即座に反則負け。",
    },
    {
      name: "成れない駒を成る",
      desc:
        "敵陣（相手側の３段目以内）に入っていない、または出ていない状態で成ること。",
    },
    {
      name: "禁じ手（待った）",
      desc:
        "一度指した手を取り消して指し直すこと。対局のマナー違反であり、公式戦では認められない。",
    },
  ];

  return (
    <>
      <div className="ph-header">
        <div>
          <div className="ph-title">
            <span className="shu">禁</span>将棋の反則
          </div>
          <div
            style={{
              fontFamily: "var(--font-mincho), serif",
              fontSize: 11,
              color: "#666",
              marginTop: 2,
              letterSpacing: ".15em",
            }}
          >
            やってはいけない指し方／一覧
          </div>
        </div>
        <div className="ph-meta">
          <div className="school">{settings.school}</div>
          <div>{settings.subtitle}</div>
          <div style={{ marginTop: 3 }}>{todayStr()}</div>
        </div>
      </div>
      <div className="ph-intro">
        将棋には「指してはいけない手」がいくつかあります。
        <br />
        反則をすると、その時点で負けになります（即負け）。最初に覚えておくと安心です。
      </div>
      <div className="hansoku-list">
        {list.map((h, i) => (
          <div className="hansoku-item" key={i}>
            <span className="hansoku-num">{String(i + 1).padStart(2, "0")}</span>
            <div className="hansoku-name">{h.name}</div>
            <div className="hansoku-desc">{h.desc}</div>
          </div>
        ))}
      </div>
      <div
        style={{
          fontSize: 10.5,
          color: "#444",
          lineHeight: 1.7,
          background: "#faf6ef",
          borderLeft: "3px solid var(--shu)",
          padding: "4mm 5mm",
          marginTop: "4mm",
          fontFamily: "var(--font-mincho), serif",
        }}
      >
        <strong>★ 教室では「気づいたら指摘してあげる」がマナー。</strong>
        <br />
        初心者のうちは反則を恐れずに、まず指してみることが上達の近道です。先生や対局相手に教えてもらいながら覚えていきましょう。
      </div>
      <div className="ph-footer">
        <div>監修: {settings.teacher}</div>
        <div>{settings.school}</div>
      </div>
    </>
  );
}

/* ============================================================
   Print: Kakoi
   ============================================================ */
function PrintKakoi({ settings }: { settings: Settings }) {
  type KakoiPiece = { p: string; f: number; r: number };
  const kakois: {
    name: string;
    reading: string;
    desc: string;
    pieces: KakoiPiece[];
  }[] = [
    {
      name: "矢倉（やぐら）",
      reading: "YAGURA",
      desc:
        "相居飛車で最も有名な囲い。金銀がしっかり組み合って堅い。攻めにも守りにも使える本格派。",
      pieces: [
        { p: "香", f: 9, r: 9 },
        { p: "桂", f: 8, r: 9 },
        { p: "銀", f: 7, r: 8 },
        { p: "金", f: 6, r: 8 },
        { p: "王", f: 7, r: 9 },
        { p: "金", f: 6, r: 7 },
        { p: "歩", f: 9, r: 7 },
        { p: "歩", f: 8, r: 7 },
        { p: "歩", f: 7, r: 7 },
        { p: "歩", f: 6, r: 6 },
      ],
    },
    {
      name: "美濃囲い（みのがこい）",
      reading: "MINO",
      desc:
        "振り飛車の定番。横からの攻めに強い。組むのが簡単で初心者にもおすすめ。",
      pieces: [
        { p: "香", f: 1, r: 9 },
        { p: "桂", f: 2, r: 9 },
        { p: "銀", f: 3, r: 9 },
        { p: "王", f: 3, r: 8 },
        { p: "金", f: 4, r: 8 },
        { p: "金", f: 5, r: 8 },
        { p: "歩", f: 1, r: 7 },
        { p: "歩", f: 2, r: 7 },
        { p: "歩", f: 3, r: 7 },
        { p: "歩", f: 4, r: 7 },
      ],
    },
    {
      name: "舟囲い(ふながこい)",
      reading: "FUNA",
      desc: "居飛車急戦で使う軽い囲い。早く攻めたい時に。",
      pieces: [
        { p: "香", f: 9, r: 9 },
        { p: "桂", f: 8, r: 9 },
        { p: "銀", f: 7, r: 9 },
        { p: "王", f: 8, r: 8 },
        { p: "金", f: 6, r: 9 },
        { p: "金", f: 5, r: 8 },
        { p: "歩", f: 9, r: 7 },
        { p: "歩", f: 8, r: 7 },
        { p: "歩", f: 7, r: 7 },
        { p: "歩", f: 6, r: 7 },
      ],
    },
    {
      name: "穴熊（あなぐま）",
      reading: "ANAGUMA",
      desc:
        "最も堅い囲い。組むのに時間がかかるが、組めれば滅多なことでは詰まない。",
      pieces: [
        { p: "王", f: 1, r: 9 },
        { p: "香", f: 2, r: 9 },
        { p: "桂", f: 3, r: 9 },
        { p: "銀", f: 2, r: 8 },
        { p: "金", f: 3, r: 8 },
        { p: "金", f: 4, r: 8 },
        { p: "歩", f: 1, r: 7 },
        { p: "歩", f: 2, r: 7 },
        { p: "歩", f: 3, r: 7 },
        { p: "歩", f: 4, r: 7 },
      ],
    },
  ];

  function buildBoard(pieces: KakoiPiece[]): Board {
    const b = makeEmptyBoard();
    pieces.forEach(({ p, f, r }) => {
      const col = 9 - f;
      const row = r - 1;
      if (row >= 0 && row < 9 && col >= 0 && col < 9) {
        b[row][col] = { side: "sente", piece: p };
      }
    });
    return b;
  }

  return (
    <>
      <div className="ph-header">
        <div>
          <div className="ph-title">
            <span className="shu">囲</span>玉の囲い
          </div>
          <div
            style={{
              fontFamily: "var(--font-mincho), serif",
              fontSize: 11,
              color: "#666",
              marginTop: 2,
              letterSpacing: ".15em",
            }}
          >
            初心者が最初に覚える基本の４種
          </div>
        </div>
        <div className="ph-meta">
          <div className="school">{settings.school}</div>
          <div>{settings.subtitle}</div>
          <div style={{ marginTop: 3 }}>{todayStr()}</div>
        </div>
      </div>
      <div className="ph-intro">
        「囲い」とは、玉のまわりに金銀を集めて守りを固めること。
        <br />
        強くなるには、まず自分のお気に入りの囲いをひとつ覚えるのが近道です。
      </div>
      <div className="pp-grid">
        {kakois.map((k, i) => (
          <div className="pp-item" key={k.name}>
            <span className="pp-num">第 {i + 1} 形</span>
            <span className="pp-tag">{k.reading}</span>
            <div
              style={{
                fontFamily: "var(--font-mincho), serif",
                fontSize: 14,
                fontWeight: 700,
                textAlign: "center",
                margin: "2mm 0",
              }}
            >
              {k.name}
            </div>
            <MiniBoard board={buildBoard(k.pieces)} />
            <div
              style={{
                fontSize: 9.5,
                lineHeight: 1.6,
                color: "#222",
                marginTop: "2mm",
                fontFamily: "var(--font-mincho), serif",
              }}
            >
              {k.desc}
            </div>
          </div>
        ))}
      </div>
      <div className="ph-footer">
        <div>監修: {settings.teacher}</div>
        <div>{settings.school}</div>
      </div>
    </>
  );
}

/* ============================================================
   NavItem
   ============================================================ */
function NavItem({
  active,
  onClick,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub?: string;
}) {
  return (
    <div
      className={`nav-item${active ? " active" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {label}
      {sub && <small>{sub}</small>}
    </div>
  );
}

/* ============================================================
   Main Page
   ============================================================ */
export default function Page() {
  const [view, setView] = useState<ViewName>("tsume");
  const [problems, setProblems] = useState<Problem[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editor, setEditor] = useState<EditorState>({
    board: makeEmptyBoard(),
    mochigoma: { sente: {}, gote: {} },
    side: "sente",
    piece: null,
  });
  const [filterTesuu, setFilterTesuu] = useState<"all" | "1" | "3" | "5">(
    "all",
  );
  const [filterVerified, setFilterVerified] = useState<
    "all" | "verified" | "unverified"
  >("all");
  const [edTitle, setEdTitle] = useState("");
  const [edTesuu, setEdTesuu] = useState<1 | 3 | 5>(1);
  const [edAuthor, setEdAuthor] = useState("");
  const [edSource, setEdSource] = useState("");
  const [edAnswer, setEdAnswer] = useState("");
  const [edVerified, setEdVerified] = useState(false);
  const [setSchool, setSetSchool] = useState(DEFAULT_SETTINGS.school);
  const [setSubtitle, setSetSubtitle] = useState(DEFAULT_SETTINGS.subtitle);
  const [setTeacher, setSetTeacher] = useState(DEFAULT_SETTINGS.teacher);
  const [toastMsg, setToastMsg] = useState("");
  const [printKind, setPrintKind] = useState<PrintKind>("tsume");
  const [showAnswers, setShowAnswers] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("show-answers", showAnswers);
    return () => {
      document.body.classList.remove("show-answers");
    };
  }, [showAnswers]);

  /* --- Toast --- */
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(""), 2200);
  }, []);

  /* --- Load from localStorage --- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as {
          problems?: Problem[];
          settings?: Settings;
        };
        if (saved.problems && saved.problems.length > 0) {
          setProblems(saved.problems);
        } else {
          setProblems(seedClassicProblems());
        }
        if (saved.settings) {
          const s = { ...DEFAULT_SETTINGS, ...saved.settings };
          setSettings(s);
          setSetSchool(s.school);
          setSetSubtitle(s.subtitle);
          setSetTeacher(s.teacher);
        }
      } else {
        setProblems(seedClassicProblems());
      }
    } catch {
      setProblems(seedClassicProblems());
    }
    setHasLoaded(true);
  }, []);

  /* --- Save to localStorage --- */
  useEffect(() => {
    if (!hasLoaded) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ problems, settings }),
      );
    } catch {
      /* ignore quota */
    }
  }, [problems, settings, hasLoaded]);

  /* --- Editor ops --- */
  function setSide(s: Side) {
    setEditor((e) => ({ ...e, side: s }));
  }
  function selectPiece(p: string) {
    setEditor((e) => ({ ...e, piece: p }));
  }
  function placePieceOnCell(r: number, c: number) {
    if (editor.piece === null) {
      showToast("駒パレットから駒を選んでください");
      return;
    }
    setEditor((e) => {
      const board = cloneBoard(e.board);
      if (e.piece === "消去") {
        board[r][c] = null;
      } else {
        const cur = board[r][c];
        if (cur && cur.piece === e.piece && cur.side === e.side) {
          board[r][c] = null;
        } else {
          board[r][c] = { side: e.side, piece: e.piece as string };
        }
      }
      return { ...e, board };
    });
  }
  function addMochi(side: Side, piece: string) {
    setEditor((e) => {
      const m = cloneMochi(e.mochigoma);
      m[side][piece] = (m[side][piece] || 0) + 1;
      return { ...e, mochigoma: m };
    });
  }
  function decMochi(side: Side, piece: string) {
    setEditor((e) => {
      const m = cloneMochi(e.mochigoma);
      const cur = (m[side][piece] || 0) - 1;
      if (cur <= 0) delete m[side][piece];
      else m[side][piece] = cur;
      return { ...e, mochigoma: m };
    });
  }
  function resetEditor() {
    setEditor({
      board: makeEmptyBoard(),
      mochigoma: { sente: {}, gote: {} },
      side: "sente",
      piece: null,
    });
    setEdTitle("");
    setEdAuthor("");
    setEdSource("");
    setEdAnswer("");
    setEdVerified(false);
    setEdTesuu(1);
  }

  function saveProblem() {
    const title = edTitle.trim() || "無題";
    const author = edAuthor.trim();
    if (!author) {
      showToast("作者名は必須です");
      return;
    }
    const hasPiece = editor.board.some((row) => row.some((c) => c !== null));
    if (!hasPiece) {
      showToast("盤面に駒を配置してください");
      return;
    }
    const p: Problem = {
      id: uid(),
      title,
      tesuu: edTesuu,
      author,
      source: edSource.trim(),
      answer: edAnswer.trim(),
      verified: edVerified,
      board: cloneBoard(editor.board),
      mochigoma: cloneMochi(editor.mochigoma),
      createdAt: Date.now(),
    };
    setProblems((prev) => [...prev, p]);
    showToast("問題を保存しました");
    resetEditor();
  }

  function deleteProblem(id: string) {
    if (!confirm("この問題を削除します。よろしいですか？")) return;
    setProblems((prev) => prev.filter((p) => p.id !== id));
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 6) {
        showToast("1ページに載せられるのは6問までです");
        return prev;
      }
      return [...prev, id];
    });
  }
  function clearSelection() {
    setSelectedIds([]);
  }

  function exportLibrary() {
    const blob = new Blob([JSON.stringify(problems, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      "shogi_problems_" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    URL.revokeObjectURL(url);
    showToast("JSONをダウンロードしました");
  }

  function saveSettings() {
    const s = { school: setSchool, subtitle: setSubtitle, teacher: setTeacher };
    setSettings(s);
    showToast("設定を保存しました");
  }

  function generatePrintTsume() {
    if (selectedIds.length === 0) {
      showToast("プリントに載せる問題を選択してください");
      return;
    }
    setPrintKind("tsume");
    setView("print");
  }

  /* --- Derived: filtered problem list --- */
  let filtered = problems.slice();
  if (filterTesuu !== "all")
    filtered = filtered.filter((p) => String(p.tesuu) === filterTesuu);
  if (filterVerified === "verified")
    filtered = filtered.filter((p) => p.verified);
  if (filterVerified === "unverified")
    filtered = filtered.filter((p) => !p.verified);

  const selectedProblems = selectedIds
    .map((id) => problems.find((p) => p.id === id))
    .filter((x): x is Problem => Boolean(x));

  /* ============================================================
     RENDER
     ============================================================ */
  return (
    <div className="app">
      {/* ====== Sidebar ====== */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">SHOGI ATELIER</div>
          <div className="brand-title">
            将棋プリント
            <br />
            工房
          </div>
          <div className="brand-sub">はじめ先生 監修</div>
        </div>

        <div className="nav-section">
          <div className="nav-label">プリント作成</div>
          <NavItem
            active={view === "tsume"}
            onClick={() => setView("tsume")}
            label="詰将棋"
            sub="1手・3手・5手"
          />
          <NavItem
            active={view === "komano"}
            onClick={() => setView("komano")}
            label="駒の動かし方"
            sub="初心者向け解説"
          />
          <NavItem
            active={view === "hansoku"}
            onClick={() => setView("hansoku")}
            label="将棋の反則"
            sub="ルール一覧"
          />
          <NavItem
            active={view === "kakoi"}
            onClick={() => setView("kakoi")}
            label="玉の囲い"
            sub="基本の形"
          />
        </div>

        <div className="nav-section">
          <div className="nav-label">問題管理</div>
          <NavItem
            active={view === "library"}
            onClick={() => setView("library")}
            label="問題ライブラリ"
            sub={`${problems.length}問 登録`}
          />
          <NavItem
            active={view === "editor"}
            onClick={() => setView("editor")}
            label="新規問題を作成"
          />
        </div>

        <div className="nav-section">
          <div className="nav-label">設定</div>
          <NavItem
            active={view === "settings"}
            onClick={() => setView("settings")}
            label="教室・出力設定"
          />
        </div>
      </aside>

      {/* ====== Main ====== */}
      <main className="main">
        {/* === TSUME === */}
        {view === "tsume" && (
          <section>
            <div className="page-head">
              <div>
                <div className="page-title">
                  <span className="accent">詰</span>将棋プリント
                </div>
                <div className="page-sub">
                  TSUME-SHOGI / PROBLEM SHEET COMPOSER
                </div>
              </div>
              <div>
                <button className="btn primary" onClick={generatePrintTsume}>
                  プリントを生成 →
                </button>
              </div>
            </div>

            <div className="ai-panel">
              <div className="ai-title">
                ◇ AI 出題アシスタント <span className="ai-badge">準備中</span>
              </div>
              <div className="ai-desc">
                テーマと手数を指定すると、AIが詰将棋の案を自動生成する機能を準備しています。
                <br />
                完成までは「新規問題を作成」から手作業で問題を登録してください。
              </div>
            </div>

            <div className="panel">
              <div className="panel-title">プリントに載せる問題を選ぶ</div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginBottom: 14,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <label
                  style={{
                    fontSize: 11,
                    color: "var(--gray)",
                    letterSpacing: ".1em",
                  }}
                >
                  フィルタ:
                </label>
                <select
                  value={filterTesuu}
                  onChange={(e) =>
                    setFilterTesuu(e.target.value as typeof filterTesuu)
                  }
                  style={{
                    padding: "6px 10px",
                    border: "1px solid #c5bda9",
                    fontSize: 12,
                    background: "#fff",
                  }}
                >
                  <option value="all">全ての手数</option>
                  <option value="1">1手詰のみ</option>
                  <option value="3">3手詰のみ</option>
                  <option value="5">5手詰のみ</option>
                </select>
                <select
                  value={filterVerified}
                  onChange={(e) =>
                    setFilterVerified(e.target.value as typeof filterVerified)
                  }
                  style={{
                    padding: "6px 10px",
                    border: "1px solid #c5bda9",
                    fontSize: 12,
                    background: "#fff",
                  }}
                >
                  <option value="all">全て</option>
                  <option value="verified">検証済みのみ</option>
                  <option value="unverified">未検証のみ</option>
                </select>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 11,
                    color: "var(--gray)",
                  }}
                >
                  選択中: <strong>{selectedIds.length}</strong> / 6問
                </span>
                <button className="btn sm ghost" onClick={clearSelection}>
                  選択クリア
                </button>
              </div>

              <div className="problem-list">
                {filtered.length === 0 ? (
                  <div className="empty-state">
                    <div className="mark">無</div>
                    <div className="msg">該当する問題がありません</div>
                    <button
                      className="btn primary"
                      onClick={() => setView("editor")}
                    >
                      + 新規問題を作成
                    </button>
                  </div>
                ) : (
                  filtered.map((p) => {
                    const sel = selectedIds.includes(p.id);
                    return (
                      <div
                        className={`problem-card${sel ? " selected" : ""}`}
                        key={p.id}
                      >
                        <div className="pc-head">
                          <span className="pc-no">
                            No. {p.id.slice(-4).toUpperCase()}
                          </span>
                          <span className="pc-tag">
                            {p.tesuu}手詰 {p.verified ? "✓検証済" : "⚠未検証"}
                          </span>
                        </div>
                        <div
                          style={{
                            fontFamily: "var(--font-mincho), serif",
                            fontWeight: 700,
                            fontSize: 14,
                            marginBottom: 4,
                          }}
                        >
                          {p.title || "無題"}
                        </div>
                        <div className="pc-board">{boardSummary(p)}</div>
                        <div className="pc-author">作者: {p.author}</div>
                        <div className="pc-actions">
                          <button
                            className={`btn sm ${sel ? "shu" : "primary"}`}
                            onClick={() => toggleSelect(p.id)}
                          >
                            {sel ? "選択解除" : "プリントに追加"}
                          </button>
                          <button
                            className="btn sm ghost"
                            onClick={() => deleteProblem(p.id)}
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>
        )}

        {/* === EDITOR === */}
        {view === "editor" && (
          <section>
            <div className="page-head">
              <div>
                <div className="page-title">
                  <span className="accent">編</span>問題エディタ
                </div>
                <div className="page-sub">PROBLEM EDITOR</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" onClick={resetEditor}>
                  クリア
                </button>
                <button className="btn primary" onClick={saveProblem}>
                  問題を保存
                </button>
              </div>
            </div>

            <div className="panel">
              <div className="panel-title">基本情報</div>
              <div className="form-grid">
                <div className="form-row">
                  <label>問題タイトル（任意）</label>
                  <input
                    type="text"
                    value={edTitle}
                    onChange={(e) => setEdTitle(e.target.value)}
                    placeholder="例: 玉と金で詰める基本"
                  />
                </div>
                <div className="form-row">
                  <label>手数</label>
                  <select
                    value={edTesuu}
                    onChange={(e) =>
                      setEdTesuu(parseInt(e.target.value) as 1 | 3 | 5)
                    }
                  >
                    <option value={1}>1手詰</option>
                    <option value={3}>3手詰</option>
                    <option value={5}>5手詰</option>
                  </select>
                </div>
                <div className="form-row">
                  <label>
                    作者名（必須・自作なら「鈴木肇」など、AI生成や引用なら出典を）
                  </label>
                  <input
                    type="text"
                    value={edAuthor}
                    onChange={(e) => setEdAuthor(e.target.value)}
                    placeholder="例: 伊藤宗看 / 鈴木肇 / AI生成（要検証）"
                  />
                </div>
                <div className="form-row">
                  <label>出典（任意）</label>
                  <input
                    type="text"
                    value={edSource}
                    onChange={(e) => setEdSource(e.target.value)}
                    placeholder="例: 将棋図巧第○番 / オリジナル"
                  />
                </div>
              </div>
              <div className="form-row">
                <label>正解手順（任意・記録用）</label>
                <textarea
                  value={edAnswer}
                  onChange={(e) => setEdAnswer(e.target.value)}
                  placeholder="例: ▲2三金（まで1手詰）"
                />
              </div>
              <div className="form-row">
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={edVerified}
                    onChange={(e) => setEdVerified(e.target.checked)}
                    style={{ width: "auto" }}
                  />
                  検証済み（自分で解いて成立を確認した）
                </label>
              </div>
            </div>

            <div className="panel">
              <div className="panel-title">盤面エディタ</div>
              <div className="board-editor">
                <div>
                  <div className="col-labels">
                    {COL_LABELS.map((n, i) => (
                      <div key={i}>{n}</div>
                    ))}
                  </div>
                  <div className="board-wrap">
                    <div className="board-grid">
                      {editor.board.flatMap((row, r) =>
                        row.map((cell, c) => (
                          <div
                            key={`${r}-${c}`}
                            className="board-cell"
                            onClick={() => placePieceOnCell(r, c)}
                          >
                            {cell && (
                              <span
                                className={`piece ${cell.side}${
                                  isPromoted(cell.piece) ? " promoted" : ""
                                }`}
                              >
                                {cell.piece}
                              </span>
                            )}
                          </div>
                        )),
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--gray)",
                      marginTop: 6,
                      lineHeight: 1.6,
                    }}
                  >
                    ※ パレットで駒と先手/後手を選択 → マスをクリックで配置
                    <br />
                    ※ 同じ駒のマスをクリックで削除（「削除」を選ぶと全消去）
                  </div>
                </div>

                <div className="piece-palette">
                  <div className="palette-title">駒パレット</div>
                  <div className="palette-toggle">
                    <button
                      className={editor.side === "sente" ? "active" : ""}
                      onClick={() => setSide("sente")}
                    >
                      ▲ 先手（攻方）
                    </button>
                    <button
                      className={editor.side === "gote" ? "active" : ""}
                      onClick={() => setSide("gote")}
                    >
                      ▽ 後手（玉方）
                    </button>
                  </div>
                  <div className="piece-row">
                    {PIECE_PALETTE.slice(0, 4).map((p) => (
                      <button
                        key={p}
                        className={`piece-btn${editor.piece === p ? " selected" : ""}`}
                        onClick={() => selectPiece(p)}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <div className="piece-row">
                    {PIECE_PALETTE.slice(4, 8).map((p) => (
                      <button
                        key={p}
                        className={`piece-btn${editor.piece === p ? " selected" : ""}`}
                        onClick={() => selectPiece(p)}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <div className="piece-row">
                    {PIECE_PALETTE.slice(8, 12).map((p) => (
                      <button
                        key={p}
                        className={`piece-btn${editor.piece === p ? " selected" : ""}`}
                        onClick={() => selectPiece(p)}
                        style={{ color: "var(--shu)" }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <div className="piece-row">
                    {PIECE_PALETTE.slice(12).map((p) => (
                      <button
                        key={p}
                        className={`piece-btn${editor.piece === p ? " selected" : ""}`}
                        onClick={() => selectPiece(p)}
                        style={{ color: "var(--shu)" }}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      className={`piece-btn${editor.piece === "消去" ? " selected" : ""}`}
                      onClick={() => selectPiece("消去")}
                      style={{ background: "#eee", color: "#444" }}
                    >
                      削除
                    </button>
                    <button
                      className="piece-btn"
                      style={{ visibility: "hidden" }}
                      tabIndex={-1}
                      aria-hidden
                    >
                      ・
                    </button>
                  </div>

                  <div className="mochigoma">
                    <div className="mochigoma-label">▲ 先手 持駒</div>
                    <div className="mochigoma-row">
                      {Object.entries(editor.mochigoma.sente).map(([k, v]) =>
                        v > 0 ? (
                          <span
                            key={k}
                            className="mochigoma-chip"
                            onClick={() => decMochi("sente", k)}
                          >
                            {k}
                            <span className="x">×{v}</span>
                          </span>
                        ) : null,
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 4,
                        marginTop: 4,
                        flexWrap: "wrap",
                      }}
                    >
                      {MOCHI_KINDS.map((p) => (
                        <button
                          key={p}
                          className="btn sm"
                          onClick={() => addMochi("sente", p)}
                        >
                          {p}+
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mochigoma">
                    <div className="mochigoma-label">▽ 後手 持駒</div>
                    <div className="mochigoma-row">
                      {Object.entries(editor.mochigoma.gote).map(([k, v]) =>
                        v > 0 ? (
                          <span
                            key={k}
                            className="mochigoma-chip"
                            onClick={() => decMochi("gote", k)}
                          >
                            {k}
                            <span className="x">×{v}</span>
                          </span>
                        ) : null,
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 4,
                        marginTop: 4,
                        flexWrap: "wrap",
                      }}
                    >
                      {MOCHI_KINDS.map((p) => (
                        <button
                          key={p}
                          className="btn sm"
                          onClick={() => addMochi("gote", p)}
                        >
                          {p}+
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* === LIBRARY === */}
        {view === "library" && (
          <section>
            <div className="page-head">
              <div>
                <div className="page-title">
                  <span className="accent">蔵</span>問題ライブラリ
                </div>
                <div className="page-sub">PROBLEM LIBRARY</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" onClick={exportLibrary}>
                  JSONエクスポート
                </button>
                <button
                  className="btn primary"
                  onClick={() => setView("editor")}
                >
                  + 新規問題
                </button>
              </div>
            </div>
            <div className="panel">
              <div className="panel-title">これまでに作った問題</div>
              <p
                style={{
                  fontSize: 12.5,
                  color: "#555",
                  lineHeight: 1.7,
                  marginBottom: 14,
                  fontFamily: "var(--font-mincho), serif",
                }}
              >
                ここには、これまでに登録された詰将棋の問題がすべて入っています。
                <br />
                ここから「詰将棋プリント」の画面に行って、お気に入りの問題を最大6問えらんで、A4のプリントを作れます。
              </p>
              {problems.length === 0 ? (
                <div className="empty-state">
                  <div className="mark">蔵</div>
                  <div className="msg">まだ問題が登録されていません</div>
                  <button
                    className="btn primary"
                    onClick={() => setView("editor")}
                  >
                    + 最初の問題を作る
                  </button>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: "flex",
                      gap: 18,
                      marginBottom: 18,
                      flexWrap: "wrap",
                    }}
                  >
                    {[1, 3, 5].map((t) => {
                      const cnt = problems.filter((p) => p.tesuu === t).length;
                      return (
                        <div
                          key={t}
                          style={{
                            background: "#fff",
                            border: "1px solid #d9d2c3",
                            padding: "10px 16px",
                            minWidth: 110,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 10,
                              color: "var(--gray)",
                              letterSpacing: ".15em",
                            }}
                          >
                            {t}手詰
                          </div>
                          <div
                            style={{
                              fontFamily: "var(--font-mincho), serif",
                              fontSize: 24,
                              fontWeight: 700,
                              color: cnt > 0 ? "var(--shu)" : "#bbb",
                            }}
                          >
                            {cnt}
                            <span style={{ fontSize: 12, marginLeft: 4 }}>問</span>
                          </div>
                        </div>
                      );
                    })}
                    <div
                      style={{
                        background: "#fff",
                        border: "1px solid #d9d2c3",
                        padding: "10px 16px",
                        minWidth: 110,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--gray)",
                          letterSpacing: ".15em",
                        }}
                      >
                        合計
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-mincho), serif",
                          fontSize: 24,
                          fontWeight: 700,
                        }}
                      >
                        {problems.length}
                        <span style={{ fontSize: 12, marginLeft: 4 }}>問</span>
                      </div>
                    </div>
                  </div>
                  {([1, 3, 5] as const).map((t) => {
                    const list = problems
                      .filter((p) => p.tesuu === t)
                      .slice()
                      .sort((a, b) => b.createdAt - a.createdAt);
                    if (list.length === 0) return null;
                    return (
                      <div key={t} style={{ marginBottom: 24 }}>
                        <h3
                          style={{
                            fontFamily: "var(--font-mincho), serif",
                            fontSize: 14,
                            fontWeight: 700,
                            letterSpacing: ".1em",
                            marginBottom: 10,
                            paddingBottom: 6,
                            borderBottom: "1px dotted #c5bda9",
                          }}
                        >
                          {t}手詰　<span style={{ fontSize: 11, color: "var(--gray)", fontWeight: 400 }}>（{list.length}問）</span>
                        </h3>
                        <div className="problem-list">
                          {list.map((p) => (
                            <div className="problem-card" key={p.id}>
                              <div className="pc-head">
                                <span className="pc-no">
                                  No. {p.id.slice(-4).toUpperCase()}
                                </span>
                                <span className="pc-tag">
                                  {p.tesuu}手詰　{p.verified ? "✓検証済" : "⚠未検証"}
                                </span>
                              </div>
                              <div
                                style={{
                                  fontFamily: "var(--font-mincho), serif",
                                  fontWeight: 700,
                                  fontSize: 14,
                                  marginBottom: 4,
                                }}
                              >
                                {p.title || "無題"}
                              </div>
                              <div className="pc-author">
                                作者: {p.author}
                                {p.source ? `　／　${p.source}` : ""}
                              </div>
                              {p.answer && (
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: "#555",
                                    marginTop: 6,
                                    fontFamily: "var(--font-mincho), serif",
                                  }}
                                >
                                  こたえ: {p.answer}
                                </div>
                              )}
                              <div className="pc-actions">
                                <button
                                  className="btn sm ghost"
                                  onClick={() => deleteProblem(p.id)}
                                >
                                  削除
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </section>
        )}

        {/* === KOMANO === */}
        {view === "komano" && (
          <section>
            <div className="page-head">
              <div>
                <div className="page-title">
                  <span className="accent">駒</span>駒の動かし方
                </div>
                <div className="page-sub">HOW PIECES MOVE</div>
              </div>
              <div>
                <button
                  className="btn primary"
                  onClick={() => {
                    setPrintKind("komano");
                    setView("print");
                  }}
                >
                  プリントを生成 →
                </button>
              </div>
            </div>
            <div className="panel">
              <div className="panel-title">プリント内容</div>
              <p style={{ fontSize: 13, color: "#444", lineHeight: 1.7 }}>
                将棋の8種類の駒（王・飛・角・金・銀・桂・香・歩）の動き方を、図と説明文で解説したA4プリントを生成します。
                <br />
                完全にオリジナル文章なので著作権の問題はありません。
              </p>
            </div>
          </section>
        )}

        {/* === HANSOKU === */}
        {view === "hansoku" && (
          <section>
            <div className="page-head">
              <div>
                <div className="page-title">
                  <span className="accent">禁</span>将棋の反則
                </div>
                <div className="page-sub">FORBIDDEN MOVES</div>
              </div>
              <div>
                <button
                  className="btn primary"
                  onClick={() => {
                    setPrintKind("hansoku");
                    setView("print");
                  }}
                >
                  プリントを生成 →
                </button>
              </div>
            </div>
            <div className="panel">
              <div className="panel-title">プリント内容</div>
              <p style={{ fontSize: 13, color: "#444", lineHeight: 1.7 }}>
                二歩・打ち歩詰め・行き所のない駒・連続王手の千日手・二手指し・成れない場所での成り
                など、
                <br />
                将棋の主な反則ルールを一覧化したA4プリントを生成します。
              </p>
            </div>
          </section>
        )}

        {/* === KAKOI === */}
        {view === "kakoi" && (
          <section>
            <div className="page-head">
              <div>
                <div className="page-title">
                  <span className="accent">囲</span>玉の囲い
                </div>
                <div className="page-sub">CASTLES OVERVIEW</div>
              </div>
              <div>
                <button
                  className="btn primary"
                  onClick={() => {
                    setPrintKind("kakoi");
                    setView("print");
                  }}
                >
                  プリントを生成 →
                </button>
              </div>
            </div>
            <div className="panel">
              <div className="panel-title">プリント内容</div>
              <p style={{ fontSize: 13, color: "#444", lineHeight: 1.7 }}>
                矢倉・美濃囲い・舟囲い・穴熊
                など、初心者がまず覚えるべき基本の囲いをA4プリント1枚にまとめます。
              </p>
            </div>
          </section>
        )}

        {/* === SETTINGS === */}
        {view === "settings" && (
          <section>
            <div className="page-head">
              <div>
                <div className="page-title">
                  <span className="accent">設</span>教室・出力設定
                </div>
                <div className="page-sub">SETTINGS</div>
              </div>
            </div>
            <div className="panel">
              <div className="panel-title">
                教室情報（プリントに印字されます）
              </div>
              <div className="form-row">
                <label>教室名</label>
                <input
                  type="text"
                  value={setSchool}
                  onChange={(e) => setSetSchool(e.target.value)}
                />
              </div>
              <div className="form-row">
                <label>サブタイトル</label>
                <input
                  type="text"
                  value={setSubtitle}
                  onChange={(e) => setSetSubtitle(e.target.value)}
                />
              </div>
              <div className="form-row">
                <label>監修者・講師名</label>
                <input
                  type="text"
                  value={setTeacher}
                  onChange={(e) => setSetTeacher(e.target.value)}
                />
              </div>
              <div style={{ marginTop: 14 }}>
                <button className="btn primary" onClick={saveSettings}>
                  設定を保存
                </button>
              </div>
            </div>
          </section>
        )}

        {/* === PRINT === */}
        {view === "print" && (
          <section>
            <div className="print-controls">
              <div className="print-controls-left">
                <button
                  className="btn ghost"
                  onClick={() => {
                    if (printKind === "tsume") setView("tsume");
                    else if (printKind === "komano") setView("komano");
                    else if (printKind === "hansoku") setView("hansoku");
                    else setView("kakoi");
                  }}
                >
                  ← 戻る
                </button>
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--gray)",
                    letterSpacing: ".1em",
                  }}
                >
                  プリントプレビュー
                </span>
              </div>
              <div className="print-controls-right">
                {printKind === "tsume" && (
                  <button
                    className="btn"
                    onClick={() => setShowAnswers((v) => !v)}
                  >
                    {showAnswers ? "こたえを隠す" : "こたえを表示"}
                  </button>
                )}
                <button className="btn shu" onClick={() => window.print()}>
                  🖨 印刷する
                </button>
              </div>
            </div>
            <div className="preview-wrap">
              <div className="a4-page">
                {printKind === "tsume" && (
                  <PrintTsume problems={selectedProblems} settings={settings} />
                )}
                {printKind === "komano" && <PrintKomano settings={settings} />}
                {printKind === "hansoku" && (
                  <PrintHansoku settings={settings} />
                )}
                {printKind === "kakoi" && <PrintKakoi settings={settings} />}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Toast */}
      <div className={`toast${toastMsg ? " show" : ""}`}>{toastMsg}</div>
    </div>
  );
}
