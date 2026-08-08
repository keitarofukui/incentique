# 機能設計仕様書: 保護者モードにおける解説ページ (`streak_bonus_info`) への遷移修正

## 1. 概要・目的
保護者モード中 (`isParentMode === true`) に、保護者ポータルの「ポイント獲得ルール」から「解説ページを見る」ボタンをクリックした際、`StreakBonusInfo` コンポーネントへ正しく画面遷移できるように `App.tsx` のレンダリング分岐を修正する。

---

## 2. 変更仕様 (`src/frontend/App.tsx`)

### レンダリング条件分岐の修正
保護者モード時のコンポーネント切り替えロジックに `'streak_bonus_info'` タブを追加：

```tsx
{isParentMode ? (
  activeTab === 'wishlist' ? (
    <WishlistSection
      currentUser={currentUser}
      isParentMode={isParentMode}
      users={users}
      wishItems={wishItems}
      onRefresh={fetchData}
    />
  ) : activeTab === 'streak_bonus_info' ? (
    <StreakBonusInfo
      onNavigate={handleSetActiveTab}
    />
  ) : (
    <ParentPortal
      users={users}
      wishItems={wishItems}
      onRefresh={fetchData}
      onNavigate={handleSetActiveTab}
    />
  )
) : ( ...
```

---

## 3. 実装タスクチェックリスト

- [x] **タスク1: `App.tsx` の保護者モードレンダリング分岐に `activeTab === 'streak_bonus_info'` を追加**
- [x] **タスク2: ビルド・型チェック (`npm run typecheck && npm run build`) による動作確認**
