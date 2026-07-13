/**
 * 验证脚本：检查图片引用完整性
 * 1. 统计 assets/images/ 下英文命名 vs 数字命名文件数
 * 2. 检查 questions.json 中所有非空 image 字段对应文件是否存在
 * 3. 输出样本记录
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const imgDir = path.join(ROOT, 'assets', 'images');
const files = fs.readdirSync(imgDir).filter(f => f.endsWith('.jpg'));
const englishNamed = files.filter(f => /^[a-z]/.test(f));
const numericNamed = files.filter(f => /^\d/.test(f));

console.log('=== 文件统计 ===');
console.log(`英文命名文件: ${englishNamed.length}`);
console.log(`数字命名文件(4/5位，不在rename-map中): ${numericNamed.length}`);
console.log(`总计: ${files.length}`);

console.log('\n=== 前20个文件(按名称排序) ===');
files.sort().slice(0, 20).forEach(f => console.log(`  ${f}`));

console.log('\n=== 英文命名文件样本(前20个) ===');
englishNamed.sort().slice(0, 20).forEach(f => console.log(`  ${f}`));

// 验证 questions.json 引用完整性
const qPath = path.join(ROOT, 'src', 'data', 'questions.json');
const questions = JSON.parse(fs.readFileSync(qPath, 'utf8'));
const fileSet = new Set(files);

const imgQuestions = questions.filter(q => q.image);
let validRefs = 0;
let invalidRefs = 0;
const invalidList = [];

for (const q of imgQuestions) {
  if (fileSet.has(q.image)) {
    validRefs++;
  } else {
    invalidRefs++;
    invalidList.push({ id: q.id, image: q.image });
  }
}

console.log('\n=== 引用完整性验证 ===');
console.log(`总题目数: ${questions.length}`);
console.log(`含图片引用的题目数: ${imgQuestions.length}`);
console.log(`有效引用(文件存在): ${validRefs}`);
console.log(`无效引用(文件不存在): ${invalidRefs}`);

if (invalidList.length > 0) {
  console.log('--- 无效引用详情 ---');
  invalidList.forEach(d => console.log(`  id=${d.id} image="${d.image}"`));
}

console.log('\n=== questions.json 样本记录(含图片的前5条) ===');
imgQuestions.slice(0, 5).forEach(q => {
  console.log(`  id=${q.id} image="${q.image}" question="${q.question.substring(0, 30)}..."`);
});

console.log('\n=== 更多样本(第100,300,500,700,最后1条) ===');
const indices = [100, 300, 500, 700, imgQuestions.length - 1];
indices.forEach(i => {
  if (imgQuestions[i]) {
    console.log(`  id=${imgQuestions[i].id} image="${imgQuestions[i].image}"`);
  }
});

console.log('\n=== 验证完成 ===');
