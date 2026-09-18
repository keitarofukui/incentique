-- ポイント失効（非活動ペナルティ）管理カラムの追加
ALTER TABLE users ADD COLUMN inactivity_penalty_stage INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN last_penalty_date TEXT;
ALTER TABLE users ADD COLUMN penalty_base_date TEXT;

-- 既存ユーザーの penalty_base_date を本日（機能導入日）に初期設定（過去放置分の即時全額失効を防ぐ）
UPDATE users SET penalty_base_date = '2026-09-18', inactivity_penalty_stage = 0 WHERE penalty_base_date IS NULL;
