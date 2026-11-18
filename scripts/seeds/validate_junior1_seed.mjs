import fs from 'fs';
import path from 'path';

const VALID_GRADES = new Set([
  'junior_1_early_mid',
  'junior_1_early_final',
  'junior_1_late_mid',
  'junior_1_late_final',
]);

const VALID_CATEGORIES = new Set([
  'english',
  'math',
  'science',
  'social_studies',
  'japanese',
  'music',
  'art',
  'pe',
  'tech_home',
]);

function sqlEscape(str) {
  return String(str).replace(/'/g, "''");
}

function normalizeText(text) {
  return String(text || '')
    .replace(/\s+/g, '')
    .replace(/[。、．，「」『』（）()]/g, '')
    .toLowerCase();
}

function main() {
  const rawPath = path.resolve(process.cwd(), 'scripts/seeds/junior1_4terms_raw.json');
  if (!fs.existsSync(rawPath)) {
    console.error('raw JSON が見つかりません');
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(rawPath, 'utf-8'));
  const seen = new Set();
  const accepted = [];
  const rejected = [];

  for (const q of raw) {
    if (!q || typeof q !== 'object') {
      rejected.push('invalid_obj');
      continue;
    }
    if (!VALID_GRADES.has(q.grade_level) || !VALID_CATEGORIES.has(q.category)) {
      rejected.push('invalid_grade_or_cat');
      continue;
    }
    const qText = String(q.question_text || '').trim();
    if (qText.length < 8) {
      rejected.push('too_short_question');
      continue;
    }
    const key = `${q.grade_level}:${q.category}:${normalizeText(qText)}`;
    if (seen.has(key)) {
      rejected.push('duplicate');
      continue;
    }
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      rejected.push('invalid_options');
      continue;
    }
    if (q.options.some((o) => typeof o !== 'string' || o.trim().length === 0)) {
      rejected.push('empty_option');
      continue;
    }
    const cIdx = Number(q.correct_index);
    if (!Number.isInteger(cIdx) || cIdx < 0 || cIdx >= 4) {
      rejected.push('invalid_correct_index');
      continue;
    }
    const exp = String(q.explanation || '').trim();
    if (exp.length < 10) {
      rejected.push('missing_explanation');
      continue;
    }

    seen.add(key);
    accepted.push({
      grade_level: q.grade_level,
      category: q.category,
      question_text: qText,
      options: q.options.map((o) => o.trim()),
      correct_index: cIdx,
      difficulty: [1, 2, 3].includes(Number(q.difficulty)) ? Number(q.difficulty) : 1,
      explanation: exp,
    });
  }

  const byCat = {};
  for (const q of accepted) {
    byCat[q.category] = (byCat[q.category] || 0) + 1;
  }

  console.log('=== 中1 4期間×9教科 検証サマリー ===');
  console.log(`入力合計: ${raw.length}問`);
  console.log(`合格採用: ${accepted.length}問`);
  console.log(`除外件数: ${rejected.length}問`);
  console.log('教科別内訳:', byCat);

  if (accepted.length < 1800) {
    console.error(`エラー: 合格問題数 (${accepted.length}) が目標の 1800 問未満です。`);
    process.exit(1);
  }

  const sqlLines = [
    '-- Junior 1 4-Term x 9-Subject Seed (Validated)',
    "DELETE FROM quiz_questions WHERE grade_level IN ('junior_1_early_mid', 'junior_1_early_final', 'junior_1_late_mid', 'junior_1_late_final');",
    ...accepted.map(
      (q) =>
        `INSERT INTO quiz_questions (grade_level, category, question_text, options_json, correct_index, difficulty, explanation, image_key) VALUES ('${sqlEscape(q.grade_level)}', '${sqlEscape(q.category)}', '${sqlEscape(q.question_text)}', '${sqlEscape(JSON.stringify(q.options))}', ${q.correct_index}, ${q.difficulty}, '${sqlEscape(q.explanation)}', NULL);`
    ),
  ];

  const outSqlPath = path.resolve(process.cwd(), 'scripts/seeds/junior1_4terms_seed.sql');
  fs.writeFileSync(outSqlPath, sqlLines.join('\n') + '\n', 'utf-8');
  console.log(`SQL 出力完了: ${outSqlPath} (${accepted.length}問)`);
}

main();
