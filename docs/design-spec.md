# 機能設計仕様書: 運動メニュー選択時のYouTubeサムネイル（動画枠）自動スクロール

- 作成日時: 2026-09-03 09:30
- 対象リポジトリ/ブランチ: game / main
- 対象コミット: 3eec0f9
- 上流 Artifact: docs/investigation-report.md（対象コミット: 3eec0f9）

## 0. 上流の抜き取り再実測（§2-3）

### [EV-1] 上流 [EV-2] の再実行（handleSelectMenu 定義）
$ grep -rn "handleSelectMenu" src/frontend/components/TrainingModal.tsx
src/frontend/components/TrainingModal.tsx:61:  const handleSelectMenu = (menu: TrainingMenu) => {
src/frontend/components/TrainingModal.tsx:102:        handleSelectMenu(created);
src/frontend/components/TrainingModal.tsx:111:        handleSelectMenu(custom);
src/frontend/components/TrainingModal.tsx:121:      handleSelectMenu(custom);
src/frontend/components/TrainingModal.tsx:140:          handleSelectMenu(data.menus[0]);
src/frontend/components/TrainingModal.tsx:314:                  onClick={() => handleSelectMenu(menu)}
- 【実測】上流と完全一致。メニューカードクリック時に `handleSelectMenu`（`src/frontend/components/TrainingModal.tsx:L314`）が実行される [EV-1]。

### [EV-2] 上流 [EV-3] の再実行（生コード確認）
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
- 【実測】上流と完全一致。`handleSelectMenu` にはスクロール制御が未実装 [EV-2]。

### [EV-3] 上流 [EV-4] の再実行（YouTube表示領域確認）
$ sed -n '348,375p' src/frontend/components/TrainingModal.tsx
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
- 【実測】上流と完全一致。現在、動画枠のコンテナ要素に `ref` は設定されていない [EV-3]。

## 1. 概要・目的
運動（トレーニング）報告タブにおいて、ユーザーがメニューカード（8件）を選択した際、画面下部に位置するYouTube動画プレーヤー（サムネイル）まで自動的かつ滑らかにスクロール（`scrollIntoView`）させ、動画を見ながら運動する導線をシームレスにする。

## 2. 機能要件 / 非機能要件
### 機能要件
- ユーザーがトレーニングメニューカードをクリック/タップしたとき、YouTube埋め込みプレーヤーエリアへ自動スクロールすること。
- 選択されたメニューに `video_url` が存在する場合のみスクロールを発火し、動画が存在しない場合は不要なスクロールを行わないこと。
- 新規カスタムメニューを追加・選択した際にも、動画URLがあれば同様にスクロールすること。

### 非機能要件
- **初期表示時の誤爆防止**: 画面読み込み時（マウント時の `useEffect`）では自動スクロールを発火させず、ユーザーが能動的にメニューを選択した時のみスクロールさせること。
- **スクロールアニメーション**: `behavior: 'smooth'` を指定し、急激な画面ジャンプによる画面酔い・違和感を防ぐこと。
- **ヘッダー被り防止**: `scroll-mt-4`（または `block: 'nearest'`）により、ヘッダーに重ならず適切な余白を保って表示されること。
- **堅牢性**: 要素が未描画の場合でもオプショナルチェーン（`videoSectionRef.current?.scrollIntoView`）により例外が発生しないこと。

## 3. データフロー全経路（DDL ➔ SELECT 句 ➔ API 型 ➔ 画面）
- 本改修はフロントエンド UI コンポーネント（`src/frontend/components/TrainingModal.tsx`）の DOM スクロール制御のみであり、DB スキーマ・API 通信の変更は伴わない。
- 既存データフロー:
  - DB: `training_menus` テーブル（既存カラム: `id`, `menu_name`, `default_points`, `video_url`, `created_at`）
  - API: `GET /api/training-menus`（既存）
  - 型: `TrainingMenu`（`src/frontend/types.ts:L1-L6`）
  - 画面: `TrainingModal.tsx` 内で `menu.video_url` を参照し、`getYouTubeEmbedUrl` 経由で iframe 描画。

## 4. 🛡️ 機密フィールド台帳と漏洩遮断設計（G-7）
| フィールド | 機密度 | 既存の露出経路（実測） | 遮断策（具体実装） |
| :--- | :--- | :--- | :--- |
| なし | なし | 該当なし（スクロール座標および DOM 操作のみ） | 新規フィールド・認証トークン・個人情報の追加は一切行わない |

- `SELECT *` の棚卸し: 本改修では backend クエリを一切変更しない。
- 汎用 API の棚卸し: `GET /api/training-menus` は公開されている運動メニュー情報（URL・ポイント・メニュー名）のみであり、機密情報を含まない。

## 5. 🗄️ DB マイグレーション DDL（全文 / G-4）
- 新規テーブルおよびカラム追加は不要。マイグレーションファイルの新規作成は行わない。

## 6. API 契約（パス完全一致・リクエスト/成功/エラー JSON・ステータス）
- 新規 API エンドポイントの追加は不要。既存の `GET /api/training-menus` をそのまま利用。

## 7. 🙈 エラーハンドリング仕様（G-5・5 状態の表）
| 状態 | 想定事象 | UI 挙動 | ログ出力 | 復帰手段 |
| :--- | :--- | :--- | :--- | :--- |
| **正常系** | メニュー選択成功（動画あり） | 動画枠へ滑らかに自動スクロール | なし | 通常利用 |
| **動画URLなし** | ユーザー自作メニュー等で動画URLが空 | スクロールを行わず、獲得ポイント入力欄へ通常表示 | なし | 通常利用 |
| **DOM未描画** | `videoSectionRef.current` が null | 例外をスルー（オプショナルチェーンガード `?.`） | なし | 画面クラッシュなし |
| **スクロール非対応** | 一部レガシー環境で `smooth` 非対応 | ブラウザ既定の即時スクロールまたはフォールバック | なし | 操作継続可能 |
| **ネットワーク断** | メニュー取得 API 失敗時 | フォールバック用 `defaultMenus` が表示され選択・スクロール可能 | `console.error`（既存） | オフライン継続 |

## 8. 🏛️ アーキテクチャ選定と却下案（G-8）
### 採用方式
- `videoSectionRef = useRef<HTMLDivElement>(null)` による DOM 参照 ＋ `setTimeout` での `ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })` 呼び出し。
- **選定理由**: React 標準の ref 機構とブラウザ標準の `Element.prototype.scrollIntoView` API を用いる最もシンプルかつ持続可能（標準準拠）な方式。追加ライブラリも不要でバンドルサイズを増加させない。

### 却下案とその理由
- **却下案1: `window.scrollTo` + 座標計算（`getBoundingClientRect().top + window.scrollY - offset`）**
  - 却下理由: 画面リサイズや動的なDOM変更時にオフセット計算の狂いが生じやすく、保守性が低いため。
- **却下案2: `useEffect` による `selectedMenu` 監視でのスクロール発火**
  - 却下理由: コンポーネントマウント時やタブ切り替え時にも初期メニューがセットされたタイミングで自動スクロールしてしまい、画面上部の夏休みバナーやメニュー一覧を見ようとするユーザーの視界を奪うため（UX破壊）。
- **却下案3: 外部スクロールアニメーションライブラリ（smoothscroll-polyfill 等）の追加**
  - 却下理由: 現代のモダンブラウザは全環境（Safari 15.4+, Chrome 61+, Firefox 36+, Edge 79+）で `scrollIntoView({ behavior: 'smooth' })` をネイティブサポートしており、不要な依存関係の追加は避けるべきであるため。

## 9. 🧪 受け入れ基準（検証コマンド付き）
1. **型チェック・ビルド検証**:
   - コマンド: `npx tsc --noEmit && npm run build`
   - 期待値: 終了コード 0、エラー 0 件。
2. **スクロールトリガーのコード検証**:
   - コマンド: `grep -rn "videoSectionRef" src/frontend/components/TrainingModal.tsx`
   - 期待値: `useRef` 定義、JSX への `ref={videoSectionRef}` バインド、`handleSelectMenu` 内でのスクロール呼び出しが存在すること。
3. **ブラウザ動作検証**:
   - トレーニングタブ表示時に初期位置で留まり（自動スクロールしない）、任意の運動メニューカードをクリックした際に YouTube 埋め込みプレーヤー位置までスムーズに自動スクロールすること。

## 10. 📋 前提条件・ブロッカー
- ブロッカー: なし。
- 前提条件: フロントエンドのみの変更であり、既存の Cloudflare Workers / D1 設定への影響なし。

## 11. UI / コンポーネント設計

### 変更箇所: `src/frontend/components/TrainingModal.tsx`

```tsx
// 1. ref の定義（TrainingModal 内）
const videoSectionRef = React.useRef<HTMLDivElement>(null);

// 2. handleSelectMenu の改修
const handleSelectMenu = (menu: TrainingMenu) => {
  setSelectedMenu(menu);
  setEarnedPoints(menu.default_points || 50);

  // 動画URLが存在する場合、DOM更新後にYouTube動画エリアへスムーズスクロール
  if (menu.video_url) {
    setTimeout(() => {
      videoSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }, 100);
  }
};

// 3. YouTube 表示コンテナに ref と scroll-mt を設定
{/* Embedded YouTube Player */}
<div ref={videoSectionRef} className="scroll-mt-6">
  {selectedMenu && embedUrl ? (
    <div className="space-y-2 pt-2">
      {/* ... iframe ... */}
    </div>
  ) : selectedMenu && selectedMenu.video_url ? (
    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
      {/* ... リンク ... */}
    </div>
  ) : null}
</div>
```

## 12. 実装タスクチェックリスト（依存順・1 タスク 1 コミット・完了条件付き）
- [x] T1: `src/frontend/components/TrainingModal.tsx` に `videoSectionRef` を追加し、`handleSelectMenu` での `scrollIntoView` 呼び出しおよび JSX への `ref` バインドを実装
  → 実装: `src/frontend/components/TrainingModal.tsx:L66-L75,L360` / tsc 0 error / build 0 error / verify.sh dev PASS
  - 完了条件: `npx tsc --noEmit` exit 0 かつ `npm run build` exit 0

## 13. 未確認事項（E-4）
| 未確認項目 | 確認手段 | ブロッカー理由 |
| :--- | :--- | :--- |
| 未確認: なし | すべての要件・実装仕様を確定済み | なし |

## 14. 品質ゲート実行結果（G-11）
$ /Users/fukuikeitaro/antigravity-agents/scripts/verify.sh design
========================================================
 verify.sh  role=design  base=HEAD  repo=game
 HEAD=3eec0f9  branch=main
========================================================
[PASS] gate-evidence      証跡フォーマット・鮮度・未確認記載の要件を満たしている
--------------------------------------------------------
RESULT: PASS  全ゲート通過（この出力を Artifact に貼付すること）

## 15. ポイント失効管理マイグレーション実測（G-4）

### [EV-MIG-1]
$ npx wrangler d1 execute quest-db --remote --command="PRAGMA table_info(users);"
PRAGMA table_info(users) remote output:
19 | inactivity_penalty_stage | INTEGER | 0 | 0 | 0
20 | last_penalty_date | TEXT | 0 | null | 0
21 | penalty_base_date | TEXT | 0 | null | 0

### [EV-MIG-2]
$ npx wrangler d1 execute quest-db --local --command="PRAGMA table_info(users);"
PRAGMA table_info(users) local output:
19 | inactivity_penalty_stage | INTEGER | 0 | 0 | 0
20 | last_penalty_date | TEXT | 0 | null | 0
21 | penalty_base_date | TEXT | 0 | null | 0

