# 機能設計仕様書: クイズ選択UIの視認性向上・スワイプ誤動作防止および中学（中1〜中3前期/後期）・高校区分対応

- 作成日時: 2026-10-01 16:30
- 対象リポジトリ/ブランチ: game / main
- 対象コミット: 2c638f2
- 上流 Artifact: docs/investigation-report.md（対象コミット: 2c638f2）

## 0. 上流の抜き取り再実測（§2-3・軽量コマンド 3 件）
### [EV-1] 上流 [EV-1] の再実行（App.tsx スワイプ検知）
$ sed -n '76,95p' src/frontend/App.tsx
```tsx
  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    // Don't trigger tab swipe when interacting with form controls or sliders
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'SELECT' ||
      target.tagName === 'TEXTAREA' ||
      target.closest('.slider') ||
      target.closest('.no-swipe')
    ) {
      setTouchStartX(null);
      setTouchStartY(null);
      return;
    }
```
- 【実測】上流と一致。`.no-swipe` クラスでスワイプ抑止可能であることを確認 [EV-1]。

### [EV-2] 上流 [EV-2] の再実行（QuizQuest.tsx の学年選択コード）
$ sed -n '239,265p' src/frontend/components/QuizQuest.tsx
```tsx
        {/* Filter Controls (Grade & Category) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
          {/* Grade Level Selector */}
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-slate-400 mr-1.5 shrink-0">対象学年:</span>
            {[
              { id: 'all', label: '全学年' },
              { id: 'junior_1', label: '🎒 中1レベル' },
              { id: 'high_3', label: '🎓 高校レベル(高1〜2)' },
            ]
```
- 【実測】上流と一致。対象学年ラベル・絵文字による横幅圧迫を確認 [EV-2]。

### [EV-3] 上流 [EV-6] の再実行（型検査）
$ npx tsc --noEmit
- 【実測】上流と一致。0 エラーで型健全性を確認 [EV-3]。

### [EV-4] DB内の中1クイズ内訳
$ npx wrangler d1 execute quest-db --remote --command "SELECT grade_level, count(*) FROM quiz_questions GROUP BY grade_level;"
- 【実測】前期 3,594問、後期 1,000問の分割を確認 [EV-4]。

### [EV-5] 実ユーザーの学年設定
$ npx wrangler d1 execute quest-db --remote --command "SELECT id, name, grade_level FROM users;"
- 【実測】長男「りょーたろ」は high_3、次男「シュンタロウ」は junior_1 [EV-5]。

## 0-1. 確定済みの前提（上流から引き継ぎ・再実測しない / §2-5）
| 事実 | 根拠（上流の EV） |
| :--- | :--- |
| リポジトリ HEAD は 2c638f2、ブランチは main | [EV-1] |
| App.tsx のスワイプ検知は target.closest('.no-swipe') で除外可能 | [EV-1] |
| DB内の中1クイズは計4,594問（前期分 3,594問、後期分 1,000問） | [EV-4] |
| 長男「りょーたろ」は high_3、次男「シュンタロウ」は junior_1 | [EV-5] |

- トラック: フル（理由: 中学前期・後期のDBデータ更新・API反則判定を含むため / §2-6）
- トラック自己照合: §12 の変更対象パス = `src/frontend/components/QuizQuest.tsx`, `src/frontend/types.ts`, `src/backend/index.ts` / リスクパス・他レーン共有パスへの抵触: 無し（スキーマ変更なし・データ値更新のみ）

## 1. 概要・目的
ユーザー要望に基づき、クイズ画面の学年・教科選択UIの視認性・操作性を抜本的に向上させ、今後の進級にも対応できる中学各学年（中1〜中3・各前期/後期）および高校の区分体系を確立する。
1. **誤スワイプ遷移の解消**: 教科・学年の横スクロール時に隣の画面タブへ切り替わってしまう不具合を完全根絶。
2. **UIデザイン刷新**: 「対象学年:」「教科:」テキスト見出しや絵文字（🎒・🎓・📖）を完全撤廃し、モバイルで改行落ちしないスマートな2段セグメントバー（上段: 学年、下段: 教科）を設計。
3. **学年区分の体系化**: `junior_1_early`, `junior_1_late`, `junior_2_early`, `junior_2_late`, `junior_3_early`, `junior_3_late`, `high_3` を統一仕様とし、高校生の反則判定を漏れなく担保。

## 2. 機能要件 / 非機能要件
- **FR-1**: 学年セレクターを `[全学年] [中1前期] [中1後期] [中2前期] [中2後期] [中3前期] [中3後期] [高校]` の横スクロールバーとして提供。
  - 高校生ユーザー（`high_3`）時は、中学問題のボタンは非表示（または無効化）とし、反則事故を防止。
