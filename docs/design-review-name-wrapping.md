# 設計レビュー報告書: ライバル画面の名前折り返し・Android等の1文字改行不具合の恒久是正

- 作成日時: 2026-10-05 16:23
- 対象リポジトリ/ブランチ: game / main
- 対象コミット: 8ee4872
- トピック: rival-board-name-wrapping
- 上流 Artifact: docs/design-spec.md（対象コミット: 8ee4872）
- 判定: **PASS（承認）**

## 0. 上流の抜き取り再実測（§2-3・軽量コマンド 3 件）
### [EV-1] 上流 [EV-1] の再実行（RivalBoard.tsx カード名前表示）
$ sed -n '96,100p' src/frontend/components/RivalBoard.tsx
```tsx
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm sm:text-base font-extrabold text-white">
                      {user.name}
                    </span>
```
- 【実測】上流の指摘通り `flex-wrap` が存在し `whitespace-nowrap` が欠落している [EV-1]。

### [EV-2] 上流 [EV-2] の再実行（RivalBoard.tsx 上部バナー）
$ sed -n '46p' src/frontend/components/RivalBoard.tsx
```tsx
            <span>首位の【{personAhead.name}】まで あと <strong className="text-amber-400 font-mono text-sm">{gapToAhead.toLocaleString()} pt</strong>！</span>
```
- 【実測】上流の指摘通り `【{personAhead.name}】` に改行防止がない [EV-2]。

### [EV-3] 上流 [EV-3] の再実行（tsc型検査）
$ npx tsc --noEmit
- 【実測】exit code 0、エラーなし [EV-3]。

---

## 1. 判定基準の確認
| 項目 | 判定 | 理由 |
| :--- | :--- | :--- |
| G-1: 担当外ファイル書き込み | PASS | 設計仕様書の作成のみ実施 |
| G-2: プロジェクトスコープ | PASS | `src/frontend/components/RivalBoard.tsx` 内の修正のみ |
| G-4: DBマイグレーション | PASS | スキーマ変更なし |
| G-5: エラー握りつぶし | PASS | 表示スタイルのみの修正 |
| G-6: 実測エビデンス主義 | PASS | 実測証跡に基づき設計 |
| G-7: 二次被害（情報漏洩） | PASS | 新規データ送出なし |
| G-8: 本質的アーキテクチャ | PASS | Tailwindの標準クラス（`whitespace-nowrap truncate min-w-0`）による堅牢な実装 |
| トラック判定（ライト） | PASS | 差分見込み約15行、危険パスへの接触なし |

## 2. 結論
無条件差し戻し項目は全て確認し、該当なし。製造フェーズへ進行を承認。
