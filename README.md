# 科目一教考 · 速记通

> 2026 年 7 月最新版 · 机动车驾驶证科目一在线学习与速记练习网页

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Build: Vite](https://img.shields.io/badge/构建-Vite_7-646cff.svg)](https://vitejs.dev/)
[![Framework: React 19](https://img.shields.io/badge/框架-React_19-61dafb.svg)](https://react.dev/)
[![Lang: TypeScript](https://img.shields.io/badge/语言-TypeScript_5.9-3178c6.svg)](https://www.typescriptlang.org/)
[![Questions: 1964](https://img.shields.io/badge/题目-1964-0d9488.svg)](https://fanquanpp.github.io/KeMuONEXueKao/)
[![Mnemonics: 119](https://img.shields.io/badge/口诀-119-f97316.svg)](https://fanquanpp.github.io/KeMuONEXueKao/#/mnemonics)
[![PWA: 支持](https://img.shields.io/badge/PWA-支持-9333ea.svg)](https://fanquanpp.github.io/KeMuONEXueKao/)
[![Deploy: GitHub Pages](https://img.shields.io/badge/部署-GitHub%20Pages-success.svg)](https://docs.github.com/en/pages)

## 在线访问

> **提示**：GitHub 仓库主页右侧 **About / 关于** 栏目已配置 Pages 快速访问链接，点击即可直达在线网页。

| 入口 | 地址 |
|------|------|
| 在线网址 | <https://fanquanpp.github.io/KeMuONEXueKao/> |
| GitHub 仓库 | <https://github.com/fanquanpp/KeMuONEXueKao> |
| 主页 | <https://fanquanpp.github.io/KeMuONEXueKao/#/> |
| 题库练习 | <https://fanquanpp.github.io/KeMuONEXueKao/#/practice> |
| 模拟考试 | <https://fanquanpp.github.io/KeMuONEXueKao/#/exam> |
| 知识学习 | <https://fanquanpp.github.io/KeMuONEXueKao/#/knowledge> |
| 口诀总览 | <https://fanquanpp.github.io/KeMuONEXueKao/#/mnemonics> |
| 分类导航 | <https://fanquanpp.github.io/KeMuONEXueKao/#/categories> |

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

## 技术栈

- **构建工具**：Vite 7 + vite-plugin-pwa（PWA 离线缓存与可安装）
- **框架**：React 19 + React Router 7（HashRouter，单页应用 + 视图懒加载代码分割）
- **语言**：TypeScript 5.9（严格模式，禁用 any/unknown）
- **状态管理**：Zustand（轻量级 store，按需选择器订阅）
- **动画**：Framer Motion（视图切换、卡片悬浮、Toast 入场退场）
- **虚拟滚动**：@tanstack/react-virtual（长列表性能优化）
- **特效**：canvas-confetti（答对/通过撒花庆祝）
- **样式方案**：原生 CSS + CSS 设计令牌系统（CSS 变量级联主题切换）
- **部署**：GitHub Pages

## 架构特性

### 工程化质量

- **三层架构**：UI 层（views/components）→ Service 层（services/dataLoader）→ Data 层（data/*.json）
- **代码分割**：题库、口诀、知识内容均按需动态 import，首屏仅加载 Home，初始 gzip 体积约 150KB
- **类型安全**：完整 TypeScript 类型定义，所有 store/hook/component 强类型化
- **PWA 离线**：Service Worker 缓存核心资源，离线仍可练习；Stale-While-Revalidate 策略保证版本更新
- **响应式**：5 档断点（1024/768/480px + 横屏 + 大屏）适配桌面、平板、移动端
- **无障碍**：WAI-ARIA 语义标记、`prefers-reduced-motion` 减弱动画、`prefers-color-scheme` 自动主题、键盘焦点可见、Modal 焦点陷阱

### 安全防护

- **XSS 防护**：题目文本渲染前统一 escapeHtml，Markdown 链接协议白名单（仅允许 http/https/mailto/tel/相对路径/锚点）
- **URL 协议校验**：`javascript:`/`data:` 等危险协议不转换，保留原文
- **参数化存储**：所有数据访问通过 services 层封装，禁止裸调用

### 性能优化

- **虚拟滚动**：千级长列表（口诀总览、分类导航）使用 react-virtual 仅渲染可视区域
- **Stale-While-Revalidate**：Service Worker 缓存策略，秒级响应 + 后台更新
- **rAF 节流**：长文档滚动监听使用 requestAnimationFrame 节流，避免卡顿
- **模块级常量**：SVG 图标路径等提取至模块级，避免每次渲染重建对象
- **图片懒加载**：LazyImage 组件 IntersectionObserver 按需加载题目图片

## 功能特性

### 六大视图 · 一站式学习

- **主页**：Hero 数据概览、核心功能入口、六大分类速达、学习进度统计、雷达图正确率可视化
- **知识学习**：十大章节系统化交通法规知识，左侧章节目录 + 右侧内容渲染，搜索高亮，滚动联动
- **题库练习**：1964 道题目完整练习，左侧分类侧栏 + 右侧答题主区，乱序/仅错题/仅收藏组合筛选
- **模拟考试**：全真模拟考场，45 分钟限时 100 道随机题目，答题卡导航、五五提示、错题回顾
- **口诀总览**：虚拟滚动分栏式查阅，左侧分类索引 + 右侧编辑式详情列表
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
- **计时器安全**：重复 start 自动清理已有计时器，避免双倍速倒计时

### 完善交互体验

- **双主题切换**：浅色 / 深色双主题，薄荷青 + 珊瑚橙清新配色，localStorage 记忆偏好
- **自动跟随系统**：首次访问自动跟随系统 `prefers-color-scheme` 主题偏好
- **键盘快捷键**：`←` `→` 翻页，`1` `2` `3` `4` 或 `A` `B` `C` `D` 选择选项，`ESC` 关闭弹窗
- **闭包安全**：useHotkeys 使用 useRef 保持最新 handlers，避免闭包陈旧
- **题号跳转**：输入题号快速跳转至任意题目
- **搜索筛选**：练习题库与口诀总览均支持全文搜索
- **乱序练习**：一键开启乱序，打乱题目顺序强化记忆；关闭后基于筛选条件重算有序列表
- **过滤器组合**：仅错题 + 仅收藏 + 搜索 + 分类可任意组合，互不冲突
- **进度记忆**：答题进度、正确率、主题偏好、收藏全程 localStorage 持久化
- **URL 路由**：六视图 hash 路由，支持分享直达指定视图
- **自定义模态**：替代原生 `confirm()` 对话框，风格统一；aria-labelledby 关联标题，键盘可操作

### PWA 渐进式 Web 应用

- **可安装**：支持添加到主屏幕，独立窗口显示（`display: standalone`）
- **离线可用**：Service Worker 缓存核心资源，离线状态下仍可练习
- **图片缓存**：题目图片自动缓存，二次访问秒加载
- **状态保持**：考试进度通过 sessionStorage 保存，切换不丢状态
- **iOS 安全区适配**：`viewport-fit=cover` + `env(safe-area-inset-*)` 适配刘海屏

### 质感 UI 设计（去 AI 味）

- **克制配色**：薄荷青主色 (#0d9488) + 珊瑚橙强调色 (#ea580c)，避免紫色渐变
- **层次布局**：主页 Hero + Stats + Categories + Radar + Quick 多段式结构，避免单一流式滚动
- **分栏式口诀**：左侧索引 + 右侧详情，Notion 风格编辑式排版，避免卡片堆砌
- **列表式分类**：表格化布局，含练习进度条，避免卡片堆砌
- **细腻动效**：卡片悬浮微动效、视图进入动画、解析折叠展开、按钮态切换、Toast 入场退场
- **毛玻璃导航**：`backdrop-filter: blur(16px) saturate(180%)` 滚动时增强
- **响应式布局**：5 档断点适配桌面、平板、移动端，移动端独立抽屉式目录
- **无障碍**：`prefers-reduced-motion` 减弱动画、`prefers-color-scheme` 自动主题、WAI-ARIA 语义标记、键盘焦点可见、Modal 焦点陷阱与 aria-labelledby

## 项目结构

```
KeMuONEXueKao/
├── src/
│   ├── components/                # 通用组件
│   │   ├── common/               # 基础组件（Modal、LazyImage、EmptyState、Skeleton）
│   │   ├── feedback/             # 反馈组件（ToastContainer、ConfirmProvider、GlobalLoading）
│   │   ├── layout/               # 布局组件（TopNav）
│   │   └── question/             # 题目组件（QuestionCard）
│   ├── views/                    # 视图层（HomeView、KnowledgeView、PracticeView、ExamView、MnemonicsView、CategoriesView）
│   ├── stores/                   # Zustand 状态管理（themeStore、progressStore、practiceStore、examStore、toastStore）
│   ├── services/                 # 服务层（dataLoader、storage、highlight）
│   ├── hooks/                    # 自定义 Hook（useHotkeys、useSwipe、useVibrate、useConfetti、useMediaQuery）
│   ├── data/                     # 数据层（questions.json、mnemonics.json、categories.json、categoryGroups.ts）
│   ├── styles/                   # 样式（tokens、base、layout、components、views、responsive）
│   ├── types/                    # TypeScript 类型定义
│   ├── utils/                    # 纯函数工具（escapeHtml、shuffle、debounce、throttle、formatTime）
│   ├── App.tsx                   # 应用根组件（路由配置 + 全局布局）
│   └── main.tsx                  # 应用入口（CSS 引入 + 根渲染）
├── public/
│   ├── docs/
│   │   └── knowledge.md          # 知识学习内容（Markdown）
│   └── assets/images/            # 图像题图片资源（362 张，约 12MB）
├── index.html                    # HTML 模板
├── vite.config.ts                # Vite 配置（base 路径 + PWA 插件）
├── tsconfig.json                 # TypeScript 配置（严格模式）
├── package.json                  # 依赖与脚本
├── .gitignore                    # Git 忽略规则
└── README.md                     # 项目说明（本文件）
```

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

## 本地开发

### 环境要求

- Node.js 18+
- npm 9+（或 pnpm / yarn）

### 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:5173）
npm run dev

# 类型检查
npx tsc --noEmit

# 生产构建
npm run build

# 预览构建产物
npm run preview

# 部署至 GitHub Pages
npm run deploy
```

### 开发提示

- 题库 JSON 体积较大（约 2.5MB），首次 `npm run dev` 启动后动态 import 会有短暂延迟
- 知识学习内容位于 `public/docs/knowledge.md`，修改后需刷新页面（fetch 重新加载）
- Service Worker 仅在 `npm run build` 后的预览或部署环境生效，开发环境不启用
- 修改 `src/styles/*.css` 后无需重启，HMR 自动应用

## 部署到 GitHub Pages

本项目已部署至 GitHub Pages，在线访问：<https://fanquanpp.github.io/KeMuONEXueKao/>

部署流程已通过 `npm run deploy` 脚本自动化：

1. `npm run build` 构建生产产物至 `dist/`
2. `gh-pages -d dist` 将 `dist/` 推送至 `gh-pages` 分支
3. GitHub Pages 自动构建部署，约 1-2 分钟生效

如需自行部署：

1. Fork 本仓库至你的 GitHub 账户
2. 修改 `vite.config.ts` 中的 `base` 字段为你的仓库名（如 `/YourRepoName/`）
3. 进入仓库 **Settings** → **Pages**
4. **Source** 选择 `Deploy from a branch`
5. **Branch** 选择 `gh-pages` / `(root)`，点击 **Save**
6. 等待约 1 分钟，访问 `https://<你的用户名>.github.io/<仓库名>/`

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
| `B` | 收藏/取消收藏 | 练习 |
| `H` | 五五提示（考试） | 考试 |
| `Enter` | 交卷 | 考试 |
| `M` | 标记题目 | 考试 |
| `ESC` | 关闭弹窗 / 答题卡 | 全局 |

## 浏览器兼容性

- Chrome / Edge 90+
- Firefox 88+
- Safari 14+
- 移动端 Chrome / Safari（支持 PWA 安装）

推荐使用 Chrome 或 Edge 浏览器获得最佳体验。

## 版本信息

- **当前版本**：v3.1.20260713
- **更新日期**：2026 年 7 月 13 日
- **架构版本**：Vite + React 19 + TypeScript 重构版（v3.x）
- **题库规模**：1964 题（判断题 + 单选题）
- **口诀数量**：119 条
- **分类数量**：24 个
- **本次更新**：清理旧版残留 · 修复 XSS/闭包/计时器泄漏/竞态等代码质量问题 · 完善 a11y 焦点管理 · fetch 超时控制 · 主题切换性能优化

## License

本项目采用 [MIT License](https://opensource.org/licenses/MIT) 开源协议。

题库数据与图片资源版权归原作者所有，本项目仅用于学习交流目的。

---

**在线体验**：<https://fanquanpp.github.io/KeMuONEXueKao/>

如果本项目对你有帮助，欢迎 Star 支持！
