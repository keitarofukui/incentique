# テスト & QA検証レポート (バグ修正＆拡張検証版)

## 1. 発見された不具合の分析と原因
- **不具合現象**:
  スクリーンショットの通り、「換金希望金額 (円)」に `2000` 円を入力し、必要ポイント（`2,858 pt`）が正しく表示されているにもかかわらず、Submitボタン（「交換をリクエストする」）が非アクティブ (disabled) のままグレーアウトしてクリックできない。
- **根本原因**:
  Submitボタンの `disabled` 条件文において、`!newPointsStr || newPoints <= 0` (旧ポイント入力State) のみを参照していたため、`itemType === 'cash'` 時に `cashAmountStr` ("2000") が入力されていても `newPointsStr` が空であることから誤って非活性化と判定されていた。
- **テスト時の見落とし**:
  前回の単体テストでは算術計算ロジック（`Math.ceil((C*10)/7)`）のみを検証し、DOMレベルにおけるフォームStateとのバリデーション連携（`disabled` 条件式）の自動検証が不足していた。

---

## 2. 修正内容と単体検証結果
- **コード修正**:
  `WishlistSection.tsx` L675-L690 において、`itemType === 'cash'` の場合は `cashAmountStr` を評価し、`itemType === 'goods'` の場合は `newPointsStr` を評価する `isFormInvalid` 判定関数を導入。
- **拡張単体テスト結果 (`scratch/test_cash_calc.js`)**:
  - `【スクショ再現】現金2000円入力時`: `disabled = false` (ボタンアクティブ化成功) [PASS]
  - `現金未入力 / 0円入力時`: `disabled = true` (非アクティブ) [PASS]
  - `物品500pt入力時`: `disabled = false` (ボタンアクティブ化) [PASS]
- **ビルドテスト**:
  - コマンド: `npm run build`
  - 結果: **PASS** (Vite ビルド成功、TypeScript 0エラー)

---

## 3. 本番デプロイステータス
- `npm run deploy` 実行完了 (Cloudflare Workers へ修正アセットを配信)
