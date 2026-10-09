# 調査報告レポート: 3日連続未活動ポイント失効計算のフライング不具合調査

- 作成日時: 2026-10-10 06:15
- 対象リポジトリ/ブランチ: game / main
- 対象コミット: ff81428
- トピック: inactivity-penalty-calculation
- 上流 Artifact: なし（新規調査起点）
- トラック: ライト（ロジック計算の修正およびデータ補正であり、スキーマ・機密フィールド・外部API・認証に触れず、コード差分も200行未満の見込み / §2-6）

## 1. 結論サマリー
- 依頼内容: シュンタロウが３日連続活動なしでポイント引かれているが、10/7まで活動していて今日が10/10なのでまだ２日しか休んでいない。計算間違ってないか？
- 【実測】根本原因（1行断定）: [EV-1] ユーザーの指摘通り計算ロジックが誤っており、カレンダー上の日数差（`10/10 - 10/7 = 3`）をそのまま「未活動日数」として扱っていたため、丸一日未活動で終了した過去日（10/8, 10/9の【2日間】）に加えて当日（10/10）を未活動とフライング判定して所持ポイントの1/3（-11,421pt）を失効させていた。
- 【実測】修正すべき箇所: `src/backend/index.ts:L157-L175`（`checkAndApplyInactivityPenalty` 内の未活動日数計算および失効判定閾値）および `src/backend/index.ts:L558-L578`（`/api/users/:id/summary` の警告日数計算）
- 推奨トラック: ライト（理由: スキーマ変更や外部API、認証には一切触れず、バックエンド内の日数計算式修正とシュンタロウのデータ復元のみで完結するため / §2-6）

## 1-1. 確定済みの前提（下流は再実測しない / §2-5）
| 事実 | 根拠 | 重い実測か |
| :--- | :--- | :--- |
| シュンタロウの最終活動日は2026-10-07（クイズ正解） | [EV-1], [EV-2] | いいえ |
| 2026-10-10 06:04:00 (JST) に -11,421pt の失効が物理適用された | [EV-2] | いいえ |
| シュンタロウの所持ポイントは 34,263pt から 22,842pt に減算されている | [EV-1], [EV-3] | いいえ |
| 本日の論理日付は朝4時基準で正しく `2026-10-10` である | [EV-3] | いいえ |
| ビルド（`npm run build`）および型チェック（`tsc --noEmit`）はエラーなし | [EV-7] | いいえ |
| DBマイグレーションは最新まで適用済み | [EV-8] | いいえ |

## 2. 実測エビデンス

### [EV-1] シュンタロウのユーザーレコード実測（D1 `users` テーブル）
$ npx wrangler d1 execute quest-db --remote --command "SELECT id, name, current_points, last_action_date, inactivity_penalty_stage, last_penalty_date, penalty_base_date FROM users WHERE name LIKE '%シュン%';"
```text
┌─────────────────────────┬──────────────┬────────────────┬──────────────────┬──────────────────────────┬───────────────────┬───────────────────┐
│ id                      │ name         │ current_points │ last_action_date │ inactivity_penalty_stage │ last_penalty_date │ penalty_base_date │
├─────────────────────────┼──────────────┼────────────────┼──────────────────┼──────────────────────────┼───────────────────┼───────────────────┤
│ user_1784723445812_y29a │ シュンタロウ │ 22842          │ 2026-10-07       │ 1                        │ 2026-10-10        │ 2026-10-07        │
└─────────────────────────┴──────────────┴────────────────┴──────────────────┴──────────────────────────┴───────────────────┴───────────────────┘
```
- 【実測】この出力が示す事実: `last_action_date` は `2026-10-07`、`last_penalty_date` は本日 `2026-10-10`、`inactivity_penalty_stage` が `1`（所持ptの1/3失効）にセットされている [EV-1]。

