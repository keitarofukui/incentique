import { Hono } from 'hono';
import { cors } from 'hono/cors';
// Imported as types (not via tsconfig "types") so the Workers globals don't
// override the DOM lib the frontend compiles against.
import type { D1Database } from '@cloudflare/workers-types';

export type Bindings = {
  DB: D1Database;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  RESEND_API_KEY?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

function isSummerBreakPeriod(): boolean {
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = jstNow.getUTCFullYear();
  const month = jstNow.getUTCMonth() + 1;

  // Summer break campaign: July 1 – Aug 31, 2026 (JST).
  // NOTE: hard-coded to 2026 — the campaign silently ends after this year.
  if (year === 2026 && (month === 7 || month === 8)) {
    return true;
  }
  return false;
}

function rollGachaMultiplier(): { multiplier: number; bonusTier: string; bonusLabel: string; isSummerBonus?: boolean } {
  const isSummer = isSummerBreakPeriod();
  const rand = Math.random() * 100;

  if (isSummer) {
    // ☀️ Summer break 2x Bonus Chance! (当選確率が通常の2倍)
    // 10x JACKPOT: 1.5% -> 3.0%
    // 3x SUPER FEVER: 8.5% -> 17.0% (3.0% ~ 20.0%)
    // 2x FEVER: 20.0% -> 40.0%       (20.0% ~ 60.0%)
    // 1x Normal: 40.0%
    if (rand < 3.0) {
      return { multiplier: 10, bonusTier: 'jackpot_10x', bonusLabel: '☀️夏休み確率UP中🎰 超激レア 10倍 JACKPOT！', isSummerBonus: true };
    } else if (rand < 20.0) {
      return { multiplier: 3, bonusTier: 'super_3x', bonusLabel: '☀️夏休み確率UP中⚡ 3倍 SUPER FEVER！', isSummerBonus: true };
    } else if (rand < 60.0) {
      return { multiplier: 2, bonusTier: 'fever_2x', bonusLabel: '☀️夏休み確率UP中🔥 2倍 FEVER！', isSummerBonus: true };
    } else {
      return { multiplier: 1, bonusTier: 'normal', bonusLabel: '通常' };
    }
  } else {
    if (rand < 1.5) {
      return { multiplier: 10, bonusTier: 'jackpot_10x', bonusLabel: '🎰 超激レア 10倍 JACKPOT！' };
    } else if (rand < 10.0) {
      return { multiplier: 3, bonusTier: 'super_3x', bonusLabel: '⚡ 3倍 SUPER FEVER！' };
    } else if (rand < 30.0) {
      return { multiplier: 2, bonusTier: 'fever_2x', bonusLabel: '🔥 2倍 FEVER！' };
    } else {
      return { multiplier: 1, bonusTier: 'normal', bonusLabel: '通常' };
    }
  }
}

app.use('*', cors());

// ==========================================
// 1. Users & Authentication
// ==========================================
app.get('/api/users', async (c) => {
  try {
    // Never select pin_code — the login screen is public and 1-click, so no
    // client needs it. (Per-child PIN login was removed; only the parent PIN
    // in app_settings is still used, via /api/parent/verify-pin.)
    const { results } = await c.env.DB.prepare('SELECT id, name, grade_level, avatar, current_points, created_at FROM users ORDER BY created_at ASC').all();
    return c.json({ success: true, users: results });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.post('/api/users', async (c) => {
  try {
    const body = await c.req.json<{
      name: string;
      gradeLevel: string;
      avatar?: string;
    }>();

    if (!body.name || !body.name.trim()) {
      return c.json({ success: false, error: 'Name is required' }, 400);
    }

    const id = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const avatar = body.avatar || '⚡';

    await c.env.DB.prepare(
      'INSERT INTO users (id, name, grade_level, avatar, current_points) VALUES (?, ?, ?, ?, 0)'
    )
      .bind(id, body.name.trim(), body.gradeLevel || 'high_3', avatar)
      .run();

    const newUser: any = await c.env.DB.prepare('SELECT id, name, grade_level, avatar, current_points FROM users WHERE id = ?').bind(id).first();

    return c.json({ success: true, user: newUser });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.delete('/api/users/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
    await c.env.DB.prepare('DELETE FROM action_logs WHERE user_id = ?').bind(id).run();
    await c.env.DB.prepare('DELETE FROM wish_items WHERE user_id = ?').bind(id).run();
    await c.env.DB.prepare('DELETE FROM user_goals WHERE user_id = ?').bind(id).run();

    return c.json({ success: true, id });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.get('/api/rivals', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT id, name, grade_level, avatar, current_points FROM users ORDER BY current_points DESC'
    ).all();

    return c.json({ success: true, rivals: results });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// ==========================================
// Point Rules Master Endpoints
// ==========================================
app.get('/api/point-rules', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM point_rules').all();
    return c.json({ success: true, rules: results });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.put('/api/point-rules', async (c) => {
  try {
    const body = await c.req.json<{
      category: string;
      points: number;
    }>();

    await c.env.DB.prepare(
      'UPDATE point_rules SET points = ?, updated_at = CURRENT_TIMESTAMP WHERE category = ?'
    )
      .bind(body.points, body.category)
      .run();

    const { results } = await c.env.DB.prepare('SELECT * FROM point_rules').all();
    return c.json({ success: true, rules: results });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// ==========================================
// 2. Target & Deadline Goals
// ==========================================
app.get('/api/goals/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const goal = await c.env.DB.prepare('SELECT * FROM user_goals WHERE user_id = ? ORDER BY created_at DESC LIMIT 1')
      .bind(userId)
      .first();

    return c.json({ success: true, goal: goal || null });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.post('/api/goals', async (c) => {
  try {
    const body = await c.req.json<{
      userId: string;
      targetTitle: string;
      targetPoints: number;
      targetDate: string;
    }>();

    const existing: any = await c.env.DB.prepare('SELECT id FROM user_goals WHERE user_id = ?').bind(body.userId).first();

    if (existing) {
      await c.env.DB.prepare(
        'UPDATE user_goals SET target_title = ?, target_points = ?, target_date = ? WHERE user_id = ?'
      )
        .bind(body.targetTitle, body.targetPoints, body.targetDate, body.userId)
        .run();
    } else {
      const id = 'goal_' + Date.now();
      await c.env.DB.prepare(
        'INSERT INTO user_goals (id, user_id, target_title, target_points, target_date) VALUES (?, ?, ?, ?, ?)'
      )
        .bind(id, body.userId, body.targetTitle, body.targetPoints, body.targetDate)
        .run();
    }

    const updated = await c.env.DB.prepare('SELECT * FROM user_goals WHERE user_id = ?').bind(body.userId).first();

    return c.json({ success: true, goal: updated });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// ==========================================
// 3. Quizzes & Gemini API
// ==========================================
app.get('/api/quizzes', async (c) => {
  try {
    const gradeLevel = c.req.query('grade_level');
    const category = c.req.query('category');

    let studyWhere = " WHERE category != 'anime_manga'";
    const studyParams: any[] = [];

    // Category filter for academic subjects
    if (category && category !== 'all') {
      studyWhere += ' AND category = ?';
      studyParams.push(category);
    }

    // Grade Level filter for academic subjects
    if (gradeLevel && gradeLevel !== 'all' && gradeLevel !== 'other') {
      studyWhere += " AND (grade_level = ? OR grade_level = 'all')";
      studyParams.push(gradeLevel);
    }

    const studyWhereAnd = studyWhere.replace(/^ WHERE /, ' AND ');

    // id is an INTEGER PRIMARY KEY, so MAX(id) is a single b-tree lookup (1 row
    // read). It drives the random sampling below and doubles as a cheap
    // "has the question pool changed?" signal for the count cache.
    const maxRow: any = await c.env.DB.prepare('SELECT MAX(id) as maxId FROM quiz_questions').first();
    const maxId = Number(maxRow?.maxId) || 0;

    // 1. Cached total count (24h TTL in app_settings).
    //    COUNT(*) is a full table scan (~3,600 rows), so it is cached — and the
    //    value doubles as the selectivity estimate that picks the sampling
    //    strategy below.
    //    The cache is also keyed on maxId: importing new questions (via the seed
    //    scripts or /api/quizzes/generate) bumps it and invalidates the entry
    //    immediately, instead of leaving the screen showing a stale "全 N 問"
    //    for up to 24 hours.
    const cacheKey = `quiz_count_${category || 'all'}_${gradeLevel || 'all'}`;
    let totalCount: number | null = null;

    try {
      const cacheRow: any = await c.env.DB.prepare(
        'SELECT value FROM app_settings WHERE key = ?'
      ).bind(cacheKey).first();

      if (cacheRow && cacheRow.value) {
        const parsed = JSON.parse(cacheRow.value);
        const fresh = Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000;
        if (typeof parsed.count === 'number' && typeof parsed.timestamp === 'number' && fresh && parsed.maxId === maxId) {
          totalCount = parsed.count;
        }
      }
    } catch (_) {}

    if (totalCount === null) {
      const countRes: any = await c.env.DB.prepare(
        `SELECT COUNT(*) as total FROM quiz_questions${studyWhere}`
      ).bind(...studyParams).first();
      totalCount = countRes?.total || 0;

      try {
        await c.env.DB.prepare(
          'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
        ).bind(cacheKey, JSON.stringify({ count: totalCount, timestamp: Date.now(), maxId })).run();
      } catch (_) {}
    }

    // 2. Fetch study quizzes.
    //
    //    Random primary-key sampling avoids ORDER BY RANDOM() reading the whole
    //    table, but it only pays off when the filter is loose enough that a
    //    sample of SAMPLE_SIZE ids reliably contains NEEDED matches. For a
    //    selective filter (e.g. a single subject) the sample mostly misses and
    //    we would pay for the attempt *and* the fallback, so go straight to the
    //    indexed ORDER BY RANDOM() instead.
    const NEEDED = 45;
    const SAMPLE_SIZE = 150;

    let studyQuizzes: any[] = [];
    const expectedHits = maxId > 0 ? (SAMPLE_SIZE * (totalCount ?? 0)) / maxId : 0;

    if (expectedHits >= NEEDED * 1.4) {
      const ids = new Set<number>();
      while (ids.size < Math.min(SAMPLE_SIZE, maxId)) {
        ids.add(Math.floor(Math.random() * maxId) + 1);
      }

      // D1 allows at most 100 bound parameters per query, so the sampled ids are
      // inlined rather than bound. They are integers generated here, never input.
      const idList = Array.from(ids).map((n) => Math.trunc(n)).join(',');

      // ORDER BY RANDOM() over the sampled ids only (<= SAMPLE_SIZE rows, not the
      // table). Without it, LIMIT returns the lowest ids of the sample, which
      // biases every quiz session towards the earliest-seeded questions.
      const sampledRes = await c.env.DB.prepare(
        `SELECT * FROM quiz_questions WHERE id IN (${idList})${studyWhereAnd} ORDER BY RANDOM() LIMIT ${NEEDED}`
      ).bind(...studyParams).all();
      studyQuizzes = sampledRes.results || [];
    }

    // Fallback: selective filter, or an unlucky draw. The index on
    // (category, grade_level) keeps this to the matching rows, not the table.
    if (studyQuizzes.length < NEEDED) {
      const fallbackRes = await c.env.DB.prepare(
        `SELECT * FROM quiz_questions${studyWhere} ORDER BY RANDOM() LIMIT ${NEEDED}`
      ).bind(...studyParams).all();
      studyQuizzes = fallbackRes.results || [];
    }

    // 3. Fetch Anime Break-time Quizzes (Bonus Mix: 3 items)
    let animeQuizzes: any[] = [];
    if (studyQuizzes.length > 0) {
      const animeRes = await c.env.DB.prepare(
        `SELECT * FROM quiz_questions WHERE category = 'anime_manga' ORDER BY RANDOM() LIMIT 3`
      ).all();
      animeQuizzes = animeRes.results || [];
    }

    // Combine & Fisher-Yates Shuffle
    const combined = [...studyQuizzes, ...animeQuizzes];
    for (let i = combined.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [combined[i], combined[j]] = [combined[j], combined[i]];
    }

    const formatted = combined.map((q: any) => ({
      ...q,
      options: JSON.parse(q.options_json || '[]')
    }));

    return c.json({
      success: true,
      quizzes: formatted,
      totalCount: totalCount
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.post('/api/quizzes/answer', async (c) => {
  try {
    const body = await c.req.json<{
      userId: string;
      questionId: number;
      selectedIndex: number;
    }>();

    const question: any = await c.env.DB.prepare('SELECT * FROM quiz_questions WHERE id = ?')
      .bind(body.questionId)
      .first();

    if (!question) {
      return c.json({ success: false, error: 'Question not found' }, 404);
    }

    const isCorrect = question.correct_index === body.selectedIndex;
    let basePoints = 0;
    let multiplier = 1;
    let pointsEarned = 0;
    let bonusTier = 'normal';
    let bonusLabel = '';

    if (isCorrect) {
      // Honour the 'study_quiz' rule the parent portal edits (falls back to 1pt)
      const quizRule: any = await c.env.DB.prepare(
        "SELECT points FROM point_rules WHERE category = 'study_quiz'"
      ).first();
      basePoints = Number(quizRule?.points) > 0 ? Number(quizRule.points) : 1;

      const gacha = rollGachaMultiplier();
      multiplier = gacha.multiplier;
      bonusTier = gacha.bonusTier;
      bonusLabel = gacha.bonusLabel;
      pointsEarned = basePoints * multiplier;

      await c.env.DB.prepare('UPDATE users SET current_points = current_points + ? WHERE id = ?')
        .bind(pointsEarned, body.userId)
        .run();

      const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const catLabel =
        question.category === 'english' ? '英語' :
        question.category === 'math' ? '数学' :
        question.category === 'science' ? '理科' :
        question.category === 'social_studies' ? '社会' :
        question.category === 'japanese' ? '国語' :
        question.category === 'anime_manga' ? '🍿箸休めアニメ' : 'クイズ';
      const titlePrefix = multiplier > 1 ? `【クイズ正解】${bonusLabel} ` : `【クイズ正解】`;

      await c.env.DB.prepare(
        'INSERT INTO action_logs (id, user_id, category, title_or_menu, review_text, earned_points, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))'
      )
        .bind(
          logId,
          body.userId,
          'quiz',
          `${titlePrefix}${catLabel}`,
          `問題: ${question.question_text}`,
          pointsEarned,
          'approved'
        )
        .run();
    }

    const user: any = await c.env.DB.prepare('SELECT current_points FROM users WHERE id = ?')
      .bind(body.userId)
      .first();

    return c.json({
      success: true,
      isCorrect,
      correctIndex: question.correct_index,
      basePoints,
      multiplier,
      bonusTier,
      bonusLabel,
      pointsEarned,
      newTotalPoints: user ? user.current_points : 0
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.post('/api/quizzes/generate', async (c) => {
  try {
    // process.env is not available in the Workers runtime — use the binding only
    const apiKey = c.env.GEMINI_API_KEY;
    const body = await c.req.json<{
      gradeLevel: string;
      category: string;
      count?: number;
      topic?: string;
    }>();

    const count = body.count || 5;
    const gradeTitle = body.gradeLevel === 'high_3' ? '高校レベル' : '中学レベル';
    const catLabel = body.category === 'english' ? '英語' : body.category === 'social_studies' ? '社会' : '理科';
    const topicDesc = body.topic ? `（テーマ: ${body.topic}）` : '';

    const prompt = `あなたは小中高生の学習を支援する優秀な教育AIです。
${gradeTitle}向けの「${catLabel}」科目に関する4択学習クイズを${count}問作成してください${topicDesc}。

【出力フォーマット】
以下のキーを持つ厳密なJSON配列（Markdown装飾コードブロックなし）のみを出力してください：
[
  {
    "question_text": "問題文",
    "options": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
    "correct_index": 0,
    "difficulty": 2
  }
]`;

    let generatedQuestions: any[] = [];

    if (apiKey) {
      const model = c.env.GEMINI_MODEL || 'gemini-2.5-flash';
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini API HTTP Error (${res.status}): ${errText}`);
      }

      const resData: any = await res.json();
      const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
      const cleanJson = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      generatedQuestions = JSON.parse(cleanJson);
    } else {
      generatedQuestions = Array.from({ length: count }).map((_, i) => ({
        question_text: `【AI生成サンプル】${catLabel} 問題 #${i + 1}`,
        options: [`正解の選択肢 A`, `選択肢 B`, `選択肢 C`, `選択肢 D`],
        correct_index: 0,
        difficulty: (i % 3) + 1
      }));
    }

    const insertedIds: number[] = [];
    for (const q of generatedQuestions) {
      const optionsJson = JSON.stringify(q.options || []);
      const stmt = await c.env.DB.prepare(
        'INSERT INTO quiz_questions (grade_level, category, question_text, options_json, correct_index, difficulty) VALUES (?, ?, ?, ?, ?, ?)'
      )
        .bind(
          body.gradeLevel,
          body.category,
          q.question_text,
          optionsJson,
          q.correct_index ?? 0,
          q.difficulty ?? 1
        )
        .run();

      if (stmt.meta?.last_row_id) {
        insertedIds.push(stmt.meta.last_row_id);
      }
    }

    return c.json({
      success: true,
      count: generatedQuestions.length,
      questions: generatedQuestions,
      insertedCount: insertedIds.length
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// ==========================================
// Training Menus Master Endpoints
// ==========================================
app.get('/api/training-menus', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM training_menus ORDER BY created_at ASC').all();
    return c.json({ success: true, menus: results });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.post('/api/training-menus', async (c) => {
  try {
    const body = await c.req.json<{
      menuName: string;
      defaultPoints?: number;
      videoUrl?: string;
    }>();

    const id = 'menu_' + Date.now();
    const pts = body.defaultPoints || 50;

    await c.env.DB.prepare(
      'INSERT INTO training_menus (id, menu_name, default_points, video_url) VALUES (?, ?, ?, ?)'
    )
      .bind(id, body.menuName, pts, body.videoUrl || null)
      .run();

    const { results } = await c.env.DB.prepare('SELECT * FROM training_menus ORDER BY created_at ASC').all();
    return c.json({ success: true, menus: results });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.put('/api/training-menus/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json<{
      menuName: string;
      defaultPoints: number;
      videoUrl?: string;
    }>();

    await c.env.DB.prepare(
      'UPDATE training_menus SET menu_name = ?, default_points = ?, video_url = ? WHERE id = ?'
    )
      .bind(body.menuName, body.defaultPoints || 50, body.videoUrl || null, id)
      .run();

    const { results } = await c.env.DB.prepare('SELECT * FROM training_menus ORDER BY created_at ASC').all();
    return c.json({ success: true, menus: results });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.delete('/api/training-menus/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM training_menus WHERE id = ?').bind(id).run();

    const { results } = await c.env.DB.prepare('SELECT * FROM training_menus ORDER BY created_at ASC').all();
    return c.json({ success: true, menus: results });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// ==========================================
// 4. Action Logs & Wishlist
// ==========================================
app.get('/api/action-logs', async (c) => {
  try {
    const userId = c.req.query('user_id');
    const status = c.req.query('status');

    let query = 'SELECT action_logs.*, users.name as user_name FROM action_logs JOIN users ON action_logs.user_id = users.id';
    const conditions: string[] = [];
    const params: any[] = [];

    if (userId) {
      conditions.push('action_logs.user_id = ?');
      params.push(userId);
    }
    if (status) {
      conditions.push('action_logs.status = ?');
      params.push(status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY action_logs.created_at DESC';

    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, logs: results });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.post('/api/action-logs', async (c) => {
  try {
    const body = await c.req.json<{
      userId: string;
      category: string;
      titleOrMenu: string;
      reviewText?: string;
      earnedPoints?: number;
      grams?: number;
    }>();

    const id = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    let basePoints = body.earnedPoints || 50;

    // Server-side recalculation for meal quests, so the client can't inflate points.
    // Rates must stay in sync with MEAL_RATES in src/frontend/components/EatRiceModal.tsx.
    if ((body.category === 'eat_rice' || body.category === 'eat_meat') && body.grams) {
      const user: any = await c.env.DB.prepare('SELECT grade_level FROM users WHERE id = ?').bind(body.userId).first();
      if (user) {
        const isJunior = (user.grade_level || '').startsWith('junior');
        // Meat gets a 1.5x rate bonus for the protein
        const ratePercent = body.category === 'eat_meat' ? (isJunior ? 15 : 4.5) : isJunior ? 10 : 3;
        const requestedGrams = Math.min(1000, Math.max(1, body.grams));
        basePoints = Math.floor((requestedGrams * ratePercent) / 100);
      }
    }

    // Roll Lucky Multiplier Gacha!
    const gacha = rollGachaMultiplier();
    const finalEarnedPoints = basePoints * gacha.multiplier;

    const displayTitle =
      gacha.multiplier > 1 ? `【${gacha.bonusLabel}】${body.titleOrMenu}` : body.titleOrMenu;

    // Auto-approve logs upon submission (self-reporting model)
    await c.env.DB.prepare(
      'INSERT INTO action_logs (id, user_id, category, title_or_menu, review_text, earned_points, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))'
    )
      .bind(
        id,
        body.userId,
        body.category,
        displayTitle,
        body.reviewText || '',
        finalEarnedPoints,
        'approved'
      )
      .run();

    // Automatically award points to user
    await c.env.DB.prepare(
      'UPDATE users SET current_points = current_points + ? WHERE id = ?'
    )
      .bind(finalEarnedPoints, body.userId)
      .run();

    return c.json({
      success: true,
      id,
      status: 'approved',
      basePoints,
      multiplier: gacha.multiplier,
      bonusTier: gacha.bonusTier,
      bonusLabel: gacha.bonusLabel,
      finalEarnedPoints
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.delete('/api/action-logs/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const log: any = await c.env.DB.prepare('SELECT * FROM action_logs WHERE id = ?').bind(id).first();

    if (!log) {
      return c.json({ success: false, error: 'Action log not found' }, 404);
    }

    if (log.status === 'approved' && log.earned_points > 0) {
      await c.env.DB.prepare(
        'UPDATE users SET current_points = MAX(0, current_points - ?) WHERE id = ?'
      )
        .bind(log.earned_points, log.user_id)
        .run();
    }

    await c.env.DB.prepare('DELETE FROM action_logs WHERE id = ?').bind(id).run();

    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.get('/api/wish-items', async (c) => {
  try {
    try {
      await c.env.DB.prepare("ALTER TABLE wish_items ADD COLUMN item_type TEXT DEFAULT 'goods'").run();
    } catch (_) {}

    const userId = c.req.query('user_id');
    let query = 'SELECT wish_items.*, users.name as user_name FROM wish_items JOIN users ON wish_items.user_id = users.id';
    const params: any[] = [];

    if (userId) {
      query += ' WHERE wish_items.user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY wish_items.required_points ASC';

    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, wishItems: results });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.post('/api/wish-items', async (c) => {
  try {
    try {
      await c.env.DB.prepare("ALTER TABLE wish_items ADD COLUMN item_type TEXT DEFAULT 'goods'").run();
    } catch (_) {}

    const body = await c.req.json<{
      userId: string;
      title: string;
      imageUrl?: string;
      requiredPoints: number;
      itemType?: 'goods' | 'cash';
    }>();

    const id = 'wish_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const itemType = body.itemType || 'goods';

    await c.env.DB.prepare(
      'INSERT INTO wish_items (id, user_id, title, image_url, required_points, item_type, is_approved, is_claimed) VALUES (?, ?, ?, ?, ?, ?, 0, 0)'
    )
      .bind(
        id,
        body.userId,
        body.title,
        body.imageUrl || (itemType === 'cash' ? 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop' : 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop'),
        body.requiredPoints,
        itemType
      )
      .run();

    return c.json({ success: true, id });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.delete('/api/wish-items/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const wish: any = await c.env.DB.prepare('SELECT * FROM wish_items WHERE id = ?').bind(id).first();

    if (!wish) {
      return c.json({ success: false, error: 'Wish item not found' }, 404);
    }

    // An already-approved exchange has been paid out in real life — deleting the
    // row must not hand the points back.
    await c.env.DB.prepare('DELETE FROM wish_items WHERE id = ?').bind(id).run();

    return c.json({ success: true, id });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.put('/api/wish-items/:id/claim', async (c) => {
  try {
    const id = c.req.param('id');
    const wish: any = await c.env.DB.prepare('SELECT * FROM wish_items WHERE id = ?').bind(id).first();

    if (!wish) {
      return c.json({ success: false, error: 'Wish item not found' }, 404);
    }

    const user: any = await c.env.DB.prepare('SELECT current_points FROM users WHERE id = ?')
      .bind(wish.user_id)
      .first();

    if (!user || user.current_points < wish.required_points) {
      return c.json({ success: false, error: 'Points insufficient for this item' }, 400);
    }

    await c.env.DB.prepare('UPDATE wish_items SET is_claimed = 1 WHERE id = ?').bind(id).run();

    // Trigger notification
    try {
      await c.env.DB.prepare(
        'CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT)'
      ).run();

      const emailRow: any = await c.env.DB.prepare(
        'SELECT value FROM app_settings WHERE key = ?'
      )
        .bind('notification_email')
        .first();

      const userDetail: any = await c.env.DB.prepare('SELECT name FROM users WHERE id = ?')
        .bind(wish.user_id)
        .first();

      const childName = userDetail?.name || 'お子様';

      if (emailRow && emailRow.value && emailRow.value.trim()) {
        const targetEmail = emailRow.value.trim();
        console.log(`[Notification] Claim submitted by ${childName} for "${wish.title}". Target email: ${targetEmail}`);

        if (c.env.RESEND_API_KEY) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${c.env.RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: 'INCENTI QUEST <onboarding@resend.dev>',
              to: targetEmail,
              subject: `【INCENTI QUEST】🎁 ${childName} さんからご褒美交換のリクエストが届きました！`,
              html: `
                <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
                  <h2>🎁 ご褒美交換リクエストのお知らせ</h2>
                  <p>保護者様</p>
                  <p>お子様より新しいご褒美の交換リクエストが提出されました！</p>
                  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 15px 0;" />
                  <p><strong>■ リクエスト者:</strong> ${childName} さん</p>
                  <p><strong>■ 交換ご褒美:</strong> ${wish.title} ${wish.item_type === 'cash' ? '💵 (現金還元 7掛け)' : ''}</p>
                  <p><strong>■ 必要ポイント:</strong> ${wish.required_points.toLocaleString()} pt</p>
                  ${wish.item_type === 'cash' ? `<p><strong>■ 還元金額 (70%還元):</strong> ${Math.floor(wish.required_points * 0.7).toLocaleString()} 円</p>` : ''}
                  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 15px 0;" />
                  <p>実生活で物品・お小遣いを手渡した後に、管理者ポータルにて「ポイント引き落とし」を行ってください。</p>
                </div>
              `,
            }),
          }).catch((err) => console.error('Email send error', err));
        }
      }
    } catch (notifErr) {
      console.error('Notification logic error', notifErr);
    }

    return c.json({ success: true, message: 'Claim submitted for parent approval!' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.get('/api/settings', async (c) => {
  try {
    await c.env.DB.prepare(
      'CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT)'
    ).run();
    const rows = await c.env.DB.prepare('SELECT * FROM app_settings').all();
    const settings: { [key: string]: string } = {};
    if (rows.results) {
      rows.results.forEach((r: any) => {
        settings[r.key] = r.value;
      });
    }
    return c.json({ success: true, settings });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.put('/api/settings', async (c) => {
  try {
    const body = await c.req.json<{ key: string; value: string }>();
    await c.env.DB.prepare(
      'CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT)'
    ).run();
    await c.env.DB.prepare(
      'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    )
      .bind(body.key, body.value)
      .run();
    return c.json({ success: true, message: 'Settings saved' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.post('/api/parent/verify-pin', async (c) => {
  try {
    const body = await c.req.json<{ pin: string }>();
    await c.env.DB.prepare(
      'CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT)'
    ).run();
    const row: any = await c.env.DB.prepare('SELECT value FROM app_settings WHERE key = \'parent_pin\'').first();
    const targetPin = row?.value || '1234';

    if (body.pin === targetPin) {
      return c.json({ success: true, valid: true });
    } else {
      return c.json({ success: true, valid: false, error: 'PINコードが正しくありません' });
    }
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.put('/api/parent/set-pin', async (c) => {
  try {
    const body = await c.req.json<{ newPin: string }>();
    if (!body.newPin || body.newPin.length !== 4 || !/^\d{4}$/.test(body.newPin)) {
      return c.json({ success: false, error: '4桁の数字を入力してください' }, 400);
    }
    await c.env.DB.prepare(
      'CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT)'
    ).run();
    await c.env.DB.prepare(
      'INSERT INTO app_settings (key, value) VALUES (\'parent_pin\', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    ).bind(body.newPin).run();

    return c.json({ success: true, message: '保護者PINを変更しました' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.put('/api/wish-items/:id/approve', async (c) => {
  try {
    const id = c.req.param('id');
    const wish: any = await c.env.DB.prepare('SELECT * FROM wish_items WHERE id = ?').bind(id).first();

    if (!wish) {
      return c.json({ success: false, error: 'Wish item not found' }, 404);
    }

    // Only mark the item exchanged if the deduction actually happened, otherwise
    // an under-funded claim would be approved for free.
    const deduction = await c.env.DB.prepare('UPDATE users SET current_points = current_points - ? WHERE id = ? AND current_points >= ?')
      .bind(wish.required_points, wish.user_id, wish.required_points)
      .run();

    if (!deduction.meta?.changes) {
      return c.json({ success: false, error: 'ポイントが不足しているため引き落とせませんでした' }, 400);
    }

    await c.env.DB.prepare('UPDATE wish_items SET is_approved = 1, is_claimed = 1 WHERE id = ?').bind(id).run();

    const updatedUser: any = await c.env.DB.prepare('SELECT current_points FROM users WHERE id = ?')
      .bind(wish.user_id)
      .first();

    return c.json({
      success: true,
      message: 'Item exchange approved!',
      newTotalPoints: updatedUser ? updatedUser.current_points : 0
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// Static frontend assets are served by the platform (assets.directory in
// wrangler.toml) before a request reaches the Worker, so anything landing here
// is an unknown path.
app.get('*', (c) => {
  if (c.req.path.startsWith('/api')) {
    return c.json({ error: 'Not found' }, 404);
  }
  return c.text('Not Found', 404);
});

export default app;
