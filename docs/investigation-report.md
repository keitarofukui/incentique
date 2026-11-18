# 調査報告レポート: 中学1年 定期テスト4期間×全9教科（主要5＋副教科4）対応

- 作成日時: 2026-11-18 15:01
- 対象リポジトリ/ブランチ: game / main
- 対象コミット: 4c46251
- トラック: ミドル

## 1. 結論サマリー
- 依頼内容: 次男（中1・二期制）の定期テスト対策として、前期中間/前期期末/後期中間/後期期末の4期間ごとに主要5教科＋副教科4教科（音楽・美術・保健体育・技術家庭）の予想問題（全問解説付き）と25問模擬試験モードを追加する。
- 【実測】現状構造（1 行断定）: 現行システムには副教科4カテゴリ（`music`, `art`, `pe`, `tech_home`）、4期間区分（`junior_1_early_mid` 等）、および学校定期テスト用の模擬試験分岐が存在しない [EV-1] [EV-2]。
- 【実測】修正すべき箇所: `src/backend/index.ts:L960-1255`、`src/frontend/types.ts:L59-105`、`src/frontend/components/QuizQuest.tsx:L40-360`、`src/frontend/components/MockExamView.tsx:L1-210`、および `scripts/seeds/`
- トラック: ミドル（既存スキーマをそのまま利用し、API/UI 拡張＋新規問題シード追加のため / §2-6）

## 1-1. 確定済みの前提（下流は再実測しない / §2-5）
| 事実 | 根拠 | 重い実測か |
| :--- | :--- | :--- |
| `quiz_questions` テーブルには既に `explanation`, `image_key` カラムが local/remote 双方に存在 | 自動車学校実装時確認（`4c46251`） | はい |
| 既存 `junior_1_*` 問題に副教科（`music`, `art`, `pe`, `tech_home`）は 0 件 | [EV-2] | はい |
| `scripts/seeds/*.sql` は `gate-diffsize.sh`（400 行上限）の除外対象 | `gate-diffsize.sh:L15-20` | - |

## 2. 実測エビデンス
### [EV-1] `junior_1` 関連コードの全数検索
$ grep -rn "junior_1" src/
src/frontend/types.ts:29:  grade_level: 'high_3' | 'junior_1' | 'other';
src/frontend/components/QuizQuest.tsx:60:      case 'junior_1_early': return '中1前期';
src/frontend/components/QuizQuest.tsx:61:      case 'junior_1_late': return '中1後期';
src/frontend/components/QuizQuest.tsx:308:              { id: 'junior_1_early', label: '中1前期' },
src/frontend/components/QuizQuest.tsx:309:              { id: 'junior_1_late', label: '中1後期' },
…(中略: 計 13 件)
- 【実測】`users.grade_level` は `'junior_1'` である一方、クイズデータ側は `junior_1_early` / `junior_1_late` のように細分化されている [EV-1]。

### [EV-2] remote D1 既存の中1問題カテゴリ分布
$ npx wrangler d1 execute quest-db --remote --command "SELECT category, grade_level, COUNT(*) as cnt FROM quiz_questions WHERE grade_level LIKE 'junior_1%' GROUP BY category, grade_level;"
┌────────────────┬────────────────┬─────┐
│ category       │ grade_level    │ cnt │
├────────────────┼────────────────┼─────┤
│ english        │ junior_1_early │ 768 │
│ english        │ junior_1_late  │ 200 │
…(中略: 主要5教科のみ計 4,594 問、副教科 0 件)
- 【実測】主要5教科の中1前期/後期は存在するが、4期間（中間/期末）区分と副教科4教科は存在しない [EV-2]。

### [EV-3] ビルド・型チェック実測
$ npx tsc --noEmit && npm run build
✓ 1609 modules transformed.
✓ built in 1.46s
- 【実測】現在のビルドおよび型チェックはエラー 0 である [EV-3]。

### [EV-4] DB スキーマ（PRAGMA table_info）
$ npx wrangler d1 execute quest-db --remote --command "PRAGMA table_info(quiz_questions);"
│ 8   │ explanation   │ TEXT     │ 0       │ null              │ 0  │
│ 9   │ image_key     │ TEXT     │ 0       │ null              │ 0  │
…(0〜7 省略)
- 【実測】`explanation`, `image_key` を含む全 10 カラムが存在し、マイグレーション追加不要 [EV-4]。

