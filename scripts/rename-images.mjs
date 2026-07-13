/**
 * 图片资源重命名脚本
 * 目的：
 *   1. 将中文命名的图片重命名为纯英文/数字格式（避免 URL 编码问题）
 *   2. 同步更新 src/data/questions.json 中的 image 字段
 *   3. 统一 image 字段为纯文件名（去掉 "assets/images/" 前缀）
 *      防止 getImageUrl() 拼接出 "/assets/images/assets/images/xxx.jpg" 的重复前缀 bug
 *
 * 重命名规则：
 *   - 文件名形如 "01_停车让行.jpg" -> "01.jpg"
 *   - 文件名形如 "317_不设电子不停车收费(ETC) 车道的收费站预告.jpg" -> "317.jpg"
 *   - 纯数字文件名保持不变： "1001.jpg" -> "1001.jpg"
 *   - 若目标文件名已存在且非自身，追加 "_b"、"_c" 后缀避免覆盖
 *
 * 执行方式：
 *   node scripts/rename-images.mjs
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const IMG_DIR = path.join(ROOT, 'assets', 'images');
const QUESTIONS_FILE = path.join(ROOT, 'src', 'data', 'questions.json');

/**
 * 从原文件名中提取纯数字编号部分作为新文件名
 * 例如：
 *   "01_停车让行.jpg" -> "01.jpg"
 *   "100_右侧绕行.jpg" -> "100.jpg"
 *   "1001.jpg" -> "1001.jpg"
 *   "19984.jpg" -> "19984.jpg"
 * 返回 null 表示无法提取数字编号
 */
function buildNewName(oldName) {
  const match = oldName.match(/^(\d+)/);
  if (!match) return null;
  const ext = path.extname(oldName);
  return `${match[1]}${ext}`;
}

/**
 * 主流程
 */
