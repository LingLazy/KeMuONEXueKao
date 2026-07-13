/**
 * 修复脚本：根据新图片架构更新 questions.json 的 image 字段
 *
 * 新架构：所有图片都在 assets/images/<子文件夹>/ 下，按类别组织。
 * 旧 image 字段：纯文件名（如 "stop-and-yield.jpg"）
 * 新 image 字段：带子文件夹的相对路径（如 "prohibitory-signs/stop-and-yield.jpg"）
 *
 * 处理规则：
 * 1. 递归扫描 assets/images/，建立 fileName → relativePath 映射
 * 2. 重名文件（如 customs.jpg 在两个子文件夹都存在）默认使用 prohibitory-signs
 * 3. questions.json 中能找到的 image 字段：更新为带子文件夹的相对路径
 * 4. questions.json 中找不到的 image 字段：清空为 ""（避免 404）
 * 5. 幂等设计：已是带子文件夹路径的不重复处理
 *
 * 用法：node scripts/fix-image-paths.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const IMG_DIR = path.join(ROOT, 'assets', 'images');
const QFILE = path.join(ROOT, 'src', 'data', 'questions.json');

/**
 * 重名文件的优先级映射
 * 当同一个文件名在多个子文件夹中存在时，按优先级选择
 */
const DUPE_PRIORITY = {
  'customs.jpg': 'prohibitory-signs/customs.jpg',
};

function main() {
  console.log('=== 图片路径修复脚本启动 ===\n');

  // 1. 递归扫描 assets/images/ 下所有图片文件
  const fileMap = new Map(); // fileName -> relativePath
  const dupes = new Map();   // fileName -> [relativePath, ...]

  function scan(dir, relDir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      const rel = relDir ? `${relDir}/${e.name}` : e.name;
      if (e.isDirectory()) {
        scan(full, rel);
      } else if (/\.(jpg|jpeg|png|gif|webp)$/i.test(e.name)) {
        if (fileMap.has(e.name)) {
          if (!dupes.has(e.name)) dupes.set(e.name, [fileMap.get(e.name)]);
          dupes.get(e.name).push(rel);
        } else {
          fileMap.set(e.name, rel);
        }
      }
    }
  }
  scan(IMG_DIR, '');
  console.log(`[1] 扫描完成: ${fileMap.size} 个唯一文件名, ${dupes.size} 个重名`);

  // 2. 处理重名：按优先级映射选择
  for (const [name, paths] of dupes) {
    const preferred = DUPE_PRIORITY[name];
    if (preferred) {
      fileMap.set(name, preferred);
      console.log(`[2] 重名处理: ${name} -> ${preferred} (优先级)`);
    } else {
      // 无优先级定义，保持第一个（按字母序）
      const sorted = paths.sort();
      fileMap.set(name, sorted[0]);
      console.log(`[2] 重名处理: ${name} -> ${sorted[0]} (默认第一个)`);
      console.log(`     警告: 以下路径未被采用:`);
      sorted.slice(1).forEach(p => console.log(`       ${p}`));
    }
  }

  // 3. 读取 questions.json
  const questions = JSON.parse(fs.readFileSync(QFILE, 'utf8'));
  console.log(`\n[3] questions.json 题目数: ${questions.length}`);

  let updated = 0;      // 成功更新路径数
  let cleared = 0;      // 清空（缺失）数
  let alreadyOk = 0;    // 已是正确路径数
  let noImage = 0;      // 原本就无 image 字段

  for (const q of questions) {
    if (!q.image) {
      noImage++;
      continue;
    }

    // 如果 image 已经是带子文件夹的路径（含 /），检查是否已是正确路径
    if (q.image.includes('/')) {
      // 验证该路径是否真实存在
      const fullPath = path.join(IMG_DIR, q.image);
      if (fs.existsSync(fullPath)) {
        alreadyOk++;
        continue;
      }
      // 路径含 / 但不存在，尝试提取纯文件名重新查找
      const fileName = path.basename(q.image);
      if (fileMap.has(fileName)) {
        const newPath = fileMap.get(fileName);
        if (newPath !== q.image) {
          q.image = newPath;
          updated++;
        } else {
          alreadyOk++;
        }
        continue;
      }
      // 真的找不到，清空
      q.image = '';
      cleared++;
      continue;
    }

    // 纯文件名：查映射表
    if (fileMap.has(q.image)) {
      const newPath = fileMap.get(q.image);
      q.image = newPath;
      updated++;
    } else {
      // 找不到对应文件，清空避免 404
      q.image = '';
      cleared++;
    }
  }

  console.log(`\n[4] 路径更新汇总:`);
  console.log(`  成功更新路径: ${updated}`);
  console.log(`  已是正确路径: ${alreadyOk}`);
  console.log(`  清空(缺失引用): ${cleared}`);
  console.log(`  原本无 image: ${noImage}`);

  // 5. 写回 questions.json
  const output = JSON.stringify(questions, null, 2) + '\n';
  fs.writeFileSync(QFILE, output, 'utf8');
  console.log(`\n[5] questions.json 已写回`);

  // 6. 输出前 20 个更新示例
  console.log('\n=== 完成 ===\n');
}

main();
