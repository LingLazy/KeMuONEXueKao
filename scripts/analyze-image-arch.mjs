/**
 * 分析新图片架构，对比 questions.json 引用，输出差异报告。
 * 用法：node scripts/analyze-image-arch.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const IMG_DIR = path.join(ROOT, 'assets', 'images');
const QFILE = path.join(ROOT, 'src', 'data', 'questions.json');

function main() {
  // 1. 递归扫描 assets/images/ 下所有图片文件
  /** fileName -> relativePath (如 "stop-and-yield.jpg" -> "prohibitory-signs/stop-and-yield.jpg") */
  const fileMap = new Map();
  /** fileName -> count（检测重名） */
  const dupes = new Map();

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

  // 2. 读取 questions.json
  const questions = JSON.parse(fs.readFileSync(QFILE, 'utf8'));
  const referenced = questions.filter(q => q.image).map(q => ({ id: q.id, image: q.image }));
  console.log(`[2] questions.json 引用图片数: ${referenced.length}`);

  // 3. 对比：引用但找不到的图片
  const missing = [];
  const found = [];
  for (const r of referenced) {
    if (fileMap.has(r.image)) {
      found.push({ ...r, relPath: fileMap.get(r.image) });
    } else {
      missing.push(r);
    }
  }
  console.log(`[3] 找到: ${found.length}, 缺失: ${missing.length}`);

  if (missing.length > 0) {
    console.log('\n=== 缺失图片（questions.json 引用但 assets/images 下找不到）===');
    // 按文件名特征分组
    const numericMissing = missing.filter(m => /^\d+\.\w+/.test(m.image));
    const namedMissing = missing.filter(m => !/^\d+\.\w+/.test(m.image));
    console.log(`  数字命名: ${numericMissing.length}`);
    console.log(`  英文命名: ${namedMissing.length}`);
    if (namedMissing.length > 0) {
      console.log('\n  英文命名缺失列表（前 30）:');
      namedMissing.slice(0, 30).forEach(m => console.log(`    ${m.image}`));
    }
    if (numericMissing.length > 0) {
      console.log('\n  数字命名缺失列表（前 30）:');
      numericMissing.slice(0, 30).forEach(m => console.log(`    ${m.image}`));
    }
  }

  // 4. 重名冲突
  if (dupes.size > 0) {
    console.log(`\n=== 重名文件（${dupes.size} 个）===`);
    for (const [name, paths] of dupes) {
      console.log(`  ${name}:`);
      paths.forEach(p => console.log(`    ${p}`));
    }
  }

  // 5. 输出需要更新的映射：当前 image 字段 -> 新的相对路径（带子文件夹）
  // 仅当当前 image 字段不包含子文件夹时才需要更新
  const updates = [];
  for (const f of found) {
    if (f.image !== f.relPath) {
      updates.push({ id: f.id, old: f.image, new: f.relPath });
    }
  }
  console.log(`\n[4] 需要更新路径的引用数: ${updates.length}`);
  if (updates.length > 0) {
    console.log('  前 20 个更新示例:');
    updates.slice(0, 20).forEach(u => console.log(`    ${u.old}  ->  ${u.new}`));
  }

  // 6. 写入更新映射 JSON 文件，供后续脚本使用
  const report = {
    totalFiles: fileMap.size,
    totalReferenced: referenced.length,
    found: found.length,
    missing: missing.length,
    duplicates: Object.fromEntries(dupes),
    missingList: missing,
    updates,
  };
  fs.writeFileSync(path.join(__dirname, 'image-arch-report.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log(`\n[5] 详细报告已写入 scripts/image-arch-report.json`);
}

main();
