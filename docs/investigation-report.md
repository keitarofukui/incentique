# 調査報告レポート: 保護者画面におけるメンバー別ポイント・連続日数ダッシュボード表示

## 1. 調査目的 & 概要
保護者画面（管理者ポータル）において、メンバー（子ども）ごとの所持ポイント数、各種連続達成日数（連続アクション日数、50pt達成連続、100pt達成連続）、本日の獲得ポイントや活動状況を一発で閲覧・把握できるダッシュボード画面の提供に向け、現状のフロントエンド・バックエンドのデータ構造および実装状態を調査・分析しました。

---

## 2. 現状のコード構造・ファクト（事実）

### 2.1. 保護者画面の現行構成 (`src/frontend/components/ParentPortal.tsx`)
- **ヘッダー部**: [`ParentPortal.tsx`](file:///Users/fukuikeitaro/Documents/game/src/frontend/components/ParentPortal.tsx#L314-L322) の `Quick User summary badge` にて、メンバーごとの「アバター」「名前」「通算ポイント（`current_points`）」を横スクロールバッジで簡易表示しているのみ。
- **サブタブ構成**:
  1. `🎁 リクエスト & 履歴` (`requests_logs`)
  2. `👥 ユーザー & 運動管理` (`users_training`)
  3. `⚙️ ポイント獲得ルール` (`point_rules`)
  4. `🛡 保護者設定` (`settings`)
- **課題**: メンバーそれぞれの連続日数（連続ログイン・50pt達成連続・100pt達成連続）や、本日の獲得ポイント・当日の学習/運動達成状況を一目で閲覧できる専用画面・カードが存在しない。

### 2.2. データモデルの保持状況 (`src/frontend/types.ts`)
- [`User` インターフェース](file:///Users/fukuikeitaro/Documents/game/src/frontend/types.ts#L17-L36) には、ダッシュボード表示に必要なデータフィールドが既にすべて保持されています。
  - `current_points`: 通算所持ポイント
  - `last_action_date` / `current_streak_days`: 最終活動日・連続活動日数
  - `last_50pt_date` / `current_50pt_streak_days`: 最終50pt達成日・50pt達成連続日数
  - `last_100pt_date` / `current_100pt_streak_days`: 最終100pt達成日・100pt達成連続日数
  - `last_300pt_bonus_date` / `last_500pt_bonus_date` / `last_1000pt_bonus_date`: ボリュームボーナス達成状況

### 2.3. 連続日数の動的補正ロジック (`PersonalStreakCard.tsx` / `RivalPulse.tsx`)
- DBに保存されている `current_streak_days` 等は過去の最終活動時点の数値であるため、最終活動日から2日以上離れている場合（`getLogicalDaysDiff(last_date) >= 2`）は、画面表示時に動的に `0日` （失効）として扱う補正ロジックが既存コンポーネント（[`PersonalStreakCard.tsx`](file:///Users/fukuikeitaro/Documents/game/src/frontend/components/PersonalStreakCard.tsx#L127-L138)）で実装済みです。

---

## 3. 分析・効果・影響範囲

### 3.1. 実装における実現性
- **バックエンドAPI改修不要**:
  保護者画面は既に `users` 一覧（`GET /api/users`）および `actionLogs` 一覧（`GET /api/action-logs`）を取得・管理しているため、既存のAPIとデータモデルのみでダッシュボード表示を完全完遂できます。

### 3.2. 期待される効果
- **保護者の利便性向上**: 子どもの日々の頑張り（本日のポイント、ストリーク維持状況、未承認リクエスト有無）が保護者画面を開いた瞬間に一目で分かります。
- **モチベーション管理**: 連続日数が途切れそうなメンバーや、ポイント獲得が順調なメンバーをリアルタイムで把握しやすくなります。

### 3.3. 影響範囲
- `ParentPortal.tsx` 内のサブタブメニュー構成およびダッシュボード表示用カードコンポーネントの追加。
- 既存機能（リクエスト承認、マスター設定、PIN設定等）への破壊的変更はありません。

---

## 4. 今後の推奨アクション（次のステップ案）

- [ ] **設計フェーズ (`/architect`)**: `ParentPortal.tsx` への「📊 メンバーダッシュボード」サブタブ追加およびカードデザイン・表示因子の詳細設計（`docs/design-spec.md` の作成）。
- [ ] **UIコンポーネント構築 (`/dev`)**: メンバーごとのポイント、3種の連続日数（補正ロジック適用）、本日獲得ポイント、達成状況バッジを網羅した高質感カードUIの実装。
- [ ] **クイック操作連携 (`/dev`)**: ダッシュボードカードから該当メンバーの未承認リクエスト承認や履歴フィルターへのワンタップ遷移導線を追加。
