import fs from 'fs';
import path from 'path';

const VALID_CATEGORIES = new Set([
  'driving_karimen',
  'driving_honmen',
  'driving_hazard',
  'driving_aptitude',
]);

const VALID_IMAGE_KEYS = new Set([
  'sign_stop', 'sign_slow', 'sign_no_entry', 'sign_no_thoroughfare', 'sign_no_cars',
  'sign_no_parking', 'sign_no_park_only', 'sign_speed_30', 'sign_speed_40', 'sign_speed_50',
  'sign_one_way', 'sign_designated_dir', 'sign_crosswalk', 'sign_priority',
  'sign_warn_cross', 'sign_warn_t', 'sign_warn_rail', 'sign_warn_school', 'sign_warn_slippery',
  'hazard_residential_ball', 'hazard_intersection_bike', 'hazard_night_rain',
  'hazard_highway_merge', 'hazard_school_bus', 'hazard_bicycle_overtake',
]);

function sqlEscape(str) {
  return String(str).replace(/'/g, "''");
}

function normalizeQuestion(text) {
  return String(text || '')
    .replace(/\s+/g, '')
    .replace(/[。、．，「」『』（）()]/g, '')
    .toLowerCase();
}

function main() {
  const corePath = path.resolve(process.cwd(), 'scripts/seeds/driving_core_questions.json');
  const genPath = path.resolve(process.cwd(), 'scripts/seeds/driving_generated_raw.json');

  const core = fs.existsSync(corePath) ? JSON.parse(fs.readFileSync(corePath, 'utf-8')) : [];
  const gen = fs.existsSync(genPath) ? JSON.parse(fs.readFileSync(genPath, 'utf-8')) : [];

  const combined = [...core, ...gen];
  const seenExact = new Set();
  const accepted = [];
  const rejected = [];

  for (const q of combined) {
    if (!q || typeof q !== 'object') {
      rejected.push({ reason: 'invalid_object', q });
      continue;
    }
    if (!VALID_CATEGORIES.has(q.category)) {
      rejected.push({ reason: 'invalid_category', category: q.category });
      continue;
    }
    const qText = String(q.question_text || '').trim();
    if (qText.length < 10) {
      rejected.push({ reason: 'too_short_question', qText });
      continue;
    }
    const norm = normalizeQuestion(qText);
    if (seenExact.has(norm)) {
      rejected.push({ reason: 'duplicate', qText: qText.slice(0, 30) });
      continue;
    }
    if (!Array.isArray(q.options) || (q.options.length !== 2 && q.options.length !== 4)) {
      rejected.push({ reason: 'invalid_options_length', qText: qText.slice(0, 30) });
      continue;
    }
    if (q.options.some((o) => typeof o !== 'string' || o.trim().length === 0)) {
      rejected.push({ reason: 'empty_option', qText: qText.slice(0, 30) });
      continue;
    }
    const cIdx = Number(q.correct_index);
    if (!Number.isInteger(cIdx) || cIdx < 0 || cIdx >= q.options.length) {
      rejected.push({ reason: 'invalid_correct_index', cIdx });
      continue;
    }
    const exp = String(q.explanation || '').trim();
    if (exp.length < 10) {
      rejected.push({ reason: 'missing_explanation', qText: qText.slice(0, 30) });
      continue;
    }
    const imgKey = q.image_key ? String(q.image_key).trim() : null;
    const safeImageKey = imgKey && VALID_IMAGE_KEYS.has(imgKey) ? imgKey : null;

    // 危険予測は image_key 必須
    if (q.category === 'driving_hazard' && !safeImageKey) {
      rejected.push({ reason: 'hazard_missing_valid_image_key', imgKey });
      continue;
    }

    seenExact.add(norm);
    accepted.push({
      category: q.category,
      question_text: qText,
      options: q.options.map((o) => o.trim()),
      correct_index: cIdx,
      difficulty: [1, 2, 3].includes(Number(q.difficulty)) ? Number(q.difficulty) : 1,
      explanation: exp,
      image_key: safeImageKey,
    });
  }

  const counts = {};
  for (const item of accepted) {
    counts[item.category] = (counts[item.category] || 0) + 1;
  }

  console.log('=== 検証サマリー ===');
  console.log(`入力合計: ${combined.length}問`);
  console.log(`合格採用: ${accepted.length}問`);
  console.log(`除外件数: ${rejected.length}問`);
  console.log('カテゴリ別内訳:', counts);

  if (accepted.length < 600) {
    console.error(`エラー: 合格問題数 (${accepted.length}) が目標の 600 問未満です。`);
    process.exit(1);
  }

  const sqlLines = [
    '-- Driving School Quizzes Seed (Validated)',
    "DELETE FROM quiz_questions WHERE category LIKE 'driving_%';",
    ...accepted.map((q) => {
      const imgSql = q.image_key ? `'${sqlEscape(q.image_key)}'` : 'NULL';
      return `INSERT INTO quiz_questions (grade_level, category, question_text, options_json, correct_index, difficulty, explanation, image_key) VALUES ('all', '${sqlEscape(q.category)}', '${sqlEscape(q.question_text)}', '${sqlEscape(JSON.stringify(q.options))}', ${q.correct_index}, ${q.difficulty}, '${sqlEscape(q.explanation)}', ${imgSql});`;
    }),
  ];

  const outSqlPath = path.resolve(process.cwd(), 'scripts/seeds/driving_school_seed.sql');
  fs.writeFileSync(outSqlPath, sqlLines.join('\n') + '\n', 'utf-8');
  console.log(`SQL 出力完了: ${outSqlPath} (${accepted.length}問)`);
}

main();
