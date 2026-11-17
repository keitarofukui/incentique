# 機能設計仕様書: ライバル画面の名前折り返し・Android等の1文字改行不具合の恒久是正

- 作成日時: 2026-10-05 16:22
- 対象リポジトリ/ブランチ: game / main
- 対象コミット: 8ee4872
- トピック: rival-board-name-wrapping
- 上流 Artifact: docs/investigation-report.md（対象コミット: 8ee4872）
- トラック: ライト（UI表示スタイルの修正のみで完結、製品コード差分20行前後）

## 0. 上流の抜き取り再実測（§2-3・軽量コマンド 3 件）
### [EV-1] 上流 [EV-1] の再実行（RivalBoard.tsx のカード名前表示）
$ sed -n '96,105p' src/frontend/components/RivalBoard.tsx
```tsx
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
```
- 【実測】上流と一致。`flex-wrap` が指定されており、`span` に `whitespace-nowrap` がないことを再確認 [EV-1]。

### [EV-2] 上流 [EV-2] の再実行（RivalBoard.tsx の上部バナー名前表示）
$ sed -n '46,53p' src/frontend/components/RivalBoard.tsx
```tsx
            <span>首位の【{personAhead.name}】まで あと <strong className="text-amber-400 font-mono text-sm">{gapToAhead.toLocaleString()} pt</strong>！</span>
          </div>
        ) : personAhead ? (
          <div className="bg-red-500/10 border border-red-500/30 px-3.5 py-1.5 rounded-2xl text-xs font-bold text-red-300 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-red-400 animate-bounce shrink-0" />
              <span>次の順位（{userRankIndex}位）の【{personAhead.name}】まで あと <strong className="text-amber-400 font-mono text-sm">{gapToAhead.toLocaleString()} pt</strong>！</span>
```
- 【実測】上流と一致。`【{personAhead.name}】` に改行防止がないことを再確認 [EV-2]。

### [EV-3] 上流 [EV-4] の再実行（型検査・ビルドの健全性）
$ npx tsc --noEmit; npm run build
```
✓ built in 1.65s
```
- 【実測】上流と一致。型エラー0、ビルド正常を確認 [EV-3]。

---

## 0-1. 確定済みの前提（上流から引き継ぎ・再実測しない / §2-5）
| 事実 | 根拠（上流の EV） |
| :--- | :--- |
| リポジトリ HEAD は `8ee4872`、ブランチは `main` | [EV-3]（upstream: investigation-report.md） |
| 型検査およびビルドはエラーなし | [EV-4]（upstream: investigation-report.md） |
| DBのユーザー名データ自体の改行混入は棄却済み | 調査報告第3節（upstream: investigation-report.md） |

---

## 1. 変更要件とアーキテクチャ設計
### 1-1. 目的
Android等画面幅が狭い端末（360px〜400px）を含め、ユーザー名（「シュンタロウ」「りょーたろ」等）が途中や1文字ごとに改行されて縦長になる不具合を完全に防止し、横1行で美しく表示する。

### 1-2. 設計詳細
1. **ランキングカード内の名前表示 (`RivalBoard.tsx:L95-105`)**:
   - `flex-wrap` を廃止し、`flex items-center gap-1.5 min-w-0` とする。
   - `user.name` の `<span>` に `whitespace-nowrap truncate` を付与。名前が長い場合でも途中で改行されず `...` 省略となるようにする。
   - `YOU` バッジにも `shrink-0` を付与し、名前に押し出されて変形しないようにする。
   - カード全体の左右ギャップを `gap-2.5 sm:gap-3` に調整し、左側バッジ（`min-w-[48px]`）と右側ポイント表示（`shrink-0`）の間の名前領域に最大限の横幅を確保する。
2. **上部バナー (`RivalBoard.tsx:L46, L52`)**:
   - `【{personAhead.name}】` を `<span className="inline-block whitespace-nowrap">【{personAhead.name}】</span>` で囲み、名前途中での折り返しを防止。
   - 首位バナーの `【{leader.name}】` も同様に `inline-block whitespace-nowrap` を付与。
3. **副作用・二次影響の確認 (G-7)**:
   - 表示スタイルの修正のみ。DBカラム、API通信、認証、状態管理等への影響は一切なし。

---

## 2. 実装計画（差分定義）
- 変更ファイル: `src/frontend/components/RivalBoard.tsx` のみ（1ファイル、製品コード差分 約 15 行）
- 影響範囲: ライバルタブ表示

---

## 3. レビュー・検証方針
- ビルド・型検査: `npx tsc --noEmit` および `npm run build`
- 実行時検証（G-13）: モバイル幅（375px / 360px）でのブラウザレンダリング確認を行い、名前が1行で改行されずに表示されることを確認。
