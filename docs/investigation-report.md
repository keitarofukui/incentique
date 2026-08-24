# 調査報告レポート: 保護者機能によるポイント手動調整（加算・減算）機能の実現可能性と影響範囲調査

- 作成日時: 2026-08-24 15:48
- 対象リポジトリ/ブランチ: keitarofukui/incentique / main
- 対象コミット: 416b07b
- 上流 Artifact: なし

## 1. 結論サマリー
- 依頼内容: 保護者機能でポイント調整（ポイントをあげたり、減らしたり）ができるようにしたい。実現可能性・影響範囲・安全な設計案を調査。
- 【実測】現状の課題（1 行断定）: 保護者画面およびバックエンドに手動でポイントを加算・減算する機能・APIが存在せず、ポイント操作は自動処理のみに限定されている (`src/backend/index.ts:L398-L406`, [EV-2, EV-3, EV-6])。
- 【実測】修正・設計対象の主範囲: バックエンド新規API (`src/backend/index.ts:L1680-L1730`)、ポイント調整モーダル新規作成 (`src/frontend/components/AdjustPointsModal.tsx`)、保護者ポータル連携 (`src/frontend/components/ParentPortal.tsx:L640-L680`, `src/frontend/components/ParentMemberDashboardCard.tsx:L116-L126`)、およびログ表示・集計処理 (`src/frontend/components/PersonalStreakCard.tsx:L82-L91`, `src/frontend/components/Dashboard.tsx:L186`, `src/frontend/components/ReflectionView.tsx:L210`) [EV-3, EV-4, EV-5, EV-6]。
- 【実測】デグレなく改修可能か: **安全に実現可能**。新テーブル追加は不要で既存の `action_logs` テーブル（`category: 'parent_adjustment'`）と `users.current_points` を活用して監査性（理由と日時の記録）を担保しつつ、ストリーク・日次ボリュームボーナス計算に誤算入しない設計（`base_points = 0`）により既存ロジックへの副作用なく実装できる (`src/backend/index.ts:L238-L250`, [EV-2, EV-4, EV-7])。

## 2. 実測エビデンス

### [EV-1] 前提情報（リポジトリ状態）
$ git rev-parse --short HEAD && git branch --show-current && git status --short
416b07b
main

- 【実測】対象リポジトリは `keitarofukui/incentique` の `main` ブランチ、最新コミット `416b07b` である (`.git:L1`, [EV-1])。

### [EV-2] データベーススキーマ（users テーブルおよび action_logs テーブル定義）
$ sed -n '38,57p;110,125p' schema.sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  avatar TEXT DEFAULT '⚡',
  pin_code TEXT DEFAULT '1234',
  current_points INTEGER DEFAULT 0,
  last_action_date TEXT,
  current_streak_days INTEGER DEFAULT 0,
  last_50pt_date TEXT,
  current_50pt_streak_days INTEGER DEFAULT 0,
  last_100pt_date TEXT,
  current_100pt_streak_days INTEGER DEFAULT 0,
  last_300pt_bonus_date TEXT,
  last_500pt_bonus_date TEXT,
  last_1000pt_bonus_date TEXT,
  last_all_category_date TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS action_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  title_or_menu TEXT NOT NULL,
  review_text TEXT,
  earned_points INTEGER NOT NULL,
  -- ガチャ倍率・ボーナスを含まない素点。1日ボリュームボーナスの判定はこちらを使う
  base_points INTEGER,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_action_logs_user_cat_date ON action_logs (user_id, category, created_at);
CREATE INDEX IF NOT EXISTS idx_action_logs_user_date ON action_logs (user_id, created_at DESC);

- 【実測】ユーザーの所持ポイントは `users.current_points` に保持され、ポイント履歴・増減明細は `action_logs` テーブルで管理されている (`schema.sql:L38-L57`, `schema.sql:L110-L125`, [EV-2])。

### [EV-3] バックエンドにおける現在のポイント更新箇所
$ grep -rn "UPDATE users SET current_points" src/backend/
src/backend/index.ts:380:      await db.prepare('UPDATE users SET current_points = current_points + ? WHERE id = ?')
src/backend/index.ts:899:      await c.env.DB.prepare('UPDATE users SET current_points = current_points + ? WHERE id = ?')
src/backend/index.ts:1323:      'UPDATE users SET current_points = current_points + ? WHERE id = ?'
src/backend/index.ts:1357:        'UPDATE users SET current_points = MAX(0, current_points - ?) WHERE id = ?'
src/backend/index.ts:1703:      const deduction = await c.env.DB.prepare('UPDATE users SET current_points = current_points - ? WHERE id = ? AND current_points >= ?')

