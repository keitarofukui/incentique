# 機能設計仕様書: 推移グラフにおける「食事」と「ボーナス」の5層分離設計

## 1. 概要・目的
推移グラフ（`DailyChart.tsx`）において、「食事」と「ボーナス」を完全に分離した5層の積み上げグラデーション面グラフ（5-Layer Stacked Area Chart）に拡張改修する。

---

## 2. 改修仕様の詳細

### 2.1 5カテゴリ積み上げ構造 (5-Layer Stacked Structure)

| レイヤー順 (下から上) | カテゴリ ID | UI名 | アイコン | 配色テーマ | SVG Gradient (Start ~ End) | ツールチップ / 凡例カラー |
| :---: | :--- | :--- | :---: | :--- | :--- | :--- |
| **Layer 0** | `quiz` | クイズ | 🧠 | **シアン** | `#22d3ee` ~ `#0284c7` | `text-cyan-300`, `bg-cyan-400` |
| **Layer 1** | `input` | インプット | 📚 | **パープル** | `#c084fc` ~ `#7c3aed` | `text-purple-300`, `bg-purple-400` |
| **Layer 2** | `training` | 運動 | 🏋️ | **エメラルド** | `#34d399` ~ `#059669` | `text-emerald-300`, `bg-emerald-400` |
| **Layer 3** | `meal` | 食事 | 🍚 | **アンバー** | `#fbbf24` ~ `#d97706` | `text-amber-300`, `bg-amber-400` |
| **Layer 4** | `bonus` | ボーナス | 🎁 | **ローズ** | `#f43f5e` ~ `#be123c` | `text-rose-300`, `bg-rose-400` |

---

### 2.2 コンポーネント別の変更仕様

1. **`DailyChart.tsx` のデータ集計**:
   - `dayObj` のプロパティを `{ dateStr, label, quiz, input, training, meal, bonus, total }` に拡張。
   - ログ判定処理:
     - `cat === 'quiz' || cat === 'study'` ➔ `quiz`
     - `cat.startsWith('input_')` ➔ `input`
     - `cat === 'training'` ➔ `training`
     - `cat === 'eat_rice' || cat === 'eat_meat'` ➔ `meal`
     - `cat === 'bonus'` またはその他 ➔ `bonus`

2. **SVGグラデーション ＆ 5層積み上げPath生成**:
   - `gradBonus` (`#f43f5e` ~ `#be123c`) グラデーション定義を追加。
   - `yBase`, `yQuiz`, `yInput`, `yTraining`, `yMeal`, `yBonus` の5段階の座標を計算。
   - 各層の面を描画。

3. **凡例 (Legend) ＆ ツールチップ**:
   - 凡例バーに「🎁 ボーナス」を追加。
   - ツールチップに「🍚 食事: +X pt」と「🎁 ボーナス: +Y pt」を分けて表示。

---

## 3. 実装タスクチェックリスト

- [ ] **タスク1: `DailyChart.tsx` の5カテゴリ集計ロジック（`quiz`, `input`, `training`, `meal`, `bonus`）への変更**
- [ ] **タスク2: `DailyChart.tsx` の5層SVG Stacked Area Chart描画（`gradBonus`グラデーション追加）および凡例・ツールチップ更新**
- [ ] **タスク3: ビルド・型チェック (`npm run typecheck && npm run build`) による動作検証**
- [ ] **タスク4: Cloudflare への本番デプロイ (`npm run deploy`) および Git Commit & Push**
