# 機能設計仕様書: 累計獲得ポイントの可視化（表示箇所 1 箇所）

- 作成日時: 2026-08-22 05:20（実行ホストのローカル時刻）
- 対象ブランチ / コミット: `main` / `fc0e530`（`git status --short` 空＝クリーン。上流調査時点と同一 SHA で鮮度 OK）
- 上流 Artifact: `docs/investigation-report.md`（対象コミット: `fc0e530`）
- 依頼者確定事項:
  1. 累計には**交換で使った分も含める**（これまでどれくらい稼いだかを見せ、モチベーション向上につなげる）
  2. **表示は 1 箇所でよい**（ヘッダー / ログイン画面への展開は不要）
  3. **累計でのランキングは不要**（ライバルボードのソート基準は変更しない）

---

## 1. 概要・目的

現状 UI に出ているポイントはすべて `users.current_points`（＝**所持pt / 残高**）であり、交換承認時に減算される
（`src/backend/index.ts:1683`）。そのため「これまで稼いだ総額」が画面のどこにも存在しない。

上流調査で、累計は `action_logs.earned_points`（`status='approved'`）の SUM として**本番実データ 4/4 ユーザーで誤差 0 で復元可能**と実測確認済み。
本設計では**ダッシュボード最上部のヒーローカード 1 箇所**に、累計獲得pt を新規表示する。

| ユーザー | 累計獲得pt（新規表示） | 所持pt（現行表示・変更なし） | 交換に使ったpt |
| :--- | ---: | ---: | ---: |
| りょーたろ | **14,490** | 3,021 | 11,469 |
| シュンタロウ | **11,463** | 11,463 | 0 |
| チチ | **3,805** | 2,705 | 1,100 |
| あこ | **18** | 18 | 0 |

### 1-1. 用語定義（本設計で固定）

| 用語（UI 表記） | 内部名 | 定義 | 減るか |
| :--- | :--- | :--- | :--- |
| **累計獲得pt** | `lifetimeEarnedPoints` | `SUM(action_logs.earned_points) WHERE status='approved'` | 交換では減らない（ログ削除時のみ減る） |
| **所持pt** | `current_points` / `totalPoints` | 交換に使える残高 | 交換承認で減る |
| **交換に使ったpt** | `spentPoints` | `累計獲得pt − 所持pt`（0 未満は 0 にクランプ） | — |

### 1-2. 前回設計からのスコープ削減（依頼者指示による）

| 項目 | 前案 | 本設計 | 影響 |
| :--- | :--- | :--- | :--- |
| 表示箇所 | 4 箇所（ダッシュボード / ヘッダー / ランキング / ログイン画面） | **ダッシュボード 1 箇所のみ** | フロント変更は 1 ファイル |
| `GET /api/users` の拡張 | 全ユーザーの累計を返す | **不要（変更しない）** | バックエンド変更は 1 エンドポイントのみ |
| `User` 型への `lifetime_earned_points` 追加 | 追加 | **不要** | 型変更は `UserSummary` のみ |
| ランキングの累計化 | ソート基準を変更 | **変更しない**（残高順のまま） | `RivalBoard.tsx` のロジック変更なし |

---

## 2. 機能要件 / 非機能要件

### 機能要件
- **FR-1**: `GET /api/users/:id/summary` が `lifetimeEarnedPoints` と `spentPoints` を返す。
- **FR-2**: 累計は `status='approved'` のログのみを集計する。`pending` は所持ptにも加算されていないため除外する
  （実測: チチは `sumAll 3925 − sumApproved 3805 = 120` が pending 1 件）。
- **FR-3**: 累計は「ガチャ倍率適用後の実付与額」を含む（`earned_points` を使う。`base_points` は使わない）。
  ストリーク / ボリューム / 全カテゴリボーナス（`category='bonus'`）も含む。
- **FR-4**: 表示は `PersonalStreakCard`（ダッシュボード最上部）の 1 箇所のみ。他の画面のポイント表示は一切変更しない。
- **FR-5**: 所持ptの表示・交換可否判定・目標達成率・ランキング順は**現行のまま `current_points` を使う**。

### 非機能要件
- **NFR-1（性能）**: `summary` に SUM クエリを 1 本追加するのみ（4 本 → 5 本）。対象は最大 1,852 行。
  現行 `summary` API の実測は 0.20 秒（`time_total=0.201891s`）。
- **NFR-2（劣化耐性）**: 取得に失敗した場合、**累計を 0 と表示してはならない**。未取得として非表示にする（§7）。
- **NFR-3（権限）**: 新規の認証要件は設けない（現行同様 `/summary` は無認証）。
- **NFR-4（整合）**: 画面上で常に `累計獲得pt − 交換に使ったpt = 所持pt` が成立すること。
  `spentPoints` を独立集計せず差分で求めることで、構造的に破れないようにする。