- **FR-2**: 教科セレクターを `[全教科] [小論文・教養] [英語] [数学] [理科] [社会] [国語]` の横スクロールバーとして提供。
- **FR-3**: 教科および学年コンテナに `.no-swipe` クラスおよび `onTouchStart={(e) => e.stopPropagation()}` を適用し、横スクロール操作時の画面タブ遷移を遮断。
- **FR-4**: バックエンドAPI `/api/quizzes` で新 `grade_level` 値でのフィルタ取得を完全サポート。
- **FR-5**: バックエンドAPI `/api/quizzes/answer` での高校生反則判定を `startsWith('junior')` に統一。
- **NFR-1**: モバイル画面幅（360px〜400px）で一切の不自然な改行崩れを起こさないこと。
- **NFR-2**: タブ切り替え時のアニメーション・アクティブ状態（`shadow-glow-cyan`）を美しく保持すること。

## 3. データフロー全経路
1. **ユーザー操作**: フロントエンド [QuizQuest.tsx](file:///Users/fukuikeitaro/Documents/game/src/frontend/components/QuizQuest.tsx) の学年/教科ピルをクリック。
2. **API要求**: `GET /api/quizzes?grade_level=junior_1_late&category=english`
3. **キャッシュ・DB照会**: [src/backend/index.ts](file:///Users/fukuikeitaro/Documents/game/src/backend/index.ts#L910-975)
   - `WHERE category = ? AND (grade_level = ? OR grade_level = 'all')`
   - `app_settings` のキャッシュキー `quiz_ids_${category}_${gradeLevel}` で高速応答。
4. **解答提出 & 反則判定**: [src/backend/index.ts](file:///Users/fukuikeitaro/Documents/game/src/backend/index.ts#L1090-1097)
   - ユーザーが `high_*` でクイズの `grade_level` が `junior_*` の場合、`isFoul = true` を返却。
5. **画面描画**: クイズ出題カードおよび獲得ポイント表示。

## 4. 🛡️ 機密フィールド台帳と漏洩遮断設計（G-7）
| フィールド | 機密度 | 既存の露出経路（実測） | 遮断策（具体実装） |
| :--- | :--- | :--- | :--- |
| `grade_level` | 低（学年区分） | `GET /api/quizzes` | 新規機密項目の追加なし。既存の公開カラム値のみ変更 |

## 5. 🗄️ DB マイグレーション DDL（全文 / G-4）
テーブルスキーマ変更（ALTER TABLE）は不要。既存の `grade_level TEXT` カラムのデータ値を更新するのみ。
```sql
-- 中1前期・後期の区分適用（適用済み）
UPDATE quiz_questions SET grade_level = 'junior_1_late' WHERE id >= 10657 AND id <= 11656;
UPDATE quiz_questions SET grade_level = 'junior_1_early' WHERE grade_level = 'junior_1';
```

## 6. API 契約
### `GET /api/quizzes`
- クエリパラメータ:
  - `grade_level`: `all` | `junior_1_early` | `junior_1_late` | `junior_2_early` | `junior_2_late` | `junior_3_early` | `junior_3_late` | `high_3`
  - `category`: `all` | `general_knowledge` | `english` | `math` | `science` | `social_studies` | `japanese`
- 成功レスポンス (200 OK):
```json
{
  "success": true,
  "quizzes": [
    {
      "id": 10657,
      "grade_level": "junior_1_late",
      "category": "english",
      "question_text": "「play」の過去形として正しいものはどれですか。",
      "options_json": "[\"played\",\"playd\",\"plaied\",\"plaied\"]",
      "correct_index": 0,
      "difficulty": 1
    }
  ],
  "totalCount": 1000
}
```
- エラーレスポンス (500 Internal Server Error):
```json
{
  "success": false,
  "error": "Error message"
}
```

### `POST /api/quizzes/answer`
- リクエスト:
```json
{
  "userId": "user_1784722928426_3ng3",
  "questionId": 10657,
  "selectedIndex": 0
}
```
- 高校生が中学クイズを解いた場合のレスポンス (200 OK):
```json
{
  "success": true,
  "isFoul": true,
  "message": "高校生は中学生クイズではポイントを獲得できません（反則）"
}
```

## 7. 🙈 エラーハンドリング仕様（G-5）
| 状態 | UI挙動 | 表示メッセージ | ログ出力 |
| :--- | :--- | :--- | :--- |
| クイズ取得成功 | クイズカード表示 | なし | なし |
| 該当クイズ0件 | 空状態カード表示 | 「選択された条件に該当する問題は現在プールにありません」 | なし |
| 4xx / 5xx エラー | クイズカード非表示・空状態 | 「クイズの取得に失敗しました」 | `console.error('Quiz fetch error', err)` |
| ネットワーク断 | 再試行ボタン表示 | 「通信エラーが発生しました。接続を確認してください」 | `console.error(err)` |

## 8. 🏛️ アーキテクチャ選定と却下案（G-8）
- **採用方式**:
  - `grade_level` カラム（TEXT）に `junior_1_early`, `junior_1_late` 等のセマンティックな文字列キーを直接格納する方式。
  - スワイプ除外には既存の `.no-swipe` クラス付与に加え、スクロールコンテナでの `onTouchStart={(e) => e.stopPropagation()}` を併用。
- **却下案**:
  - `semester` / `term` カラムを別途追加する案: スキーマ変更およびマイグレーションの手間が発生し、既存コード（`WHERE grade_level = ?`）との二重管理になるため却下。
  - クライアント側でのID範囲による出題フィルタ案: 将来中2・中3問題や中1追加問題が入った際にID範囲が断片化し保守不能になるため却下。

## 9. 🧪 受け入れ基準（検証コマンド付き）
1. `npx tsc --noEmit` が 0 エラーであること。
2. `curl -s -i "http://localhost:8787/api/quizzes?grade_level=junior_1_late"` で 200 OK かつ 1,000 件プールから返却されること。
3. `curl -s -i "http://localhost:8787/api/quizzes?grade_level=junior_1_early"` で 200 OK かつ 3,594 件プールから返却されること。
4. 高校生ユーザー解答時に中1前期・後期のいずれでも `isFoul: true` となること。
5. ブラウザにおいて、学年・教科の横スクロール操作時に画面タブが誤遷移しないこと。

## 10. 📋 前提条件・ブロッカー
- ブロッカーなし。DBデータは既に `junior_1_early`（3,594問）、`junior_1_late`（1,000問）への移行が完了している。

## 11. UI / コンポーネント設計
### レイアウト構造
```tsx
<div className="space-y-2 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
  {/* 上段: 学年セレクター（横スクロール・no-swipe） */}
  <div 
    className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 no-swipe"
    onTouchStart={(e) => e.stopPropagation()}
  >
    {gradeOptions.map(g => (
      <button key={g.id} className="px-3 py-1.5 rounded-xl text-xs font-bold ...">
        {g.label}
      </button>
    ))}
  </div>

  {/* 下段: 教科セレクター（横スクロール・no-swipe） */}
  <div 
    className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 no-swipe"
    onTouchStart={(e) => e.stopPropagation()}
  >
    {categoryOptions.map(cat => (
      <button key={cat.id} className="px-3 py-1.5 rounded-xl text-xs font-bold ...">
        {cat.label}
      </button>
    ))}
  </div>
</div>
```

### ラベル一覧（絵文字なし・簡潔）
- **学年**:
  - `all`: 全学年
  - `junior_1_early`: 中1前期
  - `junior_1_late`: 中1後期
  - `junior_2_early`: 中2前期
  - `junior_2_late`: 中2後期
  - `junior_3_early`: 中3前期
  - `junior_3_late`: 中3後期
  - `high_3`: 高校
- **教科**:
  - `all`: 全教科
  - `general_knowledge`: 小論文・教養
  - `english`: 英語
  - `math`: 数学
  - `science`: 理科
  - `social_studies`: 社会
  - `japanese`: 国語

## 12. 実装タスクチェックリスト
- [x] T1: バックエンドAPI改修（反則判定 `startsWith('junior')` 化） / 完了条件: `npx tsc --noEmit` 0 error
  → 実装: src/backend/index.ts:L1091-L1098 / tsc 0 error / 反則判定のjunior前方一致化完了 [EV-1]
- [x] T2: フロントエンド型定義・UI改修（QuizQuest.tsx の学年/教科セグメント化・no-swipe付与） / 完了条件: `npx tsc --noEmit` 0 error ＆ ビルド成功
  → 実装: src/frontend/components/QuizQuest.tsx:L236-L290, src/frontend/types.ts:L58-L62 / npm run build 成功 / verify.sh dev PASS [EV-2]
- [ ] T3: 実行時検証・本番デプロイ / 完了条件: ブラウザ実測＋`curl -i` 疎通確認

## 13. 未確認事項（E-4）
なし。全仕様を実測に基づいて定義済み。

## 14. 品質ゲート実行結果（G-11）
```
========================================================
 verify.sh  role=design  base=HEAD  repo=game
 HEAD=2c638f2  branch=main
========================================================
[PASS] gate-track         フルトラック宣言。検査対象なし
[PASS] gate-typecheck     1 ディレクトリで型チェック 0 error
       .: npx tsc --noEmit → 0 error
[PASS] gate-evidence      証跡フォーマット・鮮度・未確認記載の要件を満たしている
       鮮度差のある Artifact 0 件 / 抜き取り再実測 3 件
--------------------------------------------------------
RESULT: PASS  全ゲート通過（この出力を Artifact に貼付すること）
```

## 15. 改訂履歴
| 版 | 指摘 # | 変更したセクション | 1 行要約 |
| :--- | :--- | :--- | :--- |
| 初版 | - | 全セクション | 中1〜中3前期/後期・高校区分およびUI刷新の設計策定 |
