# 設計仕様書: 将来のデータ量増大に耐える集計分離アーキテクチャ & クイズ無限出題の再設計

## 1. 概要 & 再設計の背景

### 課題の根本原因
従来の実装では、フロントエンド（`App.tsx`）が `GET /api/action-logs` を呼んで全ログをメモリ内に取得し、クライアント側で「クイズ累積正解数」「本日の達成カテゴリ」「過去30日間のカテゴリ別グラフ」などを手元で集計・計算していました。

そのため、ログを全件取ろうとするとログ件数の増大に伴い通信量・メモリ・DB走査コストが肥大化し、逆に `LIMIT 50` などの制限を設けると「50件を超えた時点で過去ログが押し出され、画面の集計や表示が壊れる」というジレンマに陥っていました。

### 本再設計のゴール
将来ログが数万〜数十万件に増大しても、**通信量は常に数KB以下・DB応答速度数ミリ秒以下** を維持し、画面表示が一切破綻しない**「バックエンド集計分離（CQRS思考）アーキテクチャ」** へ全面的に再設計します。

---

## 2. システムアーキテクチャ & 改修設計方針

```mermaid
graph TD
    subgraph Frontend [フロントエンド (React)]
        Dashboard[Dashboard / PersonalStreakCard]
        Chart[DailyChart (過去30日グラフ)]
        Quiz[QuizQuest (クイズ画面)]
    end

    subgraph Backend [バックエンド (Hono / Cloudflare Workers)]
        SummaryAPI["GET /api/users/:id/summary<br/>(サマリー集計API: ~200B)"]
        DailyStatsAPI["GET /api/users/:id/daily-stats<br/>(日次集計API: ~2KB)"]
        LogsAPI["GET /api/action-logs?user_id=X&limit=20<br/>(タイムライン表示専用: 最新20件)"]
        QuizAPI["GET /api/quizzes<br/>(先行プレフェッチ機能)"]
    end

    subgraph Database [Cloudflare D1 Database]
        DB[(action_logs / users)<br/>※複合インデックス適用]
    end

    Dashboard --> SummaryAPI
    Chart --> DailyStatsAPI
    Dashboard --> LogsAPI
    Quiz --> QuizAPI
    SummaryAPI --> DB
    DailyStatsAPI --> DB
    LogsAPI --> DB
```

---

## 3. 詳細仕様設計

### 方針①: バックエンド集計専用APIの新設（クライアント集計の完全廃止）

フロントエンドで `actionLogs` 全件を保持して集計する処理を完全に廃止し、以下の2つの集計専用エンドポイントをバックエンドに新設します。

#### 1. `GET /api/users/:id/summary` (ダッシュボード・サマリー集計API)
ダッシュボードやマイページが必要とする統計情報をDBの高速SQL集計で一括返却します。
- **レスポンス構造**:
  ```json
  {
    "success": true,
    "summary": {
      "totalPoints": 5064,
      "todayEarnedPoints": 130,
      "quizTotalCount": 385,
      "todayCategories": {
        "quiz": true,
        "study": false,
        "input_book": true,
        "training": false,
        "eat_rice": true
      }
    }
  }
  ```
- **SQLクエリ**:
  - `quizTotalCount`: `SELECT COUNT(*) FROM action_logs WHERE user_id = ? AND category = 'quiz'`
  - `todayCategories`: `SELECT DISTINCT category FROM action_logs WHERE user_id = ? AND date(datetime(created_at, '+5 hours')) = ?`
- **パフォーマンス**: ログが10万件になってもインデックス走査により **応答時間 < 5ms、通信量 < 300 Bytes**。

#### 2. `GET /api/users/:id/daily-stats?days=30` (日次グラフ専用集計API)
`DailyChart.tsx` の積み上げエリアグラフ描画用に、過去N日間の日別・カテゴリ別ポイント合計をバックエンドで `GROUP BY` 集計して返却します。
- **レスポンス構造**:
  ```json
  {
    "success": true,
    "dailyStats": [
      {
        "dateStr": "2026-08-14",
        "quiz": 130,
        "input": 50,
        "training": 0,
        "meal": 100,
        "bonus": 0,
        "total": 280
      }
    ]
  }
  ```
