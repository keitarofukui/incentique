# 調査報告レポート: 「これまでの累積ポイント数」を表示可能にできるか

- 作成日時: 2026-08-22 04:45（実行ホストのローカル時刻。`wrangler` ログファイル名 `wrangler-2026-08-22_04-42-35` より）
- 対象リポジトリ/ブランチ: quest-habit-app / `main`
- 対象コミット: `fc0e530`（`git status --short` は空＝作業ツリーはクリーン）

## 1. 調査目的 & 結論サマリー

- 依頼内容: 「これまでの累積ポイント数を見えるようにしたいのだが可能か？」
- 【実測】結論: **可能。しかも DB スキーマ変更なしで実現できる。**
  累積獲得ポイントは `action_logs.earned_points` の全期間 SUM として**すでに正確に復元可能**であり、
  本番実データで `SUM(earned_points where status='approved') − 承認済み交換の引き落とし = current_points` が
  4 ユーザー中 4 ユーザーで**誤差 0 で一致**することを実測確認した（§2-3）。
- 【実測】現状表示されているのは「累積」ではなく「残高」: `users.current_points` は交換承認時に減算される。
  `src/backend/index.ts:1683`（`UPDATE users SET current_points = current_points - ?`）
- 【実測】追加すべき箇所（最小実装）: `src/backend/index.ts:412-461`（`GET /api/users/:id/summary`）に
  `lifetimeEarnedPoints` を 1 クエリ追加し、`src/frontend/types.ts:104-109`（`UserSummary`）へフィールド追加。

---

## 2. 実測エビデンス（コマンドと生ログ）

### 2-1. 前提の固定

```bash
$ git rev-parse --short HEAD && git branch --show-current && git status --short
fc0e530
main
（git status の出力は 0 行＝クリーン）

$ git log --oneline -5
fc0e530 feat: expand All Category Achievement bonus to 5 categories including Housework (家事)
8d29ee7 feat: replace input rule notice banner with Earn by Housework new feature announcement banner
ec5baed fix: auto-dismiss success toast after 4 seconds and clear on menu select in HouseworkModal
e27ab53 docs: add agent learning and 5 whys analysis report
84c2e28 docs: update test report for API endpoint fix
```

### 2-2. 「累積ポイント」を保持するカラムは存在しない（スキーマ実測）

```bash
$ grep -n "CREATE TABLE IF NOT EXISTS users" -A 20 schema.sql
-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  avatar TEXT DEFAULT '⚡',
  pin_code TEXT DEFAULT '1234',
  current_points INTEGER DEFAULT 0,
  last_action_date TEXT,
  current_streak_days INTEGER DEFAULT 0,
  last_50pt_date TEXT,
  current_50pt_streak_days INTEGER DEFAULT 0,
  last_100pt_date TEXT,
  current_100pt_streak_days INTEGER DEFAULT 0,
  last_300pt_bonus_date TEXT,
  last_500pt_bonus_date TEXT,
  last_1000pt_bonus_date TEXT,
  last_all_category_date TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

$ grep -rn "total_earned\|lifetime\|累積ポイント" src/ schema.sql
（ヒット 0 件）
```

- 【実測】この出力が示す事実: `users` に累積用カラムは無い。保持されているのは残高 `current_points` のみ。
- 【実測】フロントで「累積」という語が使われている唯一の箇所はクイズ正解数であり、ポイントではない。
  ```bash
  $ grep -rn "累積" src/frontend/
  src/frontend/components/Dashboard.tsx:153:  🧠 クイズ累積正解: {quizSuccessCount}問 (+{quizSuccessCount}pt)
  ```

### 2-3. 本番実データでの突き合わせ（残高 = 累積獲得 − 交換引き落とし が成立するか）

`--remote` の D1 直接クエリは認証エラーで実行不可（§7）だったため、**本番 API の実応答**を根拠とした。

