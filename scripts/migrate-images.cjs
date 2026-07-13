/**
 * 图片资源迁移脚本(Node.js 版本)
 * 功能:
 * 1. 扫描"提取的图标图片"目录,构建编号→新文件名映射
 * 2. 删除 assets/images 中同编号的旧图片(无中文标注)
 * 3. 复制带中文标注的新图片到 assets/images
 * 4. 创建分类子目录架构到 assets/images/categories/
 * 5. 生成映射表 JSON 供 questions.json 更新使用
 */
const fs = require('fs');
const path = require('path');

const projectRoot = 'c:\\Atian\\Project\\KeMuONEXueKao';
const extractedRoot = path.join(projectRoot, '提取的图标图片');
const imagesRoot = path.join(projectRoot, 'assets', 'images');
const categoriesRoot = path.join(imagesRoot, 'categories');
const mapFile = path.join(projectRoot, 'scripts', 'image-map.json');

// 确保分类子目录根存在
if (!fs.existsSync(categoriesRoot)) {
  fs.mkdirSync(categoriesRoot, { recursive: true });
}

// 第一步:扫描提取图标,构建映射表
console.log('===== 步骤1:扫描提取图标文件夹 =====');
const map = new Map();
const categories = new Map();
let totalScanned = 0;

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.jpg')) {
      totalScanned++;
      const catName = path.basename(dir);
      const m = entry.name.match(/^(\d+)_(.+)$/);
      if (m) {
        const num = parseInt(m[1], 10);
        const newName = entry.name;
        map.set(num, {
          num,
          newName,
          oldName: `${num}.jpg`,
          category: catName,
          fullName: fullPath
        });
        if (!categories.has(catName)) {
          categories.set(catName, []);
        }
        categories.get(catName).push(newName);
      }
    }
  }
}
scanDir(extractedRoot);
console.log(`扫描完成:共 ${totalScanned} 个图片,构建 ${map.size} 个编号映射,${categories.size} 个分类`);

// 第二步:删除 assets/images 中同编号的旧图片
console.log('\n===== 步骤2:删除被替换的旧图片 =====');
let deleted = 0;
let added = 0;
for (const [num, entry] of map) {
  const oldPath = path.join(imagesRoot, entry.oldName);
  if (fs.existsSync(oldPath)) {
    fs.unlinkSync(oldPath);
    deleted++;
  } else {
    added++;
  }
}
console.log(`删除旧图片: ${deleted} 个, 新增图片: ${added} 个`);

// 第三步:复制新图片到 assets/images 根目录
console.log('\n===== 步骤3:复制新图片到 assets/images =====');
let copied = 0;
for (const [, entry] of map) {
  const destPath = path.join(imagesRoot, entry.newName);
  fs.copyFileSync(entry.fullName, destPath);
  copied++;
}
console.log(`复制新图片: ${copied} 个`);

// 第四步:创建分类子目录架构
console.log('\n===== 步骤4:创建分类子目录架构 =====');
for (const [catName, files] of categories) {
  const catDir = path.join(categoriesRoot, catName);
  if (!fs.existsSync(catDir)) {
    fs.mkdirSync(catDir, { recursive: true });
  }
  for (const fileName of files) {
    const srcPath = path.join(imagesRoot, fileName);
    const destPath = path.join(catDir, fileName);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
console.log(`分类子目录创建完成: ${categories.size} 个分类`);

// 第五步:生成映射表 JSON
console.log('\n===== 步骤5:生成映射表 JSON =====');
const mapObj = {};
for (const [num, entry] of map) {
  mapObj[String(num)] = {
    newName: entry.newName,
    oldName: entry.oldName,
    category: entry.category
  };
}
fs.writeFileSync(mapFile, JSON.stringify(mapObj, null, 2), 'utf8');
console.log(`映射表已保存: ${mapFile}`);

// 汇总
console.log('\n===== 迁移汇总 =====');
console.log(`提取图标总数: ${totalScanned}`);
console.log(`编号映射数: ${map.size}`);
console.log(`替换旧图片: ${deleted}`);
console.log(`新增图片: ${added}`);
console.log(`分类数: ${categories.size}`);
