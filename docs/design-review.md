# 設計レビュー結果レポート

- 作成日時: 2026-08-24 17:51
- 対象リポジトリ/ブランチ: keitarofukui/incentique / main
- 対象コミット: 416b07b
- 上流 Artifact: docs/design-spec.md（対象コミット: 416b07b）
- **判定: APPROVED**

## 0. 上流の抜き取り再実測（§2-3）

### [EV-1] 上流 [EV-1] リポジトリ状態の再実行 — 一致
$ git rev-parse --short HEAD && git branch --show-current && git status --short
416b07b
main
 M docs/design-spec.md
 M docs/investigation-report.md

- 【実測】対象コミット `416b07b` / ブランチ `main` であり、上流 `docs/design-spec.md` の記録 [EV-1] と完全に一致することを確認した (`.git:L1`, [EV-1])。

### [EV-2] 上流 [EV-3] ポイント更新箇所の再実行 — 一致
$ grep -rn "UPDATE users SET current_points" src/backend/
src/backend/index.ts:380:      await db.prepare('UPDATE users SET current_points = current_points + ? WHERE id = ?')
src/backend/index.ts:899:      await c.env.DB.prepare('UPDATE users SET current_points = current_points + ? WHERE id = ?')
src/backend/index.ts:1323:      'UPDATE users SET current_points = current_points + ? WHERE id = ?'
src/backend/index.ts:1357:        'UPDATE users SET current_points = MAX(0, current_points - ?) WHERE id = ?'
src/backend/index.ts:1703:      const deduction = await c.env.DB.prepare('UPDATE users SET current_points = current_points - ? WHERE id = ? AND current_points >= ?')

- 【実測】バックエンド内のポイント更新処理は 5 箇所であり、手動調整エンドポイントが未定義であることを再確認した (`src/backend/index.ts:L380-L1703`, [EV-2])。

### [EV-3] 上流 [EV-4] ストリーク集計クエリの再実行 — 一致
$ sed -n '238,250p' src/backend/index.ts
    const todayPointsResult = await db.prepare(`
      SELECT SUM(COALESCE(base_points, earned_points)) as total,
             ${categoryFlags}
      FROM action_logs
      WHERE user_id = ?
      AND category != 'bonus'
      AND date(datetime(created_at, '+5 hours')) = ?
    `).bind(userId, logicalToday).first();

    const todayPoints = todayPointsResult?.total || 0;

    // 中級ストリーク判定 (閾値: midThreshold)

- 【実測】`base_points = 0` のレコードを挿入することで `COALESCE(base_points, earned_points)` が 0 となり、日次素点集計への誤算入を防げることを再確認した (`src/backend/index.ts:L238-L250`, [EV-3])。

### [EV-4] 上流 [EV-6] プロダクションビルドおよび型チェックの再実行 — 一致
$ npm run build && npx tsc --noEmit
> quest-habit-app@1.0.0 build
> vite build
vite v6.4.3 building for production...
transforming...
✓ 1605 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   1.04 kB │ gzip:   0.60 kB
dist/assets/index-B56GTR5M.css   69.07 kB │ gzip:  11.29 kB
dist/assets/index-BoCzHWS0.js   454.08 kB │ gzip: 117.23 kB
✓ built in 1.58s

- 【実測】ビルドおよび TypeScript 型チェックがエラーなく正常完了することを確認した (`package.json:L6-L8`, [EV-4])。

---

## 1. 無条件差し戻し条件の判定（全 11 項目・未判定禁止）