### [EV-2] シュンタロウの直近アクションログ実測（D1 `action_logs` テーブル）
$ npx wrangler d1 execute quest-db --remote --command "SELECT id, user_id, category, title_or_menu, review_text, earned_points, created_at FROM action_logs WHERE user_id = 'user_1784723445812_y29a' ORDER BY created_at DESC LIMIT 3;"
```text
┌──────────────────────────────┬─────────────────────────┬───────────────────┬───────────────────────────────────────────────┬──────────────────────────────────────────────────────────┬───────────────┬─────────────────────┐
│ id                           │ user_id                 │ category          │ title_or_menu                                 │ review_text                                              │ earned_points │ created_at          │
├──────────────────────────────┼─────────────────────────┼───────────────────┼───────────────────────────────────────────────┼──────────────────────────────────────────────────────────┼───────────────┼─────────────────────┤
│ log_decay_1791579840579_1o3z │ user_1784723445812_y29a │ parent_adjustment │ ⚠️ 3日連続未活動によるポイント失効 (-11421pt) │ 3日間連続でポイント獲得がなかったため、所持ポイントの... │ -11421        │ 2026-10-09 21:04:00 │
├──────────────────────────────┼─────────────────────────┼───────────────────┼───────────────────────────────────────────────┼──────────────────────────────────────────────────────────┼───────────────┼─────────────────────┤
│ log_1791377727469_e2hl       │ user_1784723445812_y29a │ quiz              │ 【クイズ正解】社会                            │ 問題: 北海道の名物である「松前漬け」...                  │ 1             │ 2026-10-07 12:55:27 │
└──────────────────────────────┴─────────────────────────┴───────────────────┴───────────────────────────────────────────────┴──────────────────────────────────────────────────────────┴───────────────┴─────────────────────┘
```
- 【実測】この出力が示す事実: 2026-10-09 21:04:00 UTC（日本時間 2026-10-10 06:04:00）に失効ログ `log_decay_1791579840579_1o3z`（-11,421pt）が記録された。前回の活動は 2026-10-07 12:55:27 UTC（日本時間 2026-10-07 21:55:27）である [EV-2]。

### [EV-3] 本番 API 実応答（`/api/users/:id/summary`）
$ curl -i -s "https://quest-habit-app.keitaro-fukui.workers.dev/api/users/user_1784723445812_y29a/summary"
```text
HTTP/2 200 
date: Fri, 09 Oct 2026 21:10:34 GMT
content-type: application/json

{"success":true,"summary":{"totalPoints":22842,"lifetimeEarnedPoints":28302,"spentPoints":5460,"todayEarnedPoints":-11421,"quizTotalCount":2282,"todayCategories":{"quiz":false,"study":false,"input_book":false,"training":false,"housework":false,"eat_rice":false},"inactiveDays":3,"penaltyWarning":{"inactiveDays":3,"daysUntilPenalty":2,"penaltyLabel":"さらに50%失効"}}}
```
- 【実測】この出力が示す事実: 本番APIでも `inactiveDays: 3` と判定され、本日の獲得ポイント `todayEarnedPoints` に失効分の `-11421` が計上されている [EV-3]。

### [EV-4] 日数計算ロジック（`src/backend/index.ts:L124-L129`）
$ sed -n '124,129p' src/backend/index.ts
```ts
function getDaysDifference(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}
```
- 【実測】この出力が示す事実: `date1='2026-10-07'`, `date2='2026-10-10'` のとき、`getDaysDifference` は `3` を返す [EV-4]。

### [EV-5] 失効判定処理（`src/backend/index.ts:L157-L175`）
$ sed -n '157,175p' src/backend/index.ts
```ts
  let baseDate = user.penalty_base_date || '2026-09-18';
  if (user.last_action_date && user.last_action_date > baseDate) {
    baseDate = user.last_action_date;
  }

  if (baseDate >= logicalToday) {
    return { updatedPoints: currentPoints, penaltyApplied: false };
  }

  const inactiveDays = getDaysDifference(baseDate, logicalToday);
  let currentStage = Number(user.inactivity_penalty_stage) || 0;
  let penaltyApplied = false;

  // Stage 1: 3日以上未活動 (所持ptの1/3失効)
  if (inactiveDays >= 3 && currentStage < 1 && currentPoints > 0) {
    const decay = Math.round(currentPoints / 3);
```
- 【実測】この出力が示す事実: `inactiveDays = 3` となった瞬間に `inactiveDays >= 3` が成立し、所持ポイントの1/3が失効する [EV-5]。

