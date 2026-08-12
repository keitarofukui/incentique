# 機能設計仕様書: 現金還元（お小遣い換金）リクエストの円指定入力・ポイント自動計算機能

## 1. 概要・目的
ご褒美リクエスト画面（`WishlistSection.tsx`）において、現在「交換ポイント (pt)」を入力して7掛け現金が計算される仕様となっています。
本機能改修では、ユーザーが**「換金希望金額 (円)」**を直接入力すると、7掛けルール（還元率70%）に基づいて**「必要な交換ポイント (pt)」がリアルタイムに自動計算・表示**されるUIに変更します。
これにより、「700円欲しい」「1,000円分お小遣いにしたい」といった目的ベースの直感的な操作を実現します。

---

## 2. 機能要件 & データ構造

### ① モーダル入力モードの動的切替
- **物品 (`itemType === 'goods'`) 選択時**:
  - 従来通り「交換ポイント (pt)」(`newPointsStr`) を入力。
  - 商品・報酬タイトル、Amazon/商品URL、画像URL等の入力項目を表示。
- **現金還元 (`itemType === 'cash'`) 選択時**:
  - 入力項目を **「換金希望金額 (円)」** (`cashAmountStr`) に切り替え。
  - タイトル、URL、画像URL等の入力欄は非表示とし、自動的にタイトルを `現金還元 (〇〇円)` に自動設定。

### ② ポイント逆算ロジックと全額換金計算
- **必要ポイント算出式（端数切上げ）**:
  換金希望金額 $C$ (円) に対する必要ポイント $P$ (pt) は以下で算出：
  $$P = \left\lceil \frac{C}{0.7} \right\rceil = \left\lceil C \times \frac{10}{7} \right\rceil$$
  - *例: 700円 $\rightarrow$ 1,000 pt*
  - *例: 500円 $\rightarrow$ 715 pt (715 pt × 0.7 = 500.5円)*
  - *例: 1,000円 $\rightarrow$ 1,429 pt (1,429 pt × 0.7 = 1000.3円)*

- **「全額換金」クイック入力**:
  所持ポイント $P_{user}$ から換金できる最大現金金額 $C_{max}$：
  $$C_{max} = \lfloor P_{user} \times 0.7 \rfloor \text{ (円)}$$
  - 「全額換金」ボタン押下時、$C_{max}$ を希望金額入力欄にセット。

### ③ データフロー全行程
1. **フロントUI (`WishlistSection.tsx`)**: 
   - ユーザーが「換金希望金額 (円)」を入力 $\rightarrow$ $P = \lceil C / 0.7 \rceil$ を逆算。
   - `title`: `現金還元 (${C.toLocaleString()}円)`
   - `requiredPoints`: $P$
2. **バックエンド API (`POST /api/wish-items`)**: 
   - ペイロード `{ userId, title, requiredPoints: P, itemType: 'cash' }` をそのまま受領。
3. **DB (`D1 wish_items` テーブル)**: 
   - `title`, `required_points` ($P$), `item_type` (`'cash'`) として保存。
4. **表示・承認 (`WishlistSection.tsx` / `ApproveWishModal.tsx`)**:
   - カード一覧や保護者承認画面では、既存の表示ロジック（`title` の表示、`required_points` の引き落とし、`Math.floor(points * 0.7)` の手渡し額算出）がそのまま調和して動作。

---

## 3. UI / コンポーネント設計

### UI構成案 (`WishlistSection.tsx` モーダル内)

#### 【現金還元モード入力欄】
```tsx
{itemType === 'cash' ? (
  <div className="space-y-2">
    <div className="flex justify-between items-center text-xs">
      <label className="font-bold text-slate-300">換金希望金額 (円)</label>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-slate-400 font-mono">
          所持: <strong className="text-amber-400 font-bold">{userCurrentPoints.toLocaleString()} pt</strong>
          <span className="text-[10px] text-emerald-400 ml-1">
            (最大 {Math.floor(userCurrentPoints * 0.7).toLocaleString()} 円換金可)
          </span>
        </span>
        <button type="button" onClick={handleFillMaxCash}>全額換金</button>
      </div>
    </div>
    <div className="relative flex items-center">
      <span className="absolute left-3 text-slate-400 font-bold text-sm">¥</span>
      <input
        type="number"
        placeholder="例: 700"
        value={cashAmountStr}
        onChange={(e) => setCashAmountStr(e.target.value)}
        className="w-full bg-slate-900 border rounded-xl pl-8 pr-4 py-2 text-sm text-white font-mono"
      />
    </div>
    
    {/* 逆算結果プレビュー */}
    {cashAmount > 0 && (
      <div className="p-3 bg-slate-900 border border-emerald-500/40 rounded-xl space-y-1">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-300 font-bold">💵 必要ポイント (7掛け還元):</span>
          <span className="text-base font-black text-amber-400 font-mono">
            {requiredPointsForCash.toLocaleString()} pt
          </span>
        </div>
        <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono">
          <span>交換後残りポイント:</span>
          <span className={remainingPoints < 0 ? 'text-red-400 font-bold' : 'text-slate-300'}>
            {remainingPoints.toLocaleString()} pt
          </span>
        </div>
      </div>
    )}
    
    {isPointsExceeded && (
      <p className="text-[11px] font-bold text-red-400">
        ⚠️ 所持ポイント（{userCurrentPoints.toLocaleString()} pt）で換金できるのは最大 {maxCash.toLocaleString()} 円までです。
      </p>
    )}
  </div>
) : (
  /* 従来の物品ポイント入力欄 */
)}
```

---

## 4. 実装タスクチェックリスト

- [x] **タスク1: フロントエンド状態管理 & ポイント逆算・全額算出関数の実装**
  - [x] `WishlistSection.tsx` 内に換金希望額入力State `cashAmountStr` を追加
  - [x] 換金希望額 $C$ から必要ポイント $P = \lceil C / 0.7 \rceil$ を逆算する計算ロジックを実装
  - [x] 所持ポイントから最大換金可能額 $C_{max} = \lfloor P_{user} \times 0.7 \rfloor$ を算出する計算ロジックを実装
- [x] **タスク2: モーダルフォームUI & プレビューの刷新**
  - [x] `itemType === 'cash'` 時の金額入力欄、円マーク (`¥`)、全額換金ボタンのレイアウト実装
  - [x] 必要ポイント数と交換後残りポイントのリアルタイムプレビュー表示
  - [x] 所持ポイント超過時の分かりやすい警告表示
- [x] **タスク3: リクエスト作成処理 (`handleAddItem`) の更新**
  - [x] 現金還元時にタイトル `現金還元 (〇〇円)` と逆算した `requiredPoints` を組み立ててAPI送信する処理の実装
  - [x] 送信前のリクエスト確認モーダル (`window.confirm`) のメッセージ構成の最適化
- [x] **タスク4: ビルド・動作検証**
  - [x] `npm run build` による TypeScript 型チェック & コンパイルエラー検証
  - [x] 様々な金額指定（700円, 500円, 全額指定）でのポイント計算正確性のテスト
