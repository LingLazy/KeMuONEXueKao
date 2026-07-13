/**
 * 扫描 categories 目录下所有图片文件名，提取中文描述，
 * 对比翻译表输出缺失项，用于补充翻译表。
 *
 * 用法：node scripts/scan-categories.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { translateDesc } from './rename-to-english.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CAT_DIR = path.join(ROOT, 'assets', 'images', 'categories');

function main() {
  console.log('=== 扫描 categories 目录 ===\n');

  const subdirs = fs.readdirSync(CAT_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  console.log(`子文件夹数: ${subdirs.length}`);

  /** 所有出现的中文描述 → { count, samples: [{file, subdir}] } */
  const allDescs = new Map();
  /** 翻译表缺失的描述 */
  const missing = new Map();

  for (const subdir of subdirs) {
    const subdirPath = path.join(CAT_DIR, subdir);
    const files = fs.readdirSync(subdirPath)
      .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));

    for (const file of files) {
      // 提取中文描述：去掉数字前缀和扩展名
      // 格式：358_停止信号.jpg  或  01_停车让行.jpg
      const ext = path.extname(file);
      const base = path.basename(file, ext);
      const m = base.match(/^\d+[_\s]?(.+)$/);
      const desc = m ? m[1] : base;

      if (!allDescs.has(desc)) {
        allDescs.set(desc, { count: 0, samples: [] });
      }
      const entry = allDescs.get(desc);
      entry.count++;
      if (entry.samples.length < 2) {
        entry.samples.push({ file, subdir });
      }

      if (!translateDesc(desc) && !missing.has(desc)) {
        missing.set(desc, { count: 0, samples: [] });
      }
      if (missing.has(desc)) {
        const m2 = missing.get(desc);
        m2.count++;
        if (m2.samples.length < 2) {
          m2.samples.push({ file, subdir });
        }
      }
    }
  }

  console.log(`\n唯一中文描述总数: ${allDescs.size}`);
  console.log(`翻译表缺失数: ${missing.size}\n`);

  if (missing.size > 0) {
    console.log('=== 缺失翻译列表（按子文件夹分组） ===\n');
    const bySubdir = new Map();
    for (const [desc, info] of missing) {
      const subdir = info.samples[0].subdir;
      if (!bySubdir.has(subdir)) bySubdir.set(subdir, []);
      bySubdir.get(subdir).push({ desc, count: info.count });
    }
    for (const [subdir, items] of bySubdir) {
      console.log(`[${subdir}]`);
      for (const it of items) {
        console.log(`  ${it.desc}  (x${it.count})`);
      }
      console.log('');
    }

    // 输出可直接粘贴的 JS 对象格式
    console.log('=== 可直接粘贴到翻译表的格式 ===\n');
    for (const desc of missing.keys()) {
      // 简单转义：含特殊符号的用单引号包裹
      const needsQuote = /['",:()\s、]/.test(desc);
      const key = needsQuote ? `'${desc}'` : desc;
      console.log(`  ${key}: '',`);
    }
  } else {
    console.log('所有描述均已有翻译，可以执行重命名。');
  }
}

main();
