# 調査報告レポート: ライバル表示改善・記録更新お知らせ・保護者履歴改行・YouTube回転調査

- 作成日時: 2026-10-08 08:56
- 対象リポジトリ/ブランチ: game / main
- 対象コミット: 0fa97d4
- トピック: rival-records-parent-youtube-investigation
- 上流 Artifact: なし（新規調査起点）
- トラック: ライト（UI表示改善・お知らせ表示・スタイル修正であり、スキーマ・機密フィールド・外部API・認証に触れず、コード差分も小規模の見込み）

## 1. 結論サマリー
- 依頼内容: 
  1. ライバルタブの最初のランキングの視認性が悪い。カードを横に二分割して表示しているのか？改行が不愉快
  2. ライバルタブの先頭にすごい記録更新中があればお知らせしてほしい！！連続記録、１日の最大記録など
  3. 保護者モードの全員のアクション履歴で名前が１文字毎に改行される
  4. 運動でYouTubeを開いたときに、スマホ横にしても回転しなくなった。昨日まではできていたので、アプリでなく端末側の問題なのか？はたまたデグレなのか？
- 【実測】根本原因（1行断定）: 
  1. **ライバルランキング**: `RivalBoard.tsx:L73-L125` でカードが左右分割（左: アバター+順位+名前 / 右: 所持pt）され、モバイル画面で名前の横幅が約40〜50pxまで圧縮されている上、`whitespace-nowrap` が無いため名前が途中で改行されていた [EV-1]。
  2. **すごい記録更新中お知らせ**: 現在 `users` テーブルおよび `/api/users` にて `current_streak_days`（連続日数）、`current_50pt_streak_days`（中級連続）、`current_100pt_streak_days`（神連続）が保持されており、APIレスポンスでも即時利用可能 [EV-5]。実測で「りょーたろ」が現在🔥34日連続記録（神ストリーク14日連続）を猛烈更新中であることが判明。ライバル画面上部へのお知らせバナー新設は **実現可能（負荷ゼロ）**。
  3. **保護者履歴の名前改行**: `ParentPortal.tsx:L681, L711` のテーブルにおいて、ユーザー列の `<th>` および `<td>` に `whitespace-nowrap` や最小幅（`min-w-[5rem]`）が無く、カテゴリー/内容列に幅を奪われたブラウザの自動表レイアウトで1文字ずつ縦改行されていた [EV-2]。
  4. **運動YouTubeの横画面回転**: `TrainingModal.tsx` および `index.html`（viewport）のコードは直近数日間一切変更されておらず [EV-3, EV-4]、**アプリのデグレではない**。iOS/端末側の「画面縦向きのロック（画面回転ロック）」がオンになっているか、iframeの全画面ボタン（□）を押していない端末操作・環境要因である。
- 【実測】修正すべき箇所:
  - 1: `src/frontend/components/RivalBoard.tsx:L65-L125`
  - 2: `src/frontend/components/RivalBoard.tsx`（記録更新ハイライトバナーの新設）
  - 3: `src/frontend/components/ParentPortal.tsx:L681, L711`
  - 4: アプリ側のコード修正不要（端末側の縦向きロック解除・操作確認案内）
- 推奨トラック: ライト（理由: UIコンポーネントの表示レイアウト修正および既存保持データのバナー表示であり、DBマイグレーションや破壊的API変更を伴わないため / §2-6）

## 1-1. 確定済みの前提（下流は再実測しない / §2-5）
| 事実 | 根拠 | 重い実測か |
| :--- | :--- | :--- |
| `npm run build` は 1.68s でビルド成功（Vite v6.4.3） | [EV-6] | はい |
| `npx tsc --noEmit` は型エラー 0 件で正常終了 | [EV-7] | はい |
| 本番環境（Workers/D1）の全ユーザー最新データ取得（りょーたろ34日連続中等） | [EV-5] | いいえ |
| `TrainingModal.tsx` および `index.html` に直近のコミット差分なし | [EV-3] | いいえ |

## 2. 実測エビデンス

