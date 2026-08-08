# 機能設計仕様書: グラフ ＆ 全カテゴリカードのメニュー配色完全同期設計

## 1. 概要・目的
獲得ポイント推移グラフ（`DailyChart.tsx`）および全カテゴリ制覇カード（`AllCategoryCard.tsx`）の配色パレットを、ヘッダーのアクションメニュー（`Header.tsx`）で定義されている各カテゴリの統一テーマカラーに完全同期させる。

---

## 2. 改修仕様の詳細

### 2.1 カラーパレット定義 (Menu Synchronized Color Palette)

| カテゴリ ID | カテゴリ名 | アイコン | メニューテーマカラー | SVG Gradient (Start ~ End) | ツールチップ / 凡例 Tailwind クラス |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `quiz` | クイズ | 🧠 | **シアン (Cyan)** | `#22d3ee` (cyan-400) ~ `#0284c7` (sky-600) | `text-cyan-400`, `bg-cyan-400` |
| `input` | インプット (読書/映画) | 📚 | **パープル (Purple)** | `#c084fc` (purple-400) ~ `#7c3aed` (violet-600) | `text-purple-400`, `bg-purple-400` |
| `training` | 運動 | 🏋️ | **エメラルド (Emerald)** | `#34d399` (emerald-400) ~ `#059669` (emerald-600) | `text-emerald-400`, `bg-emerald-400` |
| `other` | 食事 / その他 | 🍚 | **アンバー (Amber)** | `#fbbf24` (amber-400) ~ `#d97706` (amber-600) | `text-amber-400`, `bg-amber-400` |

---

### 2.2 コンポーネント別の変更仕様

1. **`DailyChart.tsx`**:
   - SVG `<linearGradient>` の ID と色定義 (`gradQuiz`, `gradInput`, `gradTraining`, `gradOther`) を上記カラーコードに更新。
   - 凡例 (Legend) のカラー丸ドットとテキストカラーを更新：
     - 🧠 クイズ: `bg-cyan-400`, `text-slate-200`
     - 📚 インプット: `bg-purple-400`, `text-slate-200`
     - 🏋️ 運動: `bg-emerald-400`, `text-slate-200`
     - 🍚 食事/他: `bg-amber-400`, `text-slate-200`
   - ホバーツールチップのテキストカラーをメニュー色 (`text-cyan-300`, `text-purple-300`, `text-emerald-300`, `text-amber-300`) に更新。

2. **`AllCategoryCard.tsx`**:
   - クイズ: `border-cyan-500/40`, `text-cyan-300`
   - インプット: `border-purple-500/40`, `text-purple-300`
   - 運動: `border-emerald-500/40`, `text-emerald-300`
   - 食事: `border-amber-500/40`, `text-amber-300`

---

## 3. 実装タスクチェックリスト

- [ ] **タスク1: `DailyChart.tsx` の SVG グラデーション定義および凡例・ツールチップ配色のメニュー同期化**
- [ ] **タスク2: `AllCategoryCard.tsx` のカテゴリボタン・バッジ配色のメニュー同期化**
- [ ] **タスク3: ビルド・型チェック (`npm run typecheck && npm run build`) による動作検証**
- [ ] **タスク4: Cloudflare への本番デプロイ (`npm run deploy`) および Git Commit & Push**
