# 機能設計仕様書: 細かいUI/UXの改善（スマホ縦表示・グラフ文言＆詳細ログ視認性・ライバル順位表示）

- 作成日時: 2026-09-30 18:33
- 対象リポジトリ/ブランチ: game / main
- 対象コミット: 2b661df
- 上流 Artifact: docs/investigation-report.md（対象コミット: 2b661df）

## 0. 上流の抜き取り再実測（§2-3・軽量コマンド 3 件）

### [EV-1] 上流 [EV-1] の再実行（Git 状態）
$ git rev-parse --short HEAD && git branch --show-current
2b661df
main

- 【実測】コミットは 2b661df、ブランチは main で上流と一致 [EV-1]。

### [EV-2] 上流 [EV-3] の再実行（DailyChart.tsx L330-336）
$ sed -n '330,336p' src/frontend/components/DailyChart.tsx
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">「食事」と「ボーナス」を完全分離！どの分野をどれだけ頑張ったか一目でわかる</p>
          </div>
        </div>

- 【実測】L333 に「完全分離」文言が存在し上流と一致 [EV-2]。

### [EV-3] 上流 [EV-9] の再実行（「首位」検索）
$ grep -rn "首位" src/
src/frontend/components/RivalBoard.tsx:37:            <span>首位の【{personAhead.name}】まで あと <strong className="text-amber-400 font-mono text-sm">{gapToAhead.toLocaleString()} pt</strong>！</span>

- 【実測】ヒットは RivalBoard.tsx:37 の 1 件のみで上流と一致 [EV-3]。

### [EV-4] 上流 [EV-7] の再実行（users テーブルの首位確認）
$ npx wrangler d1 execute quest-db --remote --command "SELECT id, name, current_points FROM users ORDER BY current_points DESC;"
│ id                      │ name         │ current_points │
├─────────────────────────┼──────────────┼────────────────┤
│ user_1784723445812_y29a │ シュンタロウ │ 31925          │
│ user_1784722928426_3ng3 │ りょーたろ   │ 16109          │

- 【実測】1位はシュンタロウ、2位はりょーたろで上流と一致 [EV-4]。

### [EV-5] 上流 [EV-10] の再実行（ビルド・型チェック）
$ npx tsc --noEmit
(0 errors)

- 【実測】型エラー 0 件で上流と一致 [EV-5]。

## 0-1. 確定済みの前提（上流から引き継ぎ・再実測しない / §2-5）
| 事実 | 根拠 |
| :--- | :--- |
| リポジトリ HEAD は 2b661df | [EV-1] |
| npx tsc --noEmit はエラー 0 件 | [EV-5] |
| 所持ポイント首位はシュンタロウ（31,925pt）、りょーたろは2位（16,109pt） | [EV-4] |

- トラック: ライト（理由: DBスキーマ・機密・外部API・認証に変更がなく、フロントエンドのUIレイアウト・文言修正・CSS調整のみで製品コード差分が100行未満のため / §2-6）
- トラック自己照合: §12 の変更対象パス = `src/frontend/components/Header.tsx`, `src/frontend/components/DailyChart.tsx`, `src/frontend/components/RivalBoard.tsx` / リスクパス（migrations, auth, secret, credential, token, .env, wrangler.toml）および他レーン共有パスへの抵触: 無し（適合）

## 1. 概要・目的
ユーザーから指摘された4点の細かいUI/UX不具合を解消し、モバイル利用時およびランキング閲覧時の体験を最適化する。
1. スマホ縦表示時にアプリタイトル「INCENTI QUEST」が省略・消失する問題を解消。
2. ホーム獲得ポイント推移グラフの不要文言（「完全分離」サブタイトル、日付タップガイド説明文）を削除。
3. グラフの日付タップ時に、詳細ログパネルへ自然にスクロール連動させ、ログタイトルを折り返し表示（長文でも全表示）にする。
4. ライバルタブにおいて、3位以下のユーザー視点で直上の相手（2位のりょーたろ等）が「首位」と誤認表示されるロジック・文言を是正。

## 2. 機能要件 / 非機能要件
### 機能要件
- **FR-1 (Header)**: 幅360px〜430pxのモバイル画面で、タイトル「INCENTI QUEST」が切り詰められず完全に視認できること。
- **FR-2 (DailyChart不要文言削除)**: 「「食事」と「ボーナス」を完全分離！...」および「グラフの日付をタップすると、その日の「何をして何pt獲得したか」の明細が見られます」を削除し、すっきりとした配置にすること。
- **FR-3 (DailyChart詳細ログ改善)**:
  - 日付タップ時、自動的に詳細パネル（`Selected Day Action Logs Detail Panel`）が見える位置へスムーズスクロールすること。
  - ログカードの `title_or_menu` を `truncate` から複数行折り返し（`break-words`）に変更し、30文字以上のストリークボーナス名等も全文読めること。