```bash
$ curl -i -s "https://quest-habit-app.keitaro-fukui.workers.dev/api/users" | head -3
HTTP/2 200
date: Sat, 22 Aug 2026 04:42:48 GMT
content-type: application/json
（本文抜粋）
"チチ"        current_points: 2705
"あこ"        current_points: 18
"りょーたろ"   current_points: 3021
"シュンタロウ" current_points: 11463
```

```bash
$ # 全ログを取得して earned_points を status 別に合計
$ curl -s ".../api/action-logs?user_id=<各ID>&limit=2000" | python3 -c "...(集計)..."
user_1784697324388_3ofl (チチ)        count: 119  sumAll: 3925  sumApproved: 3805  {'approved': 118, 'pending': 1}
user_1784708761059_4stb (あこ)        count: 17   sumAll: 18    sumApproved: 18    {'approved': 17}
user_1784722928426_3ng3 (りょーたろ)   count: 341  sumAll: 14490 sumApproved: 14490 {'approved': 341}
user_1784723445812_y29a (シュンタロウ) count: 1852 sumAll: 11463 sumApproved: 11463 {'approved': 1852}

$ curl -s ".../api/action-logs?limit=1" | python3 -c "print(...pagination...)"
{'page': 1, 'limit': 1, 'totalCount': 2329, 'totalPages': 2329}
```

```bash
$ # 承認済み交換（approved_points）の合計
$ curl -s ".../api/wish-items" | python3 -c "...(集計)..."
りょーたろ approved_items: 5 spent: 11469
チチ      approved_items: 3 spent: 1100
total wish rows: 9
```

**照合結果（すべて誤差 0 で一致）:**

| ユーザー | 累積獲得(approved) | 交換引き落とし | 差＝理論残高 | 実際の `current_points` | 一致 |
| :--- | ---: | ---: | ---: | ---: | :--: |
| チチ | 3,805 | 1,100 | **2,705** | 2,705 | ✅ |
| あこ | 18 | 0 | **18** | 18 | ✅ |
| りょーたろ | 14,490 | 11,469 | **3,021** | 3,021 | ✅ |
| シュンタロウ | 11,463 | 0 | **11,463** | 11,463 | ✅ |

- 【実測】この出力が示す事実:
  1. **累積獲得ポイントは `action_logs` から完全に再構成できる**（推定ではなく全 4 ユーザーで一致確認済み）。
  2. 集計条件は `status = 'approved'` が正しい。チチの `sumAll(3925) − sumApproved(3805) = 120` の差は
     `pending` 1 件（120pt）であり、この 120pt は `current_points` にも加算されていない。
     つまり `status` で絞らないと **未加算の 120pt を累積に混ぜてしまう**。
  3. データ規模は `action_logs` 全体で 2,329 行、最大ユーザーで 1,852 行。SUM 集計の負荷は無視できる。

### 2-4. 現行 `summary` API の実応答と応答時間

```bash
$ curl -s -w "\n[time_total=%{time_total}s]\n" ".../api/users/user_1784723445812_y29a/summary"
{"success":true,"summary":{"totalPoints":11463,"todayEarnedPoints":0,"quizTotalCount":1785,"todayCategories":{"quiz":false,"study":false,"input_book":false,"training":false,"eat_rice":false}}}
[time_total=0.201891s]
```

- 【実測】`totalPoints` という名前だが**中身は残高**（`current_points`）であり、累積ではない。
  1,852 行のユーザーで既に COUNT/SUM/DISTINCT を 3 本走らせて 0.20 秒。SUM 1 本の追加は許容範囲。

### 2-5. 型チェックの現状（着手前ベースライン）

