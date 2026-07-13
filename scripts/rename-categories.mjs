/**
 * 重命名脚本：将 assets/images/categories/ 下的中文子文件夹及内部图片
 * 全部改为英文描述性名称（kebab-case）。
 *
 * 功能：
 * 1. 遍历 17 个中文子文件夹，重命名内部图片为英文描述性名称
 * 2. 重命名子文件夹本身为英文名称
 * 3. 复用 rename-to-english.mjs 的翻译表（CN_TO_EN + CN_TO_EN_SPECIAL）
 * 4. 处理同文件夹内重名冲突（相同英文基础名追加 -2、-3 后缀）
 * 5. 幂等设计：重复执行不报错，已重命名的自动跳过
 *
 * 注意：questions.json 不引用 categories 路径，故无需更新 JSON。
 *
 * 用法：node scripts/rename-categories.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { translateDesc } from './rename-to-english.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CAT_DIR = path.join(ROOT, 'assets', 'images', 'categories');

/**
 * 17 个中文子文件夹名 → 英文名映射
 * 命名规范：kebab-case，全小写 + 连字符
 */
const SUBDIR_MAP = {
  '交警手势信号': 'traffic-police-signals',
  '交通事故图解': 'traffic-accident-illustrations',
  '其他标线': 'other-markings',
  '指示标志': 'mandatory-signs',
  '指示标线': 'mandatory-markings',
  '指路标志': 'guide-signs',
  '旅游区标志': 'tourist-area-signs',
  '汽车仪表盘指示灯': 'dashboard-indicators',
  '禁令标志': 'prohibitory-signs',
  '禁止标线': 'prohibitory-markings',
  '色盲色弱检测': 'color-vision-test',
  '警告标志': 'warning-signs',
  '警告标线': 'warning-markings',
  '车内功能按键': 'vehicle-function-keys',
  '辅助标志': 'auxiliary-signs',
  '道路施工安全标志': 'road-construction-safety-signs',
  '道路施工安全设施设置示例': 'road-construction-safety-facility-examples',
};

/**
 * 从文件名提取中文描述
 * 支持格式：
 *   358_停止信号.jpg  → 停止信号
 *   01_停车让行.jpg   → 停车让行
 *   1001.jpg          → null（纯数字无中文描述，保留原名）
 * @param {string} fileName - 文件名（含扩展名）
 * @returns {string|null} - 中文描述，或 null 表示无中文描述
 */
function extractDesc(fileName) {
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  const m = base.match(/^\d+[_\s]?(.+)$/);
  return m ? m[1] : null;
}

/**
 * 判断文件名是否已经是纯英文（已重命名过）
 * @param {string} fileName - 文件名
 * @returns {boolean}
 */
function isAlreadyEnglish(fileName) {
  // 纯 ASCII 且无中文，视为已重命名
  return !/[^\x00-\x7F]/.test(fileName);
}