---

## 3. データフロー全経路

| 段 | 内容 |
| :-- | :--- |
| マイグレーション | **不要**（§5。派生集計のためスキーマ不変） |
| SQL | `SELECT COALESCE(SUM(earned_points),0) FROM action_logs WHERE user_id = ? AND status = 'approved'`（§6-3） |
| API レスポンス | `GET /api/users/:id/summary` の `summary` に `lifetimeEarnedPoints` / `spentPoints` を追加（camelCase） |
| TypeScript 型 | `UserSummary.lifetimeEarnedPoints` / `UserSummary.spentPoints`（§6-4） |
| フロント表示 | `src/frontend/components/PersonalStreakCard.tsx` の新規バー 1 箇所（§11） |

**キー命名規則**: `/summary` の既存キーは camelCase（`totalPoints`, `todayEarnedPoints`, `quizTotalCount`）。
新規キーもこれに合わせ、TS 型のプロパティ名と 1:1 で一致させる。`GET /api/users`（snake_case）は本タスクで触らない。

---

## 4. 🛡️ 機密フィールド台帳と漏洩遮断設計（G-7）

| フィールド | 機密度 | 既存の露出経路（実測） | 遮断策 |
| :--- | :--- | :--- | :--- |
| `lifetimeEarnedPoints`（新規・派生値） | 低 | `GET /api/users/:id/summary`（無認証、`src/backend/index.ts:412`） | 遮断不要。元データ `action_logs` は `GET /api/action-logs` が `SELECT action_logs.*`（`:1224`）で全件無認証公開しており、SUM は**既に公開済みの情報から導出可能な値**。新たな機密クラスを生じさせない |
| `spentPoints`（新規・派生値） | 低 | 同上 | 同上。`wish_items` も `GET /api/wish-items` で `approved_points` を公開済み（`:1351`） |
| `pin_code`（既存・高） | **高** | `users` テーブル | 本タスクでは `users` への SELECT を**追加も変更もしない**（既存 `:417` の `SELECT current_points FROM users WHERE id = ?` をそのまま使う）。新規クエリの対象は `action_logs` のみで、`SELECT *` は使わずカラムを明示する |

- 棚卸し結果: `users` を `SELECT *` している箇所は **0 件**（`grep -n "SELECT \* FROM users" src/backend/index.ts` → ヒット 0）。
  本設計は `users` のカラム構成にも SELECT 句にも触れないため、`pin_code` 露出リスクの増加は **0**。
- ログ出力: 新規に `console.log` でポイント値を出力しない。エラー時は `console.error` にメッセージのみ（§7）。

---

## 5. 🗄️ DB マイグレーション DDL（G-4）

### 結論: **マイグレーションは不要**

累計は `action_logs` から誤差 0 で復元可能（上流調査 §2-3 で本番 4/4 ユーザー一致）。`schema.sql` / テーブル定義に一切変更を加えない。

**この判断の決定的理由**: 本リポジトリには `migrations/` ディレクトリが存在せず（`ls -1 migrations/` → `no such directory`）、
`schema.sql` は冒頭で `DROP TABLE IF EXISTS action_logs;` / `DROP TABLE IF EXISTS users;` を実行する**破壊的スクリプト**（`schema.sql:1-7`）。
本番へカラム追加を当てる安全な導線が未整備であり、スキーマ変更を伴わない方式が最もリスクが低い。

（参考: カウンタ列方式を採る場合の DDL は §8「却下 1」に記載。今回は実施しない）

---

## 6. API 契約

### 6-1. 契約表

| メソッド | パス（完全一致） | リクエスト | 成功レスポンス | エラー |
| :--- | :--- | :--- | :--- | :--- |
| GET | `/api/users/:id/summary` | なし | `200 { success:true, summary:{ totalPoints, lifetimeEarnedPoints, spentPoints, todayEarnedPoints, quizTotalCount, todayCategories } }` | `404 { success:false, error:'User not found' }` / `500 { success:false, error }` |

- **新規エンドポイントは追加しない**（既存 1 本のレスポンス拡張のみ）。よって新規 API パス文字列の定数化対象は無い。
- 既存のパス文字列 `/api/users/${userId}/summary`（`src/frontend/App.tsx:143`）も**変更しない**ため、タイポ由来 404 の新規リスクは無い。
- **`GET /api/users` は変更しない**（前案から削除）。

### 6-2. レスポンス JSON 実例（実測値ベース。実装後にこの値と一致すること）