- 【実測】現在のポイント更新は「ストリークボーナス付与 (L380)」「クイズ正解 (L899)」「行動承認 (L1323)」「ログ削除取消 (L1357)」「ご褒美交換承認 (L1703)」の5箇所のみであり、保護者が任意の理由と数値で直接調整するエンドポイントは存在しない (`src/backend/index.ts:L380-L1703`, [EV-3])。

### [EV-4] ストリーク・日次素点集計ロジックにおける action_logs 参照クエリ
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

- 【実測】デイリー判定・中級/神ストリークの判定は `COALESCE(base_points, earned_points)` を合計して算出している (`src/backend/index.ts:L238-L250`, [EV-4])。保護者手動調整を `category = 'parent_adjustment'` かつ `base_points = 0` で記録すれば、子供の日次素点目標に誤って加算されることを防止できる (`src/backend/index.ts:L240-L246`, [EV-4])。

### [EV-5] フロントエンドにおけるログ表示の「+」記号ハードコード箇所
$ grep -rnE "\+\{.*(earned_points|points).*\}" src/frontend/
src/frontend/components/ReflectionView.tsx:210:                  <span className="text-xs font-mono font-black text-amber-400">+{item.earned_points || 0} pt</span>
src/frontend/components/ReflectionView.tsx:330:                    +{log.earned_points} pt
src/frontend/components/Dashboard.tsx:186:                  <span className="font-mono font-black text-amber-400 text-sm">+{log.earned_points} pt</span>
src/frontend/components/TrainingModal.tsx:240:                +{selectedMenu?.default_points || 50} pt
src/frontend/components/TrainingModal.tsx:323:                      +{menu.default_points || 50} pt
src/frontend/components/ParentPortal.tsx:680:                                  +{log.earned_points}
src/frontend/components/HouseworkModal.tsx:165:                      +{menu.default_points} pt

- 【実測】`ParentPortal.tsx` (L680), `Dashboard.tsx` (L186), `ReflectionView.tsx` (L210, L330) において獲得ポイント表示に `+` 記号が直接ハードコードされており、ポイント減算（マイナス値）時に `+-50` や不自然な表示になる課題が存在する (`src/frontend/components/ParentPortal.tsx:L680`, [EV-5])。

### [EV-6] 保護者ポータルのメンバーカードおよびUI現状
$ sed -n '116,126p;256,268p' src/frontend/components/ParentMemberDashboardCard.tsx
        {/* POINTS SUMMARY (Total & Today) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-1">
            <div className="text-xs font-bold text-slate-400 flex items-center gap-1">
              <span>所持pt</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
              {(user.current_points || 0).toLocaleString()} <span className="text-xs text-amber-300">pt</span>
            </div>
          </div>

      {/* QUICK ACTION FOOTER */}
      <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2 mt-4">
        <button
          onClick={() => onSelectUserFilter(user.id, 'requests_logs')}
          className="flex-1 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/80 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
        >
          <History className="w-3.5 h-3.5 text-amber-400" />
          <span>活動履歴・申請を見る</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>
    </div>
  );

- 【実測】保護者ダッシュボードの各メンバーカードには「所持pt」と「活動履歴・申請を見る」ボタンのみが存在し、ポイントを調整するための導線が存在しない (`src/frontend/components/ParentMemberDashboardCard.tsx:L116-L126`, [EV-6])。

### [EV-7] プロダクションビルドおよび型チェック検証
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
✓ built in 1.47s

- 【実測】現状のコードベースにおいてビルド・TypeScript型チェックともに正常に通過する (`package.json:L6-L8`, [EV-7])。

### [EV-8] 開発サーバーHTTP応答 (curl -i)
$ curl -i -s "http://localhost:5173" | head -n 15
HTTP/1.1 200 OK
Vary: Origin
Content-Type: text/html
Cache-Control: no-cache
Etag: W/"325-sW0Uvoamb6TjT6sqDTEHc4YSVZM"
Date: Mon, 24 Aug 2026 06:48:08 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 805

<!doctype html>
<html lang="ja">
  <head>
    <script type="module">import { injectIntoGlobalHook } from "/@react-refresh";
injectIntoGlobalHook(window);

- 【実測】開発サーバーはHTTP 200 OKで応答している (`index.html:L1-L15`, [EV-8])。

## 3. 該当コードの直接引用

