# 調査報告レポート: 連続日数のポイント閾値（50pt/100pt）表示と実態の不一致について

## 1. 調査目的 & 概要
保護者ダッシュボードやUI上の表示において、連続達成日数の表示ラベルが「50pt連続」「100pt連続」となっており、実態の判定閾値と異なっているとのご指摘を受け、コードベース全体の連続達成判定ロジック、DBカラム名、および設定ルールの整合性を調査・解明しました。

---

## 2. 現状のコード構造・ファクト（事実）

### 2.1. DBスキーマ・変数名の歴史的背景
- **DBカラム名 (`schema.sql` / `types.ts`)**:
  - `last_50pt_date`, `current_50pt_streak_days`: 中級ストリーク用
  - `last_100pt_date`, `current_100pt_streak_days`: 上級ストリーク用
  - 歴史的経緯によりDBカラム名には `50pt` / `100pt` という固定名が付与されています。

### 2.2. バックエンド & ポイントルールの実態 (`src/backend/index.ts`)
- バックエンドの実際の連続日数判定・ボーナス付与処理（[`src/backend/index.ts:L183-L187`](file:///Users/fukuikeitaro/Documents/game/src/backend/index.ts#L183-L187)）では、DBカラム `current_50pt_streak_days` および `current_100pt_streak_days` を使用しているものの、**実際の判定閾値（しきい値）はポイントルール定義 (`point_rules`) から動的に取得**されています：
  - **中級ストリーク閾値 (`streak_mid_threshold`)**: デフォルト **`100 pt`** 以上/日
  - **上級ストリーク閾値 (`streak_god_threshold`)**: デフォルト **`250 pt`** (または **`300 pt`**) 以上/日

### 2.3. フロントエンド表示の乖離
- **ユーザー画面 (`PersonalStreakCard.tsx` / `StreakBonusInfo.tsx`)**:
  - ルール定義 `midThreshold` (100pt) / `godThreshold` (250pt/300pt) を参照し、`💥 100pt達成連続` / `👑 250pt達成連続` と正しく表示されています。
- **保護者画面 (`ParentMemberDashboardCard.tsx`)**:
  - DBカラム名 `current_50pt_streak_days` / `current_100pt_streak_days` の文字を直訳し、ラベルを固定で `50pt連続` / `100pt連続` と表示していたため、実態のゲームルール（100pt/250pt）と表記が食い違っていました。

---

## 3. 原因・影響範囲

### 3.1. 原因
- DBカラム名（`50pt`/`100pt`）と、実際に運用されているポイントルール（`100pt`/`250pt`）の乖離。
- 保護者ダッシュボードカードにおいて、動的なポイントルールしきい値を取得・参照せず、DBカラム名に基づくハードコード表記を行っていたこと。

### 3.2. 影響範囲
- `ParentMemberDashboardCard.tsx` の表示ラベル表記。
- ロジック・計算値自体は正しいデータを参照していますが、保護者が画面で見た際のラベルの数値テキストが実態と異なって見えていました。

---

## 4. 今後の推奨アクション（次のステップ案）

- [ ] **設計フェーズ (`/architect`)**: `ParentMemberDashboardCard.tsx` において `/api/point-rules`（または共通プロップス）から `streak_mid_threshold` (100pt) および `streak_god_threshold` (250pt/300pt) を取得し、動的ラベル（例: `100pt連続`, `250pt連続`）に修正する設計策定。
- [ ] **実装フェーズ (`/dev`)**: `ParentMemberDashboardCard.tsx` のラベル表示ロジックの改修。
- [ ] **全自動連携 (`全自動:` / `/auto`)**: 調査〜修正〜テスト〜本番適用を一気に自動実行。
