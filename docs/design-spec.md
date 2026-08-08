# 機能設計仕様書: 重複カード（AllCategoryCard）の除去とホーム構造のスリム化設計

## 1. 概要・目的
`Dashboard.tsx` に直下配置されていた重複コンポーネント `<AllCategoryCard>` を完全に削除し、「📊 ダッシュボード（`PersonalStreakCard.tsx`）」カード内の全カテゴリ進捗表示へ一本化することで画面の冗長性を排除する。

---

## 2. 改修仕様

### `Dashboard.tsx`
- インポート文から `AllCategoryCard` を削除。
- JSX レンダリングツリーから `<AllCategoryCard>` のブロックを削除。

---

## 3. 実装タスクチェックリスト

- [ ] **タスク1: `Dashboard.tsx` から `<AllCategoryCard>` のインポートおよび描画部分の削除**
- [ ] **タスク2: ビルド・型チェック (`npm run build`) による検証**
- [ ] **タスク3: 本番デプロイ (`npm run deploy`) および Git Commit & Push**
