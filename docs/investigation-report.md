# 調査報告レポート: 重複している「全カテゴリ制覇カード」の削除調査

## 1. 調査目的 & 概要
ユーザーからのご指摘「全カテゴリ状況はダッシュボードに入っているので、その下のカードは不要じゃないですか？また重複している」に基づき、[Dashboard.tsx](file:///Users/fukuikeitaro/Documents/game/src/frontend/components/Dashboard.tsx) および [PersonalStreakCard.tsx](file:///Users/fukuikeitaro/Documents/game/src/frontend/components/PersonalStreakCard.tsx) 内の重複カード配置を調査・解消する。

---

## 2. 事実（ファクト）
1. **[PersonalStreakCard.tsx Line 356-404](file:///Users/fukuikeitaro/Documents/game/src/frontend/components/PersonalStreakCard.tsx#L356-L404)**:
   - 「📊 ダッシュボード」カードの内部に「👑 本日の全カテゴリ制覇進捗」領域（4カテゴリの完了チェックとボーナス案内）がすでに組み込まれている。
2. **[Dashboard.tsx Line 93-97](file:///Users/fukuikeitaro/Documents/game/src/frontend/components/Dashboard.tsx#L93-L97)**:
   - `PersonalStreakCard` の直下に `<AllCategoryCard>` が配置されているため、まったく同じ「全カテゴリ制覇」の情報が上下2箇所に完全に重複表示されていた。

---

## 3. 解消方針
- **`Dashboard.tsx` から `<AllCategoryCard>` を完全に削除・除去する**。
- `PersonalStreakCard.tsx` 内の一本化された「全カテゴリ制覇進捗」のみとし、不要な重複カードを排除してホーム画面をすっきり整理・最適化する。

---

## 4. 推奨アクション
- [x] **Step 1 (設計)**: `Dashboard.tsx` から `<AllCategoryCard>` を削除し、「📊 ダッシュボード」カード内の一本化構造へ設計。
- [x] **Step 2 (製造・テスト)**: コード更新、ビルド検証。
- [x] **Step 3 (デプロイ)**: 本番デプロイ (`npm run deploy`) および Git コミット・プッシュ。
