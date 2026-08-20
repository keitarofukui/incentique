export interface TrainingMenu {
  id: string;
  menu_name: string;
  default_points: number;
  video_url?: string;
  created_at?: string;
}

export interface HouseworkMenu {
  id: string;
  menu_name: string;
  default_points: number;
  icon?: string;
  description?: string;
  created_at?: string;
}

export interface PointRule {
  category: string;
  title: string;
  points: number;
  description?: string;
  updated_at?: string;
}

export interface User {
  id: string;
  name: string;
  grade_level: 'high_3' | 'junior_1' | 'other';
  avatar?: string;
  current_points: number;
  last_action_date?: string;
  current_streak_days?: number;
  last_50pt_date?: string;
  current_50pt_streak_days?: number;
  last_100pt_date?: string;
  current_100pt_streak_days?: number;
  // その日にどの1日ボリュームボーナスを付与済みか（論理日 YYYY-MM-DD、朝4時区切り）
  last_300pt_bonus_date?: string | null;
  last_500pt_bonus_date?: string | null;
  last_1000pt_bonus_date?: string | null;
  /** 全カテゴリ制覇ボーナスを付与した論理日 */
  last_all_category_date?: string | null;
  created_at: string;
}

export interface UserGoal {
  id: string;
  user_id: string;
  target_title: string;
  target_points: number;
  target_date: string; // 'YYYY-MM-DD'
  created_at?: string;
}

export interface QuizQuestion {
  id: number;
  grade_level: 'high_3' | 'junior_1' | 'other';
  category: 'english' | 'social_studies' | 'science' | string;
  question_text: string;
  options: string[];
  correct_index: number;
  difficulty: number;
  created_at: string;
}

export interface WishItem {
  id: string;
  user_id: string;
  user_name?: string;
  title: string;
  image_url: string;
  product_url?: string;
  required_points: number;
  item_type?: 'goods' | 'cash';
  is_approved: boolean;
  is_claimed: boolean;
  /** 実際に引き落としたポイント（申請額と異なる場合がある） */
  approved_points?: number | null;
  /** 承認日時（UTC） */
  approved_at?: string | null;
  /** 差し戻し時に保護者が残したコメント */
  parent_comment?: string | null;
  returned_at?: string | null;
  created_at: string;
}

export interface ActionLog {
  id: string;
  user_id: string;
  user_name?: string;
  // 'quiz' is written by POST /api/quizzes/answer, 'bonus' by the streak /
  // volume milestone payouts in updateStreaks; 'study' is legacy data
  category: 'quiz' | 'bonus' | 'study' | 'input_book' | 'input_manga' | 'input_movie' | 'input_drama' | 'training' | 'housework' | 'eat_rice' | 'eat_meat';
  title_or_menu: string;
  review_text?: string;
  earned_points: number;
  /** ガチャ倍率・ボーナスを含まない素点。1日ボリュームボーナスの判定に使う（旧ログは未設定） */
  base_points?: number | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface UserSummary {
  totalPoints: number;
  todayEarnedPoints: number;
  quizTotalCount: number;
  todayCategories: { [key: string]: boolean };
}

export interface DailyStatItem {
  dateStr: string;
  quiz: number;
  input: number;
  training: number;
  meal: number;
  bonus: number;
  total: number;
}