- **FR-4 (RivalBoard順位文言是正)**:
  - 1位のとき: 「あなたが現在ランキング 1 位です！👑」
  - 2位のとき: 「首位の【{首位の名前}】まで あと {差分} pt！」
  - 3位以下のとき: 「次の順位（{直上の順位}位）の【{直上の名前}】まで あと {直上との差分} pt！」（首位との差分もサブ表示）

### 非機能要件
- **NFR-1 (レスポンシブ)**: PC・タブレット（sm以上）の既存表示を壊さず、スマホ縦（幅375px等）のみに最適化されること。
- **NFR-2 (アクセシビリティ)**: Header のボタン（ログアウト・保護者切替）のタップターゲット領域を維持すること。

## 3. データフロー全経路
今回はフロントエンドの表示ロジックおよび CSS クラスの変更のみであり、バックエンド API や DB への新規データフローは発生しない。
- 既存のデータ読み出し経路:
  - `Header.tsx:L83-L130`: `currentUser` の名前・ポイントを表示。
  - `DailyChart.tsx:L85-L120`: `selectedDate` の更新および `/api/action-logs` からの該当ログ取得。
  - `RivalBoard.tsx:L15-L40`: `users` 配列のソートと差分計算。

## 4. 🛡️ 機密フィールド台帳と漏洩遮断設計（G-7）
本変更では新規フィールドの追加や既存フィールドの変更は一切行わない。
機密値（トークン・パスワード等）の取り扱いは無く、漏洩リスクは存在しない。

| フィールド | 機密度 | 既存の露出経路 | 遮断策 |
| :--- | :--- | :--- | :--- |
| 該当なし（UI調整のみ） | - | - | - |

## 5. 🗄️ DB マイグレーション DDL（全文 / G-4）
本機能において DB スキーマの変更は不要（マイグレーションなし）。

## 6. API 契約
本機能においてバックエンド API の新規追加およびスキーマ変更は不要。

## 7. 🙈 エラーハンドリング仕様（G-5）
本機能では新規 API リクエストは追加せず、DailyChart 内の既存の `/api/action-logs` 取得処理（`res.ok` に対する else/try-catch 処理）をそのまま維持する。

## 8. 🏛️ アーキテクチャ選定と却下案（G-8）
### 採用アーキテクチャ
1. **Header の省スペース化**:
   - モバイル幅（sm 未満）では Controls 側の余白（padding/gap）をわずかに縮め、ユーザー名バッジの最大幅を 85px から 60px 程度にスリム化することで、Brand 側に約 130px 以上の表示幅を安定して確保。
   - タイトルはモバイルで `text-sm`（フォントサイズ縮小）、PCで `sm:text-xl` とし、画面幅 360px でも「INCENTI QUEST」が完全に収まるようにする。
   - *却下案*: タイトルをアイコンのみにして文字を隠す案 ➔ ユーザーの「タイトルが表示されない」という要望に反するため却下。
2. **DailyChart スクロール処理**:
   - `useRef<HTMLDivElement>` を詳細パネルに付与し、日付選択時に `scrollIntoView({ behavior: 'smooth', block: 'nearest' })` を呼び出す。
   - *却下案*: `window.scrollTo` でハードコードされた座標を指定する案 ➔ 画面サイズや期間タブの選択状態によって位置が変わるため却下。
3. **RivalBoard の順位分岐**:
   - `userRankIndex === 1`（2位）と `userRankIndex > 1`（3位以下）で文言を明確に分岐。
   - *却下案*: 常に首位との差だけを表示する案 ➔ 3位以下のユーザーにとって「直上の相手を抜く」という現実的なモチベーションが失われるため、直上の相手を「次の順位（N位）」として明示しつつ首位差も添える設計とする。

## 9. 🧪 受け入れ基準（検証コマンド付き）
| # | 検証項目 | 検証手順 / コマンド | 合格基準 |
| :--- | :--- | :--- | :--- |
| AC-1 | 型チェック | `npx tsc --noEmit` | エラー 0 件 |
| AC-2 | プロダクションビルド | `npm run build` | exit 0 で正常終了 |
| AC-3 | Header タイトル | 幅 375px で表示確認 | 「INCENTI QUEST」が切り詰められず表示される |
| AC-4 | グラフ不要文言 | `grep -rn "完全分離" src/` | ヒット 0 件 |
| AC-5 | グラフ説明文 | `grep -rn "グラフの日付をタップ" src/` | ヒット 0 件 |
| AC-6 | 日付タップ詳細表示 | 日付タップ時の DOM / CSS 確認 | `scrollIntoView` が呼ばれ、タイトルに `break-words` が適用されている |
| AC-7 | ライバル順位表示 | `RivalBoard.tsx` の文言確認 | 3位以下のとき「首位の【...】」と表示されず「次の順位」と正しく表示される |