```jsonc
// GET /api/users/user_1784722928426_3ng3/summary  （りょーたろ）
{
  "success": true,
  "summary": {
    "totalPoints": 3021,             // 既存キー・意味変更なし（所持pt = current_points）
    "lifetimeEarnedPoints": 14490,   // ★新規: 累計獲得pt
    "spentPoints": 11469,            // ★新規: 交換に使ったpt = 14490 - 3021
    "todayEarnedPoints": 0,
    "quizTotalCount": 1785,
    "todayCategories": { "quiz": false, "study": false, "input_book": false, "training": false, "eat_rice": false }
  }
}
```

### 6-3. 追加するクエリ全文（`src/backend/index.ts:417-440` の既存クエリ群の直後に 1 本追加）

```sql
SELECT COALESCE(SUM(earned_points), 0) AS lifetime
FROM action_logs
WHERE user_id = ? AND status = 'approved';
```

- `SELECT *` は使わない。集計カラムのみを返す。
- `spentPoints` は**独立集計しない**。`Math.max(0, lifetime - (user.current_points || 0))` で算出する。
  理由: `wish_items.approved_points` から別途 SUM すると 2 系統の集計が食い違い得る。差分で求めれば
  `累計 − 使用 = 所持` が構造的に常に成立する（NFR-4）。
  実測では両者は一致する（りょーたろ: `14490-3021=11469` = 承認済み交換合計 11,469 / チチ: `3805-2705=1100` = 1,100）。
- 【実測】同型の SQL をローカル sqlite（読み取り専用 `mode=ro&immutable=1`）で実行検証済み:
  ```bash
  $ sqlite3 "file:<local d1>?mode=ro&immutable=1" \
      "SELECT u.id, u.current_points, COALESCE(l.t,0) FROM users u LEFT JOIN (SELECT user_id, SUM(earned_points) t FROM action_logs WHERE status='approved' GROUP BY user_id) l ON l.user_id=u.id;"
  user_1785881367635_cya8|1100|1500
  ```
  （ローカル DB は本番と別データ・全 2 行だが、`status` 絞り込みと `COALESCE` が期待どおり動くことを確認）

### 6-4. TypeScript 型（キー名は API と 1:1）

```ts
// src/frontend/types.ts — UserSummary を差し替え
export interface UserSummary {
  /** 所持pt（= users.current_points）。既存キー名・意味は変更しない */
  totalPoints: number;
  /** 累計獲得pt。status='approved' の action_logs.earned_points 合計。交換では減らない */
  lifetimeEarnedPoints: number;
  /** 交換に使ったpt = lifetimeEarnedPoints - totalPoints（0 未満は 0 にクランプ） */
  spentPoints: number;
  todayEarnedPoints: number;
  quizTotalCount: number;
  todayCategories: { [key: string]: boolean };
}
```

- `User` 型は**変更しない**（前案の `lifetime_earned_points` は不要になった）。
- **必須の付随修正**: `src/frontend/App.tsx:2` の import に `UserSummary` / `DailyStatItem` を追加し、
  `src/frontend/components/DailyChart.tsx` にも `DailyStatItem` の import を追加する。
  着手前から以下 3 件が `npx tsc --noEmit` で失敗しており（実測）、型を触る本タスクの完了判定を妨げる:
  ```
  src/frontend/App.tsx(38,50): error TS2304: Cannot find name 'UserSummary'.
  src/frontend/App.tsx(39,48): error TS2304: Cannot find name 'DailyStatItem'.
  src/frontend/components/DailyChart.tsx(9,16): error TS2304: Cannot find name 'DailyStatItem'.
  ```

---

## 7. 🙈 エラーハンドリング仕様（G-5）

対象は `GET /api/users/:id/summary` の 1 本のみ（呼び出し元: `src/frontend/App.tsx:141-153`）。

| 状態 | 条件 | UI 挙動 | ログ出力 |
| :--- | :--- | :--- | :--- |
| 成功 | `200` かつ `success:true` | 累計バーを表示 | なし |
| ユーザー不在 | `404` | 累計バーを**非表示**。既存の所持pt表示・本日サマリーは維持 | `console.error('summary 404', userId)` |
| サーバーエラー | `500` | 累計バーを**非表示**（`0 pt` と描画しない） | `console.error` にレスポンスの `error` 文字列 |
| 通信断 | `fetch` reject | 同上・非表示 | `console.error('Failed to fetch user summary', err)`（既存 `App.tsx:151` の挙動を踏襲） |
| タイムアウト | 応答なし | 未取得（`undefined`）のまま。ダッシュボードの他ブロックの描画をブロックしない | 同上 |

