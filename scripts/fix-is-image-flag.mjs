/**
 * 修复脚本：同步 is_image_question 字段
 * 当 image 字段被清空时，is_image_question 应设为 false
 * 避免显示"图片题"标签但实际无图片的情况
 *
 * 用法：node scripts/fix-is-image-flag.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const QFILE = path.join(ROOT, 'src', 'data', 'questions.json');

function main() {
  console.log('=== is_image_question 字段同步 ===\n');

  const questions = JSON.parse(fs.readFileSync(QFILE, 'utf8'));
  let fixed = 0;
  let alreadyOk = 0;

  for (const q of questions) {
    const hasImage = Boolean(q.image);
    const flagged = Boolean(q.is_image_question);

    if (!hasImage && flagged) {
      // image 被清空但 is_image_question 仍为 true，修正
      q.is_image_question = false;
      fixed++;
    } else if (hasImage && !flagged) {
      // 有 image 但 is_image_question 为 false，修正
      q.is_image_question = true;
      fixed++;
    } else {
      alreadyOk++;
    }
  }

  console.log(`修正: ${fixed}, 已正确: ${alreadyOk}`);

  const output = JSON.stringify(questions, null, 2) + '\n';
  fs.writeFileSync(QFILE, output, 'utf8');
  console.log('questions.json 已写回');
}

main();
