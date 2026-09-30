# 設計レビュー結果レポート

- 作成日時: 2026-09-30 19:21
- 対象リポジトリ/ブランチ: game / main
- 対象コミット: 2c17559
- 上流 Artifact: docs/design-spec.md（対象コミット: 2c17559）
- **判定: REVISION_REQUIRED**（無条件差し戻し条件 #4・#9 に該当。指摘は §6・§7 追加と §4 の文言確定の差分改訂で解消可能）

## 確定済みの前提

- 本番URL は 200 応答（設計書 §3 の証跡。本レビューは UI 文言の設計審査で本番応答に依存しないため再測しない）
- HEAD は 2c17559（本レビューでも [EV-R1] で再確認）

## 0. 上流の抜き取り再実測（§2-3）

鮮度: 上流の対象コミット 2c17559 = 現在 HEAD 2c17559 のため差分なし（§2-2）。

### [EV-R1] 上流 [EV-2] の再実行 — 一致
$ git rev-parse --short HEAD
2c17559

### [EV-R2] 上流 [EV-3] の再実行（抜粋）— 一致
$ sed -n '734,765p' src/frontend/components/DailyChart.tsx
…(22 行省略)
                          <p className="text-xs text-slate-300 mt-1.5 bg-slate-950/70 p-2 rounded-xl border border-slate-800/80 italic line-clamp-2">
                            "{log.review_text}"
…(7 行省略)

### [EV-R3] 上流 [EV-4] の再実行（抜粋）— 一致
$ sed -n '150,160p' src/frontend/components/Dashboard.tsx
…(3 行省略)
              <span>主な活動成果（読書・運動・インプット）</span>
…(3 行省略)
                🧠 クイズ累積正解: {quizSuccessCount}問 (+{quizSuccessCount}pt)
…(3 行省略)

### [EV-R4] 上流 [EV-5] の再実行（抜粋）— 一致
$ sed -n '312,315p' src/frontend/components/PersonalStreakCard.tsx
            <span className="text-xs font-black text-indigo-300 flex items-center gap-1">
              <span>🔥 デイリー</span>
              <span className="text-xs font-normal text-slate-400">(1pt+)</span>
            </span>

【実測】上流の証跡 4 件はすべて再現した [EV-R1][EV-R2][EV-R3][EV-R4]。

## 1. 無条件差し戻し条件の判定（全 11 項目・未判定禁止）

| # | 条件 | 判定 | 根拠（設計書の該当箇所を引用） |
| :-- | :--- | :--- | :--- |
| 1 | DB スキーマ変更と migration | PASS（該当なし） | §5「既存の API や DB は一切無変更」 |
| 2 | 機密フィールド台帳 | PASS（該当なし） | §5「表示要素の削除・整理のみで新規フィールド追加なし」 |
| 3 | 4xx/5xx/通信断時の挙動 | PASS（該当なし） | §5「ロジックの例外ハンドリングには触れない」。新規 API 呼び出しなし |
| 4 | 受け入れ基準と検証コマンド | **FAIL** | §6 は「`npx tsc --noEmit` でエラー0件」「`npm run build` が正常終了すること」の 2 項目のみ。これは条件文の例示「ビルドが通ること等の抽象表現」そのもので、各文言削除を確かめる `grep` 等の受け入れ基準が無い。UI 差分なのに G-13 の実画面検証（操作/観測/Console）計画も無い |
| 5 | 回避策と却下理由 | PASS | 回避策（any・setTimeout 等）の採用なし。Tailwind クラスと文言の変更のみ |
| 6 | API 契約と TS 型 | PASS（該当なし） | 新規 API・型の追加なし（§5） |
| 7 | キー名一致・パス集約 | PASS（該当なし） | 新規 API なし |
| 8 | 未確定前提のブロッカー明示 | PASS | 外部 API・認証・権限に依存しない。§3-1「未確認事項: なし」 |
| 9 | タスク分解・完了条件 | **FAIL** | 設計書にタスク分解節が無い。§4-1〜4-4 は変更内容の列挙のみで、タスクごとの完了条件（検証コマンド）が無い |
| 10 | LLM モデル既定 | PASS（該当なし） | LLM / Gemini API を使わない |
| 11 | 上流調査との整合 | PASS | 上流は「なし（直接設計）」。`docs/investigation-report.md` は別件（対象 2b661df）。§3 に自前の実測証跡があり、[EV-R2][EV-R3][EV-R4] で再現を確認済み |