**実装規則**:
1. `userSummary?.lifetimeEarnedPoints` が `number` でない間は**バー全体を描画しない**。
   **`0` にフォールバックしてはならない**（NFR-2）。「今まで稼いだ額が 0」は最も強い逆モチベーションになるため。
2. `?? 0` のようなデフォルト値付与を JSX 内で行わない。`typeof x === 'number'` で分岐する。
3. 表示専用機能なので成功トースト等は一切出さない。

---

## 8. 🏛️ アーキテクチャ選定（G-8）

### 採用: 台帳からの派生集計（Derived Aggregate）
`action_logs` を唯一の真実の源とし、累計は `/summary` 呼び出し時に `SUM` する。

**採用理由**
1. **単一の真実の源を増やさない。** 累計は `action_logs` の関数として定義され、定義上ズレが発生しない。
2. **スキーマ変更ゼロ。** `migrations/` が未整備で `schema.sql` が破壊的な現状（§5）で、本番 ALTER の導線を新設せずに済む。
3. **書き込み経路を増やさない。** ポイント付与は 3 箇所（`src/backend/index.ts:1289-1310` / `895-908` / `388-392`）に分散しており、
   カウンタ方式ではこの全てに加算漏れリスクが生じる。
4. **コスト実測が許容内。** 対象は最大 1,852 行（NFR-1）。

### 却下 1: `users.total_earned_points` カウンタ列
```sql
-- 却下案。実装しない
ALTER TABLE users ADD COLUMN total_earned_points INTEGER NOT NULL DEFAULT 0;
UPDATE users SET total_earned_points = COALESCE((
  SELECT SUM(earned_points) FROM action_logs
  WHERE action_logs.user_id = users.id AND action_logs.status = 'approved'), 0);
```
- 却下理由: 付与 3 箇所すべてに加算を追加する必要があり（加算漏れ＝**永久にズレたまま気づけない**）、
  削除経路（`:1326-1348`）とユーザー削除（`:550`）でも整合を取る必要がある。
  カウンタが台帳とズレた場合、モチベーション目的の数値としてむしろ有害。加えて本番 ALTER の導線が未整備（§5）。
- 【将来の再検討条件】`action_logs` が 10 万行規模に達し `/summary` が 500ms を超えた場合に再評価する。
  現状 2,329 行（全体）では時期尚早。

### 却下 2: フロントで `actionLogs` から集計する
- 却下理由: `src/frontend/App.tsx:169` の取得は `fetch('/api/action-logs?limit=500')` で**500 件上限**。
  実測でシュンタロウは 1,852 件あり、**フロント集計は確実に過小値になる**（11,463pt が数千ptに見える）。
  数値の正しさが機能の存在意義そのものなので不可。

### 却下 3: `summary.totalPoints` の意味を累計に変更する
- 却下理由: `totalPoints` は現在 `current_points`（残高）として扱われており、意味を変えると
  `GoalPlannerWidget` の達成率や `WishlistSection` の交換可否と齟齬が出る。**既存キーの意味は変えず、新キーを足す。**

### 却下 4: `GET /api/users` にも累計を載せる（前案）
- 却下理由: 依頼者指示により表示は 1 箇所・ランキングは累計化しないと確定したため、全ユーザー分の累計は**用途が無い**。
  用途の無いフィールドを無認証 API に増やさない（G-7 の観点でも露出面を広げない）。

### LLM 使用
本機能では LLM を使用しない。（参考: 本リポジトリの既定モデルは `wrangler.toml` の `GEMINI_MODEL = "gemini-3.1-flash-lite"`、G-10）

---

## 9. 🧪 受け入れ基準（検証コマンド付き）

- [x] **AC-1**: `summary` が実測値どおりの累計を返す — 検証:
  ```bash
  curl -s "https://quest-habit-app.keitaro-fukui.workers.dev/api/users/user_1784722928426_3ng3/summary"
  # => lifetimeEarnedPoints == 14490, spentPoints == 11469, totalPoints == 3021
  ```
  - → 実測(本番/2026-08-22): `lifetimeEarnedPoints:14490, spentPoints:11469, totalPoints:3021` 一致
- [x] **AC-2**: `pending` を混ぜていない — 検証:
  ```bash
  curl -s ".../api/users/user_1784697324388_3ofl/summary"
  # => lifetimeEarnedPoints == 3805（3925 ではない。差 120 は pending 1 件）
  ```
  - → 実測(本番): チチ `3805`（3925 ではない＝pending 120pt を除外できている）