### [EV-6] 全ユーザーのステータス実測
$ npx wrangler d1 execute quest-db --remote --command "SELECT id, name, current_points, last_action_date, inactivity_penalty_stage, last_penalty_date, penalty_base_date FROM users;"
```text
┌─────────────────────────┬──────────────┬────────────────┬──────────────────┬──────────────────────────┬───────────────────┬───────────────────┐
│ id                      │ name         │ current_points │ last_action_date │ inactivity_penalty_stage │ last_penalty_date │ penalty_base_date │
├─────────────────────────┼──────────────┼────────────────┼──────────────────┼──────────────────────────┼───────────────────┼───────────────────┤
│ user_1784697324388_3ofl │ チチ         │ 10503          │ 2026-10-09       │ 0                        │ 2026-09-23        │ 2026-10-09        │
│ user_1784708761059_4stb │ あこ         │ 0              │ null             │ 3                        │ 2026-09-28        │ 2026-09-18        │
│ user_1784722928426_3ng3 │ りょーたろ   │ 24016          │ 2026-10-09       │ 0                        │ null              │ 2026-10-09        │
│ user_1784723445812_y29a │ シュンタロウ │ 22842          │ 2026-10-07       │ 1                        │ 2026-10-10        │ 2026-10-07        │
└─────────────────────────┴──────────────┴────────────────┴──────────────────┴──────────────────────────┴───────────────────┴───────────────────┘
```
- 【実測】この出力が示す事実: りょーたろ・チチは 10/09 に活動しており影響なし。シュンタロウのみがフライング失効の被害に遭っている [EV-6]。

### [EV-7] ビルドおよび型検証
$ npm run build && npx tsc --noEmit
```text
✓ built in 1.61s
(tsc --noEmit エラー出力なし)
```
- 【実測】この出力が示す事実: フロントエンド・バックエンドともに型エラー・ビルドエラーは存在しない [EV-7]。

### [EV-8] DB マイグレーション状況
$ npx wrangler d1 migrations list quest-db --remote
```text
✅ No migrations to apply!
```
- 【実測】この出力が示す事実: D1 データベースへのマイグレーションは適用完了している [EV-8]。

## 3. 該当コードの直接引用
`src/backend/index.ts:L166-L174`
```ts
  const inactiveDays = getDaysDifference(baseDate, logicalToday);
  let currentStage = Number(user.inactivity_penalty_stage) || 0;
  let penaltyApplied = false;

  // Stage 1: 3日以上未活動 (所持ptの1/3失効)
  if (inactiveDays >= 3 && currentStage < 1 && currentPoints > 0) {
    const decay = Math.round(currentPoints / 3);
    if (decay > 0) {
      currentPoints = Math.max(0, currentPoints - decay);
```
- 【実測】[EV-4] この実装の問題点: `getDaysDifference('2026-10-07', '2026-10-10')` は `3` を返す。しかし、カレンダー上で丸一日活動がなかった日は「10/8（1日目）」「10/9（2日目）」の【2日間】のみである。本日「10/10」はまだ活動できる日であり、未活動と確定していないにもかかわらず、`inactiveDays >= 3` に合致してしまい、朝一番（06:04）にアクセスした瞬間にフライングで失効が適用されてしまう。

## 4. 根本原因（なぜなぜ）
- Why1: なぜシュンタロウのポイントが本日10/10に引かれたのか？
  ← `checkAndApplyInactivityPenalty` において `inactiveDays >= 3` が成立し、Stage 1（1/3失効）が執行されたため [EV-2, EV-5]。
- Why2: なぜ10/10の朝に `inactiveDays >= 3` になったのか？
  ← `inactiveDays` が `getDaysDifference('2026-10-07', '2026-10-10') = 3` と計算されたため [EV-4, EV-5]。
- Why3: なぜカレンダー差分が 3 なのに「まだ2日しか休んでいない」状態なのか？
  ← 10/7 に活動した後、丸一日未活動で終わった日は「10/8」と「10/9」の【2日間】だけであり、今日「10/10」はまだ進行中の日だから。
- Why4: なぜ今日の分まで未活動日数に含まれてしまったのか？
  ← 変数名は `inactiveDays`（未活動日数）だが、実態は `daysDiff`（最終活動日からの経過日数）を計算していたため。
- Why5（根本原因）:
  ← 「丸一日活動しなかった確定日数」は `daysDiff - 1` であるべきところ、あるいは「3日連続未活動」を判定するなら `daysDiff >= 4`（休んだ日が3日経過した翌日）でなければならないところを、コード上で `daysDiff >= 3` で即失効させていたため、1日フライングして執行されてしまった。

## 5. 影響範囲（全数）
該当ロジックおよび関連するシンボルの検索結果（全 20 件）：
- `checkAndApplyInactivityPenalty`: ヒット 3 件
  - `src/backend/index.ts:L146` (関数定義)
  - `src/backend/index.ts:L527` (`/api/users` 内での一括チェック)
  - `src/backend/index.ts:L554` (`/api/users/:id/summary` 内でのチェック)