## 2. 内容妥当性レビュー

- **要件網羅性**: §1-1 の 3 課題（詳細ログ幅・活動成果見出し・（）の削減）は §4 に対応する変更がある。
  ただし §1-1 ③ で例示された「（70%還元）」の重複は §4 に対応する変更が無く、目的と改修内容がずれている（指摘 #6）。
- **情報の欠落**: 「見れば自明な注釈」の削除方針のうち、次の 2 つは自明ではない情報を消してしまう（指摘 #3・#4）。
  - `midThreshold` / `godThreshold` は `rulePoints` から読む**設定値**で（`PersonalStreakCard.tsx:L49-L51`）、
    達成後はその値が画面の他の場所に出ない（未達時だけ「素点あと Npt」が出る L360-L367）[EV-R6]。
  - L442 の括弧は、節目で得られる `+{upcomingMilestone * dailyMultiplier}pt` という**報酬額**を唯一表示している箇所である。
- **実装容易性**: 「`line-clamp-4` または制限解除」「数値はバー下に簡潔配置」「1箇所に集約・整理」「自然にレイアウト」などの
  二択や曖昧な書き方が残っており、製造者が推測で決めることになる（指摘 #5・#7・#8）。
- **設計の前提と実態の不一致**: §4-4「重複する『※保護者が…』注意書き」とあるが、この文言は 1 件しか無い [EV-R7]。
  `現金還元 (7掛け)` は L326（カードバッジ）と L496（申請モーダルのボタン）の 2 箇所にあるが、どちらを変えるかの記載が無い [EV-R8]。
- **連続入力 UX 方針（メモリ）**: 記録画面・登録後の遷移・トーストには触れていないので関係しない。
- **データ構造・拡張性**: DB・API の変更が無いので該当しない。

## 3. 指摘事項 & 改善提案（引用必須）

