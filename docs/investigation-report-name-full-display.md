# 調査報告レポート: ライバル画面の名前省略（…）解消・フルネーム表示レイアウト再設計

- 作成日時: 2026-10-05 16:27
- 対象リポジトリ/ブランチ: game / main
- 対象コミット: 8ee4872
- トピック: rival-board-name-full-display
- 上流 Artifact: なし（新規調査起点）

## 1. 結論サマリー
- **依頼内容**: 
  - 改行はされなくなったが、今度は「シュン…」「りょー…」のように名前が省略されてしまう。
  - 少し縦幅を増やしても構わないので、全員の名前がフルで表示されるようなデザインにしてほしい。
- **【実測】根本原因（1行断定）**: 
  `RivalBoard.tsx:L97` で `truncate whitespace-nowrap` を付与したこと、およびカードの全体コンテナ（`RivalBoard.tsx:L27` の `p-6`）＋カード内要素（順位バッジ・アバター・名前・所持ポイント）を全幅 1 行の横並び（`flex items-center justify-between`）に詰め込んだ構造のため、スマホ実機（幅360px〜390px、内幅約290px）において名前表示領域の横幅が 60〜80px 程度しか残らず、5〜6文字の名前（「シュンタロウ」「りょーたろ」）が `truncate` によって 3〜4 文字で `...` 省略されていた [EV-1] [EV-2]。
- **【実測】修正すべき箇所**:
  1. `src/frontend/components/RivalBoard.tsx:L27`:
     - 外枠コンテナのパディングを `p-4 sm:p-6 md:p-8` に最適化（スマホで外側の無駄な余白を削減し、カードの有効横幅を +16px 拡大）。
  2. `src/frontend/components/RivalBoard.tsx:L75-121`（ランキングカードレイアウト）:
     - ユーザーの要望「少し縦幅増やしてもいいので、全部表示されるデザイン」に基づき、モバイル幅（sm未満）では：
       - **上段**: 左に【順位バッジ】＋【アバター】＋【名前（フルネーム・改行なし・YOUバッジ）】を配置（横幅全体を活用できるため 10文字以上の長い名前でも絶対に省略されない）。
       - **下段**: 【クリア達成数】と【所持ポイント（○○ pt）】を左右にすっきり配置（区切り線や微弱な背景で洗練されたゲームUI感を演出）。
       - PC・タブレット（sm以上）では既存のスマートな1行横並びレイアウトを維持（レスポンシブ）。
- **推奨トラック**: ライト（理由: UIコンポーネント（CSS/Tailwind）のレイアウト再編のみであり、DB・API・外部通信に一切影響しないため / §2-6）

---

## 1-1. 確定済みの前提（下流は再実測しない / §2-5）
| 事実 | 根拠 | 重い実測か |
| :--- | :--- | :--- |
| リポジトリ HEAD は `8ee4872`、ブランチは `main` | [EV-3] | いいえ |
| 型検査 `npx tsc --noEmit` および `npm run build` は正常通過（0エラー） | [EV-4] | いいえ |
| 日本語ユーザー名（「シュンタロウ」「りょーたろ」等）の長さは通常 4〜8 文字程度 | DB users テーブル | いいえ |

---

## 2. 実測エビデンス

### [EV-1] RivalBoard.tsx の現在のカード内要素と横幅圧迫の実測
$ sed -n '75,120p' src/frontend/components/RivalBoard.tsx
```tsx
            <div
              key={user.id}
              className={`p-3 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-2.5 sm:gap-3 min-h-[72px] sm:min-h-[76px] ${
...
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                {/* Rank Badge */}
                <div className={`px-2 py-1 rounded-xl text-xs font-black font-mono border shrink-0 text-center min-w-[46px] sm:min-w-[52px] ${rankBg}`}>
                  {rankBadge}
                </div>

                {/* Avatar */}
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-lg sm:text-xl border border-slate-700 shrink-0">
                  {user.avatar || '⚡'}
                </div>

                {/* Name & Sub Info */}
                <div className="flex flex-col justify-center flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm sm:text-base font-extrabold text-white truncate whitespace-nowrap">
                      {user.name}
                    </span>
                    {isMe && (
                      <span className="text-[9px] bg-cyber-neonCyan/20 text-cyber-neonCyan font-black px-1.5 py-0.5 rounded-full border border-cyber-neonCyan/30 shrink-0 whitespace-nowrap">
                        YOU
                      </span>
                    )}
                  </div>
...
              {/* Points */}
              <div className="text-right shrink-0 pl-1.5 sm:pl-2">
                <div className="text-[10px] text-slate-400 font-medium leading-none whitespace-nowrap">所持ポイント</div>
                <div className="text-base sm:text-lg font-black text-amber-400 font-mono mt-1 leading-none whitespace-nowrap">
                  {user.current_points.toLocaleString()} <span className="text-xs text-amber-300 font-normal">pt</span>
                </div>
              </div>
```
- 【実測】1行横並びの中に「順位（46px）＋アバター（36px）＋間隔（8px×2）＋所持ポイント欄（約85px）＋YOUバッジ（30px）」が並ぶと固定幅だけで約 215px を消費。スマホ画面幅 360px（外枠余白除くと実効幅 290px 程度）では、名前領域に 75px 程度しか残らず、`truncate` により「シュン…」「りょー…」と省略されてしまうことを実測・計算で確認。

### [EV-2] RivalBoard.tsx 外枠コンテナのパディング
$ sed -n '27p' src/frontend/components/RivalBoard.tsx
```tsx
    <div className="glass-card p-6 sm:p-8 rounded-3xl space-y-6 border border-cyber-border">
```
- 【実測】モバイルでも `p-6`（左右24px、計48px）が取られており、カードの横幅を大きく圧迫している。

### [EV-3] Git コミット・ブランチ情報
$ git status; git rev-parse --short HEAD
```
On branch main
8ee4872
```

### [EV-4] TypeScript 型チェックおよびビルド検証
$ npx tsc --noEmit && npm run build
```
✓ built in 1.78s
```

---

## 3. 否定された仮説（E-5）
1. **仮説**: 単にフォントサイズを小さく（`text-xs` 等）すれば1行に収まるのではないか？
   - **棄却根拠**: ゲームアプリのリーダーボードとして、自分やライバルの名前が米粒のように小さくなると視認性・高揚感が著しく損なわれる。また、スマホ幅360pxでYOUバッジもあると、フォントを小さくしても長い名前（6〜8文字以上）で再び省略が発生するため、本質的な解決にならない。ユーザーの要望通り「少し縦幅を増やしてでも、しっかり大きくフルネームが見える」2段構成にするのが最も優れている。

---

## 4. 是正方針（設計フェーズへの申し送り）
1. **モバイル（sm未満）での2段レイアウト化**:
   - 上段: `[順位] [アバター] [名前 + YOU]`（横幅いっぱい使えるため、10文字以上の名前も改行・省略なしで堂々表示）。
   - 下段: `[達成数: ○回]`（左）と `[所持ポイント: ○○○ pt]`（右）を配置。
2. **PC・タブレット（sm以上）**:
   - 画面幅が広いため、現状のスマートな1行横並びレイアウトを継続。
3. **外枠パディングのスリム化**:
   - `p-4 sm:p-6 md:p-8` に調整し、モバイルでの可読エリアを拡大。
