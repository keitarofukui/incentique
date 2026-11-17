# 機能設計仕様書: ライバル画面の名前省略解消・フルネーム堂々表示レイアウト再設計

- 作成日時: 2026-10-05 16:28
- 対象リポジトリ/ブランチ: game / main
- 対象コミット: 8ee4872
- トピック: rival-board-name-full-display
- 上流 Artifact: docs/investigation-report.md（対象コミット: 8ee4872）
- トラック: ライト（UIレイアウトの改善のみ、製品コード差分約25行）

## 0. 上流の抜き取り再実測（§2-3・軽量コマンド 3 件）
### [EV-1] 上流 [EV-1] の再実行（RivalBoard.tsx カード内構造）
$ sed -n '96,104p' src/frontend/components/RivalBoard.tsx
```tsx
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
```
- 【実測】上流と一致。`truncate whitespace-nowrap` が指定され、横幅不足時に `...` 省略される構造を確認 [EV-1]。

### [EV-2] 上流 [EV-2] の再実行（RivalBoard.tsx 外枠パディング）
$ sed -n '27p' src/frontend/components/RivalBoard.tsx
```tsx
    <div className="glass-card p-6 sm:p-8 rounded-3xl space-y-6 border border-cyber-border">
```
- 【実測】上流と一致。`p-6` でモバイルの有効幅が削られていることを確認 [EV-2]。

### [EV-3] 上流 [EV-4] の再実行（型検査とビルド）
$ npx tsc --noEmit && npm run build
```
✓ built in 1.78s
```
- 【実測】上流と一致。型エラー0、ビルド正常を確認 [EV-3]。

---

## 0-1. 確定済みの前提（上流から引き継ぎ・再実測しない / §2-5）
| 事実 | 根拠（上流の EV） |
| :--- | :--- |
| リポジトリ HEAD は `8ee4872`、ブランチは `main` | [EV-3]（upstream: investigation-report.md） |
| 型検査およびビルドはエラーなし | [EV-4]（upstream: investigation-report.md） |

---

## 1. 変更要件とアーキテクチャ設計
### 1-1. 目的
「シュン…」「りょー…」のような省略記号を完全に解消し、Android等のスマートフォン（画面幅360px〜）でもユーザー名が一切途切れず、堂々とフルネームで表示されるデザインを提供する。

### 1-2. 設計詳細
1. **外枠コンテナ (`RivalBoard.tsx:L27`)**:
   - `p-4 sm:p-6 md:p-8` に変更。モバイルでの左右の圧迫を解消。
2. **カードレイアウトのモバイル最適化 (`RivalBoard.tsx:L75-121`)**:
   - ユーザーの要望「少し縦幅増やしてもいいので、全部表示されるデザイン」を採用。
   - モバイル表示時（`flex-col sm:flex-row`）：
     - **上段（`flex items-center justify-between gap-2`）**:
       - 左側: 【順位バッジ】＋【アバター】＋【名前（フルネーム・`whitespace-nowrap`・`truncate` なし・太字白文字）】＋【YOUバッジ】。
       - これにより名前領域の横幅が 180px〜220px 以上確保され、長い名前でも絶対に省略されず綺麗に1行で表示される。
     - **下段（`flex items-center justify-between pt-2 border-t border-slate-800/60 mt-1` / sm以上では同一行に統合）**:
       - 左側: `達成: ○○ 回`（アイコンや落ち着いたカラー）
       - 右側: `所持ポイント: ○○ pt`（ゴールドの強調フォント）
   - PC・タブレット（`sm:` 以上）:
     - 既存のスタイリッシュな1行レイアウト（左にバッジ・アバター・名前・達成数、右に所持ポイント）をシームレスに維持。
3. **視覚的プレミアム感の向上**:
   - 縦幅が少し増えることで窮屈感が消え、ゲームのランキングボードとしてより堂々としたプレミアムカードデザインに進化。

---

## 2. 実装計画
- 変更ファイル: `src/frontend/components/RivalBoard.tsx`
- 製品コード差分: 約25行
- リスク・副作用: スタイル変更のみ。DB・API通信への影響なし。