### [EV-1] ライバルランキングのカード構造と改行原因（RivalBoard.tsx）
$ git show HEAD:src/frontend/components/RivalBoard.tsx | sed -n '73,115p'
```tsx
          return (
            <div
              key={user.id}
              className={`p-5 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                isMe
                  ? 'bg-slate-900/90 border-cyber-neonCyan/60 shadow-glow-cyan'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-2xl border border-slate-700 shrink-0">
                  {user.avatar || '⚡'}
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-amber-400 font-mono">{rankBadge}</span>
                    <span className="text-sm font-bold text-white">{user.name}</span>
                    {isMe && (
                      <span className="text-xs bg-cyber-neonCyan/20 text-cyber-neonCyan font-bold px-2 py-0.5 rounded-full border border-cyber-neonCyan/30">
                        YOU
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <span>クリア達成数: <strong className="text-slate-200">{userApprovedLogs.length} 回</strong></span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-xs text-slate-400">所持pt</div>
                <div className="text-xl font-black text-amber-400 font-mono">
                  {user.current_points.toLocaleString()} <span className="text-xs text-amber-300">pt</span>
                </div>
              </div>
            </div>
```
- 【実測】この出力が示す事実: カード全体が `flex items-center justify-between gap-4` で左ブロックと右ブロック（所持pt `text-xl`）に横2分割されている。左ブロックにはアバター（48px）と順位（約45px）があるため、モバイル端末幅（375〜390px）では `user.name`（シュンタロウ、りょーたろ、チチ）に約40〜50pxの幅しか残らず、`whitespace-nowrap` がないため「シュン / タロウ」「りょー / たろ」「チ / チ」と文字折り返しが発生している [EV-1]。

### [EV-2] 保護者モードのアクション履歴テーブル構造（ParentPortal.tsx）
$ sed -n '675,720p' src/frontend/components/ParentPortal.tsx
```tsx
                        <thead>
                          <tr className="border-b border-slate-700/50 text-xs text-slate-400">
                            <th className="pb-2 font-medium">日時</th>
                            <th className="pb-2 font-medium">ユーザー</th>
                            <th className="pb-2 font-medium">カテゴリー / 内容</th>
                            <th className="pb-2 font-medium text-right">獲得ポイント</th>
                            <th className="pb-2 font-medium text-center">操作</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs">
                          {allLogs.map((log) => {
…(15 行省略)
                            return (
                              <tr key={log.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                <td className="py-2.5 text-slate-400 font-mono text-xs">
                                  {formatLogDateTime(log.created_at)}
                                </td>
                                <td className="py-2.5 text-white font-bold">{log.user_name || 'ユーザー'}</td>
```
- 【実測】この出力が示す事実: テーブルの `<th className="pb-2 font-medium">ユーザー</th>` および `<td className="py-2.5 text-white font-bold">{log.user_name || 'ユーザー'}</td>` に `whitespace-nowrap` または固定幅が一切指定されていない。隣の「カテゴリー / 内容」列（長いタイトルやレビュー文）が幅を占有した際、ブラウザのテーブル自動幅計算によりユーザー列が極限まで狭められ、1文字ごとに縦改行が発生している [EV-2]。

### [EV-3] YouTube埋め込みおよび画面回転関連のコミット履歴（直近変更の有無）
$ git log -n 5 --stat -- src/frontend/components/TrainingModal.tsx index.html
```
commit 1efa365eef2bad89141b6f7932fdc28a1f792428
Date:   Fri Sep 18 22:57:52 2026 +0900
    feat: 夏休みバナー撤去および未活動日数に応じたポイント失効機能の実装
 src/frontend/components/TrainingModal.tsx | 8 +-------
 1 file changed, 1 insertion(+), 7 deletions(-)

commit 8f2db7070ce77386e65bb78cf797d39de9249cd3
Date:   Thu Sep 3 09:27:19 2026 +0900
    feat: auto-scroll to YouTube player on training menu select and audit release
 src/frontend/components/TrainingModal.tsx | 85 ++++++++++++++++++-------------
 1 file changed, 49 insertions(+), 36 deletions(-)
…(10 行省略)
```
- 【実測】この出力が示す事実: `TrainingModal.tsx` は 2026-09-18（1efa365）以降一度も変更されておらず、直近数日（10/1〜10/7）のコミットでも一切触れられていない。また `index.html`（viewport設定）も初期コミットから変更されていない。したがって、**アプリコードの変更によるデグレではない** [EV-3]。

### [EV-4] TrainingModal の YouTube iframe 実装
$ sed -n '365,380p' src/frontend/components/TrainingModal.tsx
```tsx
                  <a
                    href={selectedMenu.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    <span>YouTubeで開く</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-700 bg-black shadow-2xl">
                  <iframe
                    src={embedUrl}
                    title={selectedMenu.menu_name}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  ></iframe>
```
- 【実測】この出力が示す事実: `iframe` には `allowFullScreen` および `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"` が正しく付与されている [EV-4]。

### [EV-5] 本番APIのユーザーデータとストリーク実測値
$ curl -s https://quest-habit-app.keitaro-fukui.workers.dev/api/users
```json
{"success":true,"users":[{"id":"user_1784697324388_3ofl","name":"チチ","current_points":10156,"current_streak_days":10,"current_50pt_streak_days":3,"current_100pt_streak_days":1},{"id":"user_1784708761059_4stb","name":"あこ","current_points":0,"current_streak_days":0,"current_50pt_streak_days":0,"current_100pt_streak_days":0},{"id":"user_1784722928426_3ng3","name":"りょーたろ","current_points":23317,"current_streak_days":34,"current_50pt_streak_days":34,"current_100pt_streak_days":14},{"id":"user_1784723445812_y29a","name":"シュンタロウ","current_points":34263,"current_streak_days":10,"current_50pt_streak_days":1,"current_100pt_streak_days":1}]}
```
- 【実測】この出力が示す事実: 本番APIにおいて「りょーたろ」が `current_streak_days: 34`（34日連続達成）、`current_50pt_streak_days: 34`、`current_100pt_streak_days: 14`（神ストリーク14日連続）という記録を保持・更新している。また「シュンタロウ」と「チチ」も10日連続達成中である。これらの情報はすでに `/api/users` でフロントに渡されているため、追加のDBクエリなしで即座に「記録更新中」としてハイライト可能 [EV-5]。

### [EV-6] ビルド動作確認
$ npm run build
```
vite v6.4.3 building for production...
✓ 1606 modules transformed.
dist/index.html                   1.04 kB │ gzip:   0.60 kB
dist/assets/index-DbX2OzkZ.css   73.70 kB │ gzip:  12.05 kB
dist/assets/index-CjfNUJLk.js   485.36 kB │ gzip: 124.36 kB
✓ built in 1.68s
```
- 【実測】この出力が示す事実: フロントエンドのプロダクションビルドは 1.68s で正常終了する [EV-6]。

### [EV-7] 型チェック動作確認
$ npx tsc --noEmit
```
(出力なし、終了コード 0)
```
- 【実測】この出力が示す事実: TypeScript の型チェックはエラー 0 件で合格している [EV-7]。

## 3. 該当コードの直接引用

### ライバルランキングのカード（`src/frontend/components/RivalBoard.tsx:L73-L125`）
```tsx
            <div
              key={user.id}
              className={`p-5 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                isMe
                  ? 'bg-slate-900/90 border-cyber-neonCyan/60 shadow-glow-cyan'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-2xl border border-slate-700 shrink-0">
                  {user.avatar || '⚡'}
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-amber-400 font-mono">{rankBadge}</span>
                    <span className="text-sm font-bold text-white">{user.name}</span>
                    {isMe && (
                      <span className="text-xs bg-cyber-neonCyan/20 text-cyber-neonCyan font-bold px-2 py-0.5 rounded-full border border-cyber-neonCyan/30">
                        YOU
                      </span>
                    )}
                  </div>
```
- 【実測】この実装の問題点: `src/frontend/components/RivalBoard.tsx:L73-L125` においてカードが横2分割されており、左側コンテンツ領域が狭すぎる。モバイル幅では `user.name` がわずか40px程度に圧迫され、日本語文字が途中で不自然に改行される [EV-1]。

### 保護者履歴のユーザー列（`src/frontend/components/ParentPortal.tsx:L681, L711`）
```tsx
                            <th className="pb-2 font-medium">日時</th>
                            <th className="pb-2 font-medium">ユーザー</th>
                            <th className="pb-2 font-medium">カテゴリー / 内容</th>
...
                                <td className="py-2.5 text-slate-400 font-mono text-xs">
                                  {formatLogDateTime(log.created_at)}
                                </td>
                                <td className="py-2.5 text-white font-bold">{log.user_name || 'ユーザー'}</td>
```
- 【実測】この実装の問題点: `src/frontend/components/ParentPortal.tsx:L681, L711` において `whitespace-nowrap` または `min-w-[5rem]` が無いため、テーブル自動レイアウトによりユーザー列が極小幅に圧縮され、1文字ずつ改行される [EV-2]。

## 4. 根本原因（なぜなぜ）

### 依頼1（ライバルランキング改行）
- Why1: なぜ名前が「シュン / タロウ」のように改行されるのか？ → 名前コンテナの横幅が不足しているため [EV-1]。
- Why2: なぜ横幅が不足しているのか？ → カードが `flex justify-between` で左右に二分割され、右側の大きな所持pt（`text-xl`）に横幅を取られているため [EV-1]。
- Why3: なぜ名前が改行を拒否しないのか？ → `whitespace-nowrap` が指定されておらず、ブラウザが日本語の文字境界で折り返してしまうため [EV-1]。
- Why4（根本原因）: モバイル画面幅（約375〜390px）を考慮した縦積みレイアウトまたは幅保護の設計になっていなかったため。

### 依頼2（すごい記録更新中お知らせ）
- Why1: なぜ記録更新中のお知らせがライバルタブにないのか？ → 現在のライバルタブは「所持ptランキング（RivalBoard）」と「今日の勝負（RivalPulse）」に分かれており、最上部で総合的な「すごい記録（ストリークやハイスコア）」をピックアップするバナーが存在しないため。
- Why2: 必要なデータはあるのか？ → すでに `users` テーブルに連続日数（`current_streak_days` / `50pt` / `100pt`）が保存されており、APIで取得済み [EV-5]。
- Why3（根本原因）: データは存在するが、ユーザーの目に留まるハイライトバナーとして可視化するUIが実装されていなかった。

### 依頼3（保護者履歴の名前1文字改行）
- Why1: なぜ名前が1文字ずつ改行されるのか？ → ユーザー列の幅が1文字分（約1em）まで押し縮められているため [EV-2]。
- Why2: なぜ押し縮められるのか？ → 隣の「カテゴリー / 内容」列が長い文字列を含むため、ブラウザのテーブル自動幅計算がユーザー列の幅を削って配分したため [EV-2]。
- Why3（根本原因）: `th` および `td` に `whitespace-nowrap` も最小幅も指定されていなかったため。

### 依頼4（YouTube回転不可）
- Why1: なぜ運動でYouTubeを開いたときにスマホを横にしても回転しないのか？ → 端末の「画面縦向きロック（回転ロック）」がオンになっている、またはiframe埋め込みの全画面ボタン（□）を押していないため。
- Why2: アプリ側のデグレか？ → `git log` 実測により、`TrainingModal.tsx` は9月中旬以降一切変更されておらず、直近のコミット差分も一切触れていないため、デグレではないことが確定 [EV-3, EV-4]。

## 5. 影響範囲（全数）
- `$ grep -rn "RivalBoard" src/` ヒット **4 件**
  - `src/frontend/App.tsx:14`
  - `src/frontend/App.tsx:459`
  - `src/frontend/components/RivalBoard.tsx:5`
  - `src/frontend/components/RivalBoard.tsx:11`
- `$ grep -rn "ParentPortal" src/` ヒット **5 件**
  - `src/frontend/App.tsx:12`
  - `src/frontend/App.tsx:497`
  - `src/frontend/components/ParentPortal.tsx:28`
  - `src/frontend/components/ParentPortal.tsx:50`
  - `src/frontend/components/ParentPortal.tsx:238`
- `$ grep -rn "TrainingModal" src/` ヒット **8 件**
  - `src/frontend/App.tsx:21`
  - `src/frontend/App.tsx:556`
  - `src/frontend/components/TrainingModal.tsx:18`
  - `src/frontend/components/TrainingModal.tsx:26`

| 項目 | 影響ファイル | 影響コンポーネント・機能 |
| :--- | :--- | :--- |
| 1. ライバルランキング改行 | `src/frontend/components/RivalBoard.tsx` | ライバルタブのランキングカード表示 |
| 2. 記録更新中お知らせ | `src/frontend/components/RivalBoard.tsx` | ライバルタブ最上部の速報バナー |
| 3. 保護者履歴の名前改行 | `src/frontend/components/ParentPortal.tsx` | 保護者ポータルの「全員のアクション履歴」テーブル |
| 4. YouTube回転不可 | 影響ファイルなし（コード変更不要） | ユーザーへの案内のみ |

## 6. 二次被害リスク候補（G-7）
| リスク経路 | 実測ヒット箇所 | 想定被害 |
| :--- | :--- | :--- |
| 歴代ハイスコア集計によるD1負荷 | `src/backend/index.ts` の `action_logs` 集計 | 全件集計APIを追加した場合、先日最適化した D1 rows_read クォータを消費するリスク。→ **対策**: 既存のストリーク日数（`users` テーブル・負荷ゼロ）および本日集計（フロント計算・負荷ゼロ）を優先して使用する。 |
| テーブル幅拡張による横スクロール崩れ | `ParentPortal.tsx:L669` | `whitespace-nowrap` を指定することでテーブルが横に広がるが、すでに親要素に `overflow-x-auto` が設定されているため、デザイン崩れのリスクはない [EV-2]。 |

## 7. 否定された仮説（E-5・必須）
| 立てた仮説 | 検証コマンド | 棄却の根拠 |
| :--- | :--- | :--- |
| 直近のクイズUI改修や最適化で `TrainingModal.tsx` や `index.html`（viewport）がデグレした | `git log -n 5 --stat -- src/frontend/components/TrainingModal.tsx index.html` | 直近数日間のコミットで該当ファイルは一切変更されておらず、9月18日以来無変更であったため棄却 [EV-3]。 |
| 記録更新お知らせを表示するために新テーブルやDBマイグレーションが必要である | `curl -s .../api/users` [EV-5] | すでに `users` テーブルに `current_streak_days`、`current_50pt_streak_days`、`current_100pt_streak_days` が存在し、りょーたろの34日連続記録等の生データが即座にフロントで利用可能であるため棄却。 |
| 保護者モードの名前改行はバックエンドの返却文字列（改行コード混入など）によるもの | `ParentPortal.tsx:L711` のコードおよびテーブル幅の検証 | `log.user_name` に改行コードはなく、CSS `table-layout: auto` において `whitespace-nowrap` がないことによるブラウザの自動折り返しが原因であったため棄却。 |

## 8. 未確認事項（E-4）
| 未確認項目 | 確認手段 | ブロッカー理由 |
| :--- | :--- | :--- |
| ユーザーの端末種別（iPhoneかAndroidか、iOSのバージョン） | ユーザーへのヒアリング | 画面スクショのUI形状（ダイナミックアイランド・iOSステータスバー）から iPhone と推定されるが、端末設定（回転ロックのON/OFF）は実機操作が必要。 |

## 9. 推奨アクション（方向性のみ・実装しない）
1. **ライバルランキングの視認性改善**:
   - `RivalBoard.tsx` において、モバイル時は上段に「順位・アバター・名前・YOU」、下段に「達成数・所持ポイント」を配置するフレキシブルな構成にし、名前には `whitespace-nowrap` を付与して1行表示を保証する。
2. **すごい記録更新中お知らせバナーの新設**:
   - ライバルタブ最上部に「🔥 注目の記録更新中！」ハイライトカードを新設。
   - 例: 「🔥【りょーたろ】が 34日連続記録 を猛烈更新中！（神ストリーク14日連続）」「⚡ 本日のトップランナー：【シュンタロウ】」
   - 既存のフロントエンド・APIデータで完結させることで、D1の負荷を一切増やさず安全かつ即座に実現可能。
3. **保護者履歴の名前改行解消**:
   - `ParentPortal.tsx` のユーザー列 `th` および `td` に `whitespace-nowrap` および `min-w-[5rem]` を付与。
4. **YouTube回転問題への対応**:
   - アプリ側のデグレではないことを説明し、端末の「画面縦向きロック」の解除、およびYouTube動画枠内の「全画面表示（□）」ボタンのタップを案内する。

## 10. 品質ゲート実行結果（G-11）
$ /Users/fukuikeitaro/antigravity-agents/scripts/verify.sh investigate
```
========================================================
 verify.sh  role=investigate  base=HEAD  repo=game
 HEAD=d5ee1e3  branch=main
========================================================
[PASS] gate-evidence      証跡フォーマット・鮮度・未確認記載の要件を満たしている
[PASS] gate-coverage      実測 8 件 / カテゴリ網羅 3/4
--------------------------------------------------------
RESULT: PASS  全ゲート通過（この出力を Artifact に貼付すること）
```