- **SQLクエリ**:
  ```sql
  SELECT 
    date(datetime(created_at, '+5 hours')) as jst_date,
    category,
    SUM(earned_points) as points
  FROM action_logs
  WHERE user_id = ? AND created_at >= date('now', '-30 days')
  GROUP BY jst_date, category
  ```
- **パフォーマンス**: ログ件数に関わらず返却データは **最大30件の配列（約2KB）** に固定。

#### 3. `GET /api/action-logs` の役割限定（タイムライン表示専用化）
- `GET /api/action-logs` は集計目的ではなく、画面下の「直近の行動履歴タイムライン」表示専用に変更。
- デフォルト件数は `limit=20`（ページネーション対応）とし、無駄なログ全件取得を完全に廃止。

---

### 方針②: `QuizQuest.tsx` の先行プレフェッチ (Prefetching) アーキテクチャ

48問の1バッチ終了時に通信遅延が発生する問題を解決するため、**バックグラウンドプレフェッチ機構**を導入します。

1. **残り5問でのプレフェッチ発火**:
   - `currentIndex` が `quizzes.length - 5` （例: 43問目）に達した時点で、裏で自動的に次バッチの `GET /api/quizzes` をフェッチ開始し、`nextBatchBuffer` 状態に保持。
2. **シームレスなバッチ切り替え**:
   - 48問目が終わって「次の問題へ」を押した瞬間、待ち時間ゼロで `nextBatchBuffer` の問題群に即座に切り替え (`setQuizzes(nextBatchBuffer); setCurrentIndex(0);`)。
3. **二重発火・競合ガード**:
   - `isPrefetching` フラグにより、複数回のリクエスト発火を完全にガード。

---

### 方針③: データベース複合インデックスの適用 (`schema.sql`)

データ量が今後100万件規模に増大しても高速レスポンスを維持するため、以下の最適化インデックスを定義します。

```sql
-- ユーザーごとのカテゴリ別・日付別高速集計用インデックス
CREATE INDEX IF NOT EXISTS idx_action_logs_user_cat_date 
  ON action_logs (user_id, category, created_at);

-- ユーザーごとの日付範囲検索・タイムライン用インデックス
CREATE INDEX IF NOT EXISTS idx_action_logs_user_date 
  ON action_logs (user_id, created_at DESC);
```

---

## 4. タスク分解チェックリスト (製造・テスト用)

- [x] **Task 1: D1 データベース複合インデックスの適用 (`schema.sql` / マイグレーション)**
  - `idx_action_logs_user_cat_date` および `idx_action_logs_user_date` を追加。
- [x] **Task 2: バックエンド集計専用APIの実装 (`src/backend/index.ts`)**
  - `GET /api/users/:id/summary` の実装（クイズ総正解数・本日獲得pt・本日達成カテゴリを一括返却）。
  - `GET /api/users/:id/daily-stats` の実装（過去30日の日別・カテゴリ別 `GROUP BY` 集計）。
- [x] **Task 3: フロントエンド集計ロジックのバックエンド移行 (`src/frontend/App.tsx`, `Dashboard.tsx`, `DailyChart.tsx`, `PersonalStreakCard.tsx`)**
  - `App.tsx` で全ログ取得を廃止し、サマリーAPIおよび日次集計APIを呼ぶよう変更。
  - `DailyChart.tsx` を `dailyStats` 応答に接続。
  - `PersonalStreakCard.tsx` を `summary.todayCategories` に接続。
- [x] **Task 4: `QuizQuest.tsx` プレフェッチ（先行取得）シームレスバッチの実装 (`src/frontend/components/QuizQuest.tsx`)**
  - 残り5問での `nextBatchBuffer` プレフェッチ処理とシームレス切り替えの実装。
- [x] **Task 5: ビルド確認 & パフォーマンス検証**
  - `npm run build` でエラー0件を確認。
  - 大量データ時でも通信サイズ < 5KB、応答速度 < 50ms であることを検証。
