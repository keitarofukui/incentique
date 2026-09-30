# 設計仕様書: UI横幅有効活用・不要な括弧（）及び冗長説明の削減

- 版数: v1.1
- 作成日時: 2026-09-30 19:35
- 対象リポジトリ/ブランチ: game / main
- 対象コミット: 2c17559
- 上流 Artifact: なし（直接設計）
- トラック: ライト

---

## 1. 目的とスコープ

### 1-1. 目的
スマホ縦画面（横幅375px〜390px）における画面領域の浪費を解消し、情報密度と可読性を向上させる。
1. **グラフタップ時詳細ログ**: クイズ問題文が実効幅約160px【推定】・2行制限で途切れ、肝心の内容が読めない問題を解消する。
2. **主な活動成果タイムライン**: タイトル内の不要な（）により3行折り返し【推定】が発生している問題と、生英単語露出・truncateによる文字切れを解消する。
3. **不要な（）表記・自明な説明文の削減**: 見れば自明な注釈（「自動算出！」等）や、不要な括弧（「(1pt+)」「(7掛け)」等）をスリム化する。

### 1-2. トラック選定理由
- 変更対象はフロントエンドUIコンポーネント（`src/frontend/components/`）のみ。
- スキーマ（DBマイグレーション）、機密フィールド、外部API、認証には一切触れない。
- 想定差分行数は約80〜150行（< 200行）。

---

## 2. 確定済みの前提

- 本番URL: `https://quest-habit-app.keitaro-fukui.workers.dev` は正常稼働中 [EV-1]
- HEAD コミット: `2c17559` [EV-2]
- フロントエンド技術スタック: React + Vite + Tailwind CSS [EV-3]

---

## 3. 現状の課題と実測証跡

### [EV-1]
$ curl -s -o /dev/null -w "%{http_code}\n" https://quest-habit-app.keitaro-fukui.workers.dev
200

### [EV-2]
$ git rev-parse --short HEAD
2c17559

### [EV-3]
$ grep -n '"react"\|"vite"\|"tailwindcss"' package.json
7:    "dev": "vite",
17:    "react": "^18.3.1",
30:    "tailwindcss": "^3.4.17",
33:    "vite": "^6.0.5",