- `getDaysDifference`: ヒット 6 件
  - `src/backend/index.ts:L124` (関数定義)
  - `src/backend/index.ts:L166` (失効処理内での日数差分)
  - `src/backend/index.ts:L325` (デイリーストリーク判定: `diff === 1` で継続)
  - `src/backend/index.ts:L371` (50ptストリーク判定)
  - `src/backend/index.ts:L384` (100ptストリーク判定)
  - `src/backend/index.ts:L562` (サマリー警告日数計算)
- `inactivity_penalty_stage`: ヒット 7 件
  - `src/backend/index.ts:L135, L167, L234, L236, L506, L522, L544`
- `penaltyWarning`: ヒット 4 件
  - `src/backend/index.ts:L631`
  - `src/frontend/types.ts:L45`
  - `src/frontend/components/PersonalStreakCard.tsx:L208, L211`

## 6. 二次被害リスク候補（G-7）
| リスク経路 | 実測ヒット箇所 | 想定被害 |
| :--- | :--- | :--- |
| シュンタロウのポイント復元漏れ | D1 `users.current_points` | コード修正だけ行っても、既に減算された 11,421pt が戻らず、Stage 1 のまま放置される |
| 警告バナーの不整合 | `PersonalStreakCard.tsx:L208` | バックエンドの計算式と警告バナーの「あと○日で失効」の整合性が崩れる |
| 本日の獲得ポイント表示の歪み | `summary.todayEarnedPoints` | 誤った失効ログにより本日の獲得ポイントが `-11421` と表示され続ける |

## 7. 否定された仮説（E-5・必須）
| 立てた仮説 | 検証コマンド | 棄却の根拠 |
| :--- | :--- | :--- |
| タイムゾーンのズレでサーバー側が 10/11 と認識したのではないか | `src/backend/index.ts:L110-L122` / API応答 | JST 06:04 の時点で `logicalToday` は正しく `2026-10-10` であった [EV-3] |
| シュンタロウの最終活動日は 10/6 だったのではないか | `npx wrangler d1 execute ... "SELECT ... FROM action_logs"` | 2026-10-07 12:55 UTC (JST 21:55) にクイズ正解ログが存在した [EV-2] |
| フロントの表示上の誤認で、DB上は減算されていないのではないか | `npx wrangler d1 execute ... "SELECT current_points FROM users"` | DBの `current_points` が 22842 に減算され、失効ログも物理 INSERT されていた [EV-1, EV-2] |

## 8. 未確認事項（E-4）
| 未確認項目 | 確認手段 | ブロッカー理由 |
| :--- | :--- | :--- |
| 過去に失効した別ユーザー（あこ等）への過去の影響度 | `action_logs` の全件調査 | 本件はシュンタロウに対する本日のフライング失効の調査であり、過去の全ログ精査は別タスクのため |

## 9. 推奨アクション（方向性のみ・実装しない）
1. **失効判定および警告計算の修正**:
   - 丸一日未活動だった日数 `inactiveDays` の計算式を、カレンダー差分から 1日 引いた `Math.max(0, getDaysDifference(baseDate, logicalToday) - 1)` に改める（または判定条件を `daysDiff >= 4` で3日連続、`>= 6` で5日連続、`>= 11` で10日連続とする）。
   - これにより、10/7活動の場合:
     - 10/8（diff 1）: 0日休み（本日やれば継続）
     - 10/9（diff 2）: 1日休み（本日やればストップ）
     - 10/10（diff 3）: 2日休み（本日やればストップ）
     - 10/11（diff 4）: 3日連続未活動が確定し、ここで初めて失効！
2. **シュンタロウのアカウント救済（データ復元）**:
   - `users.current_points` を `22842 + 11421 = 34263` に復元。
   - `users.inactivity_penalty_stage` を `0` に復元。
   - `users.last_penalty_date` を `null` にリセット。
   - 誤発行された失効ログ `log_decay_1791579840579_1o3z` を削除または取消ログを発行。

## 10. 品質ゲート実行結果（G-11）
```text
$ /Users/fukuikeitaro/antigravity-agents/scripts/verify.sh investigate
========================================================
 verify.sh  role=investigate  base=HEAD  repo=game
 HEAD=ff81428  branch=main
========================================================
[PASS] gate-evidence      証跡フォーマット・鮮度・未確認記載の要件を満たしている
[PASS] gate-coverage      実測 9 件 / カテゴリ網羅 4/4
--------------------------------------------------------
RESULT: PASS  全ゲート通過（この出力を Artifact に貼付すること）
```
