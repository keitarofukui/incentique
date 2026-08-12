# 調査報告レポート: ダッシュボード連続記録（ストリーク）表示の非リセット問題

## 1. 調査目的 & 概要
ダッシュボード（PersonalStreakCard等）に表示されている連続記録日数（デイリー・中級・神ストリーク）について、放置等により連続が途絶えた場合でも `0日` にリセットされず、過去の記録（最終獲得時点の値）が表示され続けている問題の現状把握と原因究明。

---

## 2. 現状のコード構造・ファクト（事実）

### ① データベースおよびバックエンドの動作 (`src/backend/index.ts`)
- **更新タイミング**: 連続日数を更新する `updateStreaks()` 関数は、ユーザーが **新しいアクションログを投稿した時 (`POST /api/action-logs`) のみ** 呼び出されます。
- **リセット処理の不足**: 日付が変わった際や数日間放置された場合に、DB上の `current_streak_days`, `current_50pt_streak_days`, `current_100pt_streak_days` を `0` に自動更新・リセットする定時バッチや動的判定処理は存在しません。
- **ユーザー情報取得API**: `/api/users` や `/api/me` は、`users` テーブルに格納されている `current_streak_days` などのカラム値をそのまま返却します。

### ② ダッシュボード表示ロジック (`src/frontend/components/PersonalStreakCard.tsx`)
- `PersonalStreakCard.tsx` の 112行〜114行 では、`currentUser` から取得した値をそのまま表示変数に代入しています。
  ```tsx
  const streakDaily = currentUser.current_streak_days || 0;
  const streakMid = currentUser.current_50pt_streak_days || 0;
  const streakGod = currentUser.current_100pt_streak_days || 0;
  ```
- 最終活動日（`last_action_date` 等）と今日の論理日付（`todayLogicalDateStr()`）の日数差チェックを行っていないため、**最終活動が2日以上前であっても、DBに保存された過去の連続日数（例: 5日）がそのまま画面に表示**されます。

### ③ ライバルタブにおける算出ロジック (`src/frontend/components/RivalPulse.tsx`)
- 一方で `RivalPulse.tsx` の 213行〜225行 (`streakOf` 関数) では、過去のアクションログ履歴から直接連日連続性をチェックし、「今日または昨日に活動がなければ 0日」と計算するロジックが実装されています。

---

## 3. 分析・原因究明・影響範囲

### 原因
連続記録の保持・計算において、**「最後にアクションを行った時点での継続数」がDBに保存されたまま永続化され、未記録の日が数日続いても参照側の表示ロジックで日数の失効判定（論理日付差 `diff >= 2` で `0日` とみなす処理）を行っていないこと**が原因です。

### 連続記録が判定されるべき条件（論理日付ベース：朝4時区切り）
1. **本日すでに記録あり (`last_action_date === today`)**:
   - `current_streak_days` 日間連続が確定中。
2. **本日は未記録だが、昨日に記録あり (`last_action_date === yesterday`, 差が1日)**:
   - 今日記録すれば `current_streak_days + 1` 日目になる。
   - 現時点（今日が終わるまで）は `current_streak_days` 日間連続が維持されている（「今日記録しないと0日に戻る」警告状態）。
3. **昨日も本日も未記録 (`last_action_date < yesterday`, 差が2日以上)**:
   - 連続は**完全に途切れている**ため、有効な連続記録は **`0日`**。
   - 今日記録したとしても、過去の連続は失効しており `1日目` から再スタートとなる。

※ 中級ストリーク（`last_50pt_date`）および 神ストリーク（`last_100pt_date`）についても同様の判定が必要です。

---

## 4. 今後の推奨アクション（次のステップ案）

- [ ] `docs/design-spec.md` を作成し、論理日付の日数差判定ユーティリティおよび `PersonalStreakCard.tsx`（および必要に応じて `RivalPulse.tsx`）への動的補正適用設計を行う。
- [ ] 修正の製造・テスト・ビルド・`npm run deploy` および `git push` を実行する。