| # | 重大度 | 該当箇所 | 指摘 | 修正案（仕様断片） |
| :-- | :--- | :--- | :--- | :--- |
| 1 | **高（差し戻し #4）** | §6 検証計画 | tsc/build だけで受け入れ基準が無い | §6 に AC を追加: `grep -n "（読書・運動・インプット）" src/frontend/components/Dashboard.tsx` が 0 件、`grep -n "(1pt+)\|({midThreshold}pt+)\|({godThreshold}pt+)" PersonalStreakCard.tsx` が 0 件、`grep -n "（全{selectedDayLogs.length}件）" DailyChart.tsx` が 0 件、`grep -n "自動算出" GoalPlannerWidget.tsx` が 0 件 など、§4 の変更 1 件ごとに 1 行 |
| 2 | **高（G-13）** | §6 検証計画 | UI 差分なのに実画面検証の計画が無い（`gate-uiverify` の対象） | §6 に「幅 375px のブラウザで ①グラフの日をタップし問題文が 4 行まで（または全文）読める ②ホームの『主な活動成果』見出しが 1〜2 行に収まる ③ストリークカード・目標・交換所を表示し Console にエラーが無い、を `操作:`/`観測:`/`Console:` で記録」を追加。CDP 9222 は使わず別ポートと隔離プロファイルを使う旨も書く |
| 3 | **高（差し戻し #9）** | 設計書全体 | タスク分解と完了条件が無い | §7「タスク分解」を新設: T1 DailyChart（完了条件: AC の該当 grep＋tsc）→ T2 Dashboard → T3 PersonalStreakCard → T4 GoalPlanner/Wishlist → T5 build と実画面検証。各タスクに完了条件を 1 行ずつ付ける |
| 4 | 中 | §4-3 ストリーク区分ヘッダー | `{midThreshold}pt+` / `{godThreshold}pt+` は設定で変わる基準値で、消すと達成後に基準が分からなくなる | 括弧だけ外して値を残す: `💥 中級` の右に `<span className="text-[0.625rem] text-slate-500">{midThreshold}pt+</span>`（神も同様）。消すなら「基準値を画面に出さない」ことを判断として明記する |
| 5 | 中 | §4-3 行動喚起バー（L442） | 「次の節目まであとN日」だけにすると、節目の報酬 `+Npt` が消える。置き換え後の文字列も確定していない | 置き換え後の JSX を確定する。例: `· あと{upcomingMilestone - streakIfRecorded}日で +{(upcomingMilestone * dailyMultiplier).toLocaleString()}pt`。L452 は `（積み上げた{streakDaily}日が消滅）` の span を削除、と明記 |
| 6 | 中 | §1-1 ③ と §4-4 | 目的に「（70%還元）等の（）書き」とあるが、`Dashboard.tsx:L122` `(7掛け/70%還元)`、`WishlistSection.tsx:L136/L239/L505/L508/L581` が対象か対象外か書かれていない [EV-R8] | §4-4 に対象行を列挙する（例: L326・L496 は `現金還元` にする、L239・L505 のルール説明は 70% を明示する場所なので残す）。§1-1 ③ の例示もそれに合わせる |
| 7 | 中 | §4-4 WishlistSection | 「重複する注意書き」は実在しない（1 件のみ）。「数値はバー下に簡潔配置」も具体的でない | 注意書きの件は削除するか、L431 を残すと明記する。達成度は `<span>{progress}%</span>` とし、バー下に `<div className="text-right text-[0.625rem] text-slate-500 font-mono">{currentPoints.toLocaleString()} / {item.required_points.toLocaleString()} pt</div>` を置く、のようにクラスまで書く |
| 8 | 低 | §4-1 本文領域 | 「`line-clamp-4` または制限解除」の二択が残っている | どちらか 1 つに決める（推奨: 制限解除。親の `max-h-80 overflow-y-auto` が L723 にあり、長文でもスクロールで読めるため） |
| 9 | 低 | §4-2 ログリスト行 | 「右端上部に配置」「`flex-wrap` と `gap-2` を整理」がクラス単位で書かれていない | L178 の行コンテナを `items-center` から `items-start` に、L150 の見出しラッパーを `flex flex-wrap items-center gap-2` に、と書く |
| 10 | 低 | §2 確定済みの前提 | 「React + Vite + Tailwind CSS [EV-3]」の根拠 EV-3 は DailyChart の sed で、Vite の証拠にならない | 根拠を `package.json` の該当行に差し替えるか、記述を削る |

## 4. 実測による前提検証（読み取り専用）

### [EV-R5] §4 の変更対象文言が実在するか
$ grep -n "獲得アクション一覧" src/frontend/components/DailyChart.tsx
726:                <span>獲得アクション一覧（全{selectedDayLogs.length}件）</span>
$ grep -n "自動算出\|目標を設定しよう\|p-6" src/frontend/components/GoalPlannerWidget.tsx
91:    <div className="glass-card p-6 rounded-3xl border border-amber-500/30 space-y-6 shadow-2xl relative overflow-hidden">
126:            <p className="text-xs text-slate-400">期間までの残り日数から、1日あたり必要な頑張りペースを自動算出！</p>
150:          <div className="text-base font-black text-amber-300 truncate">{targetTitle || '未設定 (目標を設定しよう)'}</div>
245:          <div className="glass-card w-full max-w-md rounded-3xl p-5 sm:p-6 border border-amber-500/40 shadow-2xl space-y-4 max-h-[88vh] overflow-y-auto scrollbar-none">

【実測】§4-1・§4-4 の対象文言は実在する。GoalPlanner の `p-6` は L91 と L245（モーダル）の 2 件あり、§4-4 が変えるのは L91 だけと読めるが明記は無い（指摘 #9 と同じ種類の曖昧さ）[EV-R5]。