```bash
$ npx tsc --noEmit
src/frontend/App.tsx(38,50): error TS2304: Cannot find name 'UserSummary'.
src/frontend/App.tsx(39,48): error TS2304: Cannot find name 'DailyStatItem'.
src/frontend/components/DailyChart.tsx(9,16): error TS2304: Cannot find name 'DailyStatItem'.
src/frontend/components/HouseworkModal.tsx(95,13): error TS2353: Object literal may only specify known properties, and 'finalPoints' does not exist in type 'GachaResult'.
src/frontend/components/HouseworkModal.tsx(115,42): error TS2322: Type '{ message: string; onClose: () => void; }' is not assignable to type 'IntrinsicAttributes & SuccessToastProps'.
  Property 'onClose' does not exist on type 'IntrinsicAttributes & SuccessToastProps'.
```

- 【実測】**着手前から 5 件のエラーが存在する**。うち 2 件は今回の対象ファイル `src/frontend/App.tsx` で、
  `UserSummary` / `DailyStatItem` が `types.ts` に定義済みなのに **import されていない**（`src/frontend/App.tsx:2` の
  import 文は `User, WishItem, ActionLog, UserGoal` のみ）ため発生している。
  ```bash
  $ sed -n '2p;38,39p' src/frontend/App.tsx
  import { User, WishItem, ActionLog, UserGoal } from './types';
    const [userSummary, setUserSummary] = useState<UserSummary | null>(null);
    const [dailyStats, setDailyStats] = useState<DailyStatItem[]>([]);
  ```
- 【実測】`UserSummary` を拡張する実装を行う場合、この import 漏れを踏むため**同時に修正が必要**になる。

---

## 3. 該当コードの直接引用

### 3-1. 残高が減算される箇所（＝累積と残高が乖離する原因）

- `src/backend/index.ts:1683-1686`（交換承認）
```ts
      const deduction = await c.env.DB.prepare('UPDATE users SET current_points = current_points - ? WHERE id = ? AND current_points >= ?')
        .bind(deductPoints, wish.user_id, deductPoints)
        .run();
```

- `src/backend/index.ts:1335-1341`（ログ削除時の巻き戻し）
```ts
    if (log.status === 'approved' && log.earned_points > 0) {
      await c.env.DB.prepare(
        'UPDATE users SET current_points = MAX(0, current_points - ?) WHERE id = ?'
      )
        .bind(log.earned_points, log.user_id)
        .run();
    }

    await c.env.DB.prepare('DELETE FROM action_logs WHERE id = ?').bind(id).run();
```

- 【実測】この実装の問題点（累積表示の観点）:
  - 交換承認は `current_points` を減らすだけで、獲得実績（`action_logs`）には触らない。
    よって **`action_logs` 側は「稼いだ総額」の台帳として正しく残っている**（§2-3 で一致確認）。
  - 一方 **ログ削除は行を物理削除する**ため、削除された分は累積からも消える。
    「稼いだ総額」を厳密に不変にしたい場合はここが唯一の穴（§6）。

### 3-2. 累積の集計元になるカラム定義

- `schema.sql:112-121`
```sql
CREATE TABLE IF NOT EXISTS action_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  title_or_menu TEXT NOT NULL,
  review_text TEXT,
  earned_points INTEGER NOT NULL,
  -- ガチャ倍率・ボーナスを含まない素点。1日ボリュームボーナスの判定はこちらを使う
  base_points INTEGER,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

- 【実測】`earned_points` はガチャ倍率適用後の最終付与額（`src/backend/index.ts:1284-1310` で
  `finalEarnedPoints` を `earned_points` に、`basePoints` を `base_points` に格納）。
  ストリーク/ボリュームボーナスも `category='bonus'` の行として `earned_points` に入る
  （`src/backend/index.ts:388-392`）。よって **`SUM(earned_points)` = 実際に付与された総額**で意味が正しい。

### 3-3. 累積を載せる最有力の受け皿

- `src/backend/index.ts:441-458`
```ts
    return c.json({
      success: true,
      summary: {
        totalPoints: user.current_points || 0,
        todayEarnedPoints: todayResult?.total || 0,
        quizTotalCount: quizResult?.total || 0,
        todayCategories,
      }
    });