function main() {
  console.log('=== categories 目录英文重命名脚本启动 ===\n');

  // 1. 读取当前 categories 下的所有子文件夹
  const currentSubdirs = fs.readdirSync(CAT_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  console.log(`[1] 当前子文件夹数: ${currentSubdirs.length}`);

  // 2. 校验所有中文子文件夹都有英文映射
  const chineseSubdirs = currentSubdirs.filter(name => /[^\x00-\x7F]/.test(name));
  const englishSubdirs = currentSubdirs.filter(name => !/[^\x00-\x7F]/.test(name));

  const missingMapping = chineseSubdirs.filter(name => !SUBDIR_MAP[name]);
  if (missingMapping.length > 0) {
    console.error(`\n[ERROR] 以下 ${missingMapping.length} 个中文子文件夹缺少英文映射:`);
    missingMapping.forEach(d => console.error(`  - ${d}`));
    process.exit(1);
  }
  console.log(`[2] 中文子文件夹映射校验通过: ${chineseSubdirs.length} 个`);
  console.log(`     已是英文(跳过): ${englishSubdirs.length} 个`);

  // 3. 遍历每个中文子文件夹，重命名内部图片
  let totalFilesRenamed = 0;
  let totalFilesSkipped = 0;
  let totalFilesAlreadyEn = 0;
  let totalMissingTranslation = 0;
  const missingTranslations = [];

  for (const cnSubdir of chineseSubdirs) {
    const subdirPath = path.join(CAT_DIR, cnSubdir);
    const files = fs.readdirSync(subdirPath)
      .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));

    // 记录每个英文基础名已分配次数（用于重名后缀）
    const usedCount = {};

    // 先扫描收集所有映射，确保重名后缀稳定
    const renamePlan = [];
    for (const file of files) {
      if (isAlreadyEnglish(file)) {
        totalFilesAlreadyEn++;
        continue;
      }
      const desc = extractDesc(file);
      if (!desc) {
        // 纯数字无中文描述，保留原名
        totalFilesSkipped++;
        continue;
      }
      const enBase = translateDesc(desc);
      if (!enBase) {
        totalMissingTranslation++;
        missingTranslations.push({ file, subdir: cnSubdir, desc });
        totalFilesSkipped++;
        continue;
      }
      const ext = path.extname(file);
      const count = (usedCount[enBase] || 0) + 1;
      usedCount[enBase] = count;
      const newName = count === 1 ? `${enBase}${ext}` : `${enBase}-${count}${ext}`;
      renamePlan.push({ oldName: file, newName });
    }

    // 执行重命名
    let renamedInSubdir = 0;
    for (const { oldName, newName } of renamePlan) {
      const oldPath = path.join(subdirPath, oldName);
      const newPath = path.join(subdirPath, newName);
      // 幂等：新文件已存在则跳过
      if (fs.existsSync(newPath)) {
        if (oldName !== newName) {
          // 旧文件仍存在且与新文件不同，说明重名冲突，跳过避免覆盖
          totalFilesSkipped++;
        }
        continue;
      }
      try {
        fs.renameSync(oldPath, newPath);
        renamedInSubdir++;
        totalFilesRenamed++;
      } catch (err) {
        console.error(`[失败] ${cnSubdir}/${oldName} -> ${newName}: ${err.message}`);
        totalFilesSkipped++;
      }
    }
    console.log(`[3] [${cnSubdir}] 重命名 ${renamedInSubdir} 个文件`);
  }

  console.log(`\n[3] 文件重命名汇总: 成功 ${totalFilesRenamed}, 跳过 ${totalFilesSkipped}, 已是英文 ${totalFilesAlreadyEn}, 缺翻译 ${totalMissingTranslation}`);

  if (missingTranslations.length > 0) {
    console.error('\n[WARN] 以下文件缺少翻译，保留原名:');
    missingTranslations.forEach(m => console.error(`  ${m.subdir}/${m.file}  (desc: ${m.desc})`));
  }

  // 4. 重命名子文件夹本身
  let subdirRenamed = 0;
  let subdirSkipped = 0;
  for (const cnSubdir of chineseSubdirs) {
    const enSubdir = SUBDIR_MAP[cnSubdir];
    const oldPath = path.join(CAT_DIR, cnSubdir);
    const newPath = path.join(CAT_DIR, enSubdir);

    if (!fs.existsSync(oldPath)) {
      // 旧文件夹不存在（可能已重命名）
      subdirSkipped++;
      continue;
    }
    if (fs.existsSync(newPath)) {
      // 新文件夹已存在，跳过避免覆盖
      console.warn(`[跳过] 目标文件夹已存在: ${enSubdir}`);
      subdirSkipped++;
      continue;
    }
    try {
      fs.renameSync(oldPath, newPath);
      subdirRenamed++;
      console.log(`[4] ${cnSubdir} -> ${enSubdir}`);
    } catch (err) {
      console.error(`[失败] ${cnSubdir} -> ${enSubdir}: ${err.message}`);
      subdirSkipped++;
    }
  }

  console.log(`\n[4] 子文件夹重命名汇总: 成功 ${subdirRenamed}, 跳过 ${subdirSkipped}`);

  // 5. 最终验证：列出 categories 下所有子文件夹
  const finalSubdirs = fs.readdirSync(CAT_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
  const remainingChinese = finalSubdirs.filter(name => /[^\x00-\x7F]/.test(name));
  console.log(`\n[5] 最终验证: 子文件夹总数 ${finalSubdirs.length}, 剩余中文子文件夹 ${remainingChinese.length}`);
  if (remainingChinese.length > 0) {
    console.log('剩余中文子文件夹:');
    remainingChinese.forEach(d => console.log(`  - ${d}`));
  }

  // 汇总报告
  console.log('\n=== 重命名汇总报告 ===');
  console.log(`图片文件重命名成功:   ${totalFilesRenamed}`);
  console.log(`图片文件跳过:         ${totalFilesSkipped}`);
  console.log(`图片已是英文跳过:     ${totalFilesAlreadyEn}`);
  console.log(`缺翻译保留原名:       ${totalMissingTranslation}`);
  console.log(`子文件夹重命名成功:   ${subdirRenamed}`);
  console.log(`子文件夹跳过:         ${subdirSkipped}`);
  console.log('=== 完成 ===\n');
}

main();
