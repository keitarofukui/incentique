# 機能設計仕様書: 保護者画面におけるメンバー別ポイント・連続日数ダッシュボード

## 1. 概要・目的
保護者画面（管理者ポータル）において、登録されている全メンバー（子ども）のポイント獲得状況（通算・本日の獲得ポイント）、3種類の連続達成日数（通常連続活動日数、50pt達成連続日数、100pt達成連続日数）、本日のアクティビティ達成状態、未承認ウィッシュリクエストの有無を一目で参照・把握できる専用ダッシュボード画面を提供する。

---

## 2. 機能要件 & データ構造

### 2.1. 全行程データフロー (Data Flow)
```
[SQLite DB: users & action_logs]
      │
      ▼
[Backend APIs: GET /api/users, GET /api/action-logs]
      │
      ▼
[Frontend: ParentPortal.tsx]
      │
      ├── [本日日付判定 & 連続日数失効補正 (dateUtils.ts)]
      ├── [ActionLogsから本日の獲得pt・完了カテゴリ集計]
      │
      ▼
[ParentMemberDashboardCard (メンバーカード UI)]
```

### 2.2. データソース & 保持フィールド
- **ユーザーデータ (`User`)**:
  - `id`, `name`, `avatar`, `grade_level`
  - `current_points`: 通算所持ポイント
  - `last_action_date` / `current_streak_days`: 最終活動日 / アクション連続日数
  - `last_50pt_date` / `current_50pt_streak_days`: 最終50pt達成日 / 50pt連続日数
  - `last_100pt_date` / `current_100pt_streak_days`: 最終100pt達成日 / 100pt連続日数
- **ログデータ (`ActionLog[]`)**:
  - 本日の論理日付（朝4時切り替え `todayLocalDateStr()`）と一致する `created_at` を持つログから以下を集計：
    - `todayTotalPoints`: 本日の獲得ポイント合計
    - `todayBasePoints`: 本日の素点（ボーナス除外）
    - `todayBonusPoints`: 本日のボーナスポイント
    - `todayCategories`: 各カテゴリ（クイズ/インプット/運動/食事）の達成フラグ

### 2.3. 連続日数の動的補正仕様
- 本日の論理日付 `todayStr` と最終活動日 `lastDate` の日数差 `diffDays` を計算。
- `diffDays <= 1`（今日または昨日活動あり）の場合: 保存されている連続日数を採用。
- `diffDays >= 2`（2日以上未活動）の場合: `0日` （ストリーク失効状態）として動的補正。

---

## 3. UI / コンポーネント設計

### 3.1. 保護者ポータルのサブタブ構成拡張 (`ParentPortal.tsx`)
`activeSubTab` 型を拡張し、最優先タブとして `dashboard` を追加。
- `dashboard`: 📊 メンバーダッシュボード（新設）
- `requests_logs`: 🎁 リクエスト & 履歴
- `users_training`: 👥 ユーザー & 運動管理
- `point_rules`: ⚙️ ポイント獲得ルール
- `settings`: 🛡 保護者設定

### 3.2. コンポーネント構成 (`ParentMemberDashboardCard.tsx`)
各メンバーにつき1つのカード（グリッド配置: PC 2列 / スマホ 1列）を生成。

---

## 4. 実装タスクチェックリスト

- [x] **タスク1**: `ParentMemberDashboardCard.tsx` コンポーネントの新規作成（連続日数補正、本日pt集計、達成カテゴリ表示、デザイン適用）
- [x] **タスク2**: `ParentPortal.tsx` に `dashboard` サブタブを追加し、デフォルト表示サブタブとして統合
- [x] **タスク3**: ダッシュボードカードからのアクション連携（該当ユーザーフィルターをセットして「リクエスト & 履歴」タブへスムーズ遷移）の実装
- [x] **タスク4**: レスポンシブレイアウト・スタイルおよび動作確認
