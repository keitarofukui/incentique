# 調査報告レポート: 運動メニュー選択時のYouTubeサムネイル（動画枠）自動スクロール機能の実現可否

- 作成日時: 2026-09-03 09:20
- 対象リポジトリ/ブランチ: game / main
- 対象コミット: 3eec0f9

## 1. 結論サマリー
- 依頼内容: 運動のメニューを選んだときに、YouTubeのサムネまで自動的にスクロールするようにできるか？
- 【実測】結論（1 行断定）: **完全に実現可能**である [EV-3] [EV-4]。
- 【実測】修正すべき箇所: `src/frontend/components/TrainingModal.tsx:L61-L65` および `src/frontend/components/TrainingModal.tsx:L348-L376`

## 2. 実測エビデンス

### [EV-1] 前提情報とGitコミットの確認
$ git rev-parse --short HEAD && git branch --show-current
3eec0f9
main
- 【実測】対象リポジトリは `game`、ブランチは `main`、HEADコミットは `3eec0f9` である [EV-1]。

### [EV-2] handleSelectMenu 呼び出し箇所の調査
$ grep -rn "handleSelectMenu" src/frontend/components/TrainingModal.tsx
src/frontend/components/TrainingModal.tsx:61:  const handleSelectMenu = (menu: TrainingMenu) => {
src/frontend/components/TrainingModal.tsx:102:        handleSelectMenu(created);
src/frontend/components/TrainingModal.tsx:111:        handleSelectMenu(custom);
src/frontend/components/TrainingModal.tsx:121:      handleSelectMenu(custom);
src/frontend/components/TrainingModal.tsx:140:          handleSelectMenu(data.menus[0]);
src/frontend/components/TrainingModal.tsx:314:                  onClick={() => handleSelectMenu(menu)}
- 【実測】メニュー選択ハンドラ `handleSelectMenu` は 61 行目に定義され、カード選択時（314行目）やメニュー追加/削除時に呼び出されている [EV-2]。

### [EV-3] メニュー選択ハンドラとYouTube埋め込みURL生成の実装確認
$ sed -n '61,79p' src/frontend/components/TrainingModal.tsx
  const handleSelectMenu = (menu: TrainingMenu) => {
    setSelectedMenu(menu);
    setEarnedPoints(menu.default_points || 50);
  };

  const getYouTubeEmbedUrl = (url?: string) => {
    if (!url) return null;
    let videoId = '';

    if (url.includes('youtu.be/')) {
      const parts = url.split('youtu.be/')[1];
      videoId = parts.split('?')[0];
    } else if (url.includes('watch?v=')) {
      const parts = url.split('watch?v=')[1];
      videoId = parts.split('&')[0];
    }

    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };
- 【実測】`handleSelectMenu` ではステート更新（`selectedMenu`, `earnedPoints`）のみを行っており、スクロール制御のコードは存在しない [EV-3]。

### [EV-4] YouTube動画プレーヤー表示領域のJSX確認
$ sed -n '348,376p' src/frontend/components/TrainingModal.tsx
          {/* Embedded YouTube Player */}
          {selectedMenu && embedUrl ? (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                <span className="flex items-center gap-1.5 text-red-400">
                  <Play className="w-4 h-4 fill-red-500 text-red-500" />
                  <span>動画を見ながらその場でトレーニング！</span>
                </span>
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
              </div>
            </div>
- 【実測】YouTube動画は iframe による埋め込みプレーヤーとして表示されており、コンテナ要素に `ref` は付与されていない [EV-4]。

### [EV-5] TypeScript 型チェックの実行確認
$ npx tsc --noEmit
(出力なし: 終了コード 0)
- 【実測】現在の型チェックはエラーなしで通過している [EV-5]。

### [EV-6] 本番APIの登録済みトレーニングメニュー実応答
$ curl -s -i "https://quest-habit-app.keitaro-fukui.workers.dev/api/training-menus"
HTTP/2 200 
date: Thu, 03 Sep 2026 00:17:01 GMT
content-type: application/json
content-length: 1599
access-control-allow-origin: *
server: cloudflare

{"success":true,"menus":[{"id":"menu_hiit","menu_name":"🔥 HIIT 全身トレーニング","default_points":70,"video_url":"https://youtu.be/VFywKvvNuWE?si=_BKuQ94p88T8i26q","created_at":"2026-07-22 05:14:18"},{"id":"menu_plank","menu_name":"🧘 体幹プランク","default_points":50,"video_url":"https://youtu.be/4scc_lxw6L8?si=BtuMJBGMZF9OvqO4","created_at":"2026-07-22 05:14:18"},{"id":"menu_pushup","menu_name":"💪 腕立て・自重トレーニング","default_points":70,"video_url":"https://youtu.be/kUNR0pDlOok?si=RPgNQsqO17vWCBnB","created_at":"2026-07-22 05:14:18"},{"id":"menu_1784705566930","menu_name":"💪4分間の残酷なほどきつい腹筋","default_points":50,"video_url":"https://youtu.be/vluAGiavi-M?si=YFKv-sFhyUdi_BQX","created_at":"2026-07-22 07:32:47"},{"id":"menu_1784705644215","menu_name":"9分間だけ頑張れば全身の脂肪が燃える。痩せるHIIT","default_points":100,"video_url":"https://youtu.be/QjEqO4STI3w?si=rZlyrPBX8diyiuhx","created_at":"2026-07-22 07:34:04"},{"id":"menu_1784705700008","menu_name":"【地獄の7分】超高強度の下半身筋トレ","default_points":60,"video_url":"https://youtu.be/1AkhUNS4Yhw?si=Wcczo7uIys8TsLX6","created_at":"2026-07-22 07:35:00"},{"id":"menu_1784705790509","menu_name":"🧘骨盤強制ヨガ","default_points":50,"video_url":"https://youtu.be/KmWGt7VK2DM?si=v9uDJc50yH_9DloD","created_at":"2026-07-22 07:36:30"},{"id":"menu_1785416253138","menu_name":"初級腕立て伏せ","default_points":60,"video_url":"https://youtu.be/lyk8sgY8NDg?si=HAfEv3SxZ0QSOo8U","created_at":"2026-07-30 12:57:33"}]}
- 【実測】本番環境に登録されている全8件のメニューすべてに有効な YouTube `video_url` が設定されている [EV-6]。

### [EV-7] TrainingModal の利用箇所とレイアウト構造
$ grep -rn "TrainingModal" src/
src/frontend/App.tsx:8:import { TrainingModal } from './components/TrainingModal';
src/frontend/App.tsx:411:          onOpenTrainingModal={() => handleSetActiveTab('training')}
src/frontend/App.tsx:491:                <TrainingModal
src/frontend/components/TrainingModal.tsx:8:interface TrainingModalProps {
src/frontend/components/TrainingModal.tsx:14:export const TrainingModal: React.FC<TrainingModalProps> = ({
src/frontend/components/Header.tsx:12:  onOpenTrainingModal: () => void;
src/frontend/components/Header.tsx:25:  onOpenTrainingModal,
src/frontend/components/Header.tsx:203:              onClick={onOpenTrainingModal}
- 【実測】`TrainingModal` は独立したモーダルポップアップではなく、`App.tsx` のタブコンテンツとしてメインビュー（`<main>`）内に展開されている [EV-7]。

## 3. 該当コードの直接引用

### `src/frontend/components/TrainingModal.tsx:L61-L64`
```tsx
  const handleSelectMenu = (menu: TrainingMenu) => {
    setSelectedMenu(menu);
    setEarnedPoints(menu.default_points || 50);
  };
```
- 【実測】この実装ではメニュー選択時にReactの状態（`selectedMenu` と `earnedPoints`）を更新するのみであり、画面のスクロール位置を移動する命令が一切記述されていない [EV-3]。

### `src/frontend/components/TrainingModal.tsx:L349-L375`
```tsx
          {/* Embedded YouTube Player */}
          {selectedMenu && embedUrl ? (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                <span className="flex items-center gap-1.5 text-red-400">
                  <Play className="w-4 h-4 fill-red-500 text-red-500" />
                  <span>動画を見ながらその場でトレーニング！</span>
                </span>
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
              </div>
            </div>
```
- 【実測】YouTube埋め込みプレーヤー要素には DOM 参照用の `ref` がなく、メニューカード群（8件）の下に配置されている [EV-4] [EV-6]。

## 4. 根本原因（なぜなぜ）
- Why1: なぜメニューを選択した際にYouTubeのサムネイル/プレーヤーまでスクロールしないのか？
  - `handleSelectMenu`（`src/frontend/components/TrainingModal.tsx:L61-L64`）[EV-3] でステートの変更のみが行われ、DOM要素をスクロール対象とする制御が実装されていないため。
- Why2: なぜスクロールしないとYouTubeが見えないのか？
  - メニュー選択肢カードが8件並んでおり [EV-6]、縦方向の表示高さを占有するため、スマートフォンや一般的なノートPCの画面ではプレーヤー部分が画面外（下部）に押し出されるため。
- Why3: なぜYouTube動画エリアへのスクロール参照がなかったのか？
  - コンポーネント開発時に `useRef` を用いた要素スクロール（`scrollIntoView`）の連携が設計・実装されていなかったため。

## 5. 影響範囲（全数）
$ grep -rn "TrainingModal" src/
- ヒット **8 件**（全3ファイル）:
  - `src/frontend/App.tsx`: 3 件
  - `src/frontend/components/TrainingModal.tsx`: 2 件（内部定義）
  - `src/frontend/components/Header.tsx`: 3 件

$ grep -rn "handleSelectMenu" src/
- ヒット **8 件**（全2ファイル）:
  - `src/frontend/components/TrainingModal.tsx`: 6 件
  - `src/frontend/components/HouseworkModal.tsx`: 2 件（無関係: 家事メニュー）

$ grep -rn "getYouTubeEmbedUrl" src/
- ヒット **2 件**（全1ファイル）:
  - `src/frontend/components/TrainingModal.tsx`: 2 件

## 6. 二次被害リスク候補（G-7）
本改修はフロントエンドのスクロールUXの改善のみであり、APIエンドポイントやDBスキーマの変更は発生しない。

| リスク経路 | 実測ヒット箇所 | 想定被害 |
| :--- | :--- | :--- |
| `SELECT *` / 汎用取得 API | なし | 機密カラムの追加・変更は伴わないため流出リスクなし |
| トークン・個人情報漏洩 | なし | スクロール位置制御において認証トークンや個人情報は一切扱わない |
| 外部連携 / リダイレクト | なし | YouTube動画URLは既存のiframe埋め込みと外部リンク（`<a>`）のみで表示され流出経路なし |
| Git 管理ファイル / ログ | なし | 秘密鍵や環境変数の出力は行わない |

## 7. 否定された仮説（E-5・必須）
| 立てた仮説 | 検証コマンド | 棄却の根拠 |
| :--- | :--- | :--- |
| 仮説1: YouTubeサムネイルは専用の `<img>`（`img.youtube.com` / `i.ytimg.com`）要素として表示されている | `grep -rn "ytimg" src/` | ヒット 0 件。実際は `getYouTubeEmbedUrl` [EV-3] による `<iframe>` 埋め込みプレーヤー内でサムネイル・動画が表示されている [EV-4]。 |
| 仮説2: `TrainingModal` は独立したモーダルダイアログの内部スクロール要素である | `grep -rn "TrainingModal" src/frontend/App.tsx` | `App.tsx:L491` [EV-7] にてメインビュー（`<main>`）のタブコンテンツとして直列配置されている。ウィンドウ全体のスクロールまたはコンテナの `scrollIntoView` で制御可能である。 |
| 仮説3: 動画URL（`video_url`）が登録されていないメニューが存在し、スクロール対象が見つからない場合がある | `curl -s -i "https://quest-habit-app.keitaro-fukui.workers.dev/api/training-menus"` | 本番APIの実測で全8件すべてに `video_url` が存在している [EV-6]。ただし将来的なURL未登録メニューを考慮し、オプショナルチェーンガードを設けるべきである。 |

## 8. 未確認事項（E-4）
| 未確認項目 | 確認手段 | ブロッカー理由 |
| :--- | :--- | :--- |
| モバイル実機（iOS Safari / Android Chrome）での `scrollIntoView({ behavior: 'smooth' })` 実行時のスクロール位置（上部ヘッダーとの重なり具合） | 実機ブラウザでの操作検証（実装フェーズ） | 調査フェーズ（コード変更禁止 / G-1）のため、実機での視覚的オフセットは設計・実装フェーズで実測する。 |

## 9. 推奨アクション（方向性のみ・実装しない）
1. `src/frontend/components/TrainingModal.tsx` に `videoSectionRef = useRef<HTMLDivElement>(null)` を導入。
2. YouTube動画プレーヤー表示領域（L350）のコンテナに `ref={videoSectionRef}` を指定。
3. `handleSelectMenu` 内で、メニュー選択時に `setTimeout` または `requestAnimationFrame` を介して `videoSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })` を実行。
   ※ 初期レンダリング時（マウント時）は自動スクロールさせず、ユーザーがカードをクリックしたときのみ発火させる設計とする。

## 10. 品質ゲート実行結果（G-11）
$ /Users/fukuikeitaro/antigravity-agents/scripts/verify.sh investigate
========================================================
 verify.sh  role=investigate  base=HEAD  repo=game
 HEAD=3eec0f9  branch=main
========================================================
[PASS] gate-evidence      証跡フォーマット・鮮度・未確認記載の要件を満たしている
[PASS] gate-coverage      実測 11 件 / カテゴリ網羅 4/4
--------------------------------------------------------
RESULT: PASS  全ゲート通過（この出力を Artifact に貼付すること）