- [x] **AC-3**: 4 ユーザー全員で恒等式 `累計 − 交換 = 所持` が成立 — 検証:
  ```bash
  for u in user_1784697324388_3ofl user_1784708761059_4stb user_1784722928426_3ng3 user_1784723445812_y29a; do
    curl -s ".../api/users/$u/summary" | python3 -c "import sys,json;s=json.load(sys.stdin)['summary'];print(s['lifetimeEarnedPoints'], s['spentPoints'], s['totalPoints'], s['lifetimeEarnedPoints']-s['spentPoints']==s['totalPoints'])"
  done
  # => 3805 1100 2705 True / 18 0 18 True / 14490 11469 3021 True / 11463 0 11463 True
  ```
  - → 実測(本番): 4/4 ユーザーで恒等式 True（3805-1100=2705 / 18-0=18 / 14490-11469=3021 / 11463-0=11463）
- [x] **AC-4**: 404 が壊れていない — 検証: `curl -i -s ".../api/users/no_such_user/summary"` が `404` かつ `{"success":false,"error":"User not found"}`
  - → 実測(本番): `HTTP/2 404` + `{"success":false,"error":"User not found"}`
- [x] **AC-5**: `GET /api/users` のレスポンスが**変化していない** — 検証:
  ```bash
  curl -s ".../api/users" | python3 -c "import sys,json;print(sorted(json.load(sys.stdin)['users'][0].keys()))"
  # => 変更前と同一のキー集合（lifetime_earned_points が増えていないこと）。pin_code も含まれないこと
  ```
  - → 実測(本番): キー数 16・`lifetime_earned_points` 未追加・`pin_code` なし
- [x] **AC-6**: 型エラー — 検証:
  ```bash
  npx tsc --noEmit
  # => App.tsx / DailyChart.tsx の TS2304 3 件が消えていること。
  #    HouseworkModal.tsx の既存 2 件（finalPoints / onClose）は本タスク範囲外として残置可（§10 BL-2）
  ```
  - → 実測: `npx tsc --noEmit` が **0 エラー**（BL-2 の HouseworkModal 2 件も併せて解消）
- [x] **AC-7**: 異常系で `0 pt` を描画しない — 検証: DevTools の Network で `/summary` を Block してダッシュボードを再読み込みし、
  累計バーが**非表示**であること（`0 pt` と出たら不合格）。本日サマリー等の既存表示は維持されること。
  - → 実測(ローカル/隔離 headless Chrome): `*/summary` 遮断時 `{bar:false, showsZeroPt:false, 本日バーは残存}`
- [x] **AC-8**: 実画面確認 — りょーたろでログインし、ダッシュボード最上部で
  **「累計 14,490pt / 交換に使った 11,469pt / いま使える 3,021pt」**が視認できること（本機能の目的そのもの）。
  併せてシュンタロウ（累計＝所持＝11,463）で 3 値が矛盾なく出ること。
  - → 実測(本番実画面 390px/1280px): `{bar:true, 14,490pt / 11,469pt / 3,021pt すべて描画}`・横スクロールなし・「🎖️1万pt達成」チップ表示
- [x] **AC-9**: 他画面の非回帰 — ライバルボードのランキング順・「通算ポイント」の数値、
  交換所の交換可否、目標達成率が**変更前と同一**であること（`RivalBoard` / `WishlistSection` / `GoalPlannerWidget` に変更を入れていないことをコミット差分で確認）。
  - → 実測: `git diff` で RivalBoard はラベル 1 行のみ変更（ソート `:15` / 値 `:91` 未変更）。WishlistSection / GoalPlannerWidget / Header / LoginSelectScreen / QuizQuest は変更 0 件
- [x] **AC-10**: 性能劣化なし — 検証:
  ```bash
  curl -s -o /dev/null -w "%{time_total}\n" ".../api/users/user_1784723445812_y29a/summary"
  # => 変更前の実測 0.20s に対し 0.5s 未満
  ```

---

## 10. 📋 前提条件・ブロッカー

- **BL-1**: 表示箇所は **`PersonalStreakCard`（ダッシュボード最上部）1 箇所**とする。
  選定理由は §11-2。ここは `userSummary` を既に props で受け取っており（`PersonalStreakCard.tsx:9,18`）、
  新規の props 配線も fetch も不要なため、1 箇所に絞る指示と最も相性が良い。
  【推定】依頼者が「1 箇所」としてヘッダーを想定していた場合は表示先の差し替えが必要。
  確認方法: §11-2 のモックを見て「ダッシュボードで良いか」を回答してもらう。**バックエンド側の設計は表示先が変わっても不変。**
- **BL-2**: `HouseworkModal.tsx` の既存型エラー 2 件（`finalPoints` / `onClose`）は本機能と無関係のため範囲外。
  `npx tsc --noEmit` を完全にゼロにしたい場合は別タスクが必要。
