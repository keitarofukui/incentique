# コードレビュー結果レポート

## 1. 総合判定
**判定**: 【 LOOKS_GOOD_TO_ME (LGTM) 】

連続ボーナスの節目日数・達成閾値・倍率の保護者ポータル管理機能の実装について、設計仕様書 (`docs/design-spec.md`) の要件を完全に網羅しており、動作および仕様追従を確認いたしました。全体的に質の高い実装ですが、保守性および堅牢性向上のためのリファクタリング提案を以下にまとめます。

---

## 2. 品質評価サマリー
- **可読性・命名規則**: **良好** (直感的で統一されたルールキー・変数名が使用されています)
- **コード構造・共通化**: **改善推奨** (バックエンドでの初期設定登録処理やフロントエンドでの複数設定保存に一部重複・改善の余地があります)
- **パフォーマンス・堅牢性**: **良好** (一部で `catch (_)` による例外の飲み込みがあるため、ログ記録・フォールバックの強化が推奨されます)

---

## 3. 指摘事項 & リファクタリング提案

### 1. [`src/backend/index.ts`: L469-L502]
- **問題点**:
  - `GET /api/point-rules` 内で `INSERT OR IGNORE INTO point_rules ...` が10個以上個別に `await c.env.DB.prepare(...).run()` として実行されており、クエリ通信オーバーヘッドと冗長なコードになっています。
  - `try { ... } catch (_) {}` によりエラーが握りつぶされており、DB不整合発生時に原因追跡が困難です。
- **改善案**:
  - デフォルトルール配列を定義し、ループ処理でまとめるか、バッチクエリ処理にまとめることで可読性と実行効率を向上させます。

```typescript
// 改善コード案例
const DEFAULT_POINT_RULES = [
  { category: 'bonus_300pt', title: '🎉 1日300pt突破ボーナス', points: 200, description: 'ボーナス・ガチャ倍率を除いた1日の素点が300ptを超えた時の単発ボーナス' },
  { category: 'bonus_500pt', title: '🔥 1日500pt突破ボーナス', points: 300, description: 'ボーナス・ガチャ倍率を除いた1日の素点が500ptを超えた時の単発ボーナス' },
  { category: 'bonus_1000pt', title: '🤯 1日1000pt突破ボーナス', points: 500, description: 'ボーナス・ガチャ倍率を除いた1日の素点が1000ptを超えた時の単発ボーナス' },
  { category: 'bonus_all_category', title: '🎯 全カテゴリ制覇ボーナス', points: 100, description: '1日でクイズ・インプット・運動・食事の4カテゴリすべてを記録した時の単発ボーナス（0で無効化）' },
  { category: 'streak_milestones', title: '🔥 連続達成マイルストーン日数', points: 0, description: '2,3,4,5,6,7,10,14,21,30,50,100,150,200,250,300,365' },
  { category: 'streak_daily_multiplier', title: '🔥 デイリー連続ボーナス係数', points: 10, description: 'デイリー連続達成時の1日あたり獲得ポイント (日数 × 係数)' },
  { category: 'streak_mid_threshold', title: '💥 中級連続ボーナス素点閾値', points: 100, description: '中級連続ボーナス判定に必要な1日の素点 (pt)' },
  { category: 'streak_mid_multiplier', title: '💥 中級連続ボーナス係数', points: 30, description: '中級連続達成時の1日あたり獲得ポイント (日数 × 係数)' },
  { category: 'streak_god_threshold', title: '👑 神連続ボーナス素点閾値', points: 250, description: '神連続ボーナス判定に必要な1日の素点 (pt)' },
  { category: 'streak_god_multiplier', title: '👑 神連続ボーナス係数', points: 100, description: '神連続達成時の1日あたり獲得ポイント (日数 × 係数)' },
];

for (const rule of DEFAULT_POINT_RULES) {
  await c.env.DB.prepare(
    "INSERT OR IGNORE INTO point_rules (category, title, points, description) VALUES (?, ?, ?, ?)"
  ).bind(rule.category, rule.title, rule.points, rule.description).run();
}
```

---

### 2. [`src/backend/index.ts`: L178-L181]
- **問題点**:
  - DBから取得したカンマ区切り文字列 `streakMilestoneStr` のパース時、不正な文字列（例: 空白や全角文字）が含まれていた場合のフォールバックとして、パース結果配列が空 `[]` になってしまう可能性があります。
- **改善案**:
  - パース結果の要素数が0の場合にデフォルト配列へフォールバックするガード条件を追加します。

```typescript
const parsedMilestones = streakMilestoneStr
  .split(',')
  .map((s: string) => parseInt(s.trim(), 10))
  .filter((n: number) => !isNaN(n) && n > 0);

const STREAK_MILESTONES: number[] = parsedMilestones.length > 0
  ? parsedMilestones
  : [2, 3, 4, 5, 6, 7, 10, 14, 21, 30, 50, 100, 150, 200, 250, 300, 365];
```

---

### 3. [`src/frontend/components/ParentPortal.tsx`: L884-L892, L922-L930]
- **問題点**:
  - 中級連続・神連続ボーナスの保存ボタンで `await handleSaveRule('..._threshold'); await handleSaveRule('..._multiplier');` と2回連続で `PUT` リクエストを発行しています。個別変更時は問題ありませんが、保存APIを複数カテゴリ対応（一括更新API）にするか、保存成功メッセージを重複してセットしないようコントロールするとUXがより洗練されます。
- **改善案**:
  - `handleSaveRule` に複数キーを受け取れる拡張を行うか、Promise.all で並列実行します。

---

## 4. 結論
実装品質は高く、機能要件を満たしています。判定は **【 LOOKS_GOOD_TO_ME (LGTM) 】** です。
上記の指摘事項は今後のメンテナンス性・堅牢性向上のためのリファクタリング提案ですので、次のステップ（テスト・監査）に進んで問題ありません。