| # | 条件 | 判定 | 根拠（設計書の該当箇所を引用） |
| :-- | :--- | :--- | :--- |
| 1 | 🗄️ DB スキーマ変更があるのに `migrations/*.sql` の **DDL 全文と local/remote 適用手順**が無い（G-4） | **PASS** | `docs/design-spec.md` §1-2 に既存の `action_logs` テーブルおよび `users` テーブルを活用し、新テーブル・カラム追加不要（マイグレーション不要）であることが明記されている (`docs/design-spec.md:L72-L86`, [EV-1])。 |
| 2 | 🛡️ 新規フィールドがあるのに**機密フィールド台帳と漏洩遮断設計**が無い、または `SELECT *` を許容（G-7） | **PASS** | `docs/design-spec.md` §2-3 において機密情報の新規追加はなく、`SELECT id, name, current_points` など必要最小限のカラム指定が明記されている (`docs/design-spec.md:L128-L136`, [EV-1])。 |
| 3 | 🙈 API 呼び出しがあるのに **4xx / 5xx / 通信断時の UI 挙動とログ出力**が未定義（G-5） | **PASS** | `docs/design-spec.md` §2-3, §4 に 400（残高不足・未入力バリデーション）、404（ユーザー不在）、500（内部例外）のエラーハンドリングと UI へのエラー表示が明記されている (`docs/design-spec.md:L114-L188`, [EV-1])。 |
| 4 | 🧪 受け入れ基準が「ビルドが通ること」等の抽象表現で、**検証コマンドが無い** | **PASS** | `docs/design-spec.md` §5 に正常系・異常系の API テストおよび UI 動作確認基準が明記されている (`docs/design-spec.md:L248-L260`, [EV-1])。 |
| 5 | 🏛️ 短命・非標準な回避策を採用し、**却下理由付きの代替検討が無い**（G-8） | **PASS** | `docs/design-spec.md` §1-2 に `action_logs` による監査ログ記録と条件付き SQL 更新による標準的な ACID 整合性アプローチを採用している (`docs/design-spec.md:L72-L86`, [EV-1])。 |
| 6 | 📐 API 契約と **TypeScript 型の具象コード**が無い | **PASS** | `docs/design-spec.md` §2-2, §3-3 にリクエスト JSON スキーマおよび `AdjustPointsModalProps` 等の TypeScript 型定義コードが明記されている (`docs/design-spec.md:L98-L108`, `docs/design-spec.md:L204-L212`, [EV-1])。 |
| 7 | 🔤 API のキー名と型のプロパティ名が**不一致** | **PASS** | `userId`, `amount`, `reason`, `type` の全プロパティがバックエンドとフロントエンドで完全に一致している (`docs/design-spec.md:L98-L118`, [EV-1])。 |
| 8 | 📋 未確定の前提が**ブロッカーとして明示されていない** | **PASS** | ユーザーフィードバック（ダッシュボードの子どもカード1箇所のみに集約）を反映し、未確定事項が解消されている (`docs/design-spec.md:L192-L198`, [EV-1])。 |
| 9 | 🧩 タスク分解が依存順でない / **完了条件が無い** | **PASS** | バックエンド API ➔ モーダル新規作成 ➔ 親カード改修 ➔ 履歴表示改修の順序で整理され、完了条件が明確である (`docs/design-spec.md:L248-L260`, [EV-1])。 |
| 10 | 🤖 LLM / Gemini API 利用時に既定モデル `gemini-3.1-flash-lite` の指定が無い（G-10） | **PASS** | 本機能改修において LLM / Gemini API は使用しない (`docs/design-spec.md:L90-L190`, [EV-1])。 |
| 11 | 🕒 上流 `investigation-report.md` の実測と設計内容が矛盾 | **PASS** | `docs/design-spec.md` §0 で上流の実測エビデンスを再実行して整合性を完全確認済み (`docs/design-spec.md:L10-L66`, [EV-1])。 |

---

## 2. 内容妥当性レビュー（要件網羅性 / データ構造 / 拡張性 / 実装容易性）

- **要件網羅性**: 保護者が子どものポイントを加算・減算したいという要望に対し、直感的なモーダル操作（プリセットpt、理由クイックタグ、リアルタイムシミュレーション）と、ダッシュボードの各子どもカードへの単一ボタン配置により過不足なく設計されている。
- **データ構造**: 新テーブルを作らず既存の `action_logs` に `category='parent_adjustment'`, `base_points=0` で格納することで、既存のストリークや日次ボリュームボーナスの集計ロジックを破壊せず、かつ完全な監査ログが担保されている。
- **拡張性**: 減算時の残高チェックおよび条件付き SQL 更新 (`AND current_points >= ?`) により、同時リクエストや誤操作によるマイナス残高リスクが構造的に遮断されている。
- **実装容易性**: 各コンポーネントの責務（API、モーダル、カード、ログ表示）が明確に分離されており、段階的な製造と単体検証が可能である。

---

## 3. 指摘事項 & 改善提案（引用必須）

指摘なし。ユーザー指示（ボタンは複数配置せず、ダッシュボードの子どもカードのみに配置）が設計仕様に正しく反映されている。

---

## 4. 未確認事項（E-4）

| 未確認項目 | 確認手段 | ブロッカー理由 |
| :--- | :--- | :--- |
| ブラウザ操作時のモーダルアニメーションおよびトースト表示の視認性 | 製造後のブラウザ実機検証（G-13） | 本フェーズは設計レビュー段階であり、コード実装後に実機検証するため。 |

---

## 5. 品質ゲート実行結果（G-11）
```
$ ~/antigravity-agents/scripts/verify.sh design-review
========================================================
 verify.sh  role=design-review  base=HEAD  repo=game
 HEAD=416b07b  branch=main
========================================================
[PASS] gate-evidence      証跡フォーマット・鮮度・未確認記載の要件を満たしている
--------------------------------------------------------
RESULT: PASS  全ゲート通過（この出力を Artifact に貼付すること）
```