- **BL-3【推定】**: 本番 D1 への直接クエリは認証エラー（`code: 7403`）で実行できていない。
  よって検証はすべて**本番 API 経由**で行う。確認方法: `npx wrangler login` 済みアカウントで
  `npx wrangler d1 execute quest-db --remote --command "SELECT COUNT(*) FROM action_logs;"` が通れば DB 直検証も追加可能。
- **BL-4【推定】**: 本番の `action_logs` に `idx_action_logs_user_date` が実在するかは未確認
  （ローカル sqlite には PK 自動インデックスのみで、`EXPLAIN QUERY PLAN` は `SCAN action_logs` を返したが、
  ローカルは 2 行しかなく本番の代表値にならない）。現規模ではフルスキャンでも問題なく、実装のブロッカーではない。
  確認方法: BL-3 解消後に `SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='action_logs';`
- **BL-5（合意事項）**: ログ削除（`DELETE /api/action-logs/:id`、`src/backend/index.ts:1326-1348`）を行うと累計も減る。
  これは所持ptも同時に減る現行仕様と整合しており「誤記録の取り消し」として意味的に正しい。
  ただし保護者が削除運用を多用する場合はカウンタ方式の再検討が必要。

---

## 11. UI / コンポーネント設計 — **表示は 1 箇所**

### 11-0. 重複表示の事前点検（grep 実測）

```bash
$ grep -rn "累計\|通算\|累積" src/frontend/
src/frontend/components/Dashboard.tsx:153: 🧠 クイズ累積正解: {quizSuccessCount}問   ← 正解数。ポイントではない
src/frontend/components/RivalBoard.tsx:89:  通算ポイント                              ← ★実体は残高（ラベル誤り）
```
- 【実測】「累計ポイント」を名乗る UI は現状 **1 つも無い**（重複表示は発生しない）。
- 【実測】ただし `RivalBoard.tsx:89` は残高に「通算ポイント」というラベルを付けている。
  ランキングの累計化は不要との指示なので**ロジックは変更しない**が、
  ダッシュボードに「累計」が登場すると**同じアプリ内で「通算」と「累計」が別物を指す**状態になる。
  → **ラベル文字列のみ「通算ポイント」→「所持pt」に直す**（表示値・ソート・レイアウトは不変）。
  §12 の T4 として独立させ、不要なら単独でスキップできるようにする。

### 11-1. 配色（既存パレット参照・新規色を発明しない）

| 用途 | 使う既存トークン | 出典 |
| :--- | :--- | :--- |
| 累計獲得pt（主役） | `text-amber-300` / `border-amber-500/40` / `bg-gradient-to-r from-amber-500/20 to-orange-500/20` / `shadow-glow-gold` | `PersonalStreakCard.tsx:176`（本日獲得合計チップと同一）・`tailwind.config.js` の `glow-gold` |
| 交換に使ったpt（副） | `text-slate-400` / `bg-slate-950/80` / `border-slate-800` | `PersonalStreakCard.tsx:170-173` |
| いま使えるpt（副） | `text-amber-400` | `Header.tsx:118`（既存の所持pt色と統一） |
| バー地 | `bg-slate-900/90` + `border border-slate-800` + `rounded-2xl` | `PersonalStreakCard.tsx:162`（本日サマリーバーと同一） |

### 11-2. 挿入位置（唯一の表示箇所）

- **ファイル**: `src/frontend/components/PersonalStreakCard.tsx`
- **挿入行**: 既存「📊 本日の獲得成果サマリー」バー（`:162-181`）の**直後** ／ `{/* Header Row */}`（`:183`）の直前。
- **選定理由**:
  1. ダッシュボードの BLOCK 1（`Dashboard.tsx:135-140`）で最初に目に入る個人ヒーローカードである。
  2. `userSummary` を**既に props で受け取っている**（`:9,18`）ため、新規 props 配線・新規 fetch が不要。
  3. すぐ上に「本日の獲得」があるため、**「今日」→「これまで」の時間軸の対比**として自然に読める。
- **単一責任の担保**: 既存バーは「本日」、新規バーは「これまで」。時間軸が違うので同一バーに混ぜず、別バーとして上下に並べる。
  また他者比較（ランキング）とは別画面のままで、混在させない。

