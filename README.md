# 科目一教考 · 速记通

> 2026 年 7 月最新版 · 机动车驾驶证科目一在线学习与速记练习网页

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Questions: 1964](https://img.shields.io/badge/题目-1964-0d9488.svg)](https://fanquanpp.github.io/KeMuONEXueKao/)
[![Mnemonics: 76](https://img.shields.io/badge/口诀-76-f97316.svg)](https://fanquanpp.github.io/KeMuONEXueKao/#mnemonics)
[![Categories: 24](https://img.shields.io/badge/分类-24-2563eb.svg)](https://fanquanpp.github.io/KeMuONEXueKao/#categories)
[![Exam: 100题](https://img.shields.io/badge/模拟考试-100题/45分钟-success.svg)](https://fanquanpp.github.io/KeMuONEXueKao/#exam)
[![PWA: 支持](https://img.shields.io/badge/PWA-支持-9333ea.svg)](https://fanquanpp.github.io/KeMuONEXueKao/)
[![Deploy: GitHub Pages](https://img.shields.io/badge/部署-GitHub%20Pages-success.svg)](https://docs.github.com/en/pages)

## 在线访问

> **提示**：GitHub 仓库主页右侧 **About / 关于** 栏目已配置 Pages 快速访问链接，点击即可直达在线网页。

| 入口 | 地址 |
|------|------|
| 在线网址 | <https://fanquanpp.github.io/KeMuONEXueKao/> |
| GitHub 仓库 | <https://github.com/fanquanpp/KeMuONEXueKao> |
| 主页 | <https://fanquanpp.github.io/KeMuONEXueKao/#home> |
| 题库练习 | <https://fanquanpp.github.io/KeMuONEXueKao/#practice> |
| 模拟考试 | <https://fanquanpp.github.io/KeMuONEXueKao/#exam> |
| 口诀总览 | <https://fanquanpp.github.io/KeMuONEXueKao/#mnemonics> |
| 分类导航 | <https://fanquanpp.github.io/KeMuONEXueKao/#categories> |

## 项目简介

本项目是一个面向机动车驾驶证科目一考试的全功能在线学习网页，覆盖**完整 1964 道官方题库**、**119 条精选速记口诀**、**24 个精细分类**与**371 道图像题**，提供**全真模拟考试**、关键词智能高亮、口诀即时提示、双主题切换、PWA 离线使用等完善功能，助力考生高效备考。

数据严格依据公安部令第 163 号《道路交通安全违法行为记分管理办法》（2022 年 4 月 1 日施行，现行有效）与 GB 5768.2-2022《道路交通标志和标线》等最新法规标准。

## 核心数据

| 数据项 | 数量 | 说明 |
|--------|------|------|
| 完整题目 | 1964 道 | 判断题 + 单选题，覆盖全部考点 |
| 速记口诀 | 119 条 | 按 24 分类整理，每条附详细解释 |
| 精细分类 | 24 个 | 驾驶证、安全行车、限速、灯光、记分等 |
| 图像题目 | 371 道 | 含交通标志、交警手势等图像题 |
| 图片资源 | 362 张 | 从驾考宝典本地缓存提取的真实题目图片 |
| 模拟考试 | 100 题 / 45 分钟 | 随机抽题、限时交卷、90 分及格 |

## 功能特性

### 五大视图 · 一站式学习

- **主页**：Hero 数据概览、核心功能入口、热门分类速达、个人进度统计
- **题库练习**：1964 道题目完整练习，左侧分类侧栏 + 右侧答题主区
- **模拟考试**：全真模拟考场，45 分钟限时 100 道随机题目，答题卡导航、五五提示、错题回顾
- **口诀总览**：分栏式查阅，左侧分类索引 + 右侧编辑式详情列表
- **分类导航**：列表式表格浏览，含练习进度条，点击即进入对应分类题目练习

### 智能学习辅助

- **关键词高亮**：题干、选项、解析中自动高亮关键词（语义化 `<mark class="kw">`），危险词红色、数字类蓝色、其余主色
- **口诀常驻显示**：答题后口诀简短常驻显示（独立于解析），不占额外空间
- **解析独立折叠**：解析默认折叠，点击展开查看详细说明
- **图像题支持**：371 道图像题配套真实图片，控制高度确保一屏可见

### 全真模拟考试

- **限时考场**：45 分钟倒计时，最后 10 分钟黄色警告，最后 5 分钟红色警告
- **随机抽题**：从 1964 题库中随机抽取 100 道，判断题 + 单选题混合
- **五五提示**：每题可使用 1 次"五五提示"，剔除两个错误选项
- **答题卡导航**：网格状答题卡，显示已答/未答/标记/当前状态，点击跳转
- **标记题目**：疑难题目可标记，便于后续回顾
- **状态保持**：考试进度通过 sessionStorage 保存，切换标签或刷新不丢失
- **错题回顾**：交卷后可查看全部错题，附正确答案与解析
- **评分标准**：每题 1 分，90 分及格，超时自动交卷

### 完善交互体验

- **双主题切换**：浅色 / 深色双主题，薄荷青 + 珊瑚橙清新配色，localStorage 记忆偏好
- **自动跟随系统**：首次访问自动跟随系统 `prefers-color-scheme` 主题偏好
- **键盘快捷键**：`←` `→` 翻页，`1` `2` `3` `4` 或 `A` `B` `C` `D` 选择选项，`ESC` 关闭弹窗
- **题号跳转**：输入题号快速跳转至任意题目
- **搜索筛选**：练习题库与口诀总览均支持全文搜索
- **乱序练习**：一键开启乱序，打乱题目顺序强化记忆
- **进度记忆**：答题进度、正确率、主题偏好、收藏全程 localStorage 持久化
- **URL 路由**：五视图 hash 路由，支持分享直达指定视图
- **自定义模态**：替代原生 `confirm()` 对话框，风格统一

### PWA 渐进式 Web 应用

- **可安装**：支持添加到主屏幕，独立窗口显示（`display: standalone`）
- **离线可用**：Service Worker 缓存核心资源，离线状态下仍可练习
- **图片缓存**：题目图片自动缓存，二次访问秒加载
- **状态保持**：考试进度通过 sessionStorage 保存，切换不丢状态
- **iOS 安全区适配**：`viewport-fit=cover` + `env(safe-area-inset-*)` 适配刘海屏

### 质感 UI 设计（去 AI 味）

- **克制配色**：薄荷青主色 (#0d9488) + 珊瑚橙强调色 (#ea580c)，避免紫色渐变
- **层次布局**：主页 Hero + Features + Hot Categories 三段式结构，避免单一流式滚动
- **分栏式口诀**：左侧索引 + 右侧详情，Notion 风格编辑式排版，避免卡片堆砌
- **列表式分类**：表格化布局，含练习进度条，避免卡片堆砌
- **细腻动效**：卡片悬浮微动效、视图进入动画、解析折叠展开、按钮态切换
- **毛玻璃导航**：`backdrop-filter: blur(16px) saturate(180%)` 滚动时增强
- **响应式布局**：三档断点 (1100px / 900px / 600px) 适配桌面、平板、移动端
- **无障碍**：`prefers-reduced-motion` 减弱动画、`prefers-color-scheme` 自动主题、WAI-ARIA 语义标记、键盘焦点可见

## 技术栈

- **纯静态部署**：HTML5 + CSS3 + 原生 JavaScript（无框架、无构建工具）
- **SPA 架构**：五视图 hash 路由单页应用
- **CSS 设计令牌**：完整设计令牌系统（背景层次、文字层次、状态色、阴影、圆角、动效曲线、间距）
- **CSS 变量主题**：`[data-theme]` 属性切换，CSS 变量级联更新全站样式
- **PWA 支持**：manifest.json + Service Worker (sw.js) 离线缓存
- **数据驱动**：题库、口诀、分类数据独立为 `js/data.js`（约 2.5MB）
- **部署平台**：GitHub Pages

## 项目结构

```
KeMuONEXueKao/
├── index.html                    # 主页面（五视图 SPA 入口）
├── css/
│   └── style.css                 # 样式表（去AI味 + 分栏布局 + 模拟考试 + PWA）
├── js/
│   ├── data.js                   # 题库数据（1964题 + 76口诀 + 24分类 + 图片映射）
│   └── app.js                    # 应用逻辑（五视图路由 + 模拟考试 + 主题 + PWA）
├── assets/
│   └── images/                   # 图像题图片资源（362张，约12MB）
├── manifest.json                 # PWA 应用清单
├── sw.js                         # Service Worker（离线缓存）
├── .gitignore                    # Git 忽略规则
└── README.md                     # 项目说明（本文件）
```

> 注：题库原始数据源 `kemu1_question_bank_full.json` 与口诀资料 `科目一考试口诀技巧.md` 仅本地保留用于构建 `js/data.js`，已通过 `.gitignore` 排除，不进入仓库与部署包。

## 24 个精细分类

| 序号 | 分类 | 说明 |
|------|------|------|
| 01 | 驾驶证与机动车 | 申领、换证、补领、注销、撤销、吊销、暂扣 |
| 02 | 安全行车 | 安全行车常识与操作规范 |
| 03 | 限速规定 | 城市道路、公路、高速限速标准 |
| 04 | 灯光使用 | 远近光灯、雾灯、转向灯使用场景 |
| 05 | 让行规则 | 转弯让直行、右转让左转、环岛让行 |
| 06 | 交通标志 | 禁令、指示、警告、指路标志识别 |
| 07 | 道路标线 | 实线、虚线、双黄线、人行横道线 |
| 08 | 交警手势信号灯 | 8 种交警手势信号识别 |
| 09 | 超车变更车道 | 超车规则、变更车道操作 |
| 10 | 停车规定 | 禁停距离、临时停车、故障停车 |
| 11 | 高速公路 | 限速、车道、应急车道、服务区 |
| 12 | 夜间驾驶 | 夜间灯光、会车、跟车规则 |
| 13 | 恶劣天气 | 雾、雨、雪、沙尘、低能见度行驶 |
| 14 | 紧急情况处置 | 爆胎、侧滑、制动失灵处置 |
| 15 | 故障事故处理 | 故障停车、警告标志设置 |
| 16 | 事故处理 | 伤员抢救、报警、自行协商 |
| 17 | 违法记分 | 1/3/6/9/12 分五档记分规则 |
| 18 | 罚款处罚 | 200/500/1000/2000/5000 元罚款情形 |
| 19 | 酒驾醉驾 | 饮酒驾驶、醉酒驾驶处罚标准 |
| 20 | 机动车基础 | 轮胎、制动、转向、发动机常识 |
| 21 | 安全装置 | 安全带、安全气囊、ABS、儿童座椅 |
| 22 | 新能源车辆 | 电动、充电、电池、混动知识 |
| 23 | 智能辅助驾驶 | L1-L5 自动驾驶、ADAS、ACC、LKA |
| 24 | 考试与申领 | 科目一至科目四考试规则、学法减分 |

## 本地运行

### 方式一：Python 启动（推荐，PWA 需 HTTPS 或 localhost）

```bash
# 进入项目根目录
cd KeMuONEXueKao

# 启动本地服务器（Python 3）
python -m http.server 8000

# 浏览器访问
# http://localhost:8000
```

### 方式二：Node.js 启动

```bash
# 使用 npx 一键启动（无需全局安装）
npx serve .

# 或使用 http-server
npx http-server -p 8000
```

### 方式三：直接打开

直接用浏览器打开 `index.html` 即可（Service Worker 与部分 PWA 功能可能受限，推荐使用本地服务器方式）。

## 部署到 GitHub Pages

本项目已部署至 GitHub Pages，在线访问：<https://fanquanpp.github.io/KeMuONEXueKao/>

如需自行部署：

1. Fork 本仓库至你的 GitHub 账户
2. 进入仓库 **Settings** → **Pages**
3. **Source** 选择 `Deploy from a branch`
4. **Branch** 选择 `main` / `(root)`，点击 **Save**
5. 等待约 1 分钟，访问 `https://<你的用户名>.github.io/KeMuONEXueKao/`

### 配置 GitHub 仓库侧边栏 Pages 链接

在 GitHub 仓库主页右侧 **About / 关于** 栏目点击齿轮图标，在 **Website / 网站** 字段填入 Pages 地址：

```
https://fanquanpp.github.io/KeMuONEXueKao/
```

保存后，侧边栏将显示快速访问链接。

## 数据来源

- 题库数据：2026 年 7 月最新官方科目一题库（1964 道完整题目）
- 口诀数据：综合驾考宝典、视频教程、网页资料整理的 119 条速记口诀
- 图像资源：从驾考宝典本地缓存提取的 362 张题目图片（371 道图像题匹配）
- 法规依据：公安部令第 163 号、GB 5768.2-2022 等最新法规标准

## 法规依据

- **公安部令第 163 号**《道路交通安全违法行为记分管理办法》（2022 年 4 月 1 日施行，现行有效）
- **GB 5768.2-2022**《道路交通标志和标线 第 2 部分：道路交通标志》（2022 年 10 月 1 日实施）
- **公安部令第 162 号**《机动车驾驶证申领和使用规定》（2022 年 4 月 1 日施行）
- 高速限速全国统一五档标准：120 / 100 / 80 / 60 / 40

## 键盘快捷键

| 快捷键 | 功能 | 适用视图 |
|--------|------|----------|
| `←` | 上一题 | 练习 / 考试 |
| `→` | 下一题 | 练习 / 考试 |
| `1` / `A` | 选择选项 A | 练习 / 考试 |
| `2` / `B` | 选择选项 B | 练习 / 考试 |
| `3` / `C` | 选择选项 C | 练习 / 考试 |
| `4` / `D` | 选择选项 D | 练习 / 考试 |
| `ESC` | 关闭弹窗 / 答题卡 | 全局 |

## 浏览器兼容性

- Chrome / Edge 90+
- Firefox 88+
- Safari 14+
- 移动端 Chrome / Safari（支持 PWA 安装）

推荐使用 Chrome 或 Edge 浏览器获得最佳体验。

## 版本信息

- **当前版本**：v2.8.20260713
- **更新日期**：2026 年 7 月 13 日
- **题库规模**：1964 题（判断题 + 单选题）
- **口诀数量**：119 条
- **分类数量**：24 个
- **新增功能**：追加36条口诀 · 考试立即判断对错 · 学习路径引导 · 背景动效优化 · 亮色主题优化

## License

本项目采用 [MIT License](https://opensource.org/licenses/MIT) 开源协议。

题库数据与图片资源版权归原作者所有，本项目仅用于学习交流目的。

---

**在线体验**：<https://fanquanpp.github.io/KeMuONEXueKao/>

如果本项目对你有帮助，欢迎 Star 支持！
