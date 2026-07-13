/* ===================================================================
   科目一教考 · 应用逻辑 v2
   - 六视图SPA：主页 / 知识学习 / 题库练习 / 模拟考试 / 口诀总览 / 分类导航
   - 1964题完整题库 + 119条口诀 + 6大分类(24小分类)
   - 大分类聚合小分类，题目可在多分类出现（多对多关系）
   - 关键词高亮(mark.kw) + 口诀常驻 + 解析独立折叠
   - 模拟考试(倒计时+答题卡+五五提示+评分+错题回顾)
   - PWA支持 + 双主题 + 自定义模态
   =================================================================== */
'use strict';

(function () {

  // ============ 全局错误处理 ============
  window.addEventListener('error', (e) => {
    console.error('全局错误:', e.message, e.filename, e.lineno);
  });

  // ============ 工具函数 ============
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /** 安全转义HTML，防止XSS */
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * 题目文本中关键词高亮
   * 规则：使用语义化 <mark class="kw"> 标签
   *   - danger（红）：违法/吊销/逃逸等危险词
   *   - num（蓝）：纯数字+单位
   *   - 默认（主色）：其余关键词
   * 输入：text 原文，keywords 关键词数组
   * 返回：高亮后的HTML字符串
   */
  function highlightKeywords(text, keywords) {
    if (!text) return '';
    let html = escapeHtml(text);
    if (!keywords || !keywords.length) return html;

    // 去重并按长度降序，避免短词覆盖长词
    const sorted = [...new Set(keywords)].filter(Boolean).sort((a, b) => b.length - a.length);
    // 危险词列表（红色高亮）
    const danger = ['饮酒', '醉酒', '酒驾', '醉驾', '肇事逃逸', '逃逸', '违法', '伪造', '变造', '吊销', '撤销', '暂扣', '注销'];
    // 数字+单位正则（蓝色高亮）
    const numRe = /^(\d+)\s*(km\/h|公里|米|分|元|年|日|天|次)?$/i;

    sorted.forEach(kw => {
      if (!kw) return;
      const cls = danger.includes(kw) ? 'danger' : (numRe.test(kw) ? 'num' : '');
      const clsAttr = cls ? ` class="kw ${cls}"` : ' class="kw"';
      // 转义正则特殊字符
      const safe = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // 避免在已包裹的标签内再次替换（使用否定先行）
      const re = new RegExp(`(${safe})(?![^<]*</mark>)`, 'g');
      html = html.replace(re, `<mark${clsAttr}>$1</mark>`);
    });
    return html;
  }

  /** Toast 提示（轻量、自动消失） */
  let toastTimer = null;
  function toast(msg, type = '') {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'toast show ' + type;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = 'toast ' + type; }, 2000);
  }

  /** localStorage 简易封装（带异常保护） */
  const Store = {
    get(key, def) {
      try {
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : def;
      } catch (e) { return def; }
    },
    set(key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
    },
    remove(key) {
      try { localStorage.removeItem(key); } catch (e) {}
    }
  };

  /** sessionStorage 封装（用于考试状态保持） */
  const SessionStore = {
    get(key, def) {
      try {
        const v = sessionStorage.getItem(key);
        return v ? JSON.parse(v) : def;
      } catch (e) { return def; }
    },
    set(key, val) {
      try { sessionStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
    },
    remove(key) {
      try { sessionStorage.removeItem(key); } catch (e) {}
    }
  };

  /**
   * hex 转 rgba
   * 支持 3 位短色值（如 '#abc' → '#aabbcc'）与 6 位标准色值
   * 非法输入返回 fallback rgba
   */
  function hexToRgba(hex, alpha = 1) {
    const fallback = `rgba(13, 148, 136, ${alpha})`;
    if (!hex) return fallback;
    let m = String(hex).replace(/^#/, '');
    if (/^[0-9a-fA-F]{3}$/.test(m)) {
      m = m.split('').map(c => c + c).join('');
    }
    if (!/^[0-9a-fA-F]{6}$/.test(m)) return fallback;
    const r = parseInt(m.substring(0, 2), 16);
    const g = parseInt(m.substring(2, 4), 16);
    const b = parseInt(m.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /** Fisher-Yates 随机洗牌 */
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ============ 大分类系统：大分类聚合多个小分类，题目可在多分类出现 ============
  /**
   * 大分类定义
   * 每个大分类包含 cats（引用CATEGORIES的key数组）和可选的 dynamic（动态匹配规则）
   * 图片题大分类通过 is_image_question 动态匹配，允许题目同时出现在图片题和其他分类中
   */
  const CATEGORY_GROUPS = {
    image: {
      name: '图片题',
      icon: 'image',
      color: '#0ea5e9',
      desc: '交通标志、道路标线、交警手势、仪表信号等图像题目',
      cats: ['sign', 'mark', 'police'],
      dynamic: 'image'
    },
    penalty: {
      name: '记分处罚',
      icon: 'star',
      color: '#ea580c',
      desc: '违法记分、罚款处罚、酒驾醉驾',
      cats: ['score', 'fine', 'drink']
    },
    scenario: {
      name: '驾驶情境',
      icon: 'road',
      color: '#14b8a6',
      desc: '高速公路、夜间、恶劣天气、紧急情况等场景题',
      cats: ['highway', 'night', 'weather', 'emergency', 'fault', 'accident']
    },
    rules: {
      name: '行车规则',
      icon: 'traffic',
      color: '#10b981',
      desc: '限速、灯光、让行、超车、停车等通行规则',
      cats: ['speed', 'lights', 'yield', 'overtake', 'park']
    },
    vehicle: {
      name: '车辆常识',
      icon: 'car',
      color: '#64748b',
      desc: '驾驶证、机动车基础、安全装置、安全行车、考试申领',
      cats: ['license', 'basic', 'install', 'safety', 'exam']
    },
    ev: {
      name: '新能源',
      icon: 'bolt',
      color: '#22c55e',
      desc: '新能源车辆与智能辅助驾驶',
      cats: ['newenergy', 'intelligent']
    }
  };

  /**
   * 获取大分类下所有题目ID集合
   * 输入：groupKey 大分类key
   * 返回：Set<number> 题目ID集合
   * 对于图片题大分类，额外包含所有 is_image_question=true 的题目
   */
  function getGroupQuestionIds(groupKey) {
    const group = CATEGORY_GROUPS[groupKey];
    if (!group) return new Set();
    const idSet = new Set();
    // 聚合所有小分类的ids
    (group.cats || []).forEach(catKey => {
      const cat = CATEGORIES[catKey];
      if (cat && cat.ids) {
        cat.ids.forEach(id => idSet.add(id));
      }
    });
    // 动态匹配：图片题
    if (group.dynamic === 'image') {
      QUESTIONS.forEach(q => {
        if (q.is_image_question) idSet.add(q.id);
      });
    }
    return idSet;
  }

  /**
   * 获取大分类的题目总数
   * 输入：groupKey 大分类key
   * 返回：number 题目数量
   */
  function getGroupCount(groupKey) {
    return getGroupQuestionIds(groupKey).size;
  }

  /**
   * 判断key是否为大分类key
   */
  function isGroupKey(key) {
    return Object.prototype.hasOwnProperty.call(CATEGORY_GROUPS, key);
  }

  /**
   * 获取分类显示名（兼容大分类和小分类）
   */
  function getCatDisplayName(cat) {
    if (cat === 'all') return '全部题目';
    if (isGroupKey(cat)) return CATEGORY_GROUPS[cat].name;
    if (CATEGORIES[cat]) return CATEGORIES[cat].name;
    return '分类';
  }

  // ============ 应用状态 ============
  const State = {
    view: 'home',                   // 当前视图 home/practice/exam/mnemonics/categories
    currentCat: 'all',              // 当前分类
    currentList: [],                // 当前题目列表（按分类筛选后）
    currentIdx: 0,                  // 当前题目在list中的索引
    answered: Store.get('kemu1_answered', {}),    // {qid: {selected, correct, viewed?}}
    bookmarks: Store.get('kemu1_bookmarks', {}),  // {qid: true}
    searchQuery: '',
    shuffle: false,
    theme: Store.get('kemu1_theme', null),        // light/dark/null(跟随系统)
    // 模拟考试状态
    exam: {
      active: false,                // 是否正在考试
      questions: [],                // 考试题目列表
      currentIdx: 0,                // 当前题号
      answers: {},                  // {idx: selected}
      marked: {},                   // {idx: true}
      hintsUsed: {},                // {idx: true} 已用提示
      hintRemoved: {},              // {idx: [被剔除的选项索引]}
      startTime: 0,                 // 开始时间戳
      endTime: 0,                   // 结束时间戳
      duration: 45 * 60 * 1000,     // 45分钟
      timerId: null                 // 计时器ID
    }
  };

  // ============ 主题切换 ============
  /**
   * 应用主题
   * @param {string} theme 'light' | 'dark'
   * 流程：临时启用全局颜色过渡类 → 切换 data-theme → 350ms 后移除过渡类
   * 这样可避免覆盖子元素自身的 transition，仅在切换瞬间统一过渡颜色
   */
  function applyTheme(theme) {
    State.theme = theme;
    const root = document.documentElement;
    // 启用全局过渡类（仅过渡颜色相关属性）
    root.classList.add('theme-transitioning');
    root.setAttribute('data-theme', theme);
    Store.set('kemu1_theme', theme);
    const btn = $('#theme-toggle');
    if (btn) btn.setAttribute('aria-label', theme === 'dark' ? '切换到浅色主题' : '切换到深色主题');
    // 过渡结束后移除全局过渡类
    setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 360);
  }

  /** 切换主题（用户主动切换则写入 localStorage） */
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    toast(next === 'dark' ? '已切换深色主题' : '已切换浅色主题');
  }

  // ============ 视图切换 ============
  const VALID_VIEWS = ['home', 'knowledge', 'practice', 'exam', 'mnemonics', 'categories'];

  /**
   * 切换视图
   * @param {string} name 视图名
   * 流程：清理旧视图动画类 → 激活新视图 → 触发入场动画 → 初始化视图数据
   */
  function switchView(name) {
    if (!VALID_VIEWS.includes(name)) return;
    if (State.view === name && $('#view-' + name)?.classList.contains('active')) {
      // 已在该视图：仅滚动到顶
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    State.view = name;

    // 清理所有视图的激活态与入场动画类
    $$('.view').forEach(v => {
      v.classList.remove('active', 'nf-rise-in');
      // 清除残留的动画类避免重渲染冲突
      void v.offsetWidth;
    });

    // 激活目标视图
    const target = $('#view-' + name);
    if (target) {
      target.classList.add('active', 'nf-rise-in');
    }

    // 导航链接激活态
    $$('.nav-link').forEach(l => {
      const isActive = l.dataset.view === name;
      l.classList.toggle('active', isActive);
      if (isActive) l.setAttribute('aria-current', 'page');
      else l.removeAttribute('aria-current');
    });

    // 滚动到顶
    window.scrollTo({ top: 0, behavior: 'auto' });

    // 视图初始化（各视图自管理渲染逻辑）
    if (name === 'home') {
      updateHomeStats();
      // 主页特性卡片重新触发交错入场
      $$('.feature-card').forEach((card, i) => {
        card.classList.remove('nf-rise-in');
        void card.offsetWidth;
        card.classList.add('nf-rise-in');
        card.style.animationDelay = `${0.05 + i * 0.07}s`;
      });
    }
    else if (name === 'practice') {
      if (!$('#category-list').children.length) renderSidebar();
    }
    else if (name === 'knowledge') renderKnowledge();
    else if (name === 'exam') updateExamStartPanel();
    else if (name === 'mnemonics') renderMnemonics();
    else if (name === 'categories') renderCategories();

    // 更新URL hash
    if (location.hash !== '#' + name) {
      history.replaceState(null, '', '#' + name);
    }
  }

  // ============ 主页 ============
  /** 主页初始化：渲染热门分类 + 统计 */
  function renderHome() {
    renderHotCats();
    updateHomeStats();
  }

  /**
   * 渲染主页热门分类（6 个大分类）
   * 点击任意大分类卡片进入对应练习
   */
  function renderHotCats() {
    const container = $('#home-hotcats');
    if (!container) return;
    const entries = Object.entries(CATEGORY_GROUPS)
      .filter(([gk, g]) => getGroupCount(gk) > 0)
      .sort((a, b) => getGroupCount(b[0]) - getGroupCount(a[0]));

    container.innerHTML = entries.map(([key, group], i) => {
      const count = getGroupCount(key);
      const colorBg = hexToRgba(group.color, 0.10);
      return `
        <article class="hotcat-card nf-card-sheen" data-cat="${key}" style="--cat-color:${group.color};--cat-color-bg:${colorBg};animation-delay:${i * 40}ms" tabindex="0" role="button" aria-label="进入${escapeHtml(group.name)}分类">
          <div class="hotcat-icon">
            <span class="hotcat-num">${String(i + 1).padStart(2, '0')}</span>
          </div>
          <h3 class="hotcat-name">${escapeHtml(group.name)}</h3>
          <div class="hotcat-count"><span class="num">${count}</span> 题</div>
          <div class="hotcat-arrow" aria-hidden="true">→</div>
        </article>
      `;
    }).join('');

    container.onclick = e => {
      const card = e.target.closest('.hotcat-card');
      if (!card) return;
      enterCategory(card.dataset.cat);
    };
    container.onkeydown = e => {
      if (e.key === 'Enter' || e.key === ' ') {
        const card = e.target.closest('.hotcat-card');
        if (card) { e.preventDefault(); enterCategory(card.dataset.cat); }
      }
    };
  }

  /**
   * 进入指定分类练习
   * @param {string} cat 分类key（支持 'all'、大分类key、小分类key）
   * 流程：记录分类 → 切换视图 → 同步侧栏激活态 → 加载题目列表
   */
  function enterCategory(cat) {
    State.currentCat = cat;
    switchView('practice');
    // 同步侧栏激活态：同时处理大分类项和小分类项
    $$('.cat-item, .cat-group-head').forEach(el => {
      el.classList.toggle('active', el.dataset.cat === cat);
    });
    // 若进入的是小分类，展开其所属大分类
    if (CATEGORIES[cat]) {
      const groupEntry = Object.entries(CATEGORY_GROUPS).find(([gk, g]) => (g.cats || []).includes(cat));
      if (groupEntry) {
        const groupEl = $(`.cat-group[data-group="${groupEntry[0]}"]`);
        if (groupEl) groupEl.classList.add('expanded');
      }
    }
    loadQuestionList();
    toast(`已切换至「${getCatDisplayName(cat)}」`);
  }

  /** 更新主页与导航的统计数据 */
  function updateHomeStats() {
    const total = QUESTIONS.length;
    const answeredCount = Object.keys(State.answered).length;
    const correctCount = Object.values(State.answered).filter(r => r.correct).length;
    const acc = answeredCount > 0 ? Math.round(correctCount / answeredCount * 100) + '%' : '—';

    // 主页统计
    const qEl = $('#home-stat-questions');
    if (qEl) qEl.textContent = total;
    const mEl = $('#home-stat-mnemonics');
    if (mEl) mEl.textContent = MNEMONICS.length;
    const cEl = $('#home-stat-categories');
    if (cEl) cEl.textContent = Object.keys(CATEGORY_GROUPS).length;
    const iEl = $('#home-stat-images');
    if (iEl) iEl.textContent = QUESTIONS.filter(q => q.image || q.is_image_question).length;

    // 主页进度
    const progressText = $('#home-progress-text');
    if (progressText) progressText.textContent = `${answeredCount} / ${total}`;
    const progressFill = $('#home-progress-fill');
    if (progressFill) progressFill.style.width = (total > 0 ? answeredCount / total * 100 : 0) + '%';
    const accuracy = $('#home-accuracy');
    if (accuracy) accuracy.textContent = acc;
    const practiced = $('#home-practiced');
    if (practiced) practiced.textContent = answeredCount;

    // 导航栏统计
    updateNavMeta();
  }

  // ============ 练习视图：分类侧栏（大分类+小分类层级） ============
  /**
   * 渲染分类侧栏
   * 结构：「全部」项 → 6个大分类组（可展开/折叠小分类）
   * 交互：点击大分类头部 → 进入该大分类练习；点击 chevron → 展开/折叠小分类列表
   */
  function renderSidebar() {
    const list = $('#category-list');
    const total = $('#sidebar-total');
    if (!list) return;
    const totalQ = QUESTIONS.length;
    if (total) total.textContent = `${Object.keys(CATEGORY_GROUPS).length} 大分类 / ${totalQ} 题`;

    list.innerHTML = '';

    // "全部" 项
    const allItem = document.createElement('div');
    allItem.className = 'cat-item' + (State.currentCat === 'all' ? ' active' : '');
    allItem.dataset.cat = 'all';
    allItem.setAttribute('role', 'option');
    allItem.tabIndex = 0;
    allItem.innerHTML = `
      <span class="cat-dot" style="background:var(--accent)"></span>
      <span class="cat-name">全部题目</span>
      <span class="cat-count">${totalQ}</span>
    `;
    list.appendChild(allItem);

    // 6 个大分类组
    Object.entries(CATEGORY_GROUPS).forEach(([gKey, group]) => {
      const groupCount = getGroupCount(gKey);
      if (groupCount === 0) return;
      const isActive = State.currentCat === gKey;
      // 判断是否需要默认展开（当前选中的小分类属于该组）
      const childActive = group.cats.some(c => c === State.currentCat);
      const expanded = isActive || childActive;

      const groupEl = document.createElement('div');
      groupEl.className = 'cat-group' + (expanded ? ' expanded' : '');
      groupEl.dataset.group = gKey;
      groupEl.style.setProperty('--group-color', group.color);

      // 大分类头部（点击进入大分类练习）
      const head = document.createElement('div');
      head.className = 'cat-group-head' + (isActive ? ' active' : '');
      head.dataset.cat = gKey;
      head.setAttribute('role', 'option');
      head.tabIndex = 0;
      head.innerHTML = `
        <span class="cat-chevron" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>
        </span>
        <span class="cat-dot" style="background:${group.color}"></span>
        <span class="cat-name">${escapeHtml(group.name)}</span>
        <span class="cat-count">${groupCount}</span>
      `;
      groupEl.appendChild(head);

      // 小分类列表（可折叠）
      const body = document.createElement('div');
      body.className = 'cat-group-body';
      group.cats.forEach(cKey => {
        const cat = CATEGORIES[cKey];
        if (!cat || cat.count === 0) return;
        const subActive = State.currentCat === cKey;
        const sub = document.createElement('div');
        sub.className = 'cat-item cat-sub' + (subActive ? ' active' : '');
        sub.dataset.cat = cKey;
        sub.setAttribute('role', 'option');
        sub.tabIndex = 0;
        sub.innerHTML = `
          <span class="cat-dot" style="background:${cat.color}"></span>
          <span class="cat-name">${escapeHtml(cat.name)}</span>
          <span class="cat-count">${cat.count}</span>
        `;
        body.appendChild(sub);
      });
      groupEl.appendChild(body);
      list.appendChild(groupEl);
    });

    // 事件绑定（仅一次）
    if (list.dataset.bound === '1') return;
    list.addEventListener('click', e => {
      // 优先处理 chevron 展开/折叠
      const chevron = e.target.closest('.cat-chevron');
      if (chevron) {
        const groupEl = chevron.closest('.cat-group');
        if (groupEl) {
          groupEl.classList.toggle('expanded');
          e.stopPropagation();
          return;
        }
      }
      // 处理分类项点击（大分类头部 + 小分类项 + 全部）
      const item = e.target.closest('.cat-item, .cat-group-head');
      if (!item) return;
      const cat = item.dataset.cat;
      if (!cat || cat === State.currentCat) {
        // 相同分类但点击的是 head：切换展开态
        if (item.classList.contains('cat-group-head')) {
          const groupEl = item.closest('.cat-group');
          if (groupEl) groupEl.classList.toggle('expanded');
        }
        return;
      }
      State.currentCat = cat;
      $$('.cat-item, .cat-group-head').forEach(c => c.classList.toggle('active', c.dataset.cat === State.currentCat));
      // 若选中小分类，自动展开其所属大分类
      if (CATEGORIES[cat]) {
        const groupEntry = Object.entries(CATEGORY_GROUPS).find(([gk, g]) => (g.cats || []).includes(cat));
        if (groupEntry) {
          const ge = $(`.cat-group[data-group="${groupEntry[0]}"]`);
          if (ge) ge.classList.add('expanded');
        }
      }
      loadQuestionList();
      toast(`已切换至「${getCatDisplayName(cat)}」`);
    });
    list.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        const item = e.target.closest('.cat-item, .cat-group-head');
        if (item) { e.preventDefault(); item.click(); }
      }
    });
    list.dataset.bound = '1';
  }

  // ============ 练习视图：题目加载与渲染 ============
  /**
   * 按分类/搜索/乱序加载题目列表
   * 支持三种分类模式：all（全部）、大分类key（聚合多小分类）、小分类key（单分类）
   */
  function loadQuestionList() {
    let list;
    if (State.currentCat === 'all') {
      list = QUESTIONS.slice();
    } else if (isGroupKey(State.currentCat)) {
      // 大分类：聚合旗下所有小分类的题目（含动态匹配）
      const idSet = getGroupQuestionIds(State.currentCat);
      list = QUESTIONS.filter(q => idSet.has(q.id));
    } else {
      // 小分类：直接按 ids 过滤
      const ids = CATEGORIES[State.currentCat]?.ids || [];
      const idSet = new Set(ids);
      list = QUESTIONS.filter(q => idSet.has(q.id));
    }
    // 搜索过滤
    if (State.searchQuery.trim()) {
      const q = State.searchQuery.trim().toLowerCase();
      list = list.filter(item =>
        (item.question || '').toLowerCase().includes(q) ||
        (item.analysis || '').toLowerCase().includes(q) ||
        (item.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }
    // 乱序
    if (State.shuffle) {
      list = shuffle(list);
    }
    State.currentList = list;
    State.currentIdx = 0;
    renderQuestion();
    updateNavMeta();
    updateHomeStats();
  }

  /** 渲染当前题目 */
  function renderQuestion() {
    const list = State.currentList;
    const total = list.length;
    if (total === 0) {
      $('#q-text').innerHTML = '<span style="color:var(--text-3)">未找到匹配题目，请尝试其他关键词或分类。</span>';
      $('#q-options').innerHTML = '';
      $('#q-tags').innerHTML = '';
      $('#q-chapter').textContent = '';
      $('#q-image-wrap').style.display = 'none';
      $('#q-guide').style.display = 'none';
      $('#q-result').style.display = 'none';
      // 清空口诀常驻区
      const mnemonicInlineEmpty = $('#q-mnemonic-inline');
      const mnemonicContentEmpty = $('#mnemonic-inline-content');
      if (mnemonicInlineEmpty) mnemonicInlineEmpty.style.display = 'none';
      if (mnemonicContentEmpty) mnemonicContentEmpty.innerHTML = '';
      $('#practice-index').textContent = '0';
      $('#practice-total').textContent = '0';
      $('#progress-fill').style.width = '0%';
      return;
    }

    const idx = Math.max(0, Math.min(State.currentIdx, total - 1));
    State.currentIdx = idx;
    const q = list[idx];

    // 头部
    $('#practice-index').textContent = idx + 1;
    $('#practice-total').textContent = total;
    const catName = getCatDisplayName(State.currentCat);
    $('#practice-cat-tag').textContent = catName;

    // 进度条
    const pct = total > 0 ? ((idx + 1) / total * 100) : 0;
    $('#progress-fill').style.width = pct + '%';
    const progressTrack = $('#progress-track-el');
    if (progressTrack) progressTrack.setAttribute('aria-valuenow', Math.round(pct));

    // 题型/章节/标签
    const qtype = q.type === 'judge' ? '判断题' : '单选题';
    const typeEl = $('#q-type');
    typeEl.textContent = qtype;
    typeEl.className = 'q-type' + (q.type === 'judge' ? ' judge' : '');
    $('#q-chapter').textContent = q.chapter_name || '';

    // 标签
    const tagsEl = $('#q-tags');
    tagsEl.innerHTML = '';
    (q.tags || []).forEach(t => {
      if (!CATEGORIES[t]) return;
      const span = document.createElement('span');
      span.className = 'q-tag';
      span.style.borderColor = hexToRgba(CATEGORIES[t].color, 0.4);
      span.style.color = CATEGORIES[t].color;
      span.textContent = CATEGORIES[t].name;
      tagsEl.appendChild(span);
    });

    // 题干（关键词高亮）
    const kwList = q.keywords || [];
    $('#q-text').innerHTML = highlightKeywords(q.question, kwList);

    // 图像题处理
    const imgWrap = $('#q-image-wrap');
    imgWrap.className = 'q-image-wrap';
    if (q.image) {
      imgWrap.style.display = 'block';
      imgWrap.innerHTML = '';
      const imgEl = document.createElement('img');
      imgEl.className = 'q-image';
      imgEl.src = q.image;
      imgEl.alt = '题目图片';
      imgEl.loading = 'lazy';
      imgEl.addEventListener('error', () => {
        imgWrap.innerHTML = '[ 图片加载失败 ]';
        imgWrap.classList.add('q-image-placeholder');
      });
      imgWrap.appendChild(imgEl);
    } else if (q.is_image_question) {
      imgWrap.style.display = 'block';
      imgWrap.classList.add('q-image-placeholder');
      imgWrap.innerHTML = '<div class="placeholder-icon" aria-hidden="true">[ ]</div><div>图像题 · 图片暂缺</div><div class="placeholder-hint">请根据题目文字描述和选项作答</div>';
    } else {
      imgWrap.style.display = 'none';
    }

    // 选项渲染
    const optsEl = $('#q-options');
    optsEl.innerHTML = '';
    optsEl.className = 'q-options' + (q.type === 'judge' ? ' judge' : '');

    const record = State.answered[q.id];
    const answered = !!record;

    if (q.type === 'judge') {
      ['错误', '正确'].forEach((label, i) => {
        const val = i === 1;
        const item = document.createElement('div');
        item.className = 'opt-item';
        item.setAttribute('role', 'radio');
        item.setAttribute('tabindex', '0');
        if (answered) {
          item.classList.add('disabled');
          if (val === q.answer) item.classList.add('correct');
          else if (val === record.selected) item.classList.add('wrong');
        }
        item.innerHTML = `
          <span class="opt-letter">${val ? '√' : '×'}</span>
          <span class="opt-text">${escapeHtml(label)}</span>
        `;
        item.addEventListener('click', () => onAnswer(q, val, item));
        item.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.click(); }
        });
        optsEl.appendChild(item);
      });
    } else {
      const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
      (q.options || []).forEach((opt, i) => {
        const item = document.createElement('div');
        item.className = 'opt-item';
        item.setAttribute('role', 'radio');
        item.setAttribute('tabindex', '0');
        if (answered) {
          item.classList.add('disabled');
          if (i === q.answer) item.classList.add('correct');
          else if (i === record.selected) item.classList.add('wrong');
        }
        item.innerHTML = `
          <span class="opt-letter">${letters[i] || (i + 1)}</span>
          <span class="opt-text">${highlightKeywords(opt, kwList)}</span>
        `;
        item.addEventListener('click', () => onAnswer(q, i, item));
        item.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.click(); }
        });
        optsEl.appendChild(item);
      });
    }

    // 口诀常驻区：不论是否答题均立即渲染（永远显示，不隐藏）
    renderResidentMnemonic(q);

    // 引导区与结果区显示控制
    const guideEl = $('#q-guide');
    const resultEl = $('#q-result');
    const bookmarkBtn = $('#btn-bookmark');

    if (answered) {
      if (guideEl) guideEl.style.display = 'none';
      showResult(q, record);
    } else {
      if (guideEl) guideEl.style.display = 'flex';
      if (resultEl) resultEl.style.display = 'none';
      // 重置解析折叠状态
      resetAnalysisToggle();
    }

    // 收藏按钮状态
    if (bookmarkBtn) {
      bookmarkBtn.classList.toggle('active', !!State.bookmarks[q.id]);
      bookmarkBtn.setAttribute('aria-pressed', !!State.bookmarks[q.id]);
    }

    // 卡片进入动画
    const card = $('#question-card');
    if (card) {
      card.classList.remove('active');
      void card.offsetWidth;
      card.classList.add('active');
    }

    // 更新跳转输入框max
    const jumpInput = $('#jump-input');
    if (jumpInput) jumpInput.max = total;
  }

  // ============ 答题处理 ============
  /** 用户答题 */
  function onAnswer(q, selected, itemEl) {
    if (State.answered[q.id]) return; // 已答过不可改
    const correct = selected === q.answer;
    State.answered[q.id] = { selected, correct };
    Store.set('kemu1_answered', State.answered);

    // 标记选项
    const optsEl = $('#q-options');
    $$('.opt-item', optsEl).forEach(el => {
      el.classList.add('disabled');
      el.setAttribute('aria-disabled', 'true');
    });

    if (q.type === 'judge') {
      $$('.opt-item', optsEl).forEach((el, i) => {
        const val = i === 1;
        if (val === q.answer) el.classList.add('correct');
        else if (val === selected) el.classList.add('wrong');
      });
    } else {
      $$('.opt-item', optsEl).forEach((el, i) => {
        if (i === q.answer) el.classList.add('correct');
        else if (i === selected) el.classList.add('wrong');
      });
    }

    // 隐藏引导区，显示结果区
    $('#q-guide').style.display = 'none';
    showResult(q, { selected, correct });
    updateNavMeta();
    updateHomeStats();

    // 答题反馈动画
    const cardEl = $('.question-card');
    if (cardEl) {
      cardEl.classList.remove('correct-answer', 'wrong-answer');
      void cardEl.offsetWidth; // 触发重排以重置动画
      cardEl.classList.add(correct ? 'correct-answer' : 'wrong-answer');
    }

    toast(correct ? '回答正确' : '回答错误', correct ? 'success' : 'error');
  }

  /** 直接查看答案（引导型：不答题直接查看） */
  function showAnswerDirectly() {
    const list = State.currentList;
    if (!list.length) return;
    const q = list[State.currentIdx];
    if (State.answered[q.id]) return;

    State.answered[q.id] = { selected: -1, correct: false, viewed: true };
    Store.set('kemu1_answered', State.answered);

    // 标记正确答案
    const optsEl = $('#q-options');
    $$('.opt-item', optsEl).forEach(el => {
      el.classList.add('disabled');
      el.setAttribute('aria-disabled', 'true');
    });
    if (q.type === 'judge') {
      $$('.opt-item', optsEl).forEach((el, i) => {
        const val = i === 1;
        if (val === q.answer) el.classList.add('correct');
      });
    } else {
      $$('.opt-item', optsEl).forEach((el, i) => {
        if (i === q.answer) el.classList.add('correct');
      });
    }

    $('#q-guide').style.display = 'none';
    showResult(q, { selected: -1, correct: false, viewed: true });
    updateNavMeta();
    updateHomeStats();
    toast('已显示答案', 'info');
  }

  /**
   * 显示答题结果
   * - 仅渲染状态条（正确/错误/查看答案）
   * - 口诀常驻区已在 renderQuestion 中渲染，此处不再处理
   * - 解析折叠区仅在 showResult 时填充内容（默认折叠）
   */
  function showResult(q, record) {
    const resultEl = $('#q-result');
    const statusBar = $('#q-status-bar');
    const statusIcon = $('#status-icon');
    const statusText = $('#status-text');
    const statusAnswer = $('#status-answer');

    resultEl.style.display = 'block';

    // 状态条内容
    const correctText = q.type === 'judge'
      ? (q.answer ? '正确' : '错误')
      : ['A', 'B', 'C', 'D', 'E', 'F'][q.answer] + ' · ' + (q.options?.[q.answer] || '');

    if (record.viewed) {
      statusBar.className = 'q-status-bar wrong';
      statusIcon.textContent = '?';
      statusText.textContent = '查看答案';
      statusAnswer.textContent = '正确答案：' + correctText;
    } else if (record.correct) {
      statusBar.className = 'q-status-bar correct';
      statusIcon.textContent = '✓';
      statusText.textContent = '回答正确';
      statusAnswer.textContent = '正确答案：' + correctText;
    } else {
      statusBar.className = 'q-status-bar wrong';
      statusIcon.textContent = '✗';
      statusText.textContent = '回答错误';
      statusAnswer.textContent = '正确答案：' + correctText;
    }

    // 解析独立折叠区（默认折叠）
    const analysisText = $('#analysis-text');
    if (q.analysis) {
      analysisText.innerHTML = highlightKeywords(q.analysis, q.keywords || []);
    } else {
      analysisText.innerHTML = '<span class="hint-empty">暂无解析</span>';
    }
    // 确保解析默认折叠
    resetAnalysisToggle();
  }

  /**
   * 渲染口诀常驻区（永远显示，不隐藏）
   * - 不论是否答题，均在 renderQuestion 时立即渲染
   * - 有关联名口诀：显示首条 + 额外数量徽标
   * - 无关联口诀：显示"本题暂无关联口诀"占位（仍保持显示，不隐藏）
   */
  function renderResidentMnemonic(q) {
    const mnemonicInline = $('#q-mnemonic-inline');
    const mnemonicContent = $('#mnemonic-inline-content');
    if (!mnemonicInline || !mnemonicContent) return;

    const relatedMnemonics = findRelatedMnemonics(q);
    if (relatedMnemonics.length) {
      const firstMnemonic = relatedMnemonics[0];
      const extraCount = relatedMnemonics.length - 1;
      mnemonicContent.innerHTML = `
        <div class="mnemonic-quick">
          <span class="mnemonic-quick-text">${escapeHtml(firstMnemonic.text)}</span>
          ${extraCount > 0 ? `<span class="mnemonic-quick-more" title="共${relatedMnemonics.length}条相关口诀">+${extraCount}</span>` : ''}
        </div>
      `;
    } else {
      // 无关联口诀时仍保持常驻显示，展示占位提示
      mnemonicContent.innerHTML = `
        <div class="mnemonic-quick mnemonic-quick-empty">
          <span class="mnemonic-quick-text" style="color:var(--text-mute)">本题暂无关联口诀</span>
        </div>
      `;
    }
    mnemonicInline.style.display = 'flex';
  }

  /** 重置解析折叠状态为收起 */
  function resetAnalysisToggle() {
    const toggle = $('#analysis-toggle');
    const panel = $('#analysis-panel');
    if (!toggle || !panel) return;
    toggle.setAttribute('aria-expanded', 'false');
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    const textEl = toggle.querySelector('.analysis-toggle-text');
    if (textEl) textEl.textContent = '查看解析';
  }

  /** 切换解析展开/折叠 */
  function toggleAnalysis() {
    const toggle = $('#analysis-toggle');
    const panel = $('#analysis-panel');
    if (!toggle || !panel) return;
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    panel.classList.toggle('open', !expanded);
    panel.setAttribute('aria-hidden', String(expanded));
    const textEl = toggle.querySelector('.analysis-toggle-text');
    if (textEl) textEl.textContent = expanded ? '查看解析' : '收起解析';
  }

  /** 收藏/取消收藏 */
  function toggleBookmark() {
    const list = State.currentList;
    if (!list.length) return;
    const q = list[State.currentIdx];
    const isBookmarked = !!State.bookmarks[q.id];
    if (isBookmarked) {
      delete State.bookmarks[q.id];
    } else {
      State.bookmarks[q.id] = true;
    }
    Store.set('kemu1_bookmarks', State.bookmarks);
    const btn = $('#btn-bookmark');
    if (btn) {
      btn.classList.toggle('active', !isBookmarked);
      btn.setAttribute('aria-pressed', String(!isBookmarked));
    }
    toast(isBookmarked ? '已取消收藏' : '已收藏题目', 'info');
  }

  /** 根据题目tags查找相关口诀 */
  function findRelatedMnemonics(q) {
    const tags = q.tags || [];
    return MNEMONICS.filter(m => tags.includes(m.cat));
  }

  // ============ 导航元信息更新 ============
  function updateNavMeta() {
    const total = QUESTIONS.length;
    const answeredCount = Object.keys(State.answered).length;
    const correctCount = Object.values(State.answered).filter(r => r.correct).length;
    const navProg = $('#nav-progress');
    if (navProg) navProg.textContent = answeredCount;
    const navTotal = $('#nav-stat-total');
    if (navTotal) navTotal.textContent = total;
    const acc = answeredCount > 0 ? Math.round(correctCount / answeredCount * 100) + '%' : '—';
    const navAcc = $('#nav-accuracy');
    if (navAcc) navAcc.textContent = acc;
  }

  // ============ 口诀总览（分栏式：左侧索引 + 右侧详情） ============
  let mnemonicsFilter = 'all';
  let mnemonicsSearch = '';

  /** 渲染口诀总览 */
  function renderMnemonics() {
    renderMnemonicsAside();
    renderMnemonicList();
    updateMnemonicsBreadcrumb();
  }

  /** 渲染左侧分类索引 */
  function renderMnemonicsAside() {
    const listEl = $('#mnemonics-aside-list');
    const countEl = $('#mnemonics-aside-count');
    if (!listEl) return;

    // 统计每分类口诀数
    const counts = {};
    MNEMONICS.forEach(m => { counts[m.cat] = (counts[m.cat] || 0) + 1; });

    countEl.textContent = `${MNEMONICS.length} 条`;

    const items = [];
    // 全部
    items.push(`
      <div class="aside-item${mnemonicsFilter === 'all' ? ' active' : ''}" data-cat="all" role="listitem" tabindex="0">
        <span class="aside-item-name">全部口诀</span>
        <span class="aside-item-count">${MNEMONICS.length}</span>
      </div>
    `);
    // 各分类
    Object.entries(CATEGORIES).forEach(([key, meta]) => {
      if (!counts[key]) return;
      items.push(`
        <div class="aside-item${mnemonicsFilter === key ? ' active' : ''}" data-cat="${key}" role="listitem" tabindex="0">
          <span class="aside-item-dot" style="background:${meta.color}" aria-hidden="true"></span>
          <span class="aside-item-name">${escapeHtml(meta.name)}</span>
          <span class="aside-item-count">${counts[key]}</span>
        </div>
      `);
    });

    listEl.innerHTML = items.join('');

    // 点击事件
    listEl.onclick = e => {
      const item = e.target.closest('.aside-item');
      if (!item) return;
      mnemonicsFilter = item.dataset.cat;
      $$('.aside-item', listEl).forEach(el => el.classList.toggle('active', el.dataset.cat === mnemonicsFilter));
      renderMnemonicList();
      updateMnemonicsBreadcrumb();
    };
    listEl.onkeydown = e => {
      if (e.key === 'Enter' || e.key === ' ') {
        const item = e.target.closest('.aside-item');
        if (item) { e.preventDefault(); item.click(); }
      }
    };
  }

  /**
   * 渲染右侧口诀列表
   * 设计：双列网格（桌面）+ 紧凑条目 + 点击展开详情，避免长卷轴
   * 去AI味：无衬线体、无border-left引用块、无fadeUp堆砌
   */
  function renderMnemonicList() {
    const listEl = $('#mnemonics-list');
    if (!listEl) return;

    let list = mnemonicsFilter === 'all'
      ? MNEMONICS.slice()
      : MNEMONICS.filter(m => m.cat === mnemonicsFilter);

    // 搜索过滤
    if (mnemonicsSearch.trim()) {
      const q = mnemonicsSearch.trim().toLowerCase();
      list = list.filter(m =>
        (m.title || '').toLowerCase().includes(q) ||
        (m.text || '').toLowerCase().includes(q) ||
        (m.explain || '').toLowerCase().includes(q)
      );
    }

    if (list.length === 0) {
      listEl.innerHTML = '<div class="empty-state">未找到匹配的口诀</div>';
      return;
    }

    // 紧凑双列网格，默认只展示标题+口诀文本，点击展开解释与详情
    // 添加 nf-rise-in 类 + 交错延迟实现入场动效（每项延迟 30ms，最多前 12 项）
    listEl.innerHTML = list.map((m, i) => {
      const meta = CATEGORIES[m.cat] || { name: m.cat, color: '#f59e0b' };
      const hasDetail = !!(m.explain || (m.details || []).length);
      const delay = i < 12 ? ` style="--item-color:${meta.color};animation-delay:${i * 30}ms"` : ` style="--item-color:${meta.color}"`;
      return `
        <article class="mn-item nf-rise-in"${delay} data-idx="${i}">
          <div class="mn-item-head">
            <span class="mn-item-num">${String(i + 1).padStart(2, '0')}</span>
            <span class="mn-item-cat">${escapeHtml(meta.name)}</span>
          </div>
          <h3 class="mn-item-title">${escapeHtml(m.title)}</h3>
          <p class="mn-item-text">${escapeHtml(m.text)}</p>
          ${hasDetail ? `
          <button class="mn-item-toggle" type="button" aria-expanded="false">
            <span class="toggle-text">展开详情</span>
            <svg class="toggle-chevron" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="mn-item-detail" hidden>
            ${m.explain ? `<p class="mn-item-explain">${escapeHtml(m.explain)}</p>` : ''}
            ${(m.details || []).length ? `
            <ul class="mn-item-points">
              ${m.details.map(d => `<li>${escapeHtml(d)}</li>`).join('')}
            </ul>` : ''}
          </div>` : ''}
        </article>
      `;
    }).join('');

    // 折叠展开事件（事件委托）
    listEl.onclick = e => {
      const toggle = e.target.closest('.mn-item-toggle');
      if (!toggle) return;
      const item = toggle.closest('.mn-item');
      const detail = item && item.querySelector('.mn-item-detail');
      const textEl = toggle.querySelector('.toggle-text');
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      if (!detail) return;
      detail.hidden = expanded;
      toggle.setAttribute('aria-expanded', String(!expanded));
      if (textEl) textEl.textContent = expanded ? '展开详情' : '收起详情';
      toggle.classList.toggle('open', !expanded);
    };
  }

  /** 更新口诀总览面包屑 */
  function updateMnemonicsBreadcrumb() {
    const crumbCat = $('#mnemonics-crumb-cat');
    const crumbCount = $('#mnemonics-crumb-count');
    if (crumbCat) {
      crumbCat.textContent = mnemonicsFilter === 'all'
        ? '全部口诀'
        : (CATEGORIES[mnemonicsFilter]?.name || '全部口诀');
    }
    if (crumbCount) {
      let count;
      if (mnemonicsFilter === 'all') {
        count = MNEMONICS.length;
      } else {
        count = MNEMONICS.filter(m => m.cat === mnemonicsFilter).length;
      }
      crumbCount.textContent = `${count} 条`;
    }
  }

  // ============ 知识学习（系统化知识点教学） ============
  /** 知识学习视图状态 */
  const KnowledgeState = {
    chapters: [],       // 章节数据 [{id, title, text, el}]
    loaded: false,      // 是否已加载
    filter: '',          // 搜索关键词
    currentChapter: 0   // 当前所在章节索引（用于翻页器）
  };

  /**
   * 渲染知识学习视图
   * 流程：从全局 KNOWLEDGE_HTML 写入 DOM → 提取章节 → 渲染目录TOC + 章节导航卡片 + Hero统计 + 翻页器
   * 支持搜索过滤章节（通过 display:none 隐藏不匹配章节，保留 DOM 避免重复渲染）
   */
  function renderKnowledge() {
    const contentEl = $('#knowledge-content');
    const tocEl = $('#knowledge-toc');
    const countEl = $('#knowledge-count');
    if (!contentEl || !tocEl) return;

    // 首次进入：从全局 KNOWLEDGE_HTML 读取并写入 DOM
    if (!KnowledgeState.loaded) {
      const html = (typeof window !== 'undefined' && window.KNOWLEDGE_HTML) ? window.KNOWLEDGE_HTML : '';
      if (!html) {
        contentEl.innerHTML = '<div class="empty-state">知识点加载失败：KNOWLEDGE_HTML 未定义<br>请检查 js/knowledge.js 是否正确加载。</div>';
        return;
      }
      contentEl.innerHTML = html;
      // 从 DOM 中提取章节信息（用于目录、搜索、滚动监听）
      const sectionEls = $$('.know-chapter', contentEl);
      KnowledgeState.chapters = sectionEls.map(sec => ({
        id: sec.id || '',
        title: (sec.querySelector('h2') || { textContent: '' }).textContent.trim(),
        text: sec.textContent.trim(),
        el: sec
      }));
      KnowledgeState.loaded = true;
      // 添加交错入场动画
      sectionEls.forEach((el, i) => {
        el.classList.add('nf-rise-in');
        el.style.animationDelay = Math.min(i * 50, 400) + 'ms';
      });

      // 更新 Hero 统计：章节数 + 口诀总数
      const statChapters = $('#kstat-chapters');
      const statMnemonics = $('#kstat-mnemonics');
      if (statChapters) statChapters.textContent = KnowledgeState.chapters.length;
      if (statMnemonics) {
        const mCount = (typeof MNEMONICS !== 'undefined') ? MNEMONICS.length : 0;
        statMnemonics.textContent = mCount;
      }

      // 渲染顶部章节快速导航卡片（横向滚动）
      renderKnowledgeChapterNav();

      // 绑定翻页器事件（仅绑定一次）
      bindKnowledgePager();

      // 绑定顶部阅读进度条监听（仅绑定一次）
      bindReadingProgress();
    }

    const chapters = KnowledgeState.chapters;
    if (!chapters.length) {
      if (countEl) countEl.textContent = '0 章';
      return;
    }

    // 更新章节计数
    if (countEl) countEl.textContent = chapters.length + ' 章';

    // 搜索过滤：切换章节可见性（保留 DOM，仅切换 display）
    const q = KnowledgeState.filter.trim().toLowerCase();
    const filtered = q
      ? chapters.filter(c =>
          c.title.toLowerCase().includes(q) || c.text.toLowerCase().includes(q)
        )
      : chapters;

    chapters.forEach(c => {
      if (c.el) c.el.style.display = filtered.includes(c) ? '' : 'none';
    });

    // 渲染左侧目录TOC
    tocEl.innerHTML = filtered.map((c, i) => `
      <a class="knowledge-toc-item" href="#${c.id}" data-target="${c.id}" role="listitem">
        <span class="knowledge-toc-num">${String(i + 1).padStart(2, '0')}</span>
        <span class="knowledge-toc-title">${escapeHtml(c.title)}</span>
      </a>
    `).join('');

    // 目录点击：平滑滚动到对应章节
    tocEl.onclick = e => {
      const item = e.target.closest('.knowledge-toc-item');
      if (!item) return;
      e.preventDefault();
      const target = document.getElementById(item.dataset.target);
      if (target) {
        const navH = 56;
        const top = target.getBoundingClientRect().top + window.scrollY - navH - 12;
        window.scrollTo({ top, behavior: 'smooth' });
        // 高亮当前目录项
        $$('.knowledge-toc-item', tocEl).forEach(el => el.classList.remove('active'));
        item.classList.add('active');
      }
    };

    // 空结果提示
    if (!filtered.length) {
      const hint = document.createElement('div');
      hint.className = 'empty-state';
      hint.textContent = '未找到匹配的知识点';
      // 仅在内容区末尾追加提示，不破坏已有 DOM
      const existing = contentEl.querySelector('.empty-state');
      if (!existing) contentEl.appendChild(hint);
      return;
    }

    // 滚动监听：高亮当前可见章节的目录项 + 同步翻页器与导航卡片（仅绑定一次）
    if (!KnowledgeState._scrollBound) {
      KnowledgeState._scrollBound = true;
      let scrollTimer = null;
      window.addEventListener('scroll', () => {
        if (State.view !== 'knowledge') return;
        if (scrollTimer) clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
          const navH = 56 + 20;
          let activeId = null;
          let activeIdx = -1;
          // 遍历当前可见的章节，找出视口内的首个
          for (let i = 0; i < KnowledgeState.chapters.length; i++) {
            const c = KnowledgeState.chapters[i];
            if (!c.el || c.el.style.display === 'none') continue;
            const rect = c.el.getBoundingClientRect();
            if (rect.top <= navH && rect.bottom > navH) {
              activeId = c.id;
              activeIdx = i;
              break;
            }
          }
          if (activeId) {
            $$('.knowledge-toc-item', tocEl).forEach(el => {
              el.classList.toggle('active', el.dataset.target === activeId);
            });
            // 同步章节导航卡片高亮
            $$('.kchap-card').forEach(el => {
              el.classList.toggle('active', el.dataset.target === activeId);
            });
            // 同步翻页器信息
            if (activeIdx >= 0) {
              KnowledgeState.currentChapter = activeIdx;
              updateKnowledgePager();
            }
          }
        }, 80);
      }, { passive: true });
    }
  }

  /**
   * 渲染顶部章节快速导航卡片（横向滚动条）
   */
  function renderKnowledgeChapterNav() {
    const navEl = $('#knowledge-chapter-nav');
    if (!navEl) return;
    const chapters = KnowledgeState.chapters;
    if (!chapters.length) return;
    navEl.innerHTML = chapters.map((c, i) => `
      <a class="kchap-card${i === 0 ? ' active' : ''}" href="#${c.id}" data-target="${c.id}" role="tab" tabindex="0">
        <span class="kchap-num">${String(i + 1).padStart(2, '0')}</span>
        <span class="kchap-title">${escapeHtml(c.title.replace(/^[一二三四五六七八九十]+、/, ''))}</span>
      </a>
    `).join('');
    // 点击卡片：平滑滚动到对应章节
    navEl.onclick = e => {
      const card = e.target.closest('.kchap-card');
      if (!card) return;
      e.preventDefault();
      const target = document.getElementById(card.dataset.target);
      if (target) {
        const navH = 56;
        const top = target.getBoundingClientRect().top + window.scrollY - navH - 12;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    };
  }

  /**
   * 绑定底部章节翻页器事件
   */
  function bindKnowledgePager() {
    const prevBtn = $('#know-prev');
    const nextBtn = $('#know-next');
    if (!prevBtn || !nextBtn) return;
    prevBtn.addEventListener('click', () => navigateKnowledgeChapter(-1));
    nextBtn.addEventListener('click', () => navigateKnowledgeChapter(1));
    updateKnowledgePager();
  }

  /**
   * 翻页导航：方向 -1 上一章 / +1 下一章
   */
  function navigateKnowledgeChapter(dir) {
    const chapters = KnowledgeState.chapters;
    if (!chapters.length) return;
    let idx = KnowledgeState.currentChapter + dir;
    idx = Math.max(0, Math.min(chapters.length - 1, idx));
    KnowledgeState.currentChapter = idx;
    const target = chapters[idx];
    if (target && target.el) {
      const navH = 56;
      const top = target.el.getBoundingClientRect().top + window.scrollY - navH - 12;
      window.scrollTo({ top, behavior: 'smooth' });
    }
    updateKnowledgePager();
  }

  /**
   * 更新翻页器显示状态（按钮禁用 + 当前章信息）
   */
  function updateKnowledgePager() {
    const prevBtn = $('#know-prev');
    const nextBtn = $('#know-next');
    const infoEl = $('#know-pager-info');
    const chapters = KnowledgeState.chapters;
    if (!chapters.length) return;
    const idx = KnowledgeState.currentChapter;
    if (prevBtn) prevBtn.disabled = (idx <= 0);
    if (nextBtn) nextBtn.disabled = (idx >= chapters.length - 1);
    if (infoEl) {
      const cur = chapters[idx];
      const title = cur ? cur.title.replace(/^[一二三四五六七八九十]+、/, '') : '';
      infoEl.innerHTML = `
        <span class="know-pager-info-current">第 ${idx + 1} / ${chapters.length} 章</span>
        <span class="know-pager-info-title">${escapeHtml(title)}</span>
      `;
    }
  }

  /**
   * 绑定顶部阅读进度条监听（基于知识内容区滚动比例）
   */
  function bindReadingProgress() {
    const fillEl = $('#reading-progress-fill');
    if (!fillEl) return;
    let scrollTimer = null;
    window.addEventListener('scroll', () => {
      if (State.view !== 'knowledge') return;
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        const doc = document.documentElement;
        const scrollTop = window.scrollY;
        const scrollHeight = doc.scrollHeight - doc.clientHeight;
        const pct = scrollHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100)) : 0;
        fillEl.style.width = pct + '%';
      }, 30);
    }, { passive: true });
  }

  // ============ 分类导航（大分类卡片 + 小分类芯片） ============
  /**
   * 渲染分类导航页
   * 设计：6 个大分类卡片（双列网格），每卡内嵌小分类芯片
   * 交互：点大分类卡片 → 进入大分类练习；点小分类芯片 → 进入该小分类练习
   * 题目可在多分类出现（多对多关系）
   */
  // 大分类图标 SVG 集
  const GROUP_ICONS = {
    image: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    penalty: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    scenario: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18M3 6h18M3 18h18"/><circle cx="6" cy="6" r="1" fill="currentColor"/><circle cx="18" cy="18" r="1" fill="currentColor"/></svg>',
    rules: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2" width="10" height="20" rx="2"/><line x1="12" y1="6" x2="12" y2="6"/><circle cx="12" cy="8" r="1.5" fill="currentColor"/><circle cx="12" cy="13" r="1.5" fill="currentColor"/><circle cx="12" cy="18" r="1.5" fill="currentColor"/></svg>',
    vehicle: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h14M5 17a2 2 0 1 1 0-4h14a2 2 0 1 1 0 4M7 13l1.5-5h7L17 13"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/></svg>',
    ev: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>'
  };

  function renderCategories() {
    const tableEl = $('#categories-table');
    if (!tableEl) return;

    const groups = Object.entries(CATEGORY_GROUPS).filter(([gk, g]) => getGroupCount(gk) > 0);

    tableEl.innerHTML = groups.map(([gKey, group], i) => {
      const totalCount = getGroupCount(gKey);
      // 统计该大分类下已答题数（去重，因为题目可能在多小分类出现）
      const idSet = getGroupQuestionIds(gKey);
      const answeredCount = Array.from(idSet).filter(id => State.answered[id]).length;
      const progressPct = totalCount > 0 ? Math.round(answeredCount / totalCount * 100) : 0;
      const delay = `${i * 60}ms`;

      // 小分类芯片
      const subs = group.cats
        .map(cKey => {
          const cat = CATEGORIES[cKey];
          if (!cat || cat.count === 0) return null;
          const subAnswered = (cat.ids || []).filter(id => State.answered[id]).length;
          return `<button class="catgrp-sub" data-cat="${cKey}" type="button" style="--sub-color:${cat.color}">
            <span class="catgrp-sub-dot"></span>
            <span class="catgrp-sub-name">${escapeHtml(cat.name)}</span>
            <span class="catgrp-sub-count">${cat.count}</span>
            <span class="catgrp-sub-done">${subAnswered}</span>
          </button>`;
        })
        .filter(Boolean)
        .join('');

      return `
        <article class="catgrp-card nf-rise-in" data-group="${gKey}" style="--group-color:${group.color};animation-delay:${delay}">
          <div class="catgrp-head" data-cat="${gKey}" role="button" tabindex="0" aria-label="进入${escapeHtml(group.name)}练习">
            <div class="catgrp-icon">${GROUP_ICONS[group.icon] || GROUP_ICONS.image}</div>
            <div class="catgrp-meta">
              <h3 class="catgrp-name">${escapeHtml(group.name)}</h3>
              <p class="catgrp-desc">${escapeHtml(group.desc)}</p>
            </div>
            <div class="catgrp-count">
              <span class="catgrp-count-num">${totalCount}</span>
              <span class="catgrp-count-unit">题</span>
            </div>
          </div>
          <div class="catgrp-progress">
            <div class="catgrp-track" role="progressbar" aria-label="${escapeHtml(group.name)}练习进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progressPct}">
              <div class="catgrp-bar" style="width:${progressPct}%"></div>
            </div>
            <span class="catgrp-done">${answeredCount}/${totalCount}</span>
          </div>
          <div class="catgrp-subs">${subs}</div>
          <button class="catgrp-enter" data-cat="${gKey}" type="button">
            <span>进入大分类练习</span>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
        </article>
      `;
    }).join('');

    // 事件委托：大分类头部点击 + 小分类芯片点击 + 进入按钮点击
    tableEl.onclick = e => {
      const sub = e.target.closest('.catgrp-sub');
      if (sub) { enterCategory(sub.dataset.cat); return; }
      const head = e.target.closest('.catgrp-head');
      if (head) { enterCategory(head.dataset.cat); return; }
      const enterBtn = e.target.closest('.catgrp-enter');
      if (enterBtn) { enterCategory(enterBtn.dataset.cat); return; }
    };
    tableEl.onkeydown = e => {
      if (e.key === 'Enter' || e.key === ' ') {
        const target = e.target.closest('.catgrp-head, .catgrp-sub, .catgrp-enter');
        if (target) { e.preventDefault(); enterCategory(target.dataset.cat); }
      }
    };
  }

  // ============ 模拟考试 ============
  const EXAM_CONFIG = {
    questionCount: 100,        // 题目数量
    duration: 45 * 60 * 1000,  // 45分钟
    passScore: 90,             // 及格分
    hintsPerQuestion: 1        // 每题提示次数
  };

  /** 更新考试起始面板 */
  function updateExamStartPanel() {
    const startPanel = $('#exam-start');
    const runningPanel = $('#exam-running');
    const resultPanel = $('#exam-result');
    const resumeBtn = $('#btn-exam-resume');

    // 检查是否有未完成考试
    const savedExam = SessionStore.get('kemu1_exam', null);
    if (savedExam && savedExam.questions && savedExam.questions.length) {
      if (resumeBtn) resumeBtn.style.display = 'inline-flex';
    } else {
      if (resumeBtn) resumeBtn.style.display = 'none';
    }

    if (startPanel) startPanel.style.display = 'block';
    if (runningPanel) runningPanel.style.display = 'none';
    if (resultPanel) resultPanel.style.display = 'none';
  }

  /** 开始考试 */
  function startExam() {
    // 随机抽取100道题
    const shuffled = shuffle(QUESTIONS);
    const examQuestions = shuffled.slice(0, Math.min(EXAM_CONFIG.questionCount, shuffled.length));

    State.exam = {
      active: true,
      questions: examQuestions,
      currentIdx: 0,
      answers: {},
      marked: {},
      hintsUsed: {},
      hintRemoved: {},
      startTime: Date.now(),
      endTime: Date.now() + EXAM_CONFIG.duration,
      duration: EXAM_CONFIG.duration,
      timerId: null
    };

    saveExamState();

    // 切换面板
    $('#exam-start').style.display = 'none';
    $('#exam-running').style.display = 'block';
    $('#exam-result').style.display = 'none';

    // 更新顶部信息
    $('#exam-total-num').textContent = examQuestions.length;
    renderExamQuestion();
    startExamTimer();

    toast('考试开始，答题时间45分钟', 'info');
  }

  /** 恢复考试 */
  function resumeExam() {
    const saved = SessionStore.get('kemu1_exam', null);
    if (!saved || !saved.questions || !saved.questions.length) {
      toast('未找到未完成考试', 'error');
      return;
    }
    State.exam = {
      active: true,
      questions: saved.questions,
      currentIdx: saved.currentIdx || 0,
      answers: saved.answers || {},
      marked: saved.marked || {},
      hintsUsed: saved.hintsUsed || {},
      hintRemoved: saved.hintRemoved || {},
      startTime: saved.startTime || Date.now(),
      endTime: saved.endTime || (Date.now() + EXAM_CONFIG.duration),
      duration: EXAM_CONFIG.duration,
      timerId: null
    };

    $('#exam-start').style.display = 'none';
    $('#exam-running').style.display = 'block';
    $('#exam-result').style.display = 'none';
    $('#exam-total-num').textContent = State.exam.questions.length;
    renderExamQuestion();
    startExamTimer();
    toast('已恢复上次考试', 'info');
  }

  /** 保存考试状态到 sessionStorage */
  function saveExamState() {
    if (!State.exam.active) return;
    SessionStore.set('kemu1_exam', {
      questions: State.exam.questions,
      currentIdx: State.exam.currentIdx,
      answers: State.exam.answers,
      marked: State.exam.marked,
      hintsUsed: State.exam.hintsUsed,
      hintRemoved: State.exam.hintRemoved,
      startTime: State.exam.startTime,
      endTime: State.exam.endTime
    });
  }

  /** 启动考试倒计时 */
  function startExamTimer() {
    if (State.exam.timerId) clearInterval(State.exam.timerId);
    const update = () => {
      const remaining = State.exam.endTime - Date.now();
      if (remaining <= 0) {
        clearInterval(State.exam.timerId);
        State.exam.timerId = null;
        submitExam(true);
        return;
      }
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      const text = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      const timeEl = $('#exam-time-text');
      if (timeEl) timeEl.textContent = text;

      const timerEl = $('#exam-timer');
      if (timerEl) {
        timerEl.classList.remove('warning', 'danger');
        if (remaining < 5 * 60 * 1000) timerEl.classList.add('danger');
        else if (remaining < 10 * 60 * 1000) timerEl.classList.add('warning');
      }
    };
    update();
    State.exam.timerId = setInterval(update, 1000);
  }

  /** 渲染考试题目 */
  function renderExamQuestion() {
    const exam = State.exam;
    if (!exam.active || !exam.questions.length) return;
    const idx = Math.max(0, Math.min(exam.currentIdx, exam.questions.length - 1));
    exam.currentIdx = idx;
    const q = exam.questions[idx];

    // 顶部信息
    $('#exam-current-num').textContent = idx + 1;
    const answeredCount = Object.keys(exam.answers).length;
    const markedCount = Object.keys(exam.marked).length;
    $('#exam-answered-count').textContent = answeredCount;
    $('#exam-marked-count').textContent = markedCount;

    // 进度条
    const pct = exam.questions.length > 0 ? ((idx + 1) / exam.questions.length * 100) : 0;
    $('#exam-progress-fill').style.width = pct + '%';
    $('#exam-progress-track').setAttribute('aria-valuenow', Math.round(pct));

    // 题目卡片
    const qtype = q.type === 'judge' ? '判断题' : '单选题';
    $('#exam-q-type').textContent = qtype;
    $('#exam-q-type').className = 'exam-q-type' + (q.type === 'judge' ? ' judge' : '');
    $('#exam-q-num').textContent = `第 ${idx + 1} 题`;

    // 标记按钮状态
    const markBtn = $('#btn-exam-mark');
    const markText = $('#exam-mark-text');
    if (markBtn && markText) {
      const isMarked = !!exam.marked[idx];
      markBtn.setAttribute('aria-pressed', String(isMarked));
      markBtn.classList.toggle('marked', isMarked);
      markText.textContent = isMarked ? '已标记' : '标记';
    }

    // 提示按钮状态
    const hintBtn = $('#btn-exam-hint');
    const hintBadge = $('#exam-hint-badge');
    if (hintBtn && hintBadge) {
      const hintUsed = !!exam.hintsUsed[idx];
      hintBtn.disabled = hintUsed;
      hintBtn.classList.toggle('disabled', hintUsed);
      hintBadge.textContent = hintUsed ? '0' : EXAM_CONFIG.hintsPerQuestion;
    }

    // 题干（关键词高亮）
    $('#exam-q-text').innerHTML = highlightKeywords(q.question, q.keywords || []);

    // 图像题
    const imgWrap = $('#exam-q-image-wrap');
    if (q.image) {
      imgWrap.style.display = 'block';
      imgWrap.className = 'exam-q-image-wrap';
      imgWrap.innerHTML = '';
      const imgEl = document.createElement('img');
      imgEl.className = 'exam-q-image';
      imgEl.src = q.image;
      imgEl.alt = '题目图片';
      imgEl.loading = 'lazy';
      imgEl.addEventListener('error', () => {
        imgWrap.className = 'exam-q-image-wrap q-image-placeholder';
        imgWrap.innerHTML = '<div class="placeholder-icon" aria-hidden="true">[ ]</div><div>图片加载失败</div>';
      });
      imgWrap.appendChild(imgEl);
    } else if (q.is_image_question) {
      imgWrap.style.display = 'block';
      imgWrap.className = 'exam-q-image-wrap q-image-placeholder';
      imgWrap.innerHTML = '<div class="placeholder-icon" aria-hidden="true">[ ]</div><div>图像题 · 图片暂缺</div><div class="placeholder-hint">请根据题目文字描述和选项作答</div>';
    } else {
      imgWrap.style.display = 'none';
    }

    // 选项
    const optsEl = $('#exam-q-options');
    optsEl.innerHTML = '';
    optsEl.className = 'exam-q-options' + (q.type === 'judge' ? ' judge' : '');

    const userAnswer = exam.answers[idx];
    const removed = exam.hintRemoved[idx] || [];

    if (q.type === 'judge') {
      ['错误', '正确'].forEach((label, i) => {
        const val = i === 1;
        const item = document.createElement('div');
        item.className = 'exam-opt-item';
        if (removed.includes(val)) {
          item.classList.add('removed');
          item.setAttribute('aria-disabled', 'true');
        } else {
          if (userAnswer === val) item.classList.add('selected');
          // 立即判断对错：已答题则显示正确/错误标记
          if (userAnswer !== undefined) {
            if (val === q.answer) item.classList.add('correct');
            else if (val === userAnswer) item.classList.add('wrong');
          }
          item.addEventListener('click', () => onExamAnswer(idx, val));
        }
        item.innerHTML = `
          <span class="exam-opt-letter">${val ? '√' : '×'}</span>
          <span class="exam-opt-text">${escapeHtml(label)}</span>
          ${removed.includes(val) ? '<span class="exam-opt-removed">已剔除</span>' : ''}
        `;
        optsEl.appendChild(item);
      });
    } else {
      const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
      (q.options || []).forEach((opt, i) => {
        const item = document.createElement('div');
        item.className = 'exam-opt-item';
        if (removed.includes(i)) {
          item.classList.add('removed');
          item.setAttribute('aria-disabled', 'true');
        } else {
          if (userAnswer === i) item.classList.add('selected');
          // 立即判断对错：已答题则显示正确/错误标记
          if (userAnswer !== undefined) {
            if (i === q.answer) item.classList.add('correct');
            else if (i === userAnswer) item.classList.add('wrong');
          }
          item.addEventListener('click', () => onExamAnswer(idx, i));
        }
        item.innerHTML = `
          <span class="exam-opt-letter">${letters[i] || (i + 1)}</span>
          <span class="exam-opt-text">${highlightKeywords(opt, q.keywords || [])}</span>
          ${removed.includes(i) ? '<span class="exam-opt-removed">已剔除</span>' : ''}
        `;
        optsEl.appendChild(item);
      });
    }

    // 保存状态
    saveExamState();
  }

  /**
   * 考试答题
   * 立即判断对错：记录答案后显示正确/错误标记与 toast 反馈
   * 允许修改答案：修改时仅在答案改变时提示
   */
  function onExamAnswer(idx, selected) {
    const q = State.exam.questions[idx];
    if (!q) return;
    const prevAnswer = State.exam.answers[idx];
    State.exam.answers[idx] = selected;
    saveExamState();
    renderExamQuestion();
    // 立即判断对错反馈（仅在答案改变时提示，避免重复 toast）
    if (prevAnswer !== selected) {
      const correct = selected === q.answer;
      toast(correct ? '回答正确' : '回答错误', correct ? 'success' : 'error');
    }
  }

  /** 五五提示：剔除两个错误选项 */
  function useExamHint() {
    const exam = State.exam;
    const idx = exam.currentIdx;
    if (exam.hintsUsed[idx]) {
      toast('本题已使用过提示', 'error');
      return;
    }
    const q = exam.questions[idx];
    const correct = q.answer;
    // 从错误选项中随机剔除2个
    let wrongIndices = [];
    if (q.type === 'judge') {
      // 判断题只有2个选项，无法剔除
      toast('判断题不支持五五提示', 'error');
      return;
    } else {
      wrongIndices = (q.options || []).map((_, i) => i).filter(i => i !== correct);
    }
    if (wrongIndices.length < 2) {
      toast('可剔除选项不足', 'error');
      return;
    }
    const toRemove = shuffle(wrongIndices).slice(0, 2);
    exam.hintRemoved[idx] = toRemove;
    exam.hintsUsed[idx] = true;
    saveExamState();
    renderExamQuestion();
    toast('已剔除两个错误选项', 'success');
  }

  /** 切换标记 */
  function toggleExamMark() {
    const idx = State.exam.currentIdx;
    if (State.exam.marked[idx]) {
      delete State.exam.marked[idx];
    } else {
      State.exam.marked[idx] = true;
    }
    saveExamState();
    renderExamQuestion();
  }

  /** 考试导航：上一题/下一题 */
  function examPrev() {
    if (State.exam.currentIdx > 0) {
      State.exam.currentIdx--;
      renderExamQuestion();
    } else {
      toast('已经是第一题');
    }
  }
  function examNext() {
    if (State.exam.currentIdx < State.exam.questions.length - 1) {
      State.exam.currentIdx++;
      renderExamQuestion();
    } else {
      toast('已经是最后一题，可点击交卷');
    }
  }

  /** 渲染答题卡 */
  function renderExamCard() {
    const grid = $('#exam-card-grid');
    if (!grid) return;
    const exam = State.exam;
    const html = exam.questions.map((_, i) => {
      const answered = exam.answers[i] !== undefined;
      const marked = !!exam.marked[i];
      const current = i === exam.currentIdx;
      const classes = ['card-cell'];
      if (current) classes.push('current');
      if (marked) classes.push('marked');
      if (answered) classes.push('answered');
      return `<div class="${classes.join(' ')}" data-idx="${i}" role="button" tabindex="0" aria-label="第${i+1}题${answered?'(已答)':'(未答)'}${marked?'(已标记)':''}">${i + 1}</div>`;
    }).join('');
    grid.innerHTML = html;

    grid.onclick = e => {
      const cell = e.target.closest('.card-cell');
      if (!cell) return;
      const idx = parseInt(cell.dataset.idx, 10);
      State.exam.currentIdx = idx;
      renderExamQuestion();
      closeExamCard();
    };
    grid.onkeydown = e => {
      if (e.key === 'Enter' || e.key === ' ') {
        const cell = e.target.closest('.card-cell');
        if (cell) { e.preventDefault(); cell.click(); }
      }
    };
  }

  /** 打开答题卡 */
  function openExamCard() {
    renderExamCard();
    $('#exam-card-overlay').style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
  /** 关闭答题卡 */
  function closeExamCard() {
    $('#exam-card-overlay').style.display = 'none';
    document.body.style.overflow = '';
  }

  /** 交卷（弹出确认） */
  function submitExamConfirm() {
    const exam = State.exam;
    const answeredCount = Object.keys(exam.answers).length;
    const unanswered = exam.questions.length - answeredCount;
    const msg = unanswered > 0
      ? `还有 ${unanswered} 题未作答，确定要交卷吗？`
      : '已完成全部题目，确定要交卷吗？';
    showModal('确认交卷', msg, () => submitExam(false));
  }

  /**
   * 提交考试并计算成绩
   * @param {boolean} auto 是否自动交卷（超时）
   */
  function submitExam(auto) {
    const exam = State.exam;
    if (exam.timerId) {
      clearInterval(exam.timerId);
      exam.timerId = null;
    }
    exam.active = false;
    SessionStore.remove('kemu1_exam');

    // 计算成绩
    let correct = 0;
    let wrong = 0;
    let unanswered = 0;
    const wrongList = [];

    exam.questions.forEach((q, i) => {
      const userAns = exam.answers[i];
      if (userAns === undefined) {
        unanswered++;
        wrongList.push({ q, userAns: -1, correct: false });
      } else if (userAns === q.answer) {
        correct++;
      } else {
        wrong++;
        wrongList.push({ q, userAns, correct: false });
      }
    });

    const score = correct;
    const passed = score >= EXAM_CONFIG.passScore;
    const usedTime = Date.now() - exam.startTime;
    const usedMinutes = Math.floor(usedTime / 60000);
    const usedSeconds = Math.floor((usedTime % 60000) / 1000);

    // 切换面板
    $('#exam-running').style.display = 'none';
    $('#exam-result').style.display = 'block';

    // 结果卡片
    const iconWrap = $('#result-icon-wrap');
    if (iconWrap) {
      iconWrap.className = 'result-icon-wrap ' + (passed ? 'pass' : 'fail');
      iconWrap.innerHTML = passed
        ? '<svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>'
        : '<svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    }
    $('#result-title').textContent = auto ? '考试时间到' : '考试完成';
    $('#result-score-num').textContent = score;
    $('#result-verdict').textContent = passed ? '恭喜通过' : '未通过';
    $('#result-verdict').className = 'result-verdict ' + (passed ? 'pass' : 'fail');
    $('#result-correct').textContent = correct;
    $('#result-wrong').textContent = wrong;
    $('#result-unanswered').textContent = unanswered;
    $('#result-time').textContent = `${usedMinutes}分${usedSeconds}秒`;

    // 存储错题供查看
    State.exam.lastWrongList = wrongList;

    toast(passed ? `恭喜通过！得分 ${score}` : `未通过，得分 ${score}`, passed ? 'success' : 'error');
  }

  /** 查看错题 */
  function reviewExamWrong() {
    const reviewEl = $('#exam-review');
    if (!reviewEl) return;
    const wrongList = State.exam.lastWrongList || [];
    if (!wrongList.length) {
      reviewEl.style.display = 'block';
      reviewEl.innerHTML = '<div class="empty-state">本次考试无错题，表现优秀！</div>';
      return;
    }
    const html = wrongList.map((item, i) => {
      const q = item.q;
      const correctText = q.type === 'judge'
        ? (q.answer ? '正确' : '错误')
        : ['A', 'B', 'C', 'D', 'E', 'F'][q.answer] + ' · ' + (q.options?.[q.answer] || '');
      const userText = item.userAns === -1
        ? '未作答'
        : (q.type === 'judge'
            ? (item.userAns ? '正确' : '错误')
            : ['A', 'B', 'C', 'D', 'E', 'F'][item.userAns] + ' · ' + (q.options?.[item.userAns] || ''));
      return `
        <article class="review-item">
          <div class="review-item-header">
            <span class="review-num">第 ${i + 1} 题</span>
            <span class="review-type">${q.type === 'judge' ? '判断题' : '单选题'}</span>
          </div>
          <div class="review-question">${highlightKeywords(q.question, q.keywords || [])}</div>
          ${q.image ? `<div class="review-image-wrap"><img src="${escapeHtml(q.image)}" alt="题目图片" loading="lazy"></div>` : ''}
          <div class="review-answers">
            <div class="review-answer-row wrong">
              <span class="review-label">你的答案</span>
              <span class="review-value">${escapeHtml(userText)}</span>
            </div>
            <div class="review-answer-row correct">
              <span class="review-label">正确答案</span>
              <span class="review-value">${escapeHtml(correctText)}</span>
            </div>
          </div>
          ${q.analysis ? `<div class="review-analysis">${highlightKeywords(q.analysis, q.keywords || [])}</div>` : ''}
        </article>
      `;
    }).join('');
    reviewEl.style.display = 'block';
    reviewEl.innerHTML = '<h3 class="review-title">错题回顾</h3>' + html;
    reviewEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** 再考一次 */
  function retryExam() {
    $('#exam-review').style.display = 'none';
    $('#exam-result').style.display = 'none';
    startExam();
  }

  // ============ 自定义模态对话框 ============
  let modalConfirmCallback = null;

  /**
   * 显示自定义模态对话框
   * @param {string} title 标题
   * @param {string} text 内容
   * @param {function} onConfirm 确认回调
   * @param {object} opts 选项 {confirmText, cancelText, danger}
   */
  function showModal(title, text, onConfirm, opts = {}) {
    const overlay = $('#modal-overlay');
    if (!overlay) return;
    $('#modal-title').textContent = title;
    $('#modal-text').textContent = text;
    const confirmBtn = $('#modal-confirm');
    const cancelBtn = $('#modal-cancel');
    if (confirmBtn) {
      confirmBtn.textContent = opts.confirmText || '确认';
      confirmBtn.className = 'btn ' + (opts.danger ? 'btn-danger' : 'btn-primary');
    }
    if (cancelBtn) {
      cancelBtn.textContent = opts.cancelText || '取消';
      cancelBtn.style.display = opts.hideCancel ? 'none' : '';
    }
    modalConfirmCallback = onConfirm;
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    if (confirmBtn) confirmBtn.focus();
  }

  /** 关闭模态 */
  function closeModal() {
    const overlay = $('#modal-overlay');
    if (!overlay) return;
    overlay.style.display = 'none';
    document.body.style.overflow = '';
    modalConfirmCallback = null;
  }

  // ============ 事件绑定 ============
  function bindEvents() {
    // 导航链接切换
    $$('.nav-link').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        switchView(link.dataset.view);
      });
    });

    // brand 点击回主页
    const brand = $('.brand');
    if (brand) {
      brand.addEventListener('click', e => {
        e.preventDefault();
        switchView('home');
      });
    }

    // 主页 data-go 按钮（hero actions + feature cards）
    document.addEventListener('click', e => {
      const goEl = e.target.closest('[data-go]');
      if (!goEl) return;
      const target = goEl.dataset.go;
      if (target) switchView(target);
    });

    // 主题切换
    const themeBtn = $('#theme-toggle');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    // 跟随系统主题变化
    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', e => {
        // 仅当用户未主动设置主题时跟随系统
        if (!Store.get('kemu1_theme', null)) {
          document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        }
      });
    }

    // ===== 练习视图事件 =====
    const btnPrev = $('#btn-prev');
    const btnNext = $('#btn-next');
    const gotoNext = () => {
      if (State.currentIdx < State.currentList.length - 1) {
        State.currentIdx++;
        renderQuestion();
      } else {
        toast('已经是最后一题');
      }
    };
    if (btnPrev) btnPrev.addEventListener('click', () => {
      if (State.currentIdx > 0) {
        State.currentIdx--;
        renderQuestion();
      } else {
        toast('已经是第一题');
      }
    });
    if (btnNext) btnNext.addEventListener('click', gotoNext);

    // 答题后高亮"下一题"按钮
    const btnNextHighlight = $('#btn-next-highlight');
    if (btnNextHighlight) btnNextHighlight.addEventListener('click', gotoNext);

    // 显示答案（引导型）
    const btnShowAnswer = $('#btn-show-answer');
    if (btnShowAnswer) btnShowAnswer.addEventListener('click', showAnswerDirectly);

    // 收藏
    const btnBookmark = $('#btn-bookmark');
    if (btnBookmark) btnBookmark.addEventListener('click', toggleBookmark);

    // 解析折叠展开
    const analysisToggle = $('#analysis-toggle');
    if (analysisToggle) analysisToggle.addEventListener('click', toggleAnalysis);

    // 乱序切换
    const btnShuffle = $('#btn-shuffle');
    if (btnShuffle) btnShuffle.addEventListener('click', () => {
      State.shuffle = !State.shuffle;
      btnShuffle.classList.toggle('active', State.shuffle);
      btnShuffle.setAttribute('aria-pressed', String(State.shuffle));
      loadQuestionList();
      toast(State.shuffle ? '已开启乱序' : '已关闭乱序');
    });

    // 重置进度（使用自定义模态）
    const btnReset = $('#btn-reset');
    if (btnReset) btnReset.addEventListener('click', () => {
      showModal('确认重置进度', '确定要清空所有答题进度吗？此操作不可撤销。', () => {
        State.answered = {};
        Store.set('kemu1_answered', {});
        renderQuestion();
        updateNavMeta();
        updateHomeStats();
        toast('进度已重置', 'success');
      }, { danger: true, confirmText: '确认重置' });
    });

    // 题号跳转
    const jumpBtn = $('#jump-btn');
    const jumpInput = $('#jump-input');
    if (jumpBtn) jumpBtn.addEventListener('click', () => {
      const n = parseInt(jumpInput.value, 10);
      if (isNaN(n) || n < 1 || n > State.currentList.length) {
        toast('请输入有效题号', 'error');
        return;
      }
      State.currentIdx = n - 1;
      renderQuestion();
      jumpInput.value = '';
    });
    if (jumpInput) jumpInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') jumpBtn.click();
    });

    // 搜索（防抖）
    const searchInput = $('#search-input');
    let searchTimer = null;
    if (searchInput) searchInput.addEventListener('input', e => {
      const val = e.target.value;
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        State.searchQuery = val;
        loadQuestionList();
      }, 220);
    });

    // 口诀搜索
    const mnemonicsSearchInput = $('#mnemonics-search');
    let mnemonicsSearchTimer = null;
    if (mnemonicsSearchInput) mnemonicsSearchInput.addEventListener('input', e => {
      const val = e.target.value;
      if (mnemonicsSearchTimer) clearTimeout(mnemonicsSearchTimer);
      mnemonicsSearchTimer = setTimeout(() => {
        mnemonicsSearch = val;
        renderMnemonicList();
        updateMnemonicsBreadcrumb();
      }, 220);
    });

    // ===== 知识学习搜索事件 =====
    const knowledgeSearchInput = $('#knowledge-search');
    let knowledgeSearchTimer = null;
    if (knowledgeSearchInput) knowledgeSearchInput.addEventListener('input', e => {
      const val = e.target.value;
      if (knowledgeSearchTimer) clearTimeout(knowledgeSearchTimer);
      knowledgeSearchTimer = setTimeout(() => {
        KnowledgeState.filter = val;
        renderKnowledge();
      }, 250);
    });

    // ===== 模拟考试事件 =====
    const btnExamStart = $('#btn-exam-start');
    if (btnExamStart) btnExamStart.addEventListener('click', startExam);
    const btnExamResume = $('#btn-exam-resume');
    if (btnExamResume) btnExamResume.addEventListener('click', resumeExam);

    const btnExamPrev = $('#btn-exam-prev');
    if (btnExamPrev) btnExamPrev.addEventListener('click', examPrev);
    const btnExamNext = $('#btn-exam-next');
    if (btnExamNext) btnExamNext.addEventListener('click', examNext);

    const btnExamHint = $('#btn-exam-hint');
    if (btnExamHint) btnExamHint.addEventListener('click', useExamHint);
    const btnExamMark = $('#btn-exam-mark');
    if (btnExamMark) btnExamMark.addEventListener('click', toggleExamMark);

    const btnExamCard = $('#btn-exam-card');
    if (btnExamCard) btnExamCard.addEventListener('click', openExamCard);
    const btnExamCardClose = $('#btn-exam-card-close');
    if (btnExamCardClose) btnExamCardClose.addEventListener('click', closeExamCard);

    // 答题卡遮罩点击关闭
    const cardOverlay = $('#exam-card-overlay');
    if (cardOverlay) cardOverlay.addEventListener('click', e => {
      if (e.target === cardOverlay) closeExamCard();
    });

    const btnExamCardSubmit = $('#btn-exam-card-submit');
    if (btnExamCardSubmit) btnExamCardSubmit.addEventListener('click', () => {
      closeExamCard();
      submitExamConfirm();
    });

    const btnExamSubmit = $('#btn-exam-submit');
    if (btnExamSubmit) btnExamSubmit.addEventListener('click', submitExamConfirm);

    // 结果面板按钮
    const btnExamReview = $('#btn-exam-review');
    if (btnExamReview) btnExamReview.addEventListener('click', reviewExamWrong);
    const btnExamRetry = $('#btn-exam-retry');
    if (btnExamRetry) btnExamRetry.addEventListener('click', retryExam);
    const btnExamBack = $('#btn-exam-back');
    if (btnExamBack) btnExamBack.addEventListener('click', () => switchView('home'));

    // ===== 模态事件 =====
    const modalConfirm = $('#modal-confirm');
    if (modalConfirm) modalConfirm.addEventListener('click', () => {
      const cb = modalConfirmCallback;
      closeModal();
      if (typeof cb === 'function') cb();
    });
    const modalCancel = $('#modal-cancel');
    if (modalCancel) modalCancel.addEventListener('click', closeModal);
    const modalOverlay = $('#modal-overlay');
    if (modalOverlay) modalOverlay.addEventListener('click', e => {
      if (e.target === modalOverlay) closeModal();
    });

    // 滚动毛玻璃效果
    window.addEventListener('scroll', () => {
      const nav = $('#topnav');
      if (!nav) return;
      if (window.scrollY > 10) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    }, { passive: true });

    // 滚动渐入：元素进入视口时添加 nf-revealed 类触发动画
    if ('IntersectionObserver' in window) {
      const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('nf-revealed');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

      // 观察所有带 nf-reveal 类的元素
      $$('.nf-reveal').forEach(el => revealObserver.observe(el));
    } else {
      // 不支持 IntersectionObserver 的浏览器直接显示
      $$('.nf-reveal').forEach(el => el.classList.add('nf-revealed'));
    }

    // 键盘快捷键
    document.addEventListener('keydown', e => {
      // ESC 关闭模态/答题卡
      if (e.key === 'Escape') {
        const modal = $('#modal-overlay');
        if (modal && modal.style.display !== 'none') { closeModal(); return; }
        const card = $('#exam-card-overlay');
        if (card && card.style.display !== 'none') { closeExamCard(); return; }
      }
      // 输入框中不响应快捷键
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      // 练习视图快捷键
      if (State.view === 'practice') {
        if (e.key === 'ArrowLeft') { e.preventDefault(); btnPrev?.click(); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); btnNext?.click(); }
        else if (['1','2','3','4'].includes(e.key) || ['a','b','c','d','A','B','C','D'].includes(e.key)) {
          const map = {'1':0,'2':1,'3':2,'4':3,'a':0,'b':1,'c':2,'d':3,'A':0,'B':1,'C':2,'D':3};
          const opts = $$('.opt-item');
          const target = opts[map[e.key]];
          if (target && !target.classList.contains('disabled')) target.click();
        }
      }
      // 考试视图快捷键
      else if (State.view === 'exam' && State.exam.active) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); examPrev(); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); examNext(); }
        else if (['1','2','3','4'].includes(e.key) || ['a','b','c','d','A','B','C','D'].includes(e.key)) {
          const map = {'1':0,'2':1,'3':2,'4':3,'a':0,'b':1,'c':2,'d':3,'A':0,'B':1,'C':2,'D':3};
          const opts = $$('#exam-q-options .exam-opt-item');
          const target = opts[map[e.key]];
          if (target && !target.classList.contains('removed')) target.click();
        }
      }
    });

    // URL hash 路由
    window.addEventListener('hashchange', () => {
      const hash = location.hash.replace('#', '');
      if (VALID_VIEWS.includes(hash) && hash !== State.view) {
        switchView(hash);
      }
    });

    // 页面卸载前保存考试状态
    window.addEventListener('beforeunload', () => {
      if (State.exam.active) saveExamState();
    });

    // 可见性变化时保存状态
    document.addEventListener('visibilitychange', () => {
      if (State.exam.active) saveExamState();
    });
  }

  // ============ PWA Service Worker 注册 ============
  function registerSW() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => {
          console.warn('Service Worker 注册失败:', err);
        });
      });
    }
  }

  // ============ 初始化 ============
  function init() {
    // 数据完整性检查
    if (typeof QUESTIONS === 'undefined' || typeof MNEMONICS === 'undefined' || typeof CATEGORIES === 'undefined') {
      document.body.innerHTML = '<div style="padding:2rem;text-align:center;color:#dc2626">数据加载失败，请刷新页面重试。</div>';
      return;
    }

    // 应用主题（若 localStorage 无值，则 inline 脚本已按系统偏好设置）
    if (State.theme) {
      applyTheme(State.theme);
    }

    // 渲染各视图
    renderHome();
    renderSidebar();
    loadQuestionList();
    updateNavMeta();
    bindEvents();
    registerSW();

    // 根据URL hash决定初始视图，默认主页
    const hash = location.hash.replace('#', '');
    const initialView = VALID_VIEWS.includes(hash) ? hash : 'home';

    // 初始加载：重置 State.view 以强制触发 switchView 入场动画
    State.view = '';
    switchView(initialView);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