## 10. 📋 前提条件・ブロッカー
- ブロッカーなし。

## 11. UI / コンポーネント設計

### 11-1. Header.tsx 変更点
- `Brand`:
  - `span`: `text-sm sm:text-xl font-mono font-black tracking-normal sm:tracking-wider whitespace-nowrap`
- `Controls`:
  - 全体: `gap-1 sm:gap-2.5`
  - ユーザー名バッジ: `px-1.5 sm:px-2.5 py-1 max-w-[65px] sm:max-w-[130px]`
  - 所持ポイントバッジ: `px-1.5 sm:px-3 py-1 gap-1 sm:gap-1.5`
  - 保護者切替・ログアウトボタン: `p-1.5 sm:px-2.5 sm:py-1`

### 11-2. DailyChart.tsx 変更点
- L333 の `<p className="text-xs text-slate-400">「食事」と「ボーナス」を完全分離！どの分野をどれだけ頑張ったか一目でわかる</p>` を削除。
- L376-L381 のガイドメッセージ `<div ...><span>グラフの日付をタップすると...</span></div>` を削除。
- 凡例バー（Legend Bar）の親コンテナを `flex items-center justify-start sm:justify-end gap-2 sm:gap-3 text-xs font-bold text-slate-300 flex-wrap pt-1` に調整。
- `dayDetailPanelRef` を作成し、日付選択時に `scrollIntoView` を実行。
- ログカードのタイトル（L720付近）:
  `<div className="font-bold text-sm text-slate-100 break-words leading-snug">{log.title_or_menu}</div>`

### 11-3. RivalBoard.tsx 変更点
- 首位 `leader = sortedRivals[0]`、直上の相手 `personAhead = userRankIndex > 0 ? sortedRivals[userRankIndex - 1] : null`。
- 文言条件分岐:
  - 1位: `あなたが現在ランキング 1 位です！👑`
  - 2位: `首位の【{personAhead.name}】まで あと {gapToAhead.toLocaleString()} pt！`
  - 3位以下: `次の順位（{userRankIndex}位）の【{personAhead.name}】まで あと <strong className="text-amber-400 font-mono text-sm">{gapToAhead.toLocaleString()} pt</strong>！（首位【{leader.name}】まで あと {gapToLeader.toLocaleString()} pt）`

## 12. 実装タスクチェックリスト（依存順・1 タスク 1 コミット・完了条件付き）
- [x] T1: Header.tsx のモバイル向けレイアウト調整（タイトル表示領域確保） / 完了条件: `npx tsc --noEmit` exit 0
  → 実装: `src/frontend/components/Header.tsx:L76-L145` / `npx tsc --noEmit` 0 error
- [x] T2: DailyChart.tsx の不要文言削除・スクロール連動・ログタイトル折り返し / 完了条件: `npx tsc --noEmit` exit 0 ＋ `grep -rn "完全分離" src/` ヒット 0 件
  → 実装: `src/frontend/components/DailyChart.tsx:L1, L74, L337, L381, L660, L738` / `npx tsc --noEmit` 0 error / 完全分離 0 hits
- [x] T3: RivalBoard.tsx の順位比較表示ロジック・文言是正 / 完了条件: `npx tsc --noEmit` exit 0
  → 実装: `src/frontend/components/RivalBoard.tsx:L15-L60` / `npx tsc --noEmit` 0 error / 2位・3位以下分岐実装
- [x] T4: 全体ビルドおよび動作検証 / 完了条件: `npm run build` exit 0
  → 検証: `npm run build` exit 0 (built in 1.61s)

## 13. 未確認事項（E-4）
なし。

## 14. 品質ゲート実行結果（G-11）
```
$ ~/antigravity-agents/scripts/verify.sh design
========================================================
 verify.sh  role=design  base=HEAD  repo=game
 HEAD=2b661df  branch=main
========================================================
[PASS] gate-evidence      証跡フォーマット・鮮度・未確認記載の要件を満たしている
--------------------------------------------------------
RESULT: PASS  全ゲート通過（この出力を Artifact に貼付すること）
```

## 15. 改訂履歴（差分改訂 / §2-5）
| 版 | 指摘 # | 変更したセクション | 1 行要約 |
| :-- | :--- | :--- | :--- |
| 初版 | - | 全体 | 初版作成 |
