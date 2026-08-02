export interface TrainingMenu {
  id: string;
  menu_name: string;
  default_points: number;
  video_url?: string;
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
  required_points: number;
  item_type?: 'goods' | 'cash';
  is_approved: boolean;
  is_claimed: boolean;
  created_at: string;
}

export interface ActionLog {
  id: string;
  user_id: string;
  user_name?: string;
  // 'quiz' is written by POST /api/quizzes/answer; 'study' is legacy data
  category: 'quiz' | 'study' | 'input_book' | 'input_manga' | 'input_movie' | 'training' | 'eat_rice' | 'eat_meat';
  title_or_menu: string;
  review_text?: string;
  earned_points: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}
