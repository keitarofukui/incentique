# 調査報告レポート: ライバル画面の名前折り返し・Android等の1文字改行不具合調査

- 作成日時: 2026-10-05 16:20
- 対象リポジトリ/ブランチ: game / main
- 対象コミット: 8ee4872
- トピック: rival-board-name-wrapping
- 上流 Artifact: なし（新規調査起点）

## 1. 結論サマリー
- **依頼内容**: 
  - ライバル画面で名前が改行されて読みづらい。
  - 特にAndroid端末等では1文字ごとに改行されて縦長になり、非常に見づらい不具合を解消したい。
- **【実測】根本原因（1行断定）**: 
  `RivalBoard.tsx` のランキングカード（`L96-99`）において、名前のラッパーに `flex-wrap` が指定されている一方で、名前テキスト要素（`<span>`）に `whitespace-nowrap` または `break-keep` がなく、さらにカード全体（`L77-83`）の横幅が「順位バッジ（`min-w-[52px]`）＋アバター＋所持ポイント欄（`whitespace-nowrap`）」に圧迫されて名前領域の flex 幅が極小化（30〜60px程度）された結果、Android/Chromeの禁則処理（CJKの既定 `break-words`/`word-break: normal`）によって日本語が1文字単位で折り返されていた [EV-1] [EV-2]。
- **【実測】修正すべき箇所**:
  1. `src/frontend/components/RivalBoard.tsx:L96-105`: 
     - 名前の表示部分に `whitespace-nowrap truncate` または `break-keep` を適用。
     - バッジ（YOU）との並びを `flex-wrap` ではなく `flex items-center gap-1.5 min-w-0` にし、名前が溢れる場合も `truncate`（省略記号）で1行を死守。
     - 順位バッジやアバターのサイズ・パディングをモバイル向けに最適化（`shrink-0` の横幅を過大に取らない設計へ調整）。
  2. `src/frontend/components/RivalBoard.tsx:L46, L52`:
     - 上部メッセージ（「首位の【名前】まで…」「次の順位の【名前】まで…」）内の【名前】部分にも `whitespace-nowrap inline-block` 等を付与し、不自然な途中改行を防止。
  3. `src/frontend/components/RivalPulse.tsx:L351-353, L478-480`:
     - 下部の「今日の勝負」「今週の部門別チャンピオン」でも同様に名前が折り返されないよう、`truncate` やレイアウト余白の整合性を担保。
- **推奨トラック**: ライト（理由: UIコンポーネント（CSS/Tailwindクラス）のレイアウト修正のみであり、DB・API・外部通信に一切影響しないため / §2-6）

---

## 1-1. 確定済みの前提（下流は再実測しない / §2-5）
| 事実 | 根拠 | 重い実測か |
| :--- | :--- | :--- |
| リポジトリ HEAD は `8ee4872`、ブランチは `main` | [EV-3] | いいえ |
| 型検査 `npx tsc --noEmit` および `npm run build` は正常通過（0エラー） | [EV-4] | いいえ |
| ユーザーの提出画面キャプチャにて「シュン / タロウ」「りょー / たろ」と名前が縦に分断されていることを確認 | 添付画像 | いいえ |

---

## 2. 実測エビデンス

### [EV-1] RivalBoard.tsx における名前表示部のCSSクラス実測
$ sed -n '83,119p' src/frontend/components/RivalBoard.tsx
```tsx
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Rank Badge */}
                <div className={`px-2.5 py-1 rounded-xl text-xs font-black font-mono border shrink-0 text-center min-w-[52px] ${rankBg}`}>
                  {rankBadge}
                </div>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-xl border border-slate-700 shrink-0">
                  {user.avatar || '⚡'}
                </div>

                {/* Name & Sub Info */}
                <div className="flex flex-col justify-center flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm sm:text-base font-extrabold text-white">
                      {user.name}
                    </span>
                    {isMe && (
                      <span className="text-[9px] bg-cyber-neonCyan/20 text-cyber-neonCyan font-black px-1.5 py-0.5 rounded-full border border-cyber-neonCyan/30 shrink-0">
                        YOU
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-400 font-medium mt-1">
                    達成: <strong className="text-slate-200 font-mono">{userApprovedLogs.length}</strong> 回
                  </div>
                </div>
              </div>

              {/* Points */}
              <div className="text-right shrink-0 pl-2">
                <div className="text-[10px] text-slate-400 font-medium leading-none">所持ポイント</div>
                <div className="text-base sm:text-lg font-black text-amber-400 font-mono mt-1 leading-none whitespace-nowrap">
                  {user.current_points.toLocaleString()} <span className="text-xs text-amber-300 font-normal">pt</span>
                </div>
              </div>
```
- 【実測】名前表示部の外側は `flex items-center gap-1.5 flex-wrap` となっており、さらに `user.name` の `<span>` 自体には改行抑止（`whitespace-nowrap` や `break-keep`）が全く存在しない。
- 【実測】一方、右側のポイント表示には `whitespace-nowrap` および `shrink-0` が指定されており、画面幅が狭い場合（360px前後のAndroid実機等）に中央の名前領域が強制的に圧縮され、残余幅が「1文字分」程度まで縮むと、ブラウザがCJK文字を1文字ずつ改行してしまう構造になっている。

