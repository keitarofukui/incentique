# 機能設計仕様書: 全カテゴリ制覇ボーナスの5カテゴリ拡張（家事 `housework` 追加）

## 1. 概要・目的
ユーザーのご指示（案A）に基づき、「全カテゴリ制覇ボーナス」の判定対象を従来の4カテゴリ（クイズ・インプット・運動・食事）から、新設された「家事（`housework`）」を加えた **5カテゴリコンプリート（クイズ・インプット・運動・家事・食事）** へ拡張します。

---

## 2. 機能要件 & データ構造

### 2.1 データフローとカテゴリグループの拡張仕様

```
[Cloudflare D1: action_logs]
       │
       ▼ (SQL SELECT: has_quiz, has_input, has_training, has_housework, has_meal)
[Backend API: updateStreaks in src/backend/index.ts]
       │
       ▼ 5カテゴリすべて has_* === 1 ➔ bonus_all_category (100pt) を付与
[Frontend UI: AllCategoryCard / PersonalStreakCard / RivalPulse]
       │
       ▼ 5つのチェックマークアイコン（🧠 📚 🏋️ 🧹 🍚）をコンプリート描画
```

### 2.2 対象ファイルの変更仕様

#### ① バックエンド定義 (`src/backend/index.ts`)
- **`ALL_CATEGORY_GROUPS`** を 5つのグループへ拡張：
  1. `quiz`: `category IN ('quiz','study')` (🧠 クイズ)
  2. `input`: `category LIKE 'input\\_%'` (📚 インプット)
  3. `training`: `category = 'training'` (🏋️ 運動)
  4. `housework`: `category = 'housework'` (🧹 家事)
  5. `meal`: `category IN ('eat_rice','eat_meat')` (🍚 食事)
- **`point_rules` の説明文更新**:
  `'1日でクイズ・インプット・運動・家事・食事の5カテゴリすべてを記録した時の単発ボーナス'`
- **達成時メッセージ更新**:
  `'【🎯全カテゴリ制覇！クイズ・インプット・運動・家事・食事コンプリート＋${pts}pt！】'`

#### ② フロントエンドコンポーネント (`AllCategoryCard.tsx`, `PersonalStreakCard.tsx`, `RivalPulse.tsx`)
- **`AllCategoryCard.tsx`**:
  - `ALL_CATEGORIES` 配列に `key: 'housework'`, `label: '家事'`, `icon: '🧹'`, `tab: 'housework'` を追加。
  - 全達成判定を `completedCategoriesCount === 5` に更新。
- **`PersonalStreakCard.tsx`**:
  - `catMap` に `housework: false` を追加。ログ走査で `cat === 'housework'` を判定。
  - `categories` 表示配列に `{ key: 'housework', label: '家事', icon: '🧹', done: categoryStatus.housework }` を追加。
  - 全達成判定を `completedCategoriesCount === 5` に更新。
- **`RivalPulse.tsx`**:
  - `CATEGORY_GROUPS` に `{ key: 'housework', label: '家事', icon: '🧹', tab: 'housework', match: ... }` を追加。

---

## 3. 実装タスクチェックリスト (Dependency Order)

- [x] **Task 1: バックエンド全カテゴリ判定拡張 (`src/backend/index.ts`)**
  - [x] `ALL_CATEGORY_GROUPS` に `housework` を追加
  - [x] `point_rules` マスタ初期登録の説明文・更新クエリを5カテゴリ対応へ更新
- [x] **Task 2: 全カテゴリ制覇カードUIの実装 (`src/frontend/components/AllCategoryCard.tsx`)**
  - [x] `ALL_CATEGORIES` 配列に「家事 (🧹)」を追加
  - [x] 5カテゴリ達成判定および進捗プログレス表示の調整
- [x] **Task 3: 個人ストリークカードUIの実装 (`src/frontend/components/PersonalStreakCard.tsx`)**
  - [x] `catMap` および `categories` 配列に「家事 (🧹)」を追加
  - [x] 5カテゴリ判定とアイコンアニメーションの調整
- [x] **Task 4: ライバルパルスUIの実装 (`src/frontend/components/RivalPulse.tsx`)**
  - [x] `CATEGORY_GROUPS` 配列に「家事 (🧹)」を追加
- [x] **Task 5: 結合疎通テスト (HTTP / `curl` リクエスト実テスト)**
  - [x] 各カテゴリのアクション投稿 API (`POST /api/action-logs`) を実際のリクエストで疎通検証し、全5カテゴリ達成時に `bonus_all_category` が正常付与されることを実検証