### [EV-4]
$ sed -n '732,765p' src/frontend/components/DailyChart.tsx
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-cyan-500/30 transition-all gap-3"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center text-base shrink-0 ${catInfo.color}`}>
                        {catInfo.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-slate-100 break-words leading-snug">
                          {log.title_or_menu}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span className={`px-1.5 py-0.5 rounded-lg text-[0.6875rem] border ${catInfo.color}`}>
                            {catInfo.label}
                          </span>
                          {timeStr && (
                            <span className="flex items-center gap-1 font-mono text-slate-400">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {timeStr}
                            </span>
                          )}
                        </div>
                        {log.review_text && (
                          <p className="text-xs text-slate-300 mt-1.5 bg-slate-950/70 p-2 rounded-xl border border-slate-800/80 italic line-clamp-2">
                            "{log.review_text}"
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-black text-sm sm:text-base font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-xl shadow-inner">
                        +{log.earned_points} pt
                      </span>

### [EV-5]
$ sed -n '150,187p' src/frontend/components/Dashboard.tsx
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-400" />
              <span>主な活動成果（読書・運動・インプット）</span>
            </h3>
            {quizSuccessCount > 0 && (
              <span className="text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2.5 py-0.5 rounded-full">
                🧠 クイズ累積正解: {quizSuccessCount}問 (+{quizSuccessCount}pt)
              </span>
            )}
          </div>
          <button
            onClick={() => onNavigate('action-logs')}
            className="text-xs font-bold text-cyber-neonCyan hover:underline self-start sm:self-auto"
          >
            全ログ・絞り込み表示 →
          </button>
        </div>
...(中略)
                  <div className="font-bold text-white truncate flex items-center gap-2">
                    <span className="text-slate-400 text-xs">{log.category}</span>
                    <span>{log.title_or_menu}</span>
                  </div>
                  {log.review_text && (
                    <p className="text-slate-300 text-xs line-clamp-1">{log.review_text}</p>
                  )}

### [EV-6]
$ sed -n '312,320p' src/frontend/components/PersonalStreakCard.tsx
            <span className="text-xs font-black text-indigo-300 flex items-center gap-1">
              <span>🔥 デイリー</span>
              <span className="text-xs font-normal text-slate-400">(1pt+)</span>
            </span>
            <span className={`text-xs font-mono font-black px-2 py-0.5 rounded-lg ${
              streakDaily > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'
            }`}>
              {streakDaily}日連続
            </span>

【実測】`DailyChart.tsx:L734-765` において、`p-2.5` カード内に左アイコン（36px）と右ptバッジ（約80px）が横並び配置され、問題文 `review_text` に `line-clamp-2` が指定されている [EV-4]。
【推定】モバイル幅（375px）では左右要素により問題文の横幅が約160pxに制限され文字切れする。確定方法: 製造後の幅375pxブラウザ実画面検証（G-13）。
【実測】`Dashboard.tsx:L153` の見出しに `（読書・運動・インプット）` が含まれ、L157 のクイズバッジと並んで配置され、L182 では生カテゴリ英単語 `log.category` が露出して `truncate` が設定されている [EV-5]。
【推定】モバイル幅では見出しが3行に折り返す。確定方法: 同上。
【実測】`PersonalStreakCard.tsx:L314` に `(1pt+)` などの括弧書きが存在する [EV-6]。

---

## 3-1. 未確認事項

- 実機スクリーンショット上の視覚的崩れ（問題文幅約160px、見出し3行折り返し）はクラス定義からの【推定】であり、実画面のピクセル単位のレンダリング状況は未確認。
- 確定方法: 製造後の幅375pxブラウザによる G-13 実行時検証（`操作:` / `観測:` / `Console:`）にて確定する。

---

## 4. 改修仕様

### 4-1. DailyChart.tsx: 詳細ログの2段カード化
- **見出し（L726）**:
  - `獲得アクション一覧（全{selectedDayLogs.length}件）` ➔ `獲得アクション一覧 {selectedDayLogs.length}件` （（）を削除）。
- **ログアイテム行（L734-L768）を上下2段構造に変更**:
  ```tsx
  <div
    key={log.id}
    className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-cyan-500/30 transition-all space-y-2"
  >
    {/* 上段: カテゴリ情報・時刻 ＆ 右寄せptバッジ */}
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className={`w-7 h-7 rounded-xl border flex items-center justify-center text-sm shrink-0 ${catInfo.color}`}>
          {catInfo.icon}
        </div>
        <span className={`px-1.5 py-0.5 rounded-lg text-[0.6875rem] border shrink-0 ${catInfo.color}`}>
          {catInfo.label}
        </span>
        {timeStr && (
          <span className="flex items-center gap-1 font-mono text-slate-400 text-xs">
            <Clock className="w-3 h-3 text-slate-400" />
            {timeStr}
          </span>
        )}
      </div>
      <div className="text-right shrink-0">
        <span className="font-black text-sm font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-xl shadow-inner">
          +{log.earned_points} pt
        </span>
      </div>
    </div>

    {/* 下段（全幅展開）: タイトル ＆ クイズ問題文（制限解除） */}
    <div className="space-y-1">
      <div className="font-bold text-sm text-slate-100 break-words leading-snug">
        {log.title_or_menu}
      </div>
      {log.review_text && (
        <p className="text-xs text-slate-300 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 italic break-words">
          "{log.review_text}"
        </p>
      )}
    </div>
  </div>
  ```
  - **行数制限の決定**: 親コンテナ（L723）に `max-h-80 overflow-y-auto` が設定されているため、`line-clamp` は**制限解除**とし、全文読めるようにする。

### 4-2. Dashboard.tsx: 「主な活動成果」のスリム化
- **外枠パディング（L148）**:
  - `glass-card p-6 rounded-2xl space-y-4` ➔ `glass-card p-3.5 sm:p-5 rounded-2xl space-y-4`
- **見出しラッパー（L149-L160）**:
  - `flex flex-col sm:flex-row sm:items-center justify-between gap-2`
  - 見出し（L153）: `主な活動成果（読書・運動・インプット）` ➔ **`主な活動成果`**
  - クイズ累積正解バッジ（L157）: `🧠 クイズ累積正解: {quizSuccessCount}問 (+{quizSuccessCount}pt)` ➔ `🧠 クイズ累積正解: {quizSuccessCount}問`（重複括弧 `(+{...}pt)` を削除）
- **ログリスト行（L178-L188）**:
  - コンテナ（L178）: `items-center` ➔ `items-start`
  - 生英単語 `<span className="text-slate-400 text-xs">{log.category}</span>` を**削除**。
  - タイトル（L181）の `truncate` を削除し `break-words` に変更。

### 4-3. PersonalStreakCard.tsx: 基準値・報酬額を保持した（）の整理
- **ストリーク基準値ヘッダー**: 基準値は保護者設定で変動するため消さず、括弧を外して小さく併記する。
  - デイリー（L314）: `(1pt+)` ➔ `<span className="text-[0.625rem] text-slate-500 font-mono ml-1">1pt+</span>`
  - 中級（L350）: `({midThreshold}pt+)` ➔ `<span className="text-[0.625rem] text-slate-500 font-mono ml-1">{midThreshold}pt+</span>`
  - 神（L394）: `({godThreshold}pt+)` ➔ `<span className="text-[0.625rem] text-slate-500 font-mono ml-1">{godThreshold}pt+</span>`
- **行動喚起バー（L442, L452）**:
  - L442: 節目の報酬額を維持し、冗長な括弧を外す:
    `· あと{upcomingMilestone - streakIfRecorded}日で +{(upcomingMilestone * dailyMultiplier).toLocaleString()}pt`
  - L452: `<span className="text-rose-300/80">（積み上げた{streakDaily}日が消滅）</span>` を削除。

### 4-4. GoalPlannerWidget.tsx & WishlistSection.tsx: 冗長説明の削減
- **GoalPlannerWidget.tsx**:
  - 外枠カードパディング（L91）: `glass-card p-6` ➔ `glass-card p-3.5 sm:p-5`（※L245のモーダルは変更なし）
  - サブタイトル（L126）: `<p className="text-xs text-slate-400">期間までの残り日数から、1日あたり必要な頑張りペースを自動算出！</p>` ➔ **削除**
  - 目標未設定時（L150）: `targetTitle || '未設定 (目標を設定しよう)'` ➔ `targetTitle || '未設定'`
- **WishlistSection.tsx**:
  - **70%還元・7掛けの対象特定**:
    - 対象: L326（カード内バッジ）の `現金還元 (7掛け)` ➔ `現金還元` に変更。
    - 対象: L496（モーダルボタン）の `<span>💵 現金還元 (7掛け)</span>` ➔ `<span>💵 現金還元</span>` に変更。
    - 対象外（維持）: Dashboard L122, Wishlist L239, L505, ParentPortal L557 はルール解説の文脈であり還元率の明示が必要なため維持。
  - **達成度表示の改修（L381-L382）**:
    - L381-382 を以下に変更:
      ```tsx
      <div className="flex justify-between text-xs text-slate-400 font-mono">
        <span>達成度</span>
        <span>{progress}%</span>
      </div>
      ```
    - 進捗バー直下に以下を配置:
      ```tsx
      <div className="text-right text-[0.6875rem] text-slate-400 font-mono mt-0.5">
        {currentPoints.toLocaleString()} / {item.required_points.toLocaleString()} pt
      </div>
      ```
  - **注意書きの重複解消**:
    - L431（親の調達待ち時）は文脈上必要なため維持。
    - L442 の `<p className="text-xs text-slate-400 text-center">※手渡し時に {item.required_points.toLocaleString()} pt が引き落とされます</p>` を**削除**（ボタン自体にポイントが明記されているため重複不要）。

---

## 5. 影響範囲とリスク評価

- **製品コード影響範囲**: `src/frontend/components/` 配下の4ファイルのみ（JSX / Tailwind クラス）。
- **データ・APIへの影響**: なし（既存の API や DB は一切無変更）。
- **二次被害・漏洩リスク (G-7)**: なし（表示要素の削除・整理のみで新規フィールド追加なし）。
- **エラー処理 (G-5)**: なし（ロジックの例外ハンドリングには触れない）。

---

## 6. 受け入れ基準（AC）と検証計画

### 6-1. 受け入れ基準（機械的検証）
- **AC-1**: `grep -n "（全{selectedDayLogs.length}件）" src/frontend/components/DailyChart.tsx` のヒット件数が 0 件。
- **AC-2**: `grep -n "line-clamp-2" src/frontend/components/DailyChart.tsx` のヒット件数が 0 件。
- **AC-3**: `grep -n "（読書・運動・インプット）" src/frontend/components/Dashboard.tsx` のヒット件数が 0 件。
- **AC-4**: `grep -n "log.category" src/frontend/components/Dashboard.tsx` のヒット件数が 0 件。
- **AC-5**: `grep -n "(1pt+)\|({midThreshold}pt+)\|({godThreshold}pt+)" src/frontend/components/PersonalStreakCard.tsx` のヒット件数が 0 件。
- **AC-6**: `grep -n "自動算出" src/frontend/components/GoalPlannerWidget.tsx` のヒット件数が 0 件。
- **AC-7**: `grep -n "未設定 (目標を設定しよう)" src/frontend/components/GoalPlannerWidget.tsx` のヒット件数が 0 件。
- **AC-8**: `grep -n "現金還元 (7掛け)" src/frontend/components/WishlistSection.tsx` のヒット件数が 0 件。
- **AC-9**: `npx tsc --noEmit` が 0 エラーで終了すること。
- **AC-10**: `npm run build` が正常終了すること。

### 6-2. UI実機検証計画（G-13）
- **環境**: ブラウザをモバイル幅（375px × 667px / 390px × 844px）に設定。
- **検証項目**:
  1. **DailyChart**: 日付（9/29等）をタップし、クイズ問題文が上下2段レイアウトで画面全幅（300px以上）に展開され、複数行で最後まで読めることを観測。
  2. **Dashboard**: ホーム画面を開き、「主な活動成果」の見出しが折り返さずすっきり表示され、リスト内のタイトルが `truncate` されずに全文表示されることを観測。
  3. **PersonalStreakCard / GoalPlanner / Wishlist**: 各画面を表示し、不要な括弧や説明文が消え、Console にエラーが出ないことを確認。
- **証跡記録**: `docs/test-report.md` に `操作:` / `観測:` / `Console:` を明記する。

---

## 7. タスク分解と完了条件

| タスクID | 内容 | 完了条件（検証コマンド） |
| :--- | :--- | :--- |
| **T1** | `DailyChart.tsx` の2段カード化・問題文全幅展開・見出し修正 | AC-1, AC-2 通過 ＋ `npx tsc --noEmit` exit 0 |
| **T2** | `Dashboard.tsx` の見出し簡潔化・生英単語削除・truncate解除・余白最適化 | AC-3, AC-4 通過 ＋ `npx tsc --noEmit` exit 0 |
| **T3** | `PersonalStreakCard.tsx` の括弧整理・基準値/報酬pt維持 | AC-5 通過 ＋ `npx tsc --noEmit` exit 0 |
| **T4** | `GoalPlannerWidget.tsx` / `WishlistSection.tsx` の説明削減・7掛け整理 | AC-6, AC-7, AC-8 通過 ＋ `npx tsc --noEmit` exit 0 |
| **T5** | ビルド＆G-13実画面検証 | AC-9, AC-10 通過 ＋ モバイル幅での実機検証証跡記録 |

---

## 8. 改訂履歴

| 版 | 指摘/反証 # | 変更したセクション | 変更内容 |
| :--- | :--- | :--- | :--- |
| v1.0 | — | 全体 | 初版作成 |
| v1.1 | 指摘#1〜#10, 反証A〜C | §1-1, §2, §3, §3-1, §4-1〜§4-4, §6, §7 | AC新設、タスク分解新設、基準値・報酬pt残置、70%対象特定、推定ラベル是正、G-13実機検証計画追加 |

---

## 9. ゲート検証結果（完了条件）

```
========================================================
 verify.sh  role=design  base=HEAD  repo=game
 HEAD=2c17559  branch=main
========================================================
[PASS] gate-evidence      証跡フォーマット・鮮度・未確認記載の要件を満たしている
--------------------------------------------------------
RESULT: PASS  全ゲート通過（この出力を Artifact に貼付すること）
```
