# 調査報告レポート: 高校生以上の漫画ポイント1/10化およびドラマインプット追加の仕様・影響範囲調査

## 1. 調査目的 & 概要
ユーザーからの要請「高校生以上は漫画は10分の1のポイントにしたい。その代わりドラマもポイント対象にする。」に基づき、現行コードベースにおける以下の項目を調査・分析しました。
1. **漫画インプット（`input_manga`）の学年別ポイント動的計算ロジック**
   - 「高校生以上」の定義・判定方法
   - 現行のポイント獲得処理（クライアント表示 & サーバー処理）への組み込み方
2. **ドラマインプット（`input_drama`）の追加による影響範囲**
   - データベース（`point_rules`）、API、フロントエンドコンポーネント（ジャンル選択、集計、ログ表示など）への追加項目

---

## 2. 現状のコード構造・ファクト（事実）

### ① 「学年・年齢区分」の現状実装
- **該当ファイル**: 
  - `src/backend/index.ts`
  - `src/frontend/types.ts`
  - `src/frontend/components/UserRegisterModal.tsx`
  - `src/frontend/components/EatRiceModal.tsx`
- **ユーザーの学年設定**:
  - `users.grade_level` カラム（型: `'high_3' | 'junior_1' | 'other'`）で管理。
  - 現在 `EatRiceModal.tsx` や `backend/index.ts` では `user.grade_level.startsWith('high')` で高校レベルを判定している。
- **高校生以上の定義**:
  - `grade_level` が `high_3`（または `high_` で始まる文字列）の場合を「高校生以上」と判定可能。

### ② 現行のインプットカテゴリとポイント設計
- **該当ファイル**: 
  - `schema.sql`
  - `src/backend/index.ts`
  - `src/frontend/components/InputReviewModal.tsx`
  - `src/frontend/components/ParentPortal.tsx`
- **現在のルール設定 (`point_rules` テーブル)**:
  - `input_book`: 読書 (300pt)
  - `input_movie`: 映画 (120pt)
  - `input_manga`: 漫画 (50pt)
- **ポイント給付処理 (`POST /api/action-logs`)**:
  - クライアントから送信された `earnedPoints` またはデフォルト値（`50pt`）が素点 `basePoints` に設定される。
  - 食事メニュー (`eat_rice`, `eat_meat`) のみサーバー側で `user.grade_level` を参照し素点を再計算しているロジックが存在（`src/backend/index.ts:1165-1174`）。

---

## 3. 分析・変更仕様と影響範囲

### ① 漫画ポイントの学年別1/10化
- **計算仕様**:
  - 標準ポイント（中学生以下等）: `point_rules` の `input_manga` 設定値（デフォルト 50pt）。
  - 高校生以上（`grade_level.startsWith('high')`）: 標準ポイントの 1/10（例: 50pt ➔ 5pt）。`Math.floor(basePoints / 10)`。
- **影響箇所**:
  - **サーバー側 (`POST /api/action-logs`)**: 不正なポイント送信を防ぐため、`category === 'input_manga'` の際にユーザーの `grade_level` をDBから取得し、高校生以上の場合は素点 `basePoints` を 1/10 に補正。
  - **クライアント側 (`InputReviewModal.tsx`)**: ログイン中のユーザーが高校生以上の場合、UI上の獲得可能ポイント表記（「漫画 (+5pt)」など）および登録完了時の表示を 1/10 にプレビュー計算して表示。

### ② ドラマインプット（`input_drama`）の追加
- **追加定義**:
  - カテゴリキー: `'input_drama'`
  - タイトル: `'📺 ドラマ'` / `'ドラマインプット'`
  - デフォルトポイント: `120pt` （映画と同等、保護者ポータルで設定変更可能）
- **影響を受けるファイルと変更点**:
  - `schema.sql` & `src/backend/index.ts`: `point_rules` 初期投入に `input_drama` を追加。
  - `src/frontend/types.ts`: `ActionLog['category']` 及び `InputCategory` 型に `'input_drama'` を追加。
  - `src/frontend/components/InputReviewModal.tsx`:
    - ジャンル選択タブに「ドラマ (アイコン: `Tv` / `Film` 等)」ボタンを追加。
    - プレースホルダー（例: 『半沢直樹』『VIVANT』など）の対応。
  - `src/frontend/components/ParentPortal.tsx`:
    - `DEFAULT_RULES` に `input_drama` 追加。
    - ルール編集画面・ログ一覧での表示ラベル追加（`input_drama: '📺 ドラマ'`）。
  - `src/frontend/components/ReflectionView.tsx` / `RivalPulse.tsx` / `PersonalStreakCard.tsx` / `ParentMemberDashboardCard.tsx` / `App.tsx` / `Header.tsx`:
    - インプットカテゴリ判定（`input_` から始まるカテゴリ、または配列 `['input_book', 'input_movie', 'input_manga', 'input_drama']`）の更新。

---

## 4. 今後の推奨実装アクション（次のステップ案）

- [ ] **ステップ 1: スキーマ・型・デフォルトルールの追加**
  - `schema.sql` および `src/backend/index.ts` の初期ルール投入処理に `input_drama` (120pt) を定義。
  - `src/frontend/types.ts` のカテゴリ型に `input_drama` を追加。
- [ ] **ステップ 2: バックエンドにおける漫画ポイント1/10判定の実装**
  - `POST /api/action-logs` 内で `category === 'input_manga'` の場合、ユーザーの `grade_level` を取得し、高校生以上の場合は素点 `basePoints = Math.floor(basePoints / 10)` とする処理を追加。
- [ ] **ステップ 3: フロントエンド (`InputReviewModal.tsx`) のUI・計算更新**
  - 高校生以上かどうかに応じて漫画の表示ポイントを 1/10（5pt）に計算表示。
  - ドラマインプットの選択タブ・プレースホルダーを追加。
- [ ] **ステップ 4: 各種ビュー・ダッシュボード・集計コンポーネントの対応**
  - `ParentPortal.tsx`, `ReflectionView.tsx`, `RivalPulse.tsx`, `Header.tsx`, `App.tsx` 等で `input_drama` の表示および集計ロジックを統合。
