/**
 * 更新 questions.json 的 image 字段
 * - 读取 image-map.json 映射表
 * - 对每道图片题,若其编号在映射表中,则更新 image 为新命名
 * - 保留原有 assets/images/ 前缀
 */
const fs = require('fs');
const path = require('path');

const projectRoot = 'c:\\Atian\\Project\\KeMuONEXueKao';
const mapFile = path.join(projectRoot, 'scripts', 'image-map.json');
const questionsFile = path.join(projectRoot, 'src', 'data', 'questions.json');

const map = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
const questions = JSON.parse(fs.readFileSync(questionsFile, 'utf8'));

let updated = 0;
let unchanged = 0;
let noImage = 0;

for (const q of questions) {
  if (!q.is_image_question || !q.image) {
    noImage++;
    continue;
  }
  // 从 image 字段提取编号(支持 assets/images/123.jpg 或 123.jpg)
  const m = q.image.match(/(\d+)\.jpg$/);
  if (!m) {
    unchanged++;
    continue;
  }
  const num = m[1];
  if (map[num]) {
    const newName = map[num].newName;
    q.image = `assets/images/${newName}`;
    updated++;
  } else {
    unchanged++;
  }
}

fs.writeFileSync(questionsFile, JSON.stringify(questions, null, 2), 'utf8');
console.log('===== questions.json 更新汇总 =====');
console.log(`总题目数: ${questions.length}`);
console.log(`已更新 image 字段: ${updated}`);
console.log(`保持不变: ${unchanged}`);
console.log(`无图片题: ${noImage}`);
