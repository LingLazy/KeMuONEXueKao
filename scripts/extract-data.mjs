/**
 * 数据提取脚本：将 js/data.js 中的 CATEGORIES / QUESTIONS / MNEMONICS 提取为 JSON
 * 运行：node scripts/extract-data.mjs
 * 产物：src/data/categories.json / questions.json / mnemonics.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const srcData = path.join(root, 'src', 'data');
fs.mkdirSync(srcData, { recursive: true });

const dataCode = fs.readFileSync(path.join(root, 'js', 'data.js'), 'utf-8');

// 追加 CommonJS 导出，写入临时文件后 require
const tempFile = path.join(root, 'scripts', '_data_temp.cjs');
fs.writeFileSync(tempFile, dataCode + '\nmodule.exports = { CATEGORIES, QUESTIONS, MNEMONICS };\n');

const { CATEGORIES, QUESTIONS, MNEMONICS } = require(tempFile);

fs.writeFileSync(path.join(srcData, 'categories.json'), JSON.stringify(CATEGORIES, null, 2));
// 题库 JSON 不格式化，减小体积
fs.writeFileSync(path.join(srcData, 'questions.json'), JSON.stringify(QUESTIONS));
fs.writeFileSync(path.join(srcData, 'mnemonics.json'), JSON.stringify(MNEMONICS, null, 2));

fs.unlinkSync(tempFile);

console.log('数据提取完成：');
console.log(`  分类：${Object.keys(CATEGORIES).length} 个`);
console.log(`  题目：${QUESTIONS.length} 道`);
console.log(`  口诀：${MNEMONICS.length} 条`);
console.log(`  输出目录：${srcData}`);
