# 機能設計仕様書: 家事で稼ぐ（家事メニュー管理＆ポイント獲得）機能

## 1. 概要・目的
子どもたちが日々の家事（お風呂掃除、食器洗い、部屋の掃除機かけ、ゴミ出し等）を積極的にお手伝いし、成果に応じたポイントを獲得できる新機能「家事で稼ぐ（`housework`）」を導入します。
保護者が自由に「洗濯物を干す (30pt)」「洗濯物を畳む (30pt)」「ご飯を作る（1品） (30pt)」「献立を考える (20pt)」「ゴミを捨てる (10pt)」などのメニューおよび獲得ポイントを追加・変更・削除できるようにします。
保護者は管理ポータル（`ParentPortal`）上で、各家庭に合わせた家事メニューの追加・編集（ポイント数・アイコン・説明の調整）・削除を自在に行うことができます。

---

## 2. 機能要件 & データ構造

### 2.1 データベーステーブル設計 (`schema.sql`)
新規テーブル `housework_menus` を新設します。
```sql
CREATE TABLE IF NOT EXISTS housework_menus (
  id TEXT PRIMARY KEY,               -- 一意ID (例: 'hw_1784722928426')
  menu_name TEXT NOT NULL,           -- 家事名 (例: 「お風呂掃除」「食器洗い・片付け」)
  default_points INTEGER DEFAULT 50,  -- 獲得ポイント数 (例: 50)
  icon TEXT DEFAULT '🧹',            -- アイコン絵文字 (例: '🧹', '🧽', '🧺', '🗑️')
  description TEXT,                  -- 説明・やり方の注意事項メモ
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2.2 初期マスタシードデータ (`schema.sql` 投入分)
- `hw_laundry_hang`: 「洗濯物を干す」 (30pt / アイコン: 🧺)
- `hw_laundry_fold`: 「洗濯物を畳む」 (30pt / アイコン: 👕)
- `hw_cook_one`: 「ご飯を作る（1品）」 (30pt / アイコン: 🍳)
- `hw_plan_menu`: 「献立を考える」 (20pt / アイコン: 💡)
- `hw_trash`: 「ゴミを捨てる」 (10pt / アイコン: 🗑️)

---

## 3. 全データフロー経路の定義 (Data Flow Pipeline)

データの一貫性を保証するため、DBからフロントUIまでの完全なデータ経路を以下の通り定義します。

```
[Cloudflare D1: housework_menus]
       │
       ▼ (SQL SELECT * FROM housework_menus ORDER BY created_at ASC)
[Backend API: GET /api/housework-menus]
       │
       ▼ (JSON Response: { success: true, menus: HouseworkMenu[] })
[Frontend State: houseworkMenus in App.tsx / ParentPortal.tsx]
       │
       ▼
[Frontend UI: HouseworkModal.tsx (子供用選択UI) & HouseworkMenuManager (保護者管理UI)]
       │
       ▼ (POST /api/actions { category: 'housework', titleOrMenu: 'お風呂掃除', earnedPoints: 50 })
[Backend Action Log: action_logs に記録 & updateStreaks 処理]
```

### API エンドポイント詳細
1. **家事メニュー一覧取得 (`GET /api/housework-menus`)**:
   - レスポンス: `{ success: true, menus: HouseworkMenu[] }`
2. **家事メニュー追加 (`POST /api/housework-menus`)**:
   - リクエスト: `{ menuName: string, defaultPoints: number, icon?: string, description?: string }`
   - レスポンス: 更新された最新 `menus` 一覧
3. **家事メニュー編集 (`PUT /api/housework-menus/:id`)**:
   - リクエスト: `{ menuName: string, defaultPoints: number, icon?: string, description?: string }`
   - レスポンス: 更新された最新 `menus` 一覧
4. **家事メニュー削除 (`DELETE /api/housework-menus/:id`)**:
   - レスポンス: 更新された最新 `menus` 一覧
5. **家事アクション提出 (`POST /api/actions`)**:
   - リクエスト: `{ userId: string, category: 'housework', titleOrMenu: string, earnedPoints: number, reviewText?: string }`
   - 内部処理: `action_logs` への登録 + `updateStreaks` によるストリーク/ボリュームボーナス自動計算

---

## 4. UI / コンポーネント設計

### 4.1 保護者管理画面 (`ParentPortal.tsx`)
- サブタブまたはマスタ管理エリアに **「🧹 家事メニュー設定 (`HouseworkMenuManager`)」** を設置。
- インライン編集・新規作成フォームを提供（家事タイトル、ポイント、絵文字アイコン、説明）。
- テーブル形式で既存家事の一覧・編集・削除ボタンを配置。

### 4.2 子供用ダッシュボード (`App.tsx`, `Header.tsx`, `HouseworkModal.tsx`)
- **ナビゲーションバー (`Header.tsx`)**:
  - メニュータブに 「🧹 家事で稼ぐ」 を追加（テーマカラー: オレンジ/アンバー系 `#F59E0B` で統一）。
- **家事選択モーダル/ビュー (`HouseworkModal.tsx`)**:
  - 管理画面で設定された `housework_menus` 一覧をグリッドカード形式でポップ表示。
  - 家事カードを選択して「家事を報告してポイントGET」ボタンを押すと即時承認ポイントが付与される。

### 4.3 UIデザインガードレール適用
- **重複描画の防止**: 既存の `EatRiceModal` や `TrainingMenuManager` の単一責任原則に従い、家事専用のモーダル・マネージャーコンポーネントを独立分離。
- **デザインシステム同期**: アイコン・アクセントカラーは既存のアンバー・オレンジグラデーションと完全に調和。

---

## 5. 実装タスクチェックリスト (Dependency Order)

- [x] **Task 1: データベース定義・スキーマ追加 (`schema.sql`)**
  - [x] `housework_menus` テーブルの作成文を追加
  - [x] デフォルト初期シードデータ（5種）のインサート文を追加
- [x] **Task 2: 型定義の更新 (`src/frontend/types.ts`)**
  - [x] `HouseworkMenu` インターフェースの追加
  - [x] `CategoryType` に `'housework'` を追加
- [x] **Task 3: バックエンド API の実装 (`src/backend/index.ts`)**
  - [x] `/api/housework-menus` (GET, POST, PUT, DELETE) CRUD エンドポイントの実装
  - [x] `POST /api/actions` のカテゴリ検証に `'housework'` を追加
- [x] **Task 4: 保護者管理UIの実装 (`src/frontend/components/ParentPortal.tsx`)**
  - [x] `HouseworkMenuManager` コンポーネントの作成
  - [x] 家事メニューの追加・編集・削除機能の連結
- [x] **Task 5: 子供用家事モーダルUIの実装 (`src/frontend/components/HouseworkModal.tsx`)**
  - [x] `HouseworkModal` コンポーネントの新規作成
  - [x] 家事メニューのグリッドカード表示・アクション提出連動
- [x] **Task 6: ナビゲーション・ダッシュボード連携 (`src/frontend/components/Header.tsx`, `App.tsx`)**
  - [x] ナビゲーションタブに 「🧹 家事で稼ぐ」 を追加
  - [x] タブ切替・モーダル表示制御の組み込み
