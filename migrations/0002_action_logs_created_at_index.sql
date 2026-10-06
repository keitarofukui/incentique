-- action_logs の作成日時インデックス追加（D1 rows_read 最適化）
CREATE INDEX IF NOT EXISTS idx_action_logs_created_at ON action_logs (created_at DESC);
