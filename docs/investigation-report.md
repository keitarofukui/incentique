# 調査報告レポート: 新機能「家事で稼ぐ（家事メニュー管理＆ポイント獲得）」の導入実現性調査

## 1. 調査目的 & 概要
ユーザーからの要件「家事で稼ぐを追加したい。家事で稼げるメニューは管理画面で追加できるようにする。家事のメニューとその獲得ポイントを管理可能に。」に基づき、現行コードベース（フロントエンド、バックエンド、データベーススキーマ）を調査し、新機能「家事で稼ぐ（`housework`）」を拡張するための影響範囲および技術仕様を整理・定義しました。

---

## 2. 現状のコード構造・ファクト（事実）

現行システムでは、動的なメニュー管理機能として **「トレーニング（運動）メニュー (`training_menus`)」** が既に実装されており、非常に類似した構造で「家事メニュー」を安全に拡張可能です。

### 該当ファイルと役割
1. **データベース定義**: [schema.sql](file:///Users/fukuikeitaro/Documents/game/schema.sql#L19-L26)
   - `training_menus` (id, menu_name, default_points, video_url) のテーブル構造が参照モデル。
   - `action_logs` (id, user_id, category, title_or_menu, earned_points, base_points, status...) に行動ログが記録される。
2. **バックエンド API**: [src/backend/index.ts](file:///Users/fukuikeitaro/Documents/game/src/backend/index.ts#L1030-L1096)
   - `/api/training-menus` (GET, POST, PUT, DELETE) でマスターメンテを実施。
   - `POST /api/actions` でポイント計算および `updateStreaks` を実行。
3. **保護者管理ポータル**: [src/frontend/components/ParentPortal.tsx](file:///Users/fukuikeitaro/Documents/game/src/frontend/components/ParentPortal.tsx#L1250-L1350)
   - `TrainingMenuManager` コンポーネントでメニューの追加・編集・削除を実施。
4. **フロントエンド型定義・ナビゲーション**:
   - [src/frontend/types.ts](file:///Users/fukuikeitaro/Documents/game/src/frontend/types.ts#L85): `category` 型定義に `'housework'` を追加。
   - [src/frontend/components/Header.tsx](file:///Users/fukuikeitaro/Documents/game/src/frontend/components/Header.tsx): ナビゲーションタブに 「🧹 家事で稼ぐ」 を追加。

---

## 3. 分析・実装に必要な変更仕様と影響範囲

### ① データベース (DB Schema)
新規テーブル `housework_menus` を追加します。
```sql
CREATE TABLE IF NOT EXISTS housework_menus (
  id TEXT PRIMARY KEY,
  menu_name TEXT NOT NULL,          -- 例: 「お風呂掃除」「食器洗い」「部屋の掃除」
  default_points INTEGER DEFAULT 50, -- 獲得ポイント数 (例: 50pt)
  icon TEXT DEFAULT '🧹',           -- アイコン絵文字
  description TEXT,                 -- 説明・やり方のメモ
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### ② バックエンド API (`src/backend/index.ts`)
- **マスターCRUD API**:
  - `GET /api/housework-menus` : 家事メニュー一覧の取得
  - `POST /api/housework-menus` : 新規家事メニューの追加（要保護者PIN）
  - `PUT /api/housework-menus/:id` : 家事メニューの編集・ポイント変更
  - `DELETE /api/housework-menus/:id` : 家事メニューの削除
- **アクションログAPI**:
  - `POST /api/actions` で `category = 'housework'` を許容し、選択された家事メニューの獲得ポイント（素点）を処理。

### ③ 保護者ポータル画面 (`ParentPortal.tsx`)
- 「マスター管理」タブ（または専用サブタブ）に **`HouseworkMenuManager`** コンポーネントを新設。
- 保護者が自由に「風呂掃除 (50pt)」「食器洗い (30pt)」「部屋の掃除機かけ (50pt)」「ゴミ出し (20pt)」などのメニューおよび獲得ポイントを追加・変更・削除できるようにします。

### ④ 子供用アクション画面 (`HouseworkModal.tsx` または `HouseworkView.tsx`)
- 子供が「🧹 家事で稼ぐ」タブを開いた際、管理画面で登録された家事メニューがカード形式で一覧表示される。
- ワンタップで「お風呂掃除完了！(50pt獲得)」といった申請・記録を行えるインターフェースを提供。

---

## 4. 今後の推奨ステップ案（設計〜製造へ）

- [ ] **設計フェーズ (`/architect`)**:
  - `docs/design-spec.md` を作成し、DBテーブル定義、APIレスポンス型、コンポーネント構成の詳細仕様を策定。
- [ ] **製造フェーズ (`/dev`)**:
  - バックエンド API および `HouseworkMenuManager` / `HouseworkModal` を実装。
- [ ] **テスト・動作検証 (`/test`)**:
  - 家事メニューのCRUD、ポイント獲得、ログ記録、ビルドチェックを実施。
