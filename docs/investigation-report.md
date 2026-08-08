# 調査報告レポート: 「りょうたろうが全部0日になった」原因特定調査

## 1. 調査目的 & 概要
「りょうたろう」（ユーザー）の連続日数がすべて0日と表示されてしまう現象の原因を、バックエンドAPIエンドポイントおよびフロントエンドのデータ取得処理から調査・特定する。

---

## 2. 調査結果・ファクト（事実）

### 原因: **バックエンド API (`GET /api/users` & `GET /api/rivals`) の SQL SELECT クエリで `current_streak_days` カラムを取得していなかったため**

#### 詳細分析:
- バックエンドの `src/backend/index.ts` における `GET /api/users` および `GET /api/rivals` エンドポイントの SQL クエリ：
  ```sql
  -- 現状のクエリ (Line 430 & Line 455)
  SELECT id, name, grade_level, avatar, current_points FROM users
  ```
- **不具合発生のメカニズム**:
  1. APIレスポンスに DB内の `current_streak_days`, `current_50pt_streak_days`, `current_100pt_streak_days` カラムが含まれていませんでした。
  2. その結果、フロントエンドの `currentUser` や `users` オブジェクトの `current_streak_days` プロパティが常に `undefined` になっていました。
  3. UI側で `currentUser.current_streak_days || 0` と評価されたため、DB内に連続データが存在する場合でも全ユーザー画面で「0日連続」と表示されていました。

---

## 3. 解決策

1. **バックエンド API クエリの修正 (`src/backend/index.ts`)**:
   - `GET /api/users`, `GET /api/users/:id`, `GET /api/rivals` の SELECT 文に `current_streak_days`, `current_50pt_streak_days`, `current_100pt_streak_days`, `last_action_date`, `last_50pt_date`, `last_100pt_date` を追加。
2. **連続日数の即時更新・保守ロジック (`updateStreaks`)**:
   - アクションログに基づき、最新の論理日付との差分で切れ目を判定して最新数値を返すロジックを確定。

---

## 4. 今後の推奨アクション
本不具合を解消するため、設計Agent (`/architect` または `設計:`) にて API の SELECT クエリ修正およびデータ疎通の設計を作成することを推奨いたします。