### [EV-5] 本番 API 実応答
$ curl -i -s "https://quest-habit-app.keitaro-fukui.workers.dev/api/quizzes/mock?examType=karimen" | head -n 12
HTTP/2 200 
content-type: application/json
…(中略)
- 【実測】現在の本番環境は HTTP 200 で正常稼働中である [EV-5]。

## 3. 該当コードの直接引用
`src/backend/index.ts:L969-972`
```ts
    if (!isDriving && gradeLevel && gradeLevel !== 'all' && gradeLevel !== 'other') {
      studyWhere += " AND (grade_level = ? OR grade_level = 'all')";
      studyParams.push(gradeLevel);
    }
```
- 【実測】`grade_level = ?` の完全一致のみのため、ユーザー初期値 `junior_1` で検索すると `junior_1_early` 等がヒットしない（`src/backend/index.ts:L969-972`）。

## 4. 根本原因（なぜなぜ）
- Why1: 中1の4期間別・9教科別の定期テスト対策と25問模試が実行できない ← [EV-1] [EV-2]
- Why2: `MockExamView` / `GET /api/quizzes/mock` が `karimen` / `honmen` のみを受け付ける設計になっている ← `src/backend/index.ts:L1110-1114`
- Why3: 副教科4教科の問題データと4期間（`junior_1_early_mid` 等）のシードが未作成である ← [EV-2]

## 5. 影響範囲（全数）
- 検索コマンド: `grep -rn "junior_1" src/` → ヒット 13 件、およびクイズ関連 5 ファイル:
| ファイル | 該当箇所 | 影響内容 |
| :--- | :--- | :--- |
| `src/backend/index.ts` | `L940-1255` | `junior_1` 前方一致対応、副教科ラベル、`examType='school'` 模試・採点対応 |
| `src/frontend/types.ts` | `L59-105` | `MockExamResponse` / `MockSubmitRequest` に `'school'`・`subject`・`gradeLevel` 追加 |
| `src/frontend/components/QuizQuest.tsx` | `L40-360` | 4期間タブ・副教科4カテゴリタブ追加 |
| `src/frontend/components/MockExamView.tsx` | `L1-210` | 中学定期テスト模試（4期間×9教科、25問・20分・80点合格）選択 UI 追加 |
| `scripts/seeds/` | 新規 | 4期間×9教科 問題生成・検証・SQL 出力スクリプト |

## 6. 二次被害リスク候補（G-7）
| リスク経路 | 実測ヒット箇所 | 想定被害 |
| :--- | :--- | :--- |
| 既存の運転免許模試・5教科通常出題への影響 | `src/backend/index.ts:L945-965` | `driving_%` 除外条件を維持しないと通常学習に混入する。 |

## 7. 否定された仮説（E-5・必須）
| 立てた仮説 | 検証コマンド | 棄却の根拠 |
| :--- | :--- | :--- |
| 新規テーブルや DB カラム追加（マイグレーション）が必要である | `PRAGMA table_info(quiz_questions);` | 既存の `grade_level`, `category`, `explanation` カラムで 4期間×9教科をそのまま表現可能。 |

## 8. 未確認事項（E-4）
| 未確認項目 | 確認手段 | ブロッカー理由 |
| :--- | :--- | :--- |
| なし | - | - |

## 9. 推奨アクション（方向性のみ・実装しない）
1. `GET /api/quizzes` で `gradeLevel === 'junior_1'` 時は `LIKE 'junior_1%'` に対応させ、`QuizQuest.tsx` に中1の4期間（前期中間〜後期期末）と副教科4教科（音楽・美術・保健体育・技術家庭）を追加する。
2. `GET /api/quizzes/mock` と `POST /api/quizzes/mock-submit` に `examType=school`（25問・1問4点・20分・80点以上合格、全問やりきり完了 `+10pt` ＋ 合格さらに `+30pt`）を追加する。
3. API クレジット（`gemini-3.1-flash-lite`）で 4期間×9教科＝約 2,000問（全問解説付き）を生成・検証し、D1 へ投入する。

## 10. 品質ゲート実行結果（G-11）
$ /Users/fukuikeitaro/antigravity-agents/scripts/verify.sh investigate
========================================================
 verify.sh  role=investigate  base=HEAD  repo=game
 HEAD=4c46251  branch=main
========================================================
[PASS] gate-evidence      証跡フォーマット・鮮度・未確認記載の要件を満たしている
[PASS] gate-coverage      実測 5 件 / カテゴリ網羅 4/4
--------------------------------------------------------
RESULT: PASS  全ゲート通過（この出力を Artifact に貼付すること）