### [EV-R6] ストリーク基準値が設定値であること
$ grep -n "midThreshold\|godThreshold" src/frontend/components/PersonalStreakCard.tsx
49:  const midThreshold = Number.isFinite(rulePoints.streak_mid_threshold) ? rulePoints.streak_mid_threshold : 100;
51:  const godThreshold = Number.isFinite(rulePoints.streak_god_threshold) ? rulePoints.streak_god_threshold : 250;
…(3 行省略)
350:              <span className="text-xs font-normal text-slate-400">({midThreshold}pt+)</span>
360:              {todayBase >= midThreshold ? (
367:                  素点あと <span className="font-mono text-rose-300 font-black">{(midThreshold - todayBase).toLocaleString()}pt</span>
…(6 行省略)
394:              <span className="text-xs font-normal text-slate-400">({godThreshold}pt+)</span>
…(6 行省略)

【実測】基準値の表示は L350・L394 の括弧だけで、未達のときは L367/L411 の「あと Npt」が出る [EV-R6]。

### [EV-R7] 「重複する注意書き」の件数
$ grep -c "保護者が現金・物品を手渡した時" src/frontend/components/WishlistSection.tsx
1

【実測】1 件しか無く、§4-4 の「重複する」という前提は実態と合わない [EV-R7]。

### [EV-R8] 70%還元・7掛け表記の分布
$ grep -rn "70%" src/frontend/components/ | head
src/frontend/components/Dashboard.tsx:122:                交換所で <strong className="text-emerald-300 font-bold">「💵 現金還元 (7掛け/70%還元)」</strong> を選んで申請できます！貯めたポイントをお小遣いに還元しよう！
src/frontend/components/WishlistSection.tsx:239:            💵 現金還元は「7掛け (70%還元)」でお小遣い化！
src/frontend/components/WishlistSection.tsx:248:              <div className="text-xs text-slate-400">物品（100%換算）または現金還元（70%換算）を選択して申請。</div>
…(4 行省略)
src/frontend/components/ParentPortal.tsx:557:                          <span>手渡す現金（70%還元）:</span>
$ grep -n "現金還元 (7掛け)" src/frontend/components/WishlistSection.tsx
326:                          <Banknote className="w-3 h-3" /> 現金還元 (7掛け)
496:                    <span>💵 現金還元 (7掛け)</span>

【実測】70% の表記は 3 ファイルに分かれている。`現金還元 (7掛け)` は 2 箇所あり、§4-4 はどちらを変えるか書いていない [EV-R8]。

## 5. 否定された仮説（E-5）

- 仮説「§4-2 の `glass-card p-6` は存在しない」→ 棄却。`Dashboard.tsx:L148` `<div className="glass-card p-6 rounded-2xl space-y-4">` として実在する（grep で確認）。
- 仮説「記録画面の連続入力方針（登録後に画面を初期化・下部トースト）とぶつかる」→ 棄却。対象の 5 ファイルに記録フォームの送信処理は無く、§4 は表示文言とクラスだけを変える。

## 6. 未確認事項（E-4）

- 設計者が §1-1 の根拠とした実機スクリーンショット（「問題文が 160px 前後」「3 行に折り返す」）は Artifact に添付されていない。幅の数値は【推定】扱い。確定方法: 製造後の G-13 実画面検証で幅 375px のときの折り返しを観測すること（指摘 #2）。
- 想定差分（80〜150 行）がライトトラックの上限 200 行に収まるかは、製造後の `gate-track` で機械的に判定される。

## 7. 品質ゲート実行結果（G-11）

注: プロジェクト直下に `scripts/verify.sh` は無い（`./scripts/verify.sh` は exit 127: no such file）。前回レビューと同じ共有ゲート `~/antigravity-agents/scripts/verify.sh` で実行した。途中の 1 回目は gate-evidence FAIL 2 件（確定済みの前提節の upstream 引用記法をこのゲート版が受け付けない／【推定】の確定方法の語が無い）だったため、本文を直して再実行した。

```
$ ~/antigravity-agents/scripts/verify.sh design-review
========================================================
 verify.sh  role=design-review  base=HEAD  repo=game
 HEAD=2c17559  branch=main
========================================================
[PASS] gate-evidence      証跡フォーマット・鮮度・未確認記載の要件を満たしている
--------------------------------------------------------
RESULT: PASS  全ゲート通過（この出力を Artifact に貼付すること）
```
