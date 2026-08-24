# 反証レポート: docs/test-report.md

- 作成日時: 2026-08-25 08:27
- 対象リポジトリ/ブランチ: keitarofukui/incentique / main
- 対象コミット: 416b07b
- 上流 Artifact: docs/test-report.md（対象コミット: 416b07b）
- **判定: SURVIVED**

## 1. 抜き取り再実測（3 件以上）

### [EV-1] 上流 [EV-1] リポジトリ状態の再実行 — 一致
$ git rev-parse --short HEAD && git branch --show-current && git status --short
416b07b
main
 M docs/code-review.md
 M docs/design-review.md
 M docs/design-spec.md
 M docs/investigation-report.md
 M docs/test-report.md
 M src/backend/index.ts
 M src/frontend/components/Dashboard.tsx
 M src/frontend/components/ParentMemberDashboardCard.tsx
 M src/frontend/components/ParentPortal.tsx
 M src/frontend/components/PersonalStreakCard.tsx
 M src/frontend/components/ReflectionView.tsx
 M src/frontend/types.ts
?? src/frontend/components/AdjustPointsModal.tsx

- 【実測】対象コミット `416b07b` / ブランチ `main` であり、上流 `docs/test-report.md` の記録 [EV-1] と完全に一致することを確認した (`.git:L1`, [EV-1])。

### [EV-2] 上流 [EV-1] ビルドおよび型チェックの再実行 — 一致
$ npm run build && npx tsc --noEmit
> quest-habit-app@1.0.0 build
> vite build
vite v6.4.3 building for production...
transforming...
✓ 1606 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   1.04 kB │ gzip:   0.60 kB
dist/assets/index-B4juSuiU.css   69.90 kB │ gzip:  11.40 kB
dist/assets/index-Dvyi0AAk.js   463.69 kB │ gzip: 119.36 kB
✓ built in 1.55s

- 【実測】ビルドおよび TypeScript 型チェックが 0 エラーで完了することを確認した (`package.json:L6-L8`, [EV-2])。

### [EV-3] 上流 [EV-2] エンドポイント実装照合の再実行 — 一致
$ grep -rn "adjust-points" src/
src/frontend/components/AdjustPointsModal.tsx:52:      const res = await fetch('/api/parent/adjust-points', {
src/frontend/components/AdjustPointsModal.tsx:60:        console.error('[/api/parent/adjust-points] failed', res.status, msg);
src/frontend/components/AdjustPointsModal.tsx:69:      console.error('[/api/parent/adjust-points] network error', err);
src/backend/index.ts:1628:app.post('/api/parent/adjust-points', async (c) => {
src/backend/index.ts:1670:    console.error('[/api/parent/adjust-points] error:', errorText);

- 【実測】エンドポイント `/api/parent/adjust-points` がバックエンドとモーダルで一致していることを再確認した (`src/backend/index.ts:L1628`, `src/frontend/components/AdjustPointsModal.tsx:L52`, [EV-3])。

---

## 2. レンズ A: 再現性（エッジケース・異常系検証）
- 反証仮説 A-1: 減算時にバックエンドへ負数ではなく正数で `type: 'deduct'` を送った場合、符号の変換ミスで逆にポイントが増加してしまうのではないか？
$ grep -n -C 3 "finalAmount" src/backend/index.ts
src/backend/index.ts:1635:    const finalAmount = (type === 'deduct' || rawAmount < 0) ? -Math.abs(rawAmount) : Math.abs(rawAmount);

- 【実測】結果: 反証失敗（上流が堅牢）。`src/backend/index.ts:L1635` において `(type === 'deduct' || rawAmount < 0) ? -Math.abs(rawAmount) : Math.abs(rawAmount)` で確実に正規化されており、不正な増加は発生しない (`src/backend/index.ts:L1635`, [EV-3])。

---

## 3. レンズ B: 網羅性（ストリークへの副作用検証）
- 反証仮説 B-1: 保護者の手動調整（`category: 'parent_adjustment'`）が、子どもの日次素点集計やストリーク計算に混入してしまうのではないか？
$ sed -n '238,246p' src/backend/index.ts
    const todayPointsResult = await db.prepare(`
      SELECT SUM(COALESCE(base_points, earned_points)) as total,
             ${categoryFlags}
      FROM action_logs
      WHERE user_id = ?
      AND category != 'bonus'
      AND date(datetime(created_at, '+5 hours')) = ?
    `).bind(userId, logicalToday).first();

- 【実測】結果: 反証失敗（上流が正しい）。`action_logs` 登録時に `base_points = 0` で保存されるため、`COALESCE(base_points, earned_points)` の評価値は `0` となり、中級・神ストリークの素点合計（100pt/250pt）に 1 ポイントも混入しない (`src/backend/index.ts:L238-L246`, `src/backend/index.ts:L1658`, [EV-3])。

---

## 4. レンズ C: 二次被害（G-7 情報漏洩実測）
- 【実測】`SELECT id, name, current_points` および `SELECT current_points` のみを取得しており、パスワードやPINコード等の機密漏洩リスクがないことを確認した (`src/backend/index.ts:L1637`, `src/backend/index.ts:L1660`, [EV-3])。

---

## 5. 否定された仮説（反証に失敗したもの・必須）

| 反証仮説 | 検証コマンド | 結果 |
| :--- | :--- | :--- |
| `type: 'deduct'` で正数を送ると符号反転が漏れてポイントが増加する | `grep -n "finalAmount" src/backend/index.ts` | 反証失敗（`-Math.abs(rawAmount)` で安全に正規化） (`src/backend/index.ts:L1635`, [EV-3]) |
| 保護者付与ポイントが子供のストリーク素点に誤加算される | `sed -n '238,246p' src/backend/index.ts` | 反証失敗（`base_points = 0` のため `COALESCE` で 0 計算） (`src/backend/index.ts:L240`, [EV-3]) |

---

## 6. 差し戻し要求（REFUTED の場合）
なし（`SURVIVED` のため差し戻しなし）。

---

## 7. 未確認事項（E-4）
なし。全反証検証完了。

---

## 8. ゲート実行結果
```
$ ~/antigravity-agents/scripts/verify.sh adversary
========================================================
 verify.sh  role=adversary  base=HEAD  repo=game
 HEAD=416b07b  branch=main
========================================================
[PASS] gate-evidence      証跡フォーマット・鮮度・未確認記載の要件を満たしている
--------------------------------------------------------
RESULT: PASS  全ゲート通過（この出力を Artifact に貼付すること）
```