```
- `src/frontend/types.ts:104-109`
```ts
export interface UserSummary {
  totalPoints: number;
  todayEarnedPoints: number;
  quizTotalCount: number;
  todayCategories: { [key: string]: boolean };
}
```
- 【実測】この API はすでに `App.tsx:141-153` で取得され `Dashboard` → `PersonalStreakCard` へ配られている。
  **配線が既に通っているため、フロント側の新規 fetch は不要。**

---

## 4. 「なぜ今見えていないのか」の分析（なぜなぜ）

- Why1（直接原因）: 画面に出ている数値はすべて `current_points`（残高）である。
  ← 根拠: `src/frontend/components/Header.tsx:118`、`LoginSelectScreen.tsx:85`、`RivalBoard.tsx:91`、
  `ParentPortal.tsx:909`、`ParentMemberDashboardCard.tsx:120`（§5 の全数表を参照）
- Why2: `current_points` は交換承認で減算されるため、稼いだ総額を表さない。
  ← 根拠: `src/backend/index.ts:1683`、実測でりょーたろは累積 14,490 に対し残高 3,021（差 11,469 = 交換額合計）
- Why3: 累積を保持する専用カラム／API フィールドがどこにも存在しない。
  ← 根拠: `grep -rn "total_earned\|lifetime" src/ schema.sql` ヒット 0 件、`PRAGMA` 相当の `schema.sql` 定義（§2-2）
- Why4: API 側の命名が `summary.totalPoints` と「総計」に見えるため、
  累積という別概念が必要だと認識されないまま残高だけが流れている。
  ← 根拠: `src/backend/index.ts:452`（`totalPoints: user.current_points || 0`）
- Why5（根本原因）: **「稼いだ総額（累積）」と「使える残高」という 2 つの概念が分離設計されておらず、
  `current_points` 1 つが両方の役割を兼ねている**。台帳（`action_logs`）には総額が残っているため、
  失われた情報は無く、集計値を 1 つ露出させるだけで解決できる。

---

## 5. 影響範囲（全数）

### 5-1. `current_points` を表示・参照している箇所（`grep -rn "current_points" src/` ヒット **43 件**）

フロント表示のみ抽出（**表示 12 件**）:

| # | ファイル:行 | 影響内容 |
| :-- | :--- | :--- |
| 1 | `src/frontend/components/Header.tsx:118` | ヘッダーのポイントバッジ（累積を併記する最有力候補） |
| 2 | `src/frontend/components/LoginSelectScreen.tsx:85` | ログイン選択画面のユーザーカード |
| 3 | `src/frontend/components/RivalBoard.tsx:15` | ランキングのソートキー（残高順） |
| 4 | `src/frontend/components/RivalBoard.tsx:20` | 上位者との差分計算 |
| 5 | `src/frontend/components/RivalBoard.tsx:91` | ランキング行のポイント表示 |
| 6 | `src/frontend/components/GoalPlannerWidget.tsx:40,43,187` | 目標達成率・残り必要ポイント（残高基準が正しい） |
| 7 | `src/frontend/components/WishlistSection.tsx:47,79,199,281,707-708` | 交換可否判定（残高基準が正しい） |
| 8 | `src/frontend/components/QuizQuest.tsx:150,153` | 正解時の楽観的インクリメント |
| 9 | `src/frontend/components/ParentPortal.tsx:329,900,909` | 保護者ポータルのメンバー一覧 |
| 10 | `src/frontend/components/ParentMemberDashboardCard.tsx:120` | 保護者ダッシュボードのカード |
| 11 | `src/frontend/App.tsx:337-339` | 楽観更新のステート反映 |
| 12 | `src/frontend/types.ts:31` | `User.current_points` 型定義 |

バックエンドの `current_points` 参照（**残高ロジック側。累積追加では変更不要 = 17 箇所**）:
`src/backend/index.ts:380, 404, 417, 452, 531, 537, 563, 879, 912, 925, 1303, 1337, 1447, 1451, 1683, 1697, 1705`

### 5-2. `action_logs` に `earned_points` を書き込む箇所（累積の発生源。全数 **3 箇所**）

| # | ファイル:行 | 内容 |
| :-- | :--- | :--- |
| 1 | `src/backend/index.ts:1289-1310` | `POST /api/action-logs`（トレーニング・インプット・食事・家事） |
| 2 | `src/backend/index.ts:895-908` | `POST /api/quizzes/answer`（クイズ正解 1 件ごと） |
| 3 | `src/backend/index.ts:388-392` | `updateStreaks` 内のボーナス払い出し（`category='bonus'`） |

- 【実測】もし方式 B（`users` に累積カラムを持つ）を採る場合、**この 3 箇所すべてに加算処理の追加が必要**。
  方式 A（SUM 集計）なら 0 箇所（`action_logs` を読むだけ）。

### 5-3. `UserSummary` を拡張した場合の波及（`grep -rn "userSummary\|UserSummary" src/frontend/` ヒット **21 件**）

`src/frontend/types.ts:104`（定義）/ `App.tsx:38,141,147,444`（取得・受け渡し）/
`Dashboard.tsx:2,15,26,47-48,136`（中継・クイズ数表示）/ `PersonalStreakCard.tsx:2,9,18,69-74,93,103,114`（消費）
→ **既存の配線がそのまま使えるため、追加は「型 1 行＋表示 1 箇所」で足りる。**

---

## 6. 二次被害リスク候補（G-7）

| リスク経路 | 実測ヒット箇所 | 想定被害 |
| :--- | :--- | :--- |
| ログ物理削除で累積が減る | `src/backend/index.ts:1326-1348`（`DELETE /api/action-logs/:id` が `DELETE FROM action_logs`） | 保護者が誤投稿ログを消すと「これまでの累積」も減る。SUM 方式では**累積が過去に遡って目減りする**（表示上の不整合として子どもの不信を招く） |
| ユーザー削除で全ログ消滅 | `src/backend/index.ts:550`（`DELETE FROM action_logs WHERE user_id = ?`） | 累積の復元不能。ただし現状仕様どおり |
| `pending` ログの混入 | `src/backend/index.ts:426-428`（`todayEarnedPoints` は `status` で絞っていない） | `status` 未指定で SUM すると**未加算の 120pt が累積に混ざる**（チチで実測。§2-3） |
| `SELECT *` によるカラム露出 | `src/backend/index.ts:1224`（`SELECT action_logs.*` を JOIN で返却）、`1330`（`SELECT * FROM action_logs`）、`1441`/`1652`（`SELECT * FROM wish_items`） | 累積用カラムを `users` に追加する場合は影響なし（`users` は `SELECT *` していない）。ただし `action_logs` は全カラムが公開 API から見えている点は既知の状態 |
| 認証なしの全件取得 API | `GET /api/action-logs`（`src/backend/index.ts:1195`）、`GET /api/users`（`:398`） | 累積値は誰でも取得可能になる（現状も残高・全ログが無認証で取得可能。今回の追加で新たな性質は生じない） |

---

## 7. 未確認事項（E-4）

| 未確認項目 | 確認手段 | ブロッカー理由 |
| :--- | :--- | :--- |
| 本番 D1 の直接クエリ（`PRAGMA table_info(users)` / `SELECT SUM(...)`） | `npx wrangler d1 execute quest-db --remote --command ...` | **実行したが認証エラー**: `The given account is not valid or is not authorized to access this service [code: 7403]`（`wrangler 3.114.17`）。代替として本番 API 実応答で照合済み（§2-3） |
| ローカル D1 の内容 | `wrangler d1 execute --local` | ローカル sqlite は `.wrangler/state/.../*.sqlite` に 2 ファイル存在（最終更新 2026-08-20）だが本番と別データのため照合対象外と判断 |
| `SUM(earned_points)` クエリの実測レイテンシ | 実装後に `curl -w "%{time_total}"` で計測 | 未実装のため測定不能。現状 summary API は 1,852 行ユーザーで 0.20 秒（§2-4） |
| `status` にインデックスが無い影響 | `EXPLAIN QUERY PLAN` | `--remote` 実行不可。既存インデックスは `(user_id, category, created_at)` と `(user_id, created_at DESC)` の 2 本（`schema.sql:123-124`）で、`user_id` 前方一致は効く |
| ~~「累積」の定義（ユーザー意図）~~ → **確定済み（2026-08-22 依頼者回答）** | 依頼者への確認（完了） | **交換したものを含めて「これまでどれくらい稼いだか」を見せる**＝`SUM(earned_points)` ベースで確定。目的はユーザーのモチベーション向上。よって残高（`current_points`）とは別指標として並置する |

### 参考: 調査中に検出した別件の不整合（今回の依頼範囲外・実測）

- `PersonalStreakCard.tsx:72` が `userSummary.todayCategories.housework` を参照しているが、
  バックエンド `src/backend/index.ts:433-439` の `todayCategories` は
  `quiz / study / input_book / training / eat_rice` のみを返し **`housework` キーを返していない**。
  実測: `.../summary` の応答は `{"quiz":false,"study":false,"input_book":false,"training":false,"eat_rice":false}`。
  → 家事は常に未達成として描画される可能性がある。別途調査/修正の対象。

---

## 8. 推奨アクション（方向性のみ・実装はしない）

- [ ] **方式 A（推奨・低リスク）**: `GET /api/users/:id/summary` に
      `SELECT SUM(earned_points) FROM action_logs WHERE user_id = ? AND status = 'approved'` を 1 本追加し、
      `summary.lifetimeEarnedPoints` として返す。DB 変更・マイグレーション不要。
      変更点は `src/backend/index.ts:412-461` と `src/frontend/types.ts:104-109` の 2 ファイル。
      - 副作用: ログ削除で累積が目減りする（§6）。実運用の削除頻度が低ければ許容可能。
- [ ] **方式 B（厳密・高コスト）**: `users.total_earned_points` を追加し、付与 3 箇所（§5-2）で同時加算＋既存データ backfill。
      累積が削除で減らない。ただし `migrations/` ディレクトリが存在せず（`ls -1 migrations/` → no such dir）、
      `schema.sql` は冒頭で `DROP TABLE IF EXISTS action_logs;` 等を実行する破壊的スクリプトのため、
      **本番へ当てるための ALTER TABLE 運用手順を先に決める必要がある**。
- [ ] 表示先の候補（いずれも既存配線で到達可能）: `Header.tsx:118` のバッジに小さく併記 /
      `PersonalStreakCard`（`userSummary` を既に受領済み）/ `Dashboard.tsx:153` 付近のバッジ列。
- [ ] 命名の整理: `summary.totalPoints` は実体が残高のため、累積追加時に
      「残高＝`totalPoints`」「累積＝`lifetimeEarnedPoints`」と用語をコメントで明示する（Why4 の再発防止）。
- [ ] 前提修正: `src/frontend/App.tsx:2` の import に `UserSummary` / `DailyStatItem` を追加（§2-5、既存エラー）。
- [x] 依頼者への確認（完了）: **交換で使った分を含めた「稼いだ総額」を表示する**方針で確定。
      残高を置き換えるのではなく、残高（交換に使える額）と累積（これまでの実績）の**2 指標を並置**する。
      実測例では りょーたろ 累積 14,490pt / 残高 3,021pt（差 11,469pt = 交換済み）、
      チチ 累積 3,805pt / 残高 2,705pt。累積のほうが数値インパクトが大きく、動機づけの目的に合致する。