```
┌─ PersonalStreakCard（ダッシュボード最上部 / 唯一の表示箇所）──────────────┐
│ 📊 本日の獲得成果サマリー  [⚡実力素点 +0pt][🎁ボーナス +0pt][🏆本日合計 +0pt] │ ←既存(:162-181)
│                                                                          │
│ 🏆 これまでの累計獲得                                                     │ ←★新規（ここだけ）
│   ┌────────────────────┬──────────────────┬──────────────────┐         │
│   │ 💰 累計獲得          │ 🎁 交換に使った   │ 👛 いま使える      │         │
│   │   14,490 pt         │   11,469 pt      │    3,021 pt      │         │
│   │ text-lg/amber-300   │ text-xs/slate    │ text-xs/amber-400│         │
│   └────────────────────┴──────────────────┴──────────────────┘         │
│                                                                          │
│ 🔥 ダッシュボード [✅今日は記録済み]                    [ルール解説 →]     │ ←既存(:183-)
│ [🔥デイリー][💥中級][⚡神級]                                              │
└──────────────────────────────────────────────────────────────────────────┘
```

- **ラベル文言（簡潔・直感優先）**: `💰 累計獲得` / `🎁 交換に使った` / `👛 いま使える`。
  「生涯獲得ポイント総額」等の長い語は使わない。
- **視覚的優先度**: 累計を最大サイズ（`text-lg font-mono font-black text-amber-300`）にし、
  他 2 値は `text-xs`。**このカード内で最も大きい数字が累計になる**ようにする（目的＝モチベーション向上）。
- **レスポンシブ**: 既存バーと同じ `flex flex-col sm:flex-row items-center justify-between gap-3` 構造を使い、
  モバイルでは縦積みにする。**ヘッダーには何も足さないため、モバイル幅の衝突リスクは発生しない**（前案から削減した利点）。
- **節目演出（任意・過剰にしない）**: 累計が 10,000 / 50,000 / 100,000 を超えている場合のみ
  `🎖️ 1万pt達成` の小チップをバー右端に出す。新規 keyframes は追加せず、既存 `animate-pulse` のみ使用可。
- **データ源**: `userSummary.lifetimeEarnedPoints` / `spentPoints` / `totalPoints`。
  `undefined` のときはバー全体を描画しない（§7-1）。

### 11-3. 意図的に**変更しない**箇所

| 箇所 | 理由 |
| :--- | :--- |
| `Header.tsx:109-121`（ポイントバッジ） | 表示は 1 箇所との指示。加えてモバイル幅でブランド名と衝突するリスクを避けられる |
| `RivalBoard.tsx:15,20,88-92`（ランキング） | **累計ランキングは不要との指示**。ソート・差分・表示値は残高のまま（ラベル文字列のみ T4 で修正） |
| `LoginSelectScreen.tsx:82-87` | 表示は 1 箇所との指示 |
| `GoalPlannerWidget.tsx:40,43,187` | 目標達成率は「使える残高」で測るのが正しい |
| `WishlistSection.tsx:47,79,199,281,707` | 交換可否判定。残高でなければならない |
| `QuizQuest.tsx:150,153` | 正解時の楽観加算。残高の即時反映用 |
| `ParentPortal.tsx` / `ParentMemberDashboardCard.tsx` | 保護者は「あと何pt引けるか」を見る画面。本タスク対象外 |

---

## 12. 実装タスクチェックリスト（依存順・1 タスク 1 コミット）

  - → 実測(本番): 1,852 行ユーザーで `0.217s`（変更前 0.201s、0.5s 未満）
- [x] **T1: 型定義の追加と既存 import 漏れの修正**
  - `src/frontend/types.ts` の `UserSummary` に `lifetimeEarnedPoints` / `spentPoints` を追加（§6-4 の全文どおり）
  - `src/frontend/App.tsx:2` の import に `UserSummary, DailyStatItem` を追加、`DailyChart.tsx` にも `DailyStatItem` の import を追加
  - `User` 型は変更しない
  - 完了条件: `npx tsc --noEmit` の出力から TS2304 3 件が消えていること（AC-6）
  - → 実装: `src/frontend/types.ts:103-118` / `App.tsx:2` / `DailyChart.tsx:2`。`npx tsc --noEmit` の TS2304 3 件が消滅（残 2 件は BL-2 の既存分）
- [x] **T2: バックエンド `GET /api/users/:id/summary` の拡張**
  - §6-3 のクエリを 1 本追加し、`lifetimeEarnedPoints` と `spentPoints = Math.max(0, lifetime - (user.current_points || 0))` を返す
  - `GET /api/users` には手を入れない
  - 完了条件: AC-1 / AC-2 / AC-3 / AC-4 / AC-5 / AC-10 が通ること
  - → 実装: `src/backend/index.ts:435-453`（集計クエリ）/ `:468-476`（レスポンス）。ローカル実測 `{"totalPoints":1100,"lifetimeEarnedPoints":1500,"spentPoints":400}` で恒等式成立。404 は `{"success":false,"error":"User not found"}` を維持。`/api/users` のキー集合は不変・`pin_code` なし。応答 0.0068s
  - → 本番実データでの AC-1/AC-2/AC-3 はデプロイ後に実行（未実施）
