# 調査報告レポート: 管理画面の動的設定に対するフロントエンド・バックエンド表示連動調査

## 1. 調査目的 & 概要
保護者ポータル（管理画面）で設定された連続ボーナスの「節目日数」「素点閾値」「獲得倍率・係数」が、アプリ全体（バックエンドのポイント給付ロジックおよびフロントエンドの予告・UI表示）で正しく連動しているかを調査・検証する。

---

## 2. 調査結果・ファクト（事実）

### 結論: **バックエンド処理は完全に連動。フロントエンドの予告表示の一部にハードコード定数が残存**

| コンポーネント / レイヤー | 連動状況 | 現状の実装・挙動 |
| :--- | :--- | :--- |
| **バックエンド給付処理** (`src/backend/index.ts`) | **完全動的連動 (100%)** | DB (`point_rules`) から動的にルールを取得し、保護者がポータルで設定した節目日数・閾値・係数に厳密に従ってポイントが給付されます。 |
| **保護者ポータル UI** (`ParentPortal.tsx`) | **完全動的連動 (100%)** | DB の最新設定値の読み込み・編集・保存が即座に同期されます。 |
| **マイページ予告表示** (`RivalPulse.tsx`) | **一部固定値参照** | `STREAK_MILESTONES` 配列および `STREAK_BONUS_PER_DAY` (10) が固定定数として定義されており、予告表示 (`+◯pt`) に管理画面の変更が完全には反映されません。 |
| **ボーナス解説ページ** (`StreakBonusInfo.tsx`) | **静的テキスト表示** | 説明用の固定ガイドテキストとなっており、管理画面の設定変更に合わせて自動更新されません。 |

---

## 3. 詳細分析

### ① バックエンド処理 (`src/backend/index.ts`)
- **動作**: `updateStreaks` 関数内で `SELECT category, points, description FROM point_rules WHERE category LIKE 'streak_%'` を実行。
- **動的化項目**:
  - `STREAK_MILESTONES`: カンマ区切り文字列から動的パース
  - `dailyMultiplier`: デイリー係数
  - `midThreshold` / `midMultiplier`: 中級閾値・係数
  - `godThreshold` / `godMultiplier`: 神閾値・係数
- **評価**: 保護者が値を変更した瞬間から、計算結果および給付ポイントは変更後の値で処理されます。

### ② マイページ予告表示 (`src/frontend/components/RivalPulse.tsx`)
- **問題点**:
  - [`RivalPulse.tsx` Line 61, 64](file:///Users/fukuikeitaro/Documents/game/src/frontend/components/RivalPulse.tsx#L61-L64) にて以下のように固定値が記述されています：
    ```typescript
    const STREAK_MILESTONES = [2, 3, 4, 5, 6, 7, 10, 14, 21, 30, 50, 100, 150, 200, 250, 300, 365];
    const STREAK_BONUS_PER_DAY = 10;
    ```
  - そのため、保護者が管理画面でマイルストーン日数や係数を変更した場合、**実際の給付ポイント（バックエンド）と画面上の予告表示（フロントエンド）の間でズレが発生する可能性** があります。

---

## 4. 今後の推奨改善アクション（次のステップ案）

- [ ] **`RivalPulse.tsx` の動的化**: `fetch('/api/point-rules')` で取得した動的ルールから `STREAK_MILESTONES` および係数を生成して予告表示に適用する設計変更。
- [ ] **`StreakBonusInfo.tsx` の動的表示化**: 解説ページ内の閾値・ポイント表示を `point_rules` の動的値でレンダリングする変更。