`src/backend/index.ts:L1702-L1715`
```ts
    if (deductPoints > 0) {
      const deduction = await c.env.DB.prepare('UPDATE users SET current_points = current_points - ? WHERE id = ? AND current_points >= ?')
        .bind(deductPoints, wish.user_id, deductPoints)
        .run();

      if (!deduction.meta?.changes) {
        return c.json({ success: false, error: 'ポイントが不足しているため引き落とせませんでした' }, 400);
      }
    }

    // 実際に引いた額と日時を残す。残高の突き合わせと承認履歴の両方でこれを使う。
    await c.env.DB.prepare(
      "UPDATE wish_items SET is_approved = 1, is_claimed = 1, approved_points = ?, approved_at = datetime('now') WHERE id = ?"
    ).bind(deductPoints, id).run();
```
- 【実測】ご褒美交換承認時と同様に、残高チェックを伴う条件付き更新 (`current_points >= ?`) と整合性ログ記録が実装パターンとして確立されている (`src/backend/index.ts:L1702-L1715`) [EV-3]。

`src/frontend/components/ParentPortal.tsx:L678-L682`
```tsx
                                <td className="py-2.5 text-right font-mono font-black text-emerald-400">
                                  +{log.earned_points}
                                </td>
```
- 【実測】保護者ポータルの履歴一覧で `+{log.earned_points}` が固定されており、正負符号に応じた色分け（プラス: 緑、マイナス: 赤）とフォーマットが必要である (`src/frontend/components/ParentPortal.tsx:L678-L682`) [EV-5]。

## 4. 根本原因（なぜなぜ）
- Why1: 保護者が子供に任意のポイントをあげたり減らしたりできない。 ← [EV-3, EV-6]
- Why2: システムが「クイズ正解」「定型メニュー行動」「ご褒美申請承認」という自動計算フローのみを前提に組まれており、保護者主導の手動調整APIおよびUIが未実装なため。 ← [EV-2, EV-3]
- Why3: 特別なお手伝いやリアルのご褒美手渡し、ペナルティ等の柔軟な運用を想定した設計が初期仕様に含まれていなかったため。 ← [EV-3, EV-6]
- Why4: 手動調整時の監査ログ（いつ・誰が・何の理由で・何pt増減させたか）を残すデータ設計およびUIコンポーネントが用意されていなかったため。 ← [EV-2, EV-4]
- Why5（根本原因）: 保護者権限による「手動ポイント増減操作」のエンドポイント (`/api/parent/adjust-points`)、理由入力を含むモーダルUI (`AdjustPointsModal`)、および正負両対応の履歴表示基盤が未構築であったため。

## 5. 影響範囲（全数）
検索コマンド `grep -rnE "UPDATE users SET current_points|\+\{.*(earned_points|points).*\}" src/` によるヒット 12 件の全対象ファイル一覧 [EV-3, EV-5]:

| ファイルパス | ヒット件数 | 主な該当箇所と影響内容 |
| :--- | :--- | :--- |
| `src/backend/index.ts` | 5件 | 新規API `POST /api/parent/adjust-points` 実装、残高バリデーション、`action_logs` 記録 |
| `src/frontend/components/AdjustPointsModal.tsx` | 0件 (新規) | 【新規】加算/減算モード切替、プリセットptボタン、理由入力、調整後ptプレビュー機能を持つモーダル |
| `src/frontend/components/ParentPortal.tsx` | 1件 | モーダル状態管理、履歴テーブルのカテゴリ・正負符号（`+`/`-`）と色分け表示対応 |
| `src/frontend/components/ParentMemberDashboardCard.tsx` | 0件 | 「⚡ ポイント調整」ボタンの追加、カード内での調整モーダル起動 |
| `src/frontend/components/Dashboard.tsx` | 1件 | 子供ダッシュボードのアクティビティ履歴での正負符号表示対応 |
| `src/frontend/components/ReflectionView.tsx` | 2件 | 振り返り画面での履歴表示における正負符号対応 |
| `src/frontend/components/TrainingModal.tsx` | 2件 | トレーニングpt表示（正値の正常確認） |
| `src/frontend/components/HouseworkModal.tsx` | 1件 | 家事pt表示（正値の正常確認） |
| `src/frontend/components/PersonalStreakCard.tsx` | 0件 | 本日のボーナス・獲得pt集計における `parent_adjustment` の正常ハンドリング |
| `src/frontend/types.ts` | 0件 | APIレスポンス型や調整リクエスト型の定義追加 |

合計ヒット 12 件を全数特定完了。

