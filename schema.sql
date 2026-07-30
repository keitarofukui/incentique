DROP TABLE IF EXISTS training_menus;
DROP TABLE IF EXISTS point_rules;
DROP TABLE IF EXISTS user_goals;
DROP TABLE IF EXISTS action_logs;
DROP TABLE IF EXISTS wish_items;
DROP TABLE IF EXISTS quiz_questions;
DROP TABLE IF EXISTS users;

-- ポイントルール管理テーブル
CREATE TABLE IF NOT EXISTS point_rules (
  category TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  points INTEGER NOT NULL,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- トレーニングメニュー (YouTube動画URL対応)
CREATE TABLE IF NOT EXISTS training_menus (
  id TEXT PRIMARY KEY,
  menu_name TEXT NOT NULL,
  default_points INTEGER DEFAULT 50,
  video_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  avatar TEXT DEFAULT '⚡',
  pin_code TEXT DEFAULT '1234',
  current_points INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 目標＆期間プランニングテーブル
CREATE TABLE IF NOT EXISTS user_goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  target_title TEXT NOT NULL,
  target_points INTEGER NOT NULL,
  target_date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- クイズ問題プール
CREATE TABLE IF NOT EXISTS quiz_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grade_level TEXT NOT NULL,
  category TEXT NOT NULL,
  question_text TEXT NOT NULL,
  options_json TEXT NOT NULL,
  correct_index INTEGER NOT NULL,
  difficulty INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quiz_category_grade ON quiz_questions (category, grade_level);

-- 欲しいもの（ウィッシュリスト）
CREATE TABLE IF NOT EXISTS wish_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  image_url TEXT,
  required_points INTEGER NOT NULL,
  item_type TEXT DEFAULT 'goods',
  is_approved BOOLEAN DEFAULT FALSE,
  is_claimed BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- アプリ設定・キャッシュ（保護者PIN、通知メール、クイズ件数の24時間キャッシュ）
-- ※ DROP しない: 保護者PINなど再作成できない設定が入るため
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- 申請＆行動ログ
CREATE TABLE IF NOT EXISTS action_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  title_or_menu TEXT NOT NULL,
  review_text TEXT,
  earned_points INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at DATE DEFAULT (CURRENT_DATE)
);

-- ポイントルール初期投入 (映画120pt, 読書300pt, 漫画50pt, トレーニング50pt, クイズ1pt)
INSERT OR IGNORE INTO point_rules (category, title, points, description) VALUES
('input_book', '読書インプット', 300, '本を1冊読んで感想レビューを提出'),
('input_movie', '映画インプット', 120, '映画やドキュメンタリーを観てレビューを提出'),
('input_manga', '漫画', 50, '漫画を読んで感想メモを提出'),
('training', 'トレーニング', 50, '筋トレ・HIIT・動画トレーニング成果を報告'),
('study_quiz', '暗記クイズ1問正解', 1, '4択クイズ1問正解につき1ポイント');

-- 指定のYouTube動画トレーニングメニュー初期登録 (各 50 pt)
INSERT OR IGNORE INTO training_menus (id, menu_name, default_points, video_url) VALUES
('menu_hiit', 'HIIT トレーニング', 50, 'https://youtu.be/VFywKvvNuWE?si=_BKuQ94p88T8i26q'),
('menu_plank', 'プランク トレーニング', 50, 'https://youtu.be/4scc_lxw6L8?si=BtuMJBGMZF9OvqO4'),
('menu_pushup', '腕立て トレーニング', 50, 'https://youtu.be/kUNR0pDlOok?si=RPgNQsqO17vWCBnB');

-- クイズ初期プール (英語・社会・理科)
INSERT OR IGNORE INTO quiz_questions (id, grade_level, category, question_text, options_json, correct_index, difficulty) VALUES
(1, 'high_3', 'english', '単語「ubiquitous」の最も適切な意味を選べ。', '["偏執的な", "至る所にある・普遍的な", "過酷な", "一時的な"]', 1, 1),
(2, 'high_3', 'english', '「meticulous」の意味として最もふさわしいものはどれか？', '["細部まで細やかな・几帳面な", "あやふやな", "急進的な", "攻撃的な"]', 0, 1),
(3, 'high_3', 'social_studies', '1689年、イギリスの名誉革命の際に制定された権利の宣言を元にした文書は？', '["マグナ・カルタ", "権利の請願", "権利の章典", "大抗議書"]', 2, 1),
(4, 'junior_1', 'english', '「私は放課後サッカーをします」の正しい英語表現は？', '["I play soccer after school.", "I am play soccer after school.", "I played soccer after school.", "I plays soccer after school."]', 0, 1),
(5, 'junior_1', 'science', '植物が光を受けて二酸化炭素と水から養分と酸素をつくる働きを何というか？', '["呼吸", "蒸散", "光合成", "吸収"]', 2, 1);

-- 外部API用レート制限カウンタ
CREATE TABLE IF NOT EXISTS rate_limit_counters (
  bucket_key TEXT PRIMARY KEY,
  hits INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON rate_limit_counters (window_start);