- [x] **T3: フロント表示（`PersonalStreakCard` の累計バー・唯一の表示箇所）**
  - §11-2 のブロックを `:181` の直後に挿入。`typeof … === 'number'` で分岐し `?? 0` は使わない
  - 完了条件: AC-7（`/summary` を Block して `0 pt` が出ない）＋ AC-8（りょーたろで 14,490 / 11,469 / 3,021 が視認）
  - → 実装: `src/frontend/components/PersonalStreakCard.tsx:154-172`（値算出）/ `:183-215`（バー本体）
  - → 実画面実測（隔離 headless Chrome + CDP、ローカルD1）: 正常時 `{bar:true, 1,500pt/400pt/1,100pt すべて描画}`、`*/summary` 遮断時 `{bar:false, showsZeroPt:false, 本日バーは残存}`。390px / 1280px 幅ともに横スクロール発生なし（scrollW==innerW）
- [x] **T4: `RivalBoard` のラベル文字列のみ修正（任意・独立）**
  - `src/frontend/components/RivalBoard.tsx:89` の `通算ポイント` → `所持pt`。**値・ソート・レイアウトは一切変更しない**
  - 完了条件: AC-9（ランキング順と数値が変更前と同一）かつ画面に「通算」の語が残っていないこと
  - スキップ可: 用語衝突を許容する場合は本タスクを実施しない
  - → 実装: `src/frontend/components/RivalBoard.tsx:89` の 1 行のみ（`git diff` で 1 行 +/- を確認。ソート `:15` と値 `:91` は未変更）
  - → 残存: `ParentPortal.tsx:413`（説明文の「通算ポイント」）と `ParentMemberDashboardCard.tsx:117`（「通算所持ポイント」）は設計スコープ外のため未修正
- [x] **T5-a: 【設計逸脱・実測により追加】初回ロード時の summary 取得**
  - 実測で判明した事実: `fetchUserSummary` の呼び出し元は `handleActionSuccess`（記録直後）**のみ**で、
    ログイン直後は `userSummary` が null。よって設計 §11-2 の「props 配線済みだから表示できる」という前提が成立していなかった
    （実画面検証 1 回目で累計バーが描画されず発覚。`hasBarLabel:false`）
  - 対応: `src/frontend/App.tsx:258-267` の既存 `useEffect([currentUser?.id])` に `fetchUserSummary(currentUser.id)` を追加
  - 副作用（改善）: `Dashboard.tsx:47` のクイズ累計正解数が、500 件上限のフロント集計ではなくサーバー集計値を使うようになる
  - → 実装後の実画面実測: 累計バーが描画されることを確認（上記 T3 の実測ログ）
- [x] **T5-b: 【設計逸脱・回帰防止のため必須】`todayCategories` に `housework` を追加**
  - 実測で判明した事実: `PersonalStreakCard.tsx:72` は `userSummary.todayCategories.housework` を読むが、
    バックエンド `:456-462` はこのキーを返していない（実測 `{"quiz":false,"study":false,"input_book":false,"training":false,"eat_rice":false}`）
  - T5-a により `userSummary` が初回から入るため、**放置すると家事が常に未達成表示になる回帰**が発生する
  - 対応: `src/backend/index.ts:460-462` に `housework: categoryList.includes('housework')` を追加
- [x] **T5: 検証**
  - 完了条件: AC-1〜AC-10 をすべて実行して記録（`docs/test-report.md` はテストAgentの担当）
  - → AC-1〜AC-10 すべて実測合格。本番デプロイ済み（Version ID: `deb1a3be-3403-447b-b39d-1d9e005473c8`）
- [x] **T6: 【追加依頼】既存バグ 3 件の修正**
  - `PersonalStreakCard.tsx:453,476` の「/ 4 カテゴリ」「全4カテゴリ」を `categories.length` 由来に変更（実測: 本番画面で「達成: 1 / 5 カテゴリ」）
  - `ParentPortal.tsx:413` / `ParentMemberDashboardCard.tsx:117` の「通算」表記を「所持pt」に修正（`grep -rn 通算 src/` → 0 件）
  - `ParentMemberDashboardCard.tsx` に家事カテゴリの集計とタイルを追加し「/ 5 カテゴリ」に統一
  - `HouseworkModal.tsx:95,115` の型エラー 2 件を解消（`finalPoints`→`finalEarnedPoints`、`menuTitle`→`actionTitle`、存在しない `onClose` prop を削除）
  - 完了条件: `npx tsc --noEmit` が 0 エラー — → 実測合格
