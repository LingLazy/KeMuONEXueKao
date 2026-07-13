/**
 * 提取 git rename 映射并生成"数字编号 -> 中文原名"的映射文件
 * 用于后续翻译成英文描述性名称
 */
import { execSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// 用 git -c core.quotepath=false 输出原始 UTF-8 中文
// 只取最近一次 commit 的 rename 记录
const cmd = 'git -c core.quotepath=false log -1 -M --diff-filter=R --name-status --pretty=format: 93e64ed -- assets/images/';
const output = execSync(cmd, { cwd: ROOT, encoding: 'utf-8' });

const lines = output.split('\n').filter((l) => l.trim().startsWith('R'));
console.log(`rename 记录总数: ${lines.length}`);

// 解析格式：R100\t"assets/images/01_停车让行.jpg"\tassets/images/01.jpg
// 或：R100\tassets/images/100.jpg\tassets/images/100.jpg（无引号）
const map = {};
for (const line of lines) {
  // 去掉开头的 R100\t
  const m = line.match(/^R\d+\t(.+?)\t(.+)$/);
  if (!m) continue;
  let oldPath = m[1].trim();
  const newPath = m[2].trim();
  // 去掉可能的双引号
  if (oldPath.startsWith('"') && oldPath.endsWith('"')) {
    oldPath = oldPath.slice(1, -1);
  }
  // 提取文件名
  const oldName = path.basename(oldPath);
  const newName = path.basename(newPath);
  // 从旧名提取中文描述部分（去掉数字前缀和扩展名）
  // 例如 "01_停车让行.jpg" -> "停车让行"
  const descMatch = oldName.match(/^\d+[_\s]?(.+)\.\w+$/);
  const desc = descMatch ? descMatch[1] : oldName;
  map[newName] = { old: oldName, desc };
}

// 输出映射到文件，便于人工审阅和翻译
const outPath = path.join(ROOT, 'scripts', 'rename-map.json');
await fs.writeFile(outPath, JSON.stringify(map, null, 2), 'utf-8');
console.log(`映射已保存: ${outPath}`);
console.log(`条目数: ${Object.keys(map).length}`);

// 打印前 30 条样例
const keys = Object.keys(map).slice(0, 30);
for (const k of keys) {
  console.log(`  ${k}  <-  ${map[k].desc}`);
}
