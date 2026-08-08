# 機能設計仕様書: 連続ボーナス制度のフロントエンド完全動的同期（マイページ・解説画面）

## 1. 概要・目的
保護者ポータル（管理画面）で設定された連続ボーナスの「節目日数」「達成素点閾値（中級・神）」「獲得倍率・係数」が、マイページの予告表示 (`RivalPulse.tsx`) および解説画面 (`StreakBonusInfo.tsx`) でも即座にリアルタイム動的反映されるように改善し、バックエンドの実際のポイント付与とフロントエンドの表示の完全一致を実現する。

---

## 2. 機能要件 & データ構造

### 2.1 参照する `point_rules` マスターキー一覧
`GET /api/point-rules` より取得される以下の動的ルールをフロントエンドでロードし、計算・ラベル表示に適用する：

| カテゴリキー (`category`) | 対象機能・用途 | デフォルト値 / 型 | フロントエンドでの適用箇所 |
| :--- | :--- | :--- | :--- |
| `streak_milestones` | 連続ボーナス節目日数 | `"2,3,4,5,6,7,10,14,21,30,50,100,150,200,250,300,365"` | `STREAK_MILESTONES` 数値配列の動的パース |
| `streak_daily_multiplier` | デイリー連続係数 | `10` (pt/日) | 日数 × 係数の予想獲得ポイント計算 |
| `streak_mid_threshold` | 中級連続素点閾値 | `100` (pt) | 中級連続判定・画面ラベル表示 |
| `streak_mid_multiplier` | 中級連続係数 | `30` (pt/日) | 中級連続ボーナス予想ポイント計算 |
| `streak_god_threshold` | 神連続素点閾値 | `250` (pt) | 神連続判定・画面ラベル表示 |
| `streak_god_multiplier` | 神連続係数 | `100` (pt/日) | 神連続ボーナス予想ポイント計算 |

---

## 3. UI / コンポーネント設計

### 3.1 マイページ・ライバルパルス (`src/frontend/components/RivalPulse.tsx`)
1. **動的 `STREAK_MILESTONES` パース**:
   - DBから取得した `ruleMap.streak_milestones?.description` をカンマ分割して `number[]` 配列を動的生成。未定義時はデフォルト配列にフォールバック。
2. **動的ボーナス予想計算**:
   - `upcomingMilestone` 到達時の獲得予想ポイント `+{(upcomingMilestone * dailyMultiplier).toLocaleString()}pt` を動的係数 (`streak_daily_multiplier`) で算出。
3. **中級・神ストリークの動的ラベル表示**:
   - 「💥 100pt超え」「👑 250pt超え」の表示テキストを、`streak_mid_threshold` / `streak_god_threshold` の設定値に合わせて動的更新。

### 3.2 連続ボーナス解説画面 (`src/frontend/components/StreakBonusInfo.tsx`)
1. **`GET /api/point-rules` の動的ロード**:
   - コンポーネントマウント時に `point_rules` を取得。
2. **動的テキスト・マイルストーン一覧表示**:
   - カードの見出しおよび説明文中の閾値（例: 「100pt以上」「250pt以上」）を動的レンダリング。
   - ボーナス節目日数の案内リストを、設定された `streak_milestones` から生成して表示。

---

## 4. 実装タスクチェックリスト

- [x] **タスク1: `RivalPulse.tsx` における `STREAK_MILESTONES` 配列およびデイリー倍率の動的パース・算出化**
  - DBから取得した `streak_milestones` および `streak_daily_multiplier` に基づく予告メッセージ表示の実装
- [x] **タスク2: `RivalPulse.tsx` における中級・神ストリーク閾値ラベルの動的表示化**
  - `streak_mid_threshold` / `streak_god_threshold` を参照したラベル動的更新
- [x] **タスク3: `StreakBonusInfo.tsx` における `point_rules` 動的ロードと解説文・マイルストーン一覧の動的表示化**
  - 解説ページの各種閾値・マイルストーン日数の動的レンダリング
- [x] **タスク4: ビルド・型チェック・動的動作確認**
  - `npm run typecheck && npm run build` による検証および保護者ポータルで設定変更時のマイページ・解説画面への即時連動テスト
