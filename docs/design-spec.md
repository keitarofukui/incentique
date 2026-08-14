# 機能設計仕様書: 保護者ダッシュボードにおける連続日数ポイント閾値（100pt/250pt）動的表示の修正

## 1. 概要・目的
保護者ダッシュボードカードにおいて、連続達成日数の表示ラベルがDBカラム名に基づいた固定表記（「50pt連続」「100pt連続」）になっていた問題を修正し、システムの実際の判定ルール（デフォルト: 100pt連続 / 250pt連続）に動的同期させる。

---

## 2. 機能要件 & データ構造

### 2.1. データフロー
```
[ParentPortal.tsx (pointRules State)]
      │
      ├── streak_mid_threshold (デフォルト: 100)
      ├── streak_god_threshold (デフォルト: 250)
      │
      ▼
[ParentMemberDashboardCard.tsx (Props)]
      │
      ▼
[UI表示: 「100pt連続」「250pt連続」の正確な閾値ラベル描画]
```

### 2.2. コンポーネント設計変更
- `ParentMemberDashboardCardProps` に以下を追加:
  - `midThreshold?: number` (デフォルト: 100)
  - `godThreshold?: number` (デフォルト: 250)
- ラベル描画:
  - `50pt連続` ➔ `{midThreshold}pt連続` (例: `100pt連続`)
  - `100pt連続` ➔ `{godThreshold}pt連続` (例: `250pt連続`)

---

## 3. 実装タスクチェックリスト

- [x] **タスク1**: `ParentMemberDashboardCard.tsx` に `midThreshold`, `godThreshold` propsの追加と動的ラベル表示への修正
- [x] **タスク2**: `ParentPortal.tsx` から `pointRules` の閾値（`streak_mid_threshold`, `streak_god_threshold`）を取得・親から渡す処理の追加
- [x] **タスク3**: ビルドおよび動作確認
