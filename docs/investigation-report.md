# 調査報告レポート: 保護者モードから「解説ページを見る」リンクが機能しない原因調査

## 1. 調査目的 & 概要
保護者ポータルの「ポイント獲得ルール」タブ内にある「解説ページを見る」ボタンをクリックしても画面が遷移せず動作しない不具合の原因を調査・特定する。

---

## 2. 調査結果・ファクト（事実）

### 原因: `App.tsx` における `isParentMode` 時の条件付きレンダリング分岐漏れ
- **ファイル**: `src/frontend/App.tsx` (372〜388行目)
- **コード構造**:
  ```tsx
  {isParentMode ? (
    activeTab === 'wishlist' ? (
      <WishlistSection ... />
    ) : (
      <ParentPortal ... />
    )
  ) : ( ...
  ```
- **不具合発生のメカニズム**:
  1. 保護者モード (`isParentMode === true`) 時に「解説ページを見る」ボタンをクリックすると、`onNavigate('streak_bonus_info')` 経由で `activeTab` が `'streak_bonus_info'` に更新されます。
  2. しかし、`App.tsx` 側では `isParentMode` が `true` の場合、`activeTab === 'wishlist'` 以外の全てのケースで `<ParentPortal />` を固定表示する分岐になっていました。
  3. そのため、`activeTab` が `'streak_bonus_info'` に変更されても画面が再レンダリングされず、`ParentPortal` が表示されたままとなり「リンクが機能しない」状態が発生していました。

---

## 3. 解決策
`src/frontend/App.tsx` の保護者モードレンダリング分岐に `activeTab === 'streak_bonus_info'` の条件分岐を追加し、保護者モードからでも `StreakBonusInfo` コンポーネントが描画されるように修正します。

---

## 4. 今後のアクション
設計→製造→テスト→監査→本番デプロイを全自動パイプラインで実行します。
