# 機能設計仕様書: メインカードタイトルの「ダッシュボード」化設計

## 1. 概要・目的
ホーム画面最上部のメインヒーローカード（`PersonalStreakCard.tsx`）のヘッダータイトルを、冗長だった「🔥 きみの連続記録 & 本日達成目標」から、洗練された「**📊 ダッシュボード**」へ最適化変更する。

---

## 2. 改修仕様

### 該当箇所: [PersonalStreakCard.tsx Line 162](file:///Users/fukuikeitaro/Documents/game/src/frontend/components/PersonalStreakCard.tsx#L162)
- **変更前**: `<h2 className="text-lg font-black text-white tracking-tight">🔥 きみの連続記録 & 本日達成目標</h2>`
- **変更後**: `<h2 className="text-lg font-black text-white tracking-tight">📊 ダッシュボード</h2>`

---

## 3. 実装タスクチェックリスト

- [ ] **タスク1: `PersonalStreakCard.tsx` のタイトルテキストを `📊 ダッシュボード` へ変更**
- [ ] **タスク2: ビルド・型チェック (`npm run build`) による検証**
- [ ] **タスク3: 本番デプロイ (`npm run deploy`) および Git Commit & Push**