## 6. 二次被害リスク候補（G-7）
| リスク経路 | 実測ヒット箇所 | 想定被害と対策 |
| :--- | :--- | :--- |
| 残高不足による所持ptマイナス化 | `UPDATE users SET current_points = current_points - ?` [EV-3] | 減算時に所持pt以上のポイントを引くとマイナス残高になり表示崩れや整合性破壊が起きる。対策: SQLの条件句 `AND current_points >= ?` およびバックエンド・フロント両面での残高バリデーションを必須化。 |
| 日次素点・ストリークへの誤算入 | `src/backend/index.ts:L240-L246` [EV-4] | 保護者が100pt付与したことで、子供が行動していないのに「中級ストリーク達成」や「300pt突破ボーナス」が誤発火する。対策: `action_logs` 記録時に `base_points = 0` とし、`category = 'parent_adjustment'` をストリーク集計除外対象にする。 |
| 理由不明なポイント変動による混乱 | `action_logs` テーブル [EV-2] | 理由を空で登録できると、後から子供や保護者が「なぜ増えた/減ったか」追跡できない。対策: 理由（メモ）の入力を推奨/必須化し、クイック選択タグ（「お手伝い」「テスト」「ペナルティ」等）を用意。 |
| 履歴UIでの符号バグ (`+-50pt`) | `ParentPortal.tsx:L680`, `Dashboard.tsx:L186` [EV-5] | `+{earned_points}` と固定されているため、減算時に `+-50` と崩れる。対策: 符号判定関数（`pts > 0 ? `+${pts}` : `${pts}``）を共通適用。 |

## 7. 否定された仮説（E-5・必須）
| 立てた仮説 | 検証コマンド | 棄却の根拠 |
| :--- | :--- | :--- |
| 専用の `point_adjustments` 新規DBテーブルを作成・マイグレーションする必要がある | `sed -n '110,125p' schema.sql` [EV-2] | 既存の `action_logs` テーブルに必要な全フィールド（`user_id`, `category`, `title_or_menu`, `review_text`, `earned_points`, `base_points`, `created_at`）が揃っており、新テーブル追加によるマイグレーションリスク（G-4）を冒さずとも既存テーブル活用で完全な履歴管理・整合性担保が可能なため棄却。 |
| 単に `users.current_points` だけを直接 UPDATE すれば最もシンプルに実現できる | `grep -rn "UPDATE users SET current_points" src/backend/` [EV-3] | 所持ポイント数値を直接書き換えるだけでは「いつ・何のために・何ポイント増減したか」の履歴が一切残らず、子供ダッシュボードや保護者ログに反映されず不透明になるため棄却。 |

## 8. 未確認事項（E-4）
| 未確認項目 | 確認手段 | ブロッカー理由 |
| :--- | :--- | :--- |
| 実機ブラウザでのモーダル操作感および誤操作防止確認ダイアログの挙動 | 設計・製造フェーズ後のブラウザ実機検証（G-13） | 本フェーズは調査フェーズであり、コード改変・新規コンポーネント実装は未実施のため。次フェーズにて確認。 |

## 9. 推奨アクション（方向性のみ・実装しない）
1. **バックエンド API の設計 (`POST /api/parent/adjust-points`)**:
   - `userId`, `amount` (正負の整数), `reason` (調整理由), `categoryLabel` を受け取る。
   - 減算時は `current_points >= |amount|` の残高バリデーションを行い、不足時は 400 エラーを返す。
   - `action_logs` に `category: 'parent_adjustment'`, `base_points: 0`, `status: 'approved'` で INSERT し、`users.current_points` を増減。
2. **ポイント調整モーダル (`AdjustPointsModal.tsx`) の新規作成**:
   - 「あげる（加算 🟢）」と「へらす（減算 🔴）」のタブ切替。
   - プリセットボタン (`+10`, `+50`, `+100`, `+300`, `+500` / `-10`, `-50`, `-100`, `-300`, `-500`)。
   - 理由テンプレート（「テスト頑張った」「特別なお手伝い」「ペナルティ」「リアルご褒美交換」等）と自由入力欄。
   - 調整後の予想所持ptのリアルタイム計算表示。
3. **保護者画面導線の設置**:
   - `ParentMemberDashboardCard.tsx` の所持pt表示横またはアクション欄に「⚡ ポイント調整」ボタンを配置。
4. **フロントエンドログ表示の正負両対応**:
   - `ParentPortal.tsx`, `Dashboard.tsx`, `ReflectionView.tsx` の `+{pts}` 表記を正負両対応・色分け表示に修正。

## 10. 品質ゲート実行結果（G-11）
```
$ ~/antigravity-agents/scripts/verify.sh investigate
========================================================
 verify.sh  role=investigate  base=HEAD  repo=game
 HEAD=416b07b  branch=main
========================================================
[PASS] gate-evidence      証跡フォーマット・鮮度・未確認記載の要件を満たしている
[PASS] gate-coverage      実測 8 件 / カテゴリ網羅 4/4
--------------------------------------------------------
RESULT: PASS  全ゲート通過（この出力を Artifact に貼付すること）
```
