# 調査報告レポート: 「全カテゴリ制覇ボーナス」における家事（`housework`）カテゴリ未含まれの現状調査

## 1. 調査目的 & 概要
ユーザーからの指摘「調査：全カテゴリ制覇に家事が含まれていないような」に基づき、バックエンドのボーナス判定ロジック、データベースのポイントルール定義、およびフロントエンドの達成チェック表示を調査しました。
結果として、現行の「全カテゴリ制覇ボーナス」は新設された家事（`housework`）が含まれておらず、従来の4カテゴリ（クイズ・インプット・運動・食事）のままで判定・表示されている事実を確認しました。

---

## 2. 現状のコード構造・ファクト（事実）

### ① バックエンドの判定定義 (`src/backend/index.ts`)
- **[ALL_CATEGORY_GROUPS](file:///Users/fukuikeitaro/Documents/game/src/backend/index.ts#L143-L148)**:
  `ALL_CATEGORY_GROUPS` には以下の4グループのみが定義されています。
  1. `quiz`: クイズ (`category IN ('quiz','study')`)
  2. `input`: インプット (`category LIKE 'input_%'`)
  3. `training`: 運動 (`category = 'training'`)
  4. `meal`: 食事 (`category IN ('eat_rice','eat_meat')`)
- **判定処理 (L354)**:
  `ALL_CATEGORY_GROUPS` の4つすべてに当日ログ（`has_key = 1`）が存在する場合のみ `bonus_all_category` (100pt) を付与。家事 (`housework`) のログの有無は判定に含まれていません。

### ② ポイントルールマスタ (`schema.sql` / `point_rules`)
- **[point_rules 説明文](file:///Users/fukuikeitaro/Documents/game/schema.sql#L127)**:
  `'bonus_all_category'`: `'1日でクイズ・インプット・運動・食事の4カテゴリすべてを記録した時の単発ボーナス'` と記述されています。

### ③ フロントエンドの達成チェックUI (`PersonalStreakCard.tsx`, `AllCategoryCard.tsx`, `RivalPulse.tsx`)
- **[PersonalStreakCard.tsx](file:///Users/fukuikeitaro/Documents/game/src/frontend/components/PersonalStreakCard.tsx#L61-L73)**:
  `catMap`（`quiz`, `training`, `eat_rice`, `input`）の 4カテゴリのみを走査・計算。
- **[AllCategoryCard.tsx](file:///Users/fukuikeitaro/Documents/game/src/frontend/components/AllCategoryCard.tsx#L15-L61)**:
  「全カテゴリ制覇カード」で表示される進捗アイコン・チェックリストが 4カテゴリ分のみ配置。

---

## 3. 分析・判定への影響範囲

現在、子どもたちが「家事で稼ぐ（🧹）」を達成しても全カテゴリ制覇の進捗（アイコン・達成チェック）にはカウントされず、全カテゴリ制覇ボーナス（100pt）の取得条件にも含まれていません。

---

## 4. 今後の推奨アクション案（設計フェーズへのバトンタッチ）

家事（`housework`）を全カテゴリ制覇に含めるかどうか、以下のどちらの仕様にするかを選択・設計できます：

- [ ] **案 A（5カテゴリ制覇へ拡張・推奨）**:
  - 全カテゴリ制覇を 「クイズ・インプット・運動・食事・**家事**」 の **5カテゴリコンプリート** に変更する。
  - バックエンド `ALL_CATEGORY_GROUPS` およびフロントエンド (`AllCategoryCard`, `PersonalStreakCard`, `RivalPulse`) に 「🧹 家事」 を組み込む。
  - メリット: 家事を手伝った日に全達成ボーナス（100pt）が得られ、子供のお手伝いモチベーションがさらに高まる。
- [ ] **案 B（従来の4カテゴリのまま据え置き）**:
  - 全カテゴリ制覇は従来の 4カテゴリのまま変更せず、家事は独立した自由ポイント獲得枠とする。