async function main() {
  console.log('=== 图片重命名脚本启动 ===\n');

  // 1. 读取所有图片文件
  const allFiles = await fs.readdir(IMG_DIR);
  const imageFiles = allFiles.filter((f) => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));
  console.log(`图片目录: ${IMG_DIR}`);
  console.log(`图片总数: ${imageFiles.length}\n`);

  // 2. 构建重命名映射表
  // oldName -> newName
  const renameMap = new Map();
  // 用于检测目标名冲突：newName -> oldName[]
  const targetCollisions = new Map();

  for (const oldName of imageFiles) {
    // 仅处理含中文或特殊字符（空格、括号）的文件
    const hasNonAscii = /[^\x00-\x7F]/.test(oldName);
    const hasSpecial = /[()\s]/.test(oldName);
    if (!hasNonAscii && !hasSpecial) continue;

    const newName = buildNewName(oldName);
    if (!newName) {
      console.warn(`[跳过] 无法提取编号: ${oldName}`);
      continue;
    }
    if (newName === oldName) continue;

    renameMap.set(oldName, newName);
    if (!targetCollisions.has(newName)) targetCollisions.set(newName, []);
    targetCollisions.get(newName).push(oldName);
  }

  // 3. 处理冲突：同一目标名对应多个源文件时，按字典序追加 _b、_c 后缀
  const finalRenameMap = new Map();
  for (const [oldName, newName] of renameMap) {
    const collisions = targetCollisions.get(newName);
    if (collisions.length > 1) {
      // 多个原文件指向同一新文件名，需追加后缀
      const sortedCollisions = [...collisions].sort();
      const idx = sortedCollisions.indexOf(oldName);
      if (idx === 0) {
        // 第一个保持原名
        finalRenameMap.set(oldName, newName);
      } else {
        // 后续追加 _b、_c...
        const suffix = String.fromCharCode(97 + idx); // b、c、d...
        const ext = path.extname(newName);
        const base = path.basename(newName, ext);
        finalRenameMap.set(oldName, `${base}_${suffix}${ext}`);
      }
    } else {
      // 还需检查目标名是否已被其他纯数字文件占用
      const targetExists = imageFiles.includes(newName) && !renameMap.has(newName);
      if (targetExists) {
        // 目标名已被非中文同名文件占用（极少见），追加 _b
        const ext = path.extname(newName);
        const base = path.basename(newName, ext);
        finalRenameMap.set(oldName, `${base}_b${ext}`);
      } else {
        finalRenameMap.set(oldName, newName);
      }
    }
  }

  console.log(`待重命名文件数: ${finalRenameMap.size}`);
  if (finalRenameMap.size === 0) {
    console.log('无需重命名，退出。');
    return;
  }

  // 4. 执行物理文件重命名
  let renamedCount = 0;
  let skippedCount = 0;
  for (const [oldName, newName] of finalRenameMap) {
    const oldPath = path.join(IMG_DIR, oldName);
    const newPath = path.join(IMG_DIR, newName);
    try {
      // 检查新文件是否已存在（如已重命名过）
      try {
        await fs.access(newPath);
        // 文件已存在，检查是否就是源文件本身（极少情况）
        console.warn(`[跳过] 目标已存在: ${oldName} -> ${newName}`);
        skippedCount++;
        continue;
      } catch {
        // 目标不存在，可以重命名
      }
      await fs.rename(oldPath, newPath);
      renamedCount++;
    } catch (err) {
      console.error(`[失败] ${oldName} -> ${newName}: ${err.message}`);
      skippedCount++;
    }
  }
  console.log(`\n物理重命名完成: 成功 ${renamedCount} 个, 跳过 ${skippedCount} 个\n`);

  // 5. 读取 questions.json 并构建 image 字段更新映射
  const questionsRaw = await fs.readFile(QUESTIONS_FILE, 'utf-8');
  const questions = JSON.parse(questionsRaw);

  // 构建旧 image 字段 -> 新 image 字段的映射
  // 旧值形如 "assets/images/01_停车让行.jpg"
  // 新值应为纯文件名 "01.jpg"（去掉前缀 + 替换为英文文件名）
  const fieldMap = new Map();
  for (const [oldName, newName] of finalRenameMap) {
    fieldMap.set(`assets/images/${oldName}`, newName);
  }

  let updatedCount = 0;
  let prefixStrippedCount = 0;
  for (const q of questions) {
    if (!q.image) continue;
    // 1) 若 image 含中文/特殊字符的文件名，替换为重命名后的纯文件名
    if (fieldMap.has(q.image)) {
      q.image = fieldMap.get(q.image);
      updatedCount++;
      continue;
    }
    // 2) 若 image 仍以 "assets/images/" 开头但未在重命名表中（即纯数字文件名），
    //    也统一去掉前缀，避免 getImageUrl() 拼接出双重前缀
    if (q.image.startsWith('assets/images/')) {
      q.image = q.image.slice('assets/images/'.length);
      prefixStrippedCount++;
    }
  }

  console.log(`JSON 字段更新: 中文重命名 ${updatedCount} 个, 前缀剥离 ${prefixStrippedCount} 个\n`);

  // 6. 写回 questions.json
  await fs.writeFile(QUESTIONS_FILE, JSON.stringify(questions, null, 2), 'utf-8');
  console.log(`questions.json 已更新\n`);

  // 7. 输出汇总报告
  console.log('=== 重命名汇总 ===');
  console.log(`物理文件重命名: ${renamedCount}`);
  console.log(`JSON 字段中文替换: ${updatedCount}`);
  console.log(`JSON 字段前缀剥离: ${prefixStrippedCount}`);
  console.log('\n前 20 个重命名示例:');
  let i = 0;
  for (const [oldName, newName] of finalRenameMap) {
    if (i++ >= 20) break;
    console.log(`  ${oldName}  ->  ${newName}`);
  }
  console.log('\n=== 完成 ===');
}

main().catch((err) => {
  console.error('脚本执行失败:', err);
  process.exit(1);
});
