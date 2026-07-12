/* ===================================================================
   科目一教考 · 应用逻辑
   - 四视图SPA：主页 / 题库练习 / 口诀总览 / 分类导航
   - 1964题完整题库 + 76条口诀 + 24分类
   - 关键词高亮 + 口诀提示 + 进度记忆 + 双主题切换
   =================================================================== */
'use strict';

(function () {

  // ============ 工具函数 ============
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // 安全转义HTML，防止XSS
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // 题目文本中关键词高亮
  // 规则：按关键词列表匹配，危险词红色、数字类蓝色、其余主色
  function highlightKeywords(text, keywords) {
    if (!text || !keywords || !keywords.length) return escapeHtml(text);
    let html = escapeHtml(text);

    // 按长度降序，避免短词覆盖长词
    const sorted = [...new Set(keywords)].filter(Boolean).sort((a, b) => b.length - a.length);
    // 危险词（红）
    const danger = ['饮酒', '醉酒', '酒驾', '醉驾', '肇事逃逸', '逃逸', '违法', '伪造', '变造', '吊销', '撤销', '暂扣'];
    // 数字类（蓝）：纯数字 + 单位
    const numRe = /^(\d+)\s*(km\/h|公里|米|分|元|年|日|天|次)?$/i;

    sorted.forEach(kw => {
      if (!kw) return;
      const cls = danger.includes(kw) ? 'danger' : (numRe.test(kw) ? 'num' : '');
      const clsAttr = cls ? ` class="${cls}"` : '';
      // 转义正则特殊字符
      const safe = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(${safe})`, 'g');
      // 避免在已包裹的标签内再次替换
      html = html.replace(re, `<kw${clsAttr}>$1</kw>`);
    });
    return html;
  }

  // Toast 提示
  let toastTimer = null;
  function toast(msg, type = '') {
    const el = $('#toast');
    el.textContent = msg;
    el.className = 'toast show ' + type;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = 'toast ' + type; }, 1800);
  }

  // localStorage 简易封装
  const Store = {
    get(key, def) {
      try {
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : def;
      } catch (e) { return def; }
    },
    set(key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
    }
  };

  // hex 转 rgba
  function hexToRgba(hex, alpha = 1) {
    if (!hex) return `rgba(13, 148, 136, ${alpha})`;
    const m = hex.replace('#', '');
    const r = parseInt(m.substring(0, 2), 16);
    const g = parseInt(m.substring(2, 4), 16);
    const b = parseInt(m.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // ============ 应用状态 ============
  const State = {
    view: 'home',               // 当前视图 home/practice/mnemonics/categories
    currentCat: 'all',          // 当前分类
    currentList: [],            // 当前题目列表（按分类筛选后）
    currentIdx: 0,              // 当前题目在list中的索引
    answered: Store.get('kemu1_answered', {}),  // {qid: {selected, correct}}
    bookmarks: Store.get('kemu1_bookmarks', {}), // {qid: true} 收藏的题目
    searchQuery: '',
    shuffle: false,
    theme: Store.get('kemu1_theme', 'light')   // light/dark
  };

  // ============ 主题切换 ============
  function applyTheme(theme) {
    State.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    Store.set('kemu1_theme', theme);
    // 主题按钮状态由CSS控制图标显示，这里仅更新aria-label
    const btn = $('#theme-toggle');
    if (btn) btn.setAttribute('aria-label', theme === 'dark' ? '切换到浅色主题' : '切换到深色主题');
  }

  function toggleTheme() {
    const next = State.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    toast(next === 'dark' ? '已切换深色主题' : '已切换浅色主题');
  }

  // ============ 视图切换 ============
  function switchView(name) {
    if (!['home', 'practice', 'mnemonics', 'categories'].includes(name)) return;
    State.view = name;
    $$('.view').forEach(v => v.classList.remove('active'));
    const target = $('#view-' + name);
    if (target) target.classList.add('active');

    // 导航链接激活态
    $$('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.view === name));

    // 滚动到顶
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // 视图初始化
    if (name === 'home') updateHomeStats();
    else if (name === 'mnemonics') renderMnemonics();
    else if (name === 'categories') renderCategories();

    // 更新URL hash（便于分享）
    if (location.hash !== '#' + name) {
      history.replaceState(null, '', '#' + name);
    }
  }

  // ============ 主页初始化 ============
  function renderHome() {
    renderHotCats();
    updateHomeStats();
  }

  // 渲染热门分类（取题目数最多的8个分类）
  function renderHotCats() {
    const container = $('#home-hotcats');
    if (!container) return;
    const entries = Object.entries(CATEGORIES)
      .filter(([k, m]) => m.count > 0)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8);

    container.innerHTML = entries.map(([key, meta], i) => {
      const colorBg = hexToRgba(meta.color, 0.10);
      return `
        <article class="hotcat-card" data-cat="${key}" style="--cat-color:${meta.color};--cat-color-bg:${colorBg}">
          <div class="hotcat-icon">
            <span class="hotcat-num">${String(i + 1).padStart(2, '0')}</span>
          </div>
          <h3 class="hotcat-name">${meta.name}</h3>
          <div class="hotcat-count"><span class="num">${meta.count}</span> 题</div>
          <div class="hotcat-arrow">→</div>
        </article>
      `;
    }).join('');

    // 点击进入对应分类练习
    container.onclick = e => {
      const card = e.target.closest('.hotcat-card');
      if (!card) return;
      const cat = card.dataset.cat;
      State.currentCat = cat;
      switchView('practice');
      // 同步侧栏激活
      $$('.cat-item').forEach(c => c.classList.toggle('active', c.dataset.cat === cat));
      loadQuestionList();
      toast(`已切换至「${CATEGORIES[cat]?.name || '分类'}」`);
    };
  }

  // 更新主页统计数据
  function updateHomeStats() {
    const total = QUESTIONS.length;
    const answeredCount = Object.keys(State.answered).length;
    const correctCount = Object.values(State.answered).filter(r => r.correct).length;
    const acc = answeredCount > 0 ? Math.round(correctCount / answeredCount * 100) + '%' : '—';

    // 静态统计
    const qEl = $('#home-stat-questions');
    if (qEl) qEl.textContent = total;
    const mEl = $('#home-stat-mnemonics');
    if (mEl) mEl.textContent = MNEMONICS.length;
    const cEl = $('#home-stat-categories');
    if (cEl) cEl.textContent = Object.keys(CATEGORIES).length;
    const iEl = $('#home-stat-images');
    if (iEl) iEl.textContent = QUESTIONS.filter(q => q.image || q.is_image_question).length;

    // 进度
    const progressText = $('#home-progress-text');
    if (progressText) progressText.textContent = `${answeredCount} / ${total}`;
    const progressFill = $('#home-progress-fill');
    if (progressFill) progressFill.style.width = (total > 0 ? answeredCount / total * 100 : 0) + '%';
    const accuracy = $('#home-accuracy');
    if (accuracy) accuracy.textContent = acc;
    const practiced = $('#home-practiced');
    if (practiced) practiced.textContent = answeredCount;
  }

  // ============ 分类侧栏渲染 ============
  function renderSidebar() {
    const list = $('#category-list');
    const total = $('#sidebar-total');
    if (!list) return;
    const totalQ = QUESTIONS.length;
    if (total) total.textContent = `${Object.keys(CATEGORIES).length} 个分类 / ${totalQ} 题`;

    list.innerHTML = '';

    // "全部" 项
    const allItem = document.createElement('div');
    allItem.className = 'cat-item' + (State.currentCat === 'all' ? ' active' : '');
    allItem.dataset.cat = 'all';
    allItem.innerHTML = `
      <span class="cat-dot" style="background:var(--accent)"></span>
      <span class="cat-name">全部题目</span>
      <span class="cat-count">${totalQ}</span>
    `;
    list.appendChild(allItem);

    // 24分类
    Object.entries(CATEGORIES).forEach(([key, meta]) => {
      if (meta.count === 0) return;
      const item = document.createElement('div');
      item.className = 'cat-item' + (State.currentCat === key ? ' active' : '');
      item.dataset.cat = key;
      item.innerHTML = `
        <span class="cat-dot" style="background:${meta.color}"></span>
        <span class="cat-name">${meta.name}</span>
        <span class="cat-count">${meta.count}</span>
      `;
      list.appendChild(item);
    });

    // 点击事件
    list.addEventListener('click', e => {
      const item = e.target.closest('.cat-item');
      if (!item) return;
      const cat = item.dataset.cat;
      State.currentCat = cat;
      $$('.cat-item').forEach(c => c.classList.toggle('active', c.dataset.cat === cat));
      loadQuestionList();
    });
  }

  // ============ 加载题目列表（按分类/搜索筛选） ============
  function loadQuestionList() {
    let list;
    if (State.currentCat === 'all') {
      list = QUESTIONS.slice();
    } else {
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
      list = list.map(v => ({ v, r: Math.random() })).sort((a, b) => a.r - b.r).map(o => o.v);
    }
    State.currentList = list;
    State.currentIdx = 0;
    renderQuestion();
    updateNavMeta();
    updateHomeStats();
  }

  // ============ 渲染当前题目 ============
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
    const catName = State.currentCat === 'all'
      ? '全部题目'
      : (CATEGORIES[State.currentCat]?.name || '全部');
    $('#practice-cat-tag').textContent = catName;

    // 进度条
    const pct = total > 0 ? ((idx + 1) / total * 100) : 0;
    $('#progress-fill').style.width = pct + '%';

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

    // 图像题：显示实际图片或占位符（控制高度避免长图导致滚动）
    const imgWrap = $('#q-image-wrap');
    imgWrap.className = 'q-image-wrap';
    if (q.image) {
      imgWrap.style.display = 'block';
      imgWrap.innerHTML = '<img class="q-image" src="' + q.image + '" alt="题目图片" loading="lazy" onerror="this.parentNode.innerHTML=\'[ 图片加载失败 ]\'; this.parentNode.classList.add(\'q-image-placeholder\')">';
    } else if (q.is_image_question) {
      imgWrap.style.display = 'block';
      imgWrap.classList.add('q-image-placeholder');
      imgWrap.innerHTML = '[ 图像题 · 图片暂缺 ]';
    } else {
      imgWrap.style.display = 'none';
    }

    // 选项
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
        if (answered) {
          item.classList.add('disabled');
          if (val === q.answer) item.classList.add('correct');
          else if (val === record.selected) item.classList.add('wrong');
        }
        item.innerHTML = `
          <span class="opt-letter">${val ? '√' : '×'}</span>
          <span class="opt-text">${label}</span>
        `;
        item.addEventListener('click', () => onAnswer(q, val, item));
        optsEl.appendChild(item);
      });
    } else {
      const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
      (q.options || []).forEach((opt, i) => {
        const item = document.createElement('div');
        item.className = 'opt-item';
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
        optsEl.appendChild(item);
      });
    }

    // 引导区与结果区显示控制
    const guideEl = $('#q-guide');
    const resultEl = $('#q-result');
    const bookmarkBtn = $('#btn-bookmark');

    if (answered) {
      // 已答题：显示结果区，隐藏引导区
      if (guideEl) guideEl.style.display = 'none';
      showResult(q, record);
    } else {
      // 未答题：显示引导区，隐藏结果区
      if (guideEl) guideEl.style.display = 'flex';
      if (resultEl) resultEl.style.display = 'none';
    }

    // 收藏按钮状态
    if (bookmarkBtn) {
      bookmarkBtn.classList.toggle('active', !!State.bookmarks[q.id]);
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
  function onAnswer(q, selected, itemEl) {
    if (State.answered[q.id]) return; // 已答过不可改
    const correct = selected === q.answer;
    State.answered[q.id] = { selected, correct };
    Store.set('kemu1_answered', State.answered);

    // 标记选项
    const optsEl = $('#q-options');
    $$('.opt-item', optsEl).forEach(el => el.classList.add('disabled'));

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

    toast(correct ? '回答正确' : '回答错误', correct ? 'success' : 'error');
  }

  // 显示答案（引导型：不答题直接查看答案与解析）
  function showAnswerDirectly() {
    const list = State.currentList;
    if (!list.length) return;
    const q = list[State.currentIdx];
    if (State.answered[q.id]) return; // 已答过不再处理

    // 标记为"已查看"（记为答错，鼓励用户主动学习）
    State.answered[q.id] = { selected: -1, correct: false, viewed: true };
    Store.set('kemu1_answered', State.answered);

    // 标记正确答案
    const optsEl = $('#q-options');
    $$('.opt-item', optsEl).forEach(el => el.classList.add('disabled'));
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

    // 隐藏引导区，显示结果区（标记为"查看答案"状态）
    $('#q-guide').style.display = 'none';
    showResult(q, { selected: -1, correct: false, viewed: true });
    updateNavMeta();
    updateHomeStats();
    toast('已显示答案', 'info');
  }

  // 显示答题结果：状态条 + Tab切换（解析/口诀）
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
      // 查看答案模式
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

    // 解析面板
    const analysisText = $('#analysis-text');
    if (q.analysis) {
      analysisText.innerHTML = highlightKeywords(q.analysis, q.keywords || []);
    } else {
      analysisText.innerHTML = '<span class="hint-empty">暂无解析</span>';
    }

    // 口诀面板
    const relatedMnemonics = findRelatedMnemonics(q);
    const hintContent = $('#hint-content');
    const mnemonicBadge = $('#mnemonic-badge');
    const tabMnemonic = $('#tab-mnemonic');

    if (relatedMnemonics.length) {
      const html = relatedMnemonics.slice(0, 3).map(m => `
        <div class="hint-block">
          <span class="hint-text">${escapeHtml(m.text)}</span>
          <div class="hint-explain">${escapeHtml(m.explain)}</div>
        </div>
      `).join('');
      hintContent.innerHTML = html;
      if (mnemonicBadge) {
        mnemonicBadge.textContent = relatedMnemonics.length;
        mnemonicBadge.style.display = 'inline-grid';
      }
      if (tabMnemonic) tabMnemonic.style.opacity = '1';
    } else {
      hintContent.innerHTML = '<span class="hint-empty">本题暂无匹配口诀</span>';
      if (mnemonicBadge) mnemonicBadge.style.display = 'none';
      if (tabMnemonic) tabMnemonic.style.opacity = '0.5';
    }

    // 默认切换到解析 Tab
    switchTab('analysis');
  }

  // Tab 切换
  function switchTab(name) {
    $$('.q-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    $$('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + name));
  }

  // 收藏/取消收藏
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
    if (btn) btn.classList.toggle('active', !isBookmarked);
    toast(isBookmarked ? '已取消收藏' : '已收藏题目', 'info');
  }

  // 根据题目tags查找相关口诀
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
    const acc = answeredCount > 0 ? Math.round(correctCount / answeredCount * 100) + '%' : '—';
    const navAcc = $('#nav-accuracy');
    if (navAcc) navAcc.textContent = acc;
  }

  // ============ 口诀总览渲染 ============
  function renderMnemonics() {
    const grid = $('#mnemonics-grid');
    const filterBar = $('#mnemonics-filter');
    if (!grid || !filterBar) return;

    // 统计每分类口诀数
    const counts = {};
    MNEMONICS.forEach(m => { counts[m.cat] = (counts[m.cat] || 0) + 1; });

    // 渲染筛选器
    const chips = [`<button class="filter-chip active" data-cat="all">全部 <span class="chip-count">${MNEMONICS.length}</span></button>`];
    Object.entries(CATEGORIES).forEach(([key, meta]) => {
      if (!counts[key]) return;
      chips.push(`<button class="filter-chip" data-cat="${key}">${meta.name} <span class="chip-count">${counts[key]}</span></button>`);
    });
    filterBar.innerHTML = chips.join('');

    // 筛选事件
    filterBar.onclick = e => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;
      $$('.filter-chip', filterBar).forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const cat = chip.dataset.cat;
      renderMnemonicCards(cat);
    };

    renderMnemonicCards('all');
  }

  function renderMnemonicCards(cat) {
    const grid = $('#mnemonics-grid');
    const list = cat === 'all' ? MNEMONICS : MNEMONICS.filter(m => m.cat === cat);
    grid.innerHTML = list.map(m => {
      const meta = CATEGORIES[m.cat] || { name: m.cat, color: '#f59e0b' };
      const color = meta.color;
      const colorBg = hexToRgba(color, 0.12);
      return `
        <article class="mnemonic-card" style="--card-color:${color};--card-color-bg:${colorBg}">
          <div class="m-card-header">
            <span class="m-card-cat">${meta.name}</span>
            <span class="m-card-badge">口诀</span>
          </div>
          <h3 class="m-card-title">${escapeHtml(m.title)}</h3>
          <div class="m-card-text">${escapeHtml(m.text)}</div>
          <p class="m-card-explain">${escapeHtml(m.explain)}</p>
          ${(m.details || []).length ? `
          <ul class="m-card-details">
            ${m.details.map(d => `<li>${escapeHtml(d)}</li>`).join('')}
          </ul>` : ''}
        </article>
      `;
    }).join('');
  }

  // ============ 分类导航渲染 ============
  function renderCategories() {
    const grid = $('#categories-grid');
    if (!grid) return;
    const entries = Object.entries(CATEGORIES).filter(([k, m]) => m.count > 0);
    grid.innerHTML = entries.map(([key, meta], i) => {
      const colorBg = hexToRgba(meta.color, 0.10);
      const answered = Object.values(State.answered).filter(r => {
        // 简单统计：通过题目id匹配（这里仅显示总数，不精确）
        return false;
      }).length;
      return `
        <article class="category-card" data-cat="${key}" style="--cat-color:${meta.color};--cat-color-bg:${colorBg}">
          <div class="cat-card-num">${String(i + 1).padStart(2, '0')} / ${String(entries.length).padStart(2, '0')}</div>
          <h3 class="cat-card-name">${meta.name}</h3>
          <div class="cat-card-count"><span class="num">${meta.count}</span> 道题目</div>
          <p class="cat-card-desc">点击进入「${meta.name}」分类题目练习，配套口诀速记。</p>
          <div class="cat-card-arrow">→</div>
        </article>
      `;
    }).join('');

    grid.onclick = e => {
      const card = e.target.closest('.category-card');
      if (!card) return;
      const cat = card.dataset.cat;
      State.currentCat = cat;
      switchView('practice');
      // 同步侧栏激活
      $$('.cat-item').forEach(c => c.classList.toggle('active', c.dataset.cat === cat));
      loadQuestionList();
      toast(`已切换至「${CATEGORIES[cat]?.name || '分类'}」`);
    };
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

    // 上一题/下一题
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

    // Tab 切换
    const qTabs = $('#q-tabs');
    if (qTabs) qTabs.addEventListener('click', e => {
      const tab = e.target.closest('.q-tab');
      if (!tab) return;
      switchTab(tab.dataset.tab);
    });

    // 乱序切换（active态明显标识）
    const btnShuffle = $('#btn-shuffle');
    if (btnShuffle) btnShuffle.addEventListener('click', () => {
      State.shuffle = !State.shuffle;
      btnShuffle.classList.toggle('active', State.shuffle);
      loadQuestionList();
      toast(State.shuffle ? '已开启乱序' : '已关闭乱序');
    });

    // 重置进度
    const btnReset = $('#btn-reset');
    if (btnReset) btnReset.addEventListener('click', () => {
      if (!confirm('确定要清空所有答题进度吗？此操作不可撤销。')) return;
      State.answered = {};
      Store.set('kemu1_answered', {});
      renderQuestion();
      updateNavMeta();
      updateHomeStats();
      toast('进度已重置', 'success');
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

    // 滚动毛玻璃效果
    window.addEventListener('scroll', () => {
      const nav = $('#topnav');
      if (!nav) return;
      if (window.scrollY > 10) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    });

    // 键盘快捷键（仅练习视图生效）
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (State.view !== 'practice') return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); btnPrev?.click(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); btnNext?.click(); }
      else if (e.key === '1' || e.key === 'a' || e.key === 'A') {
        const opts = $$('.opt-item');
        if (opts[0] && !opts[0].classList.contains('disabled')) opts[0].click();
      } else if (e.key === '2' || e.key === 'b' || e.key === 'B') {
        const opts = $$('.opt-item');
        if (opts[1] && !opts[1].classList.contains('disabled')) opts[1].click();
      } else if (e.key === '3' || e.key === 'c' || e.key === 'C') {
        const opts = $$('.opt-item');
        if (opts[2] && !opts[2].classList.contains('disabled')) opts[2].click();
      } else if (e.key === '4' || e.key === 'd' || e.key === 'D') {
        const opts = $$('.opt-item');
        if (opts[3] && !opts[3].classList.contains('disabled')) opts[3].click();
      }
    });

    // URL hash 路由
    window.addEventListener('hashchange', () => {
      const hash = location.hash.replace('#', '');
      if (['home', 'practice', 'mnemonics', 'categories'].includes(hash) && hash !== State.view) {
        switchView(hash);
      }
    });
  }

  // ============ 初始化 ============
  function init() {
    // 应用主题
    applyTheme(State.theme);

    // 渲染各视图
    renderHome();
    renderSidebar();
    loadQuestionList();
    updateNavMeta();
    bindEvents();

    // 根据URL hash决定初始视图，默认主页
    const hash = location.hash.replace('#', '');
    const initialView = ['home', 'practice', 'mnemonics', 'categories'].includes(hash) ? hash : 'home';
    switchView(initialView);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
