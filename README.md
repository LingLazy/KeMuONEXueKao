# KeMuONEXueKao

> 机动车驾驶证科目一在线学习与速记练习网页

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Build: Vite](https://img.shields.io/badge/Build-Vite_7-646cff.svg)](https://vitejs.dev/)
[![Framework: React 19](https://img.shields.io/badge/Framework-React_19-61dafb.svg)](https://react.dev/)
[![Lang: TypeScript](https://img.shields.io/badge/Lang-TypeScript_5.9-3178c6.svg)](https://www.typescriptlang.org/)
[![PWA](https://img.shields.io/badge/PWA-enabled-9333ea.svg)](https://fanquanpp.github.io/KeMuONEXueKao/)
[![Deploy: GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-success.svg)](https://docs.github.com/en/pages)

## 在线访问

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

KeMuONEXueKao 是一个面向机动车驾驶证科目一考试的全功能在线学习网页，提供 **题库练习**、**速记口诀**、**分类导航**、**全真模拟考试**、**系统化知识学习**，以及关键词智能高亮、口诀即时提示、双主题切换、PWA 离线使用等完善功能，助力考生备考。

## 数据统计

项目内置完整题库与知识体系，覆盖科目一与科目四全部考点，数据规模如下：

| 维度 | 数量 | 说明 |
|------|------|------|
| 题库总量 | **3494 题** | 科目一 1861 题 + 科目四 1633 题 |
| 判断题 | 1810 题 | 占比约 51.8% |
| 单选题 | 1343 题 | 占比约 38.4% |
| 多选题 | 341 题 | 占比约 9.8% |
| 图片题 | 1647 题 | 含真实场景图、交通标志、手势信号等 |
| 题目图片资源 | 1179 张 | 位于 `public/images/questions/`，英文命名 |
| 交通标志 | 719 个 | 完整覆盖禁令、警告、指示、指路等标志类别 |
| 速记口诀 | 95 条 | 按主题分类，覆盖高频考点 |
| 知识模块 | 26 个 | 一级分类（涵盖法规、处罚、车辆、安全驾驶、案例分析） |
| 结构化子考点 | 157 个 | 二级知识点，关联题目编号 |
| 大分类组 | 5 组 | 法规常识 / 违法处罚 / 车辆常识 / 安全驾驶 / 其他案例 |

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
- **代码分割**：题库、口诀、知识内容均按需动态 import，首屏仅加载 Home
- **类型安全**：完整 TypeScript 类型定义，所有 store/hook/component 强类型化
- **PWA 离线**：Service Worker 缓存核心资源，离线仍可练习；Stale-While-Revalidate 策略保证版本更新
- **响应式**：5 档断点（1024/768/480px + 横屏 + 大屏）适配桌面、平板、移动端
- **无障碍**：WAI-ARIA 语义标记、`prefers-reduced-motion` 减弱动画、`prefers-color-scheme` 自动主题、键盘焦点可见、Modal 焦点陷阱

### 安全防护

- **XSS 防护**：题目文本渲染前统一 escapeHtml，Markdown 链接协议白名单（仅允许 http/https/mailto/tel/相对路径/锚点）
- **URL 协议校验**：`javascript:`/`data:` 等危险协议不转换，保留原文
- **参数化存储**：所有数据访问通过 services 层封装，禁止裸调用

### 性能优化

- **虚拟滚动**：长列表（口诀总览、分类导航）使用 react-virtual 仅渲染可视区域
- **Stale-While-Revalidate**：Service Worker 缓存策略，秒级响应 + 后台更新
- **rAF 节流**：长文档滚动监听使用 requestAnimationFrame 节流，避免卡顿
- **模块级常量**：SVG 图标路径等提取至模块级，避免每次渲染重建对象
- **图片懒加载**：LazyImage 组件 IntersectionObserver 按需加载题目图片

## 功能特性

### 六大视图 · 一站式学习

- **主页**：Hero 数据概览、核心功能入口、分类速达、学习进度统计、雷达图正确率可视化
- **知识学习**：系统化交通法规知识，左侧章节目录 + 右侧内容渲染，搜索高亮，滚动联动
- **题库练习**：题目完整练习，左侧分类侧栏 + 右侧答题主区，乱序/仅错题/仅收藏组合筛选
- **模拟考试**：全真模拟考场，限时随机题目，答题卡导航、五五提示、错题回顾
- **口诀总览**：虚拟滚动分栏式查阅，左侧分类索引 + 右侧编辑式详情列表
- **分类导航**：列表式表格浏览，含练习进度条，点击即进入对应分类题目练习

### 智能学习辅助

- **关键词高亮**：题干、选项、解析中自动高亮关键词（语义化 `<mark class="kw">`），危险词红色、数字类蓝色、其余主色
- **口诀常驻显示**：答题后口诀简短常驻显示（独立于解析），不占额外空间
- **解析独立折叠**：解析默认折叠，点击展开查看详细说明
- **图像题支持**：图像题配套真实图片，控制高度确保一屏可见

### 全真模拟考试

- **限时考场**：倒计时，最后 10 分钟黄色警告，最后 5 分钟红色警告
- **随机抽题**：从题库中随机抽取，判断题 + 单选题 + 多选题混合
- **五五提示**：每题可使用 1 次"五五提示"，剔除两个错误选项
- **答题卡导航**：网格状答题卡，显示已答/未答/标记/当前状态，点击跳转
- **标记题目**：疑难题目可标记，便于后续回顾
- **状态保持**：考试进度通过 sessionStorage 保存，切换标签或刷新不丢失
- **错题回顾**：交卷后可查看全部错题，附正确答案与解析
- **评分标准**：每题 1 分，90 分及格，超时自动交卷
- **计时器安全**：重复 start 自动清理已有计时器，避免双倍速倒计时

### 完善交互体验

- **双主题切换**：浅色 / 深色双主题，localStorage 记忆偏好
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

### 质感 UI 设计

- **克制配色**：Indigo 主色 + Amber 强调色，OKLCH 色彩空间，避免紫色渐变 AI 味
- **层次布局**：主页 Hero + Stats + Categories + Radar + Quick 多段式结构，避免单一流式滚动
- **分栏式口诀**：左侧索引 + 右侧详情，Notion 风格编辑式排版，避免卡片堆砌
- **列表式分类**：表格化布局，含练习进度条，避免卡片堆砌
- **细腻动效**：卡片悬浮微动效、视图进入动画、解析折叠展开、按钮态切换、Toast 入场退场
- **毛玻璃导航**：`backdrop-filter: blur(16px) saturate(180%)` 滚动时增强
- **响应式布局**：5 档断点适配桌面、平板、移动端，移动端独立抽屉式目录
- **无障碍**：`prefers-reduced-motion` 减弱动画、`prefers-color-scheme` 自动主题、WAI-ARIA 语义标记、键盘焦点可见、Modal 焦点陷阱与 aria-labelledby

### 构成主义背景装饰系统

受俄国构成主义、包豪斯与至上主义启发，为六个核心视图设计差异化背景装饰，通过图案 / 线条 / 曲线 / 光晕等元素丰富视觉层次，避免千篇一律。

**工程保障**：

- 所有装饰元素均使用 `aria-hidden="true"` 保证无障碍可访问性
- 768px 以下移动端隐藏重型装饰，仅保留轻量点缀
- `prefers-reduced-motion` 用户自动关闭动画
- 双主题（亮色 / 暗色）适配，暗色提亮以维持可见度

## 项目结构

```
KeMuONEXueKao/
├── src/
│   ├── components/                # 通用组件
│   │   ├── common/               # 基础组件（Modal、LazyImage、EmptyState、Skeleton）
│   │   ├── feedback/             # 反馈组件（ToastContainer、ConfirmProvider、GlobalLoading）
│   │   ├── layout/               # 布局组件（TopNav、GlobalFooter）
│   │   └── question/             # 题目组件（QuestionCard）
│   ├── views/                    # 视图层（HomeView、KnowledgeView、PracticeView、ExamView、MnemonicsView、CategoriesView）
│   ├── stores/                   # Zustand 状态管理（themeStore、progressStore、practiceStore、examStore、toastStore）
│   ├── services/                 # 服务层（dataLoader、storage、highlight）
│   ├── hooks/                    # 自定义 Hook（useHotkeys、useSwipe、useVibrate、useConfetti、useMediaQuery）
│   ├── data/                     # 数据层（questions.json、mnemonics.json、categories.json、categoryGroups.ts）
│   ├── styles/                   # 样式（tokens、base、layout、components、views、responsive、animations）
│   ├── types/                    # TypeScript 类型定义
│   ├── utils/                    # 纯函数工具（escapeHtml、shuffle、debounce、throttle、formatTime）
│   ├── App.tsx                   # 应用根组件（路由配置 + 全局布局 + Footer）
│   └── main.tsx                  # 应用入口（CSS 引入 + 根渲染）
├── public/
│   ├── docs/
│   │   └── knowledge.md          # 知识学习内容（Markdown）
│   └── images/
│       └── questions/            # 题目图片资源（1179 张，英文命名）
├── .github/
│   └── workflows/
│       └── deploy.yml            # GitHub Actions 自动部署工作流
├── index.html                    # HTML 模板
├── vite.config.ts                # Vite 配置（base 路径 + PWA 插件）
├── tsconfig.json                 # TypeScript 配置（严格模式）
├── package.json                  # 依赖与脚本
├── .gitignore                    # Git 忽略规则
└── README.md                     # 项目说明（本文件）
```

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
```

## 部署到 GitHub Pages

本项目已部署至 GitHub Pages，在线访问：<https://fanquanpp.github.io/KeMuONEXueKao/>

部署流程已通过 GitHub Actions 自动化（`.github/workflows/deploy.yml`）：

1. 推送代码至 `main` 分支
2. GitHub Actions 自动执行 `npm ci` + `npm run build`
3. 上传构建产物并部署至 GitHub Pages
4. 约 1-2 分钟生效

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

## 常见问题（FAQ）

### Q1：网页打开后内容未更新，还是旧版本？

A：GitHub Pages 部署后，浏览器可能仍使用 Service Worker 缓存的旧版本。可尝试以下方式：

1. **强制刷新**：`Ctrl + Shift + R`（Windows）/ `Cmd + Shift + R`（Mac）
2. **URL 加时间戳**：在地址后追加 `?v=时间戳`，例如 `https://fanquanpp.github.io/KeMuONEXueKao/?v=20260714`
3. **注销 Service Worker**：浏览器开发者工具 → Application → Service Workers → Unregister，然后刷新
4. **清除缓存**：浏览器开发者工具 → Application → Clear storage → Clear site data

### Q2：离线状态下能使用哪些功能？

A：首次访问并加载完成后，Service Worker 会缓存核心资源（HTML、CSS、JS、题库 JSON、图片），离线状态下可正常使用题库练习、模拟考试、知识学习、口诀总览、分类导航等全部功能。考试进度通过 sessionStorage 保存，切换标签或刷新不丢失。

### Q3：考试为什么是 90 分及格？

A：依据《机动车驾驶证申领和使用规定》，科目一考试满分 100 分，合格分数线为 90 分。本项目模拟考试严格遵循该标准：每题 1 分，90 分及格，超时自动交卷。

### Q4：题库数据是否与官方同步？

A：题库数据综合整理自公开渠道，本项目 **不保证 100% 准确性与时效性**。法规会随时间修订更新，考试内容以当地车管所官方公布为准。如发现题目错误或法规更新，欢迎通过 [GitHub Issues](https://github.com/fanquanpp/KeMuONEXueKao/issues) 反馈。

### Q5：如何在手机上安装为独立应用？

A：本项目支持 PWA 安装：

- **Android Chrome**：访问网页 → 浏览器菜单 → 添加到主屏幕
- **iOS Safari**：访问网页 → 分享按钮 → 添加到主屏幕
- **桌面 Chrome / Edge**：访问网页 → 地址栏右侧安装图标 → 安装

安装后以独立窗口显示（`display: standalone`），支持离线使用。

### Q6：双主题如何切换？会记住偏好吗？

A：点击导航栏右侧的主题切换按钮即可在浅色 / 深色主题间切换。首次访问自动跟随系统 `prefers-color-scheme` 偏好，切换后通过 localStorage 记忆，下次访问自动恢复。

### Q7：数据会被上传到服务器吗？

A：不会。所有学习进度、答题记录、收藏、主题偏好均存储在浏览器本地（localStorage / sessionStorage），不会上传到任何服务器。清除浏览器数据会清空这些记录。

### Q8：是否支持多选题练习？

A：支持。题库含 341 道多选题，练习模式下选满 2 项及以上可点击"确认答案"判定对错；考试模式下多选题需全部选对才得分，少选、多选、错选均不得分。

## 贡献指南

欢迎通过以下方式为本项目贡献力量：

### 反馈问题

- 提交 [GitHub Issue](https://github.com/fanquanpp/KeMuONEXueKao/issues) 描述问题、建议或需求
- 提交时请包含：问题描述、复现步骤、浏览器与系统版本、截图（如有）

### 内容纠错

- 题目解析错误 → 在 Issue 中注明题号与正确解析
- 法规更新 → 注明新法规名称与生效日期
- 口诀优化 → 注明原口诀与改进建议

### 代码贡献

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/your-feature`
3. 提交变更（遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范）：

   ```
   feat: 新增功能描述
   fix: 修复问题描述
   docs: 文档更新描述
   refactor: 重构描述
   style: 样式调整描述
   perf: 性能优化描述
   chore: 构建/工具变更描述
   ```

4. 推送分支：`git push origin feature/your-feature`
5. 提交 Pull Request，描述修改目的、范围与影响

### 开发规范

- TypeScript 严格模式，禁止使用 `any` / `unknown`
- 三层架构：UI 层 → Service 层 → Data 层，禁止跨层调用
- 业务逻辑全部位于 Service 层，utils 仅存放纯函数
- 所有函数配备中文注释，说明输入参数、返回值、核心流程
- 异步函数必须 try-catch 包裹，完善异常处理
- 禁止硬编码 Token、密钥等敏感信息
- 数据库操作使用参数化查询，禁止拼接 SQL

### 提交前校验

提交前必须通过以下三项校验：

```bash
npx tsc --noEmit     # 类型检查
npm run build        # 构建校验
```

## 更新日志

### v3.1.0

- 完整题库迁移：科目一 1861 题 + 科目四 1633 题，共 3494 题
- 知识学习重构：26 个一级分类 + 157 个结构化子考点，JSON 驱动渲染
- 719 个交通标志库，95 条速记口诀
- 工程化重构：三层架构落地，CSS 与视图拆分，自定义 Hooks 抽取
- 构成主义背景装饰系统：六视图差异化几何装饰
- PWA 离线支持：Service Worker Stale-While-Revalidate 缓存策略
- 双主题切换 + 自动跟随系统偏好
- 完整无障碍支持：WAI-ARIA、键盘焦点、Modal 焦点陷阱、`prefers-reduced-motion`

### v3.0.0

- 品牌统一为 KeMuONEXueKao，移除旧名称
- 全局页脚组件，含免责声明与版权信息
- GitHub 仓库链接按钮集成至导航栏

### v2.x

- 题库练习、模拟考试、知识学习、口诀总览、分类导航五大核心视图
- 关键词高亮、口诀常驻、解析折叠等学习辅助功能
- 雷达图正确率可视化、学习进度统计

## 致谢

本项目在开发过程中参考与借鉴了以下资源与社区，特此致谢：

### 技术栈

- [React](https://react.dev/) — UI 框架
- [Vite](https://vitejs.dev/) — 构建工具
- [TypeScript](https://www.typescriptlang.org/) — 类型系统
- [Zustand](https://github.com/pmndrs/zustand) — 状态管理
- [Framer Motion](https://www.framer.com/motion/) — 动画引擎
- [React Router](https://reactrouter.com/) — 路由管理
- [TanStack Virtual](https://tanstack.com/virtual) — 虚拟滚动
- [canvas-confetti](https://github.com/catdad/canvas-confetti) — 撒花特效
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) — PWA 插件

### 设计灵感

- 俄国构成主义（Constructivism）、包豪斯（Bauhaus）、至上主义（Suprematism）设计运动
- OKLCH 色彩空间与现代 CSS 设计令牌系统

### 数据来源

- 题库数据、图片资源、口诀内容综合整理自公开渠道，相关权利归原作者所有

## 关于（About）

**KeMuONEXueKao** 是一个非商业性质的开源学习辅助项目，旨在为机动车驾驶证科目一考生提供便捷的在线练习与知识学习工具。

### 项目定位

- **非官方**：本项目非任何政府机关或驾考机构官方产品，与公安部、交通运输部、车管所等官方组织无任何隶属或合作关系
- **非商业**：严禁将本项目用于任何商业用途，仅作为个人学习辅助工具
- **开源免费**：基于 MIT 协议开源，代码与功能完全免费使用

### 项目目标

1. **一站式学习**：整合题库练习、知识学习、速记口诀、模拟考试、分类导航于一体
2. **离线可用**：通过 PWA 技术，实现离线状态下完整可用，随时随地学习
3. **体验优先**：双主题、细腻动效、无障碍支持，追求质感 UI 与完善交互
4. **工程示范**：三层架构、TypeScript 严格模式、完整类型定义，作为前端工程实践参考

### 技术指标

| 指标 | 数值 |
|------|------|
| 题库规模 | 3494 题（科目一 1861 + 科目四 1633） |
| 知识体系 | 26 模块 / 157 子考点 / 719 交通标志 / 95 口诀 |
| 代码语言 | TypeScript 5.9（严格模式） |
| 框架版本 | React 19 + Vite 7 |
| 部署方式 | GitHub Pages + GitHub Actions 自动部署 |
| 离线支持 | PWA Service Worker 缓存 |
| 响应式断点 | 5 档（1024 / 768 / 480px + 横屏 + 大屏） |
| 无障碍 | WAI-ARIA + 键盘导航 + 焦点管理 |

### 联系方式

- **GitHub 仓库**：<https://github.com/fanquanpp/KeMuONEXueKao>
- **在线访问**：<https://fanquanpp.github.io/KeMuONEXueKao/>
- **问题反馈**：<https://github.com/fanquanpp/KeMuONEXueKao/issues>

## 免责声明

本项目 **KeMuONEXueKao** 仅供学习交流与技术研究的非商业用途，使用者需知悉并遵守以下条款：

1. **数据来源声明**：题库数据、图片资源、口诀内容均综合整理自公开渠道，相关权利归原作者所有，本项目不主张任何所有权。
2. **准确性提示**：法规会随时间修订更新，本网页内容 **不保证 100% 准确性与时效性**。考试内容以当地车管所官方公布为准。
3. **非官方性质**：本项目 **非任何政府机关或驾考机构官方产品**，与公安部、交通运输部、车管所等官方组织无任何隶属或合作关系，仅作为个人学习辅助工具。
4. **使用风险**：使用者因参考本网页内容而产生的任何直接或间接损失，项目维护者不承担任何法律责任。
5. **商业用途禁止**：严禁将本项目用于任何商业用途。如需商业使用，需另行取得相关权利方授权。
6. **内容撤回**：若本项目内容侵犯任何第三方合法权益，请通过 [GitHub Issues](https://github.com/fanquanpp/KeMuONEXueKao/issues) 联系，核实后将立即删除相关内容。

## License

本项目采用 [MIT License](https://opensource.org/licenses/MIT) 开源协议。

题库数据与图片资源版权归原作者所有，本项目仅用于学习交流目的。

---

**在线体验**：<https://fanquanpp.github.io/KeMuONEXueKao/>

**源代码**：<https://github.com/fanquanpp/KeMuONEXueKao>