### [EV-2] RivalBoard.tsx 上部バナー内の名前表示実測
$ sed -n '43,59p' src/frontend/components/RivalBoard.tsx
```tsx
        ) : isSecond && personAhead ? (
          <div className="bg-red-500/10 border border-red-500/30 px-3.5 py-1.5 rounded-2xl text-xs font-bold text-red-300 flex items-center gap-2">
            <Flame className="w-4 h-4 text-red-400 animate-bounce" />
            <span>首位の【{personAhead.name}】まで あと <strong className="text-amber-400 font-mono text-sm">{gapToAhead.toLocaleString()} pt</strong>！</span>
          </div>
        ) : personAhead ? (
          <div className="bg-red-500/10 border border-red-500/30 px-3.5 py-1.5 rounded-2xl text-xs font-bold text-red-300 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-red-400 animate-bounce shrink-0" />
              <span>次の順位（{userRankIndex}位）の【{personAhead.name}】まで あと <strong className="text-amber-400 font-mono text-sm">{gapToAhead.toLocaleString()} pt</strong>！</span>
            </div>
            {leader && leader.id !== personAhead.id && (
              <span className="text-[0.6875rem] text-slate-400 font-normal">
                （首位【{leader.name}】まで あと {gapToLeader.toLocaleString()} pt）
              </span>
            )}
          </div>
        ) : null}
```
- 【実測】バナーでも `【{personAhead.name}】` の部分に改行防止がなく、スマホ幅で「【りょー」と「たろ】」のように名前の真ん中で分断されて表示されていた（添付画像でも確認可能）。

### [EV-3] Git コミット・ブランチ情報
$ git status; git rev-parse --short HEAD
```
On branch main
Your branch is up to date with 'origin/main'.
8ee4872
```

### [EV-4] TypeScript 型チェックおよびビルド検証
$ npx tsc --noEmit; npm run build
```
> quest-habit-app@1.0.0 build
> vite build
✓ built in 1.65s
```

---

## 3. 否定された仮説（E-5）
1. **仮説**: DB内のユーザー名データに改行コード（`\n`）が混入しているのではないか？
   - **棄却根拠**: 他の画面（ヘッダーや目標設定、ダッシュボード等）では名前が正常に1行で表示されていること、および添付スクリーンショットで「シュン」と「タロウ」の文字幅の境界で綺麗に折り返されていることから、データ起因ではなく純粋なCSS（コンテナ幅不足＋折り返し許可）による表示不具合であることを実測・確認した。
2. **仮説**: `word-break: break-all` がグローバルCSSに指定されているのではないか？
   - **棄却根拠**: `src/frontend/index.css` を確認したところ `word-break` の指定はなく、通常のブラウザ標準（CJK文字は任意の位置で改行可能）に従って1文字ずつ折り返されていた。

---

## 4. 是正方針（設計フェーズへの申し送り）
1. **`whitespace-nowrap` の適用**:
   - `user.name` を囲む要素に `whitespace-nowrap` を付与し、名前の途中で絶対に改行させない。
   - 長い名前でも破綻しないよう、`min-w-0` と `truncate`（テキスト省略 `...`）を組み合わせる。
2. **カード内アイテムの横幅・レイアウト最適化**:
   - モバイル幅（360px〜390px）でも名前と「YOU」バッジが窮屈にならないよう、左右パディングやギャップ（`gap-2.5`）をスリム化し、名前領域に十分な横幅を確保する。
   - バナーテキストの `【{name}】` にも `inline-block whitespace-nowrap` を設定し、名前が途中で千切れないようにする。
