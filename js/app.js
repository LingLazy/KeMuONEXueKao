/* ===================================================================
   科目一教考 · 应用逻辑 v2
   - 五视图SPA：主页 / 题库练习 / 模拟考试 / 口诀总览 / 分类导航
   - 1964题完整题库 + 76条口诀 + 24分类
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

  /** 渲染热门分类（取题目数最多的8个分类） */
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
        <article class="hotcat-card nf-card-sheen" data-cat="${key}" style="--cat-color:${meta.color};--cat-color-bg:${colorBg};animation-delay:${i * 40}ms" tabindex="0" role="button" aria-label="进入${escapeHtml(meta.name)}分类">
          <div class="hotcat-icon">
            <span class="hotcat-num">${String(i + 1).padStart(2, '0')}</span>
          </div>
          <h3 class="hotcat-name">${escapeHtml(meta.name)}</h3>
          <div class="hotcat-count"><span class="num">${meta.count}</span> 题</div>
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

  /** 进入指定分类练习 */
  function enterCategory(cat) {
    State.currentCat = cat;
    switchView('practice');
    $$('.cat-item').forEach(c => c.classList.toggle('active', c.dataset.cat === cat));
    loadQuestionList();
    toast(`已切换至「${CATEGORIES[cat]?.name || '分类'}」`);
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
    if (cEl) cEl.textContent = Object.keys(CATEGORIES).length;
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

  // ============ 练习视图：分类侧栏 ============
  /** 渲染分类侧栏 */
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
    allItem.setAttribute('role', 'option');
    allItem.tabIndex = 0;
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
      item.setAttribute('role', 'option');
      item.tabIndex = 0;
      item.innerHTML = `
        <span class="cat-dot" style="background:${meta.color}"></span>
        <span class="cat-name">${escapeHtml(meta.name)}</span>
        <span class="cat-count">${meta.count}</span>
      `;
      list.appendChild(item);
    });

    // 点击事件（通过 dataset.bound 标记避免重复绑定）
    if (list.dataset.bound === '1') return;
    list.addEventListener('click', e => {
      const item = e.target.closest('.cat-item');
      if (!item) return;
      const cat = item.dataset.cat;
      if (cat === State.currentCat) return;
      State.currentCat = cat;
      $$('.cat-item').forEach(c => c.classList.toggle('active', c.dataset.cat === State.currentCat));
      loadQuestionList();
      const catName = cat === 'all' ? '全部题目' : (CATEGORIES[cat]?.name || '分类');
      toast(`已切换至「${catName}」`);
    });
    list.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        const item = e.target.closest('.cat-item');
        if (item) { e.preventDefault(); item.click(); }
      }
    });
    list.dataset.bound = '1';
  }

  // ============ 练习视图：题目加载与渲染 ============
  /** 按分类/搜索/乱序加载题目列表 */
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
      imgWrap.innerHTML = '[ 图像题 · 图片暂缺 ]';
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
   * - 状态条（正确/错误/查看答案）
   * - 口诀常驻区（独立，简短不占空间）
   * - 解析折叠区（独立，默认折叠，点击展开）
   * 关键：口诀与解析完全独立判别
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

    // 口诀常驻区（独立，简短显示）
    const relatedMnemonics = findRelatedMnemonics(q);
    const mnemonicInline = $('#q-mnemonic-inline');
    const mnemonicContent = $('#mnemonic-inline-content');

    if (relatedMnemonics.length && mnemonicInline && mnemonicContent) {
      const firstMnemonic = relatedMnemonics[0];
      const extraCount = relatedMnemonics.length - 1;
      mnemonicContent.innerHTML = `
        <div class="mnemonic-quick">
          <span class="mnemonic-quick-text">${escapeHtml(firstMnemonic.text)}</span>
          ${extraCount > 0 ? `<span class="mnemonic-quick-more" title="共${relatedMnemonics.length}条相关口诀">+${extraCount}</span>` : ''}
        </div>
      `;
      mnemonicInline.style.display = 'flex';
    } else if (mnemonicInline) {
      mnemonicInline.style.display = 'none';
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
    raw: '',            // 原始 markdown 文本
    chapters: [],       // 解析后的章节 [{id, title, html, text}]
    loaded: false,      // 是否已加载
    filter: ''          // 搜索关键词
  };

  /**
   * 轻量 Markdown 解析器
   * 支持：标题(h1-h4)、无序列表、有序列表、引用块、分割线、表格、加粗、行内代码、段落
   * 输入：md 原始 markdown 字符串
   * 返回：HTML 字符串
   */
  function parseMarkdown(md) {
    if (!md) return '';
    const lines = md.split('\n');
    const html = [];
    let i = 0;
    let inList = false;       // 当前是否在无序列表中
    let inOrderedList = false; // 当前是否在有序列表中
    let listType = '';        // 'ul' | 'ol'

    /** 关闭当前列表 */
    const closeList = () => {
      if (inList || inOrderedList) {
        html.push(`</${listType}>`);
        inList = false;
        inOrderedList = false;
      }
    };

    /** 行内格式化：加粗、行内代码、链接 */
    const inline = (text) => {
      let s = escapeHtml(text);
      // 行内代码 `code`
      s = s.replace(/`([^`]+)`/g, '<code class="md-code">$1</code>');
      // 加粗 **text**
      s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      return s;
    };

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // 空行
      if (!trimmed) {
        closeList();
        i++;
        continue;
      }

      // 分割线 ---
      if (/^---+$/.test(trimmed)) {
        closeList();
        html.push('<hr class="md-hr">');
        i++;
        continue;
      }

      // 标题 # ## ### ####
      const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
      if (headingMatch) {
        closeList();
        const level = headingMatch[1].length;
        const text = headingMatch[2];
        // 生成锚点ID（去除特殊字符）
        const id = text.replace(/[<>！？，。、（）【】《》""'']/g, '').replace(/\s+/g, '-').substring(0, 40);
        html.push(`<h${level} class="md-h md-h${level}" id="md-${id}">${inline(text)}</h${level}>`);
        i++;
        continue;
      }

      // 引用块 >
      if (trimmed.startsWith('>')) {
        closeList();
        const quoteText = trimmed.replace(/^>\s?/, '');
        html.push(`<blockquote class="md-quote">${inline(quoteText)}</blockquote>`);
        i++;
        continue;
      }

      // 表格 | a | b |
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        closeList();
        // 检查下一行是否是分隔行 |---|---|
        const nextLine = (lines[i + 1] || '').trim();
        if (/^\|[\s-:|]+\|$/.test(nextLine)) {
          const headers = trimmed.split('|').slice(1, -1).map(c => c.trim());
          const rows = [];
          i += 2;
          while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
            rows.push(lines[i].trim().split('|').slice(1, -1).map(c => c.trim()));
            i++;
          }
          let tableHtml = '<div class="md-table-wrap"><table class="md-table"><thead><tr>';
          headers.forEach(h => { tableHtml += `<th>${inline(h)}</th>`; });
          tableHtml += '</tr></thead><tbody>';
          rows.forEach(row => {
            tableHtml += '<tr>';
            row.forEach(cell => { tableHtml += `<td>${inline(cell)}</td>`; });
            tableHtml += '</tr>';
          });
          tableHtml += '</tbody></table></div>';
          html.push(tableHtml);
          continue;
        }
      }

      // 无序列表 - * +
      const ulMatch = trimmed.match(/^[-*+]\s+(.+)$/);
      if (ulMatch) {
        if (!inList) {
          closeList();
          html.push('<ul class="md-ul">');
          inList = true;
          listType = 'ul';
        }
        html.push(`<li>${inline(ulMatch[1])}</li>`);
        i++;
        continue;
      }

      // 有序列表 1. 2.
      const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);
      if (olMatch) {
        if (!inOrderedList) {
          closeList();
          html.push('<ol class="md-ol">');
          inOrderedList = true;
          listType = 'ol';
        }
        html.push(`<li>${inline(olMatch[1])}</li>`);
        i++;
        continue;
      }

      // 普通段落
      closeList();
      html.push(`<p class="md-p">${inline(trimmed)}</p>`);
      i++;
    }
    closeList();
    return html.join('\n');
  }

  /**
   * 从 markdown 中提取章节（## 二级标题）
   * 返回：[{id, title, html, text}] 数组
   */
  function extractChapters(md) {
    if (!md) return [];
    const lines = md.split('\n');
    const chapters = [];
    let current = null;     // 当前章节 {title, startLine}
    let buffer = [];        // 当前章节内容行

    lines.forEach((line, idx) => {
      const match = line.match(/^##\s+(.+)$/);
      if (match) {
        // 保存上一章
        if (current) {
          const content = buffer.join('\n');
          chapters.push({
            id: 'md-' + current.title.replace(/[<>！？，。、（）【】《》""'']/g, '').replace(/\s+/g, '-').substring(0, 40),
            title: current.title,
            html: parseMarkdown(content),
            text: content.replace(/[#*>`|]/g, '').trim()
          });
        }
        current = { title: match[1].trim(), startLine: idx };
        buffer = [];
      } else if (current) {
        buffer.push(line);
      }
    });
    // 保存最后一章
    if (current) {
      const content = buffer.join('\n');
      chapters.push({
        id: 'md-' + current.title.replace(/[<>！？，。、（）【】《》""'']/g, '').replace(/\s+/g, '-').substring(0, 40),
        title: current.title,
        html: parseMarkdown(content),
        text: content.replace(/[#*>`|]/g, '').trim()
      });
    }
    return chapters;
  }

  /**
   * 渲染知识学习视图
   * 流程：加载markdown → 解析章节 → 渲染目录TOC + 内容
   * 支持搜索过滤章节
   */
  async function renderKnowledge() {
    const contentEl = $('#knowledge-content');
    const tocEl = $('#knowledge-toc');
    const countEl = $('#knowledge-count');
    if (!contentEl || !tocEl) return;

    // 首次进入：加载并解析 markdown
    if (!KnowledgeState.loaded) {
      contentEl.innerHTML = '<div class="loading-state">正在加载知识点...</div>';
      try {
        const resp = await fetch('docs/knowledge.md');
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        KnowledgeState.raw = await resp.text();
        KnowledgeState.chapters = extractChapters(KnowledgeState.raw);
        KnowledgeState.loaded = true;
      } catch (err) {
        contentEl.innerHTML = '<div class="empty-state">知识点加载失败：' + escapeHtml(err.message) + '<br>请刷新页面重试。</div>';
        return;
      }
    }

    const chapters = KnowledgeState.chapters;
    if (!chapters.length) {
      contentEl.innerHTML = '<div class="empty-state">暂无知识点内容</div>';
      return;
    }

    // 更新章节计数
    if (countEl) countEl.textContent = chapters.length + ' 章';

    // 搜索过滤
    const q = KnowledgeState.filter.trim().toLowerCase();
    const filtered = q
      ? chapters.filter(c =>
          c.title.toLowerCase().includes(q) || c.text.toLowerCase().includes(q)
        )
      : chapters;

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

    // 渲染右侧内容
    if (!filtered.length) {
      contentEl.innerHTML = '<div class="empty-state">未找到匹配的知识点</div>';
      return;
    }

    contentEl.innerHTML = filtered.map((c, i) => `
      <section class="md-chapter nf-rise-in" id="${c.id}" style="animation-delay:${Math.min(i * 50, 400)}ms">
        ${c.html}
      </section>
    `).join('');

    // 滚动监听：高亮当前可见章节的目录项
    if (!KnowledgeState._scrollBound) {
      KnowledgeState._scrollBound = true;
      let scrollTimer = null;
      window.addEventListener('scroll', () => {
        if (State.view !== 'knowledge') return;
        if (scrollTimer) clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
          const navH = 56 + 20;
          let activeId = null;
          for (const c of filtered) {
            const el = document.getElementById(c.id);
            if (!el) continue;
            const rect = el.getBoundingClientRect();
            if (rect.top <= navH && rect.bottom > navH) {
              activeId = c.id;
              break;
            }
          }
          if (activeId) {
            $$('.knowledge-toc-item', tocEl).forEach(el => {
              el.classList.toggle('active', el.dataset.target === activeId);
            });
          }
        }, 80);
      }, { passive: true });
    }
  }

  // ============ 分类导航（紧凑双列网格，非卡片堆砌） ============
  /**
   * 渲染分类导航
   * 设计：桌面双列网格，每行紧凑展示编号+名称+题数+进度条
   * 去AI味：无卡片化、无translateX位移、用分隔线而非阴影
   */
  function renderCategories() {
    const tableEl = $('#categories-table');
    if (!tableEl) return;
    const entries = Object.entries(CATEGORIES).filter(([k, m]) => m.count > 0);

    tableEl.innerHTML = entries.map(([key, meta], i) => {
      const answeredInCat = (meta.ids || []).filter(id => State.answered[id]).length;
      const progressPct = meta.count > 0 ? Math.round(answeredInCat / meta.count * 100) : 0;
      const delay = i < 16 ? `${i * 25}ms` : '0ms';
      return `
        <div class="navcat-item nf-rise-in" data-cat="${key}" role="listitem" tabindex="0" style="--item-color:${meta.color};animation-delay:${delay}">
          <div class="navcat-num">${String(i + 1).padStart(2, '0')}</div>
          <div class="navcat-body">
            <div class="navcat-top">
              <span class="navcat-name">${escapeHtml(meta.name)}</span>
              <span class="navcat-count">${meta.count}<span class="navcat-unit">题</span></span>
            </div>
            <div class="navcat-progress">
              <div class="navcat-track" role="progressbar" aria-label="${escapeHtml(meta.name)}练习进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progressPct}">
                <div class="navcat-bar" style="width:${progressPct}%"></div>
              </div>
              <span class="navcat-done">${answeredInCat}/${meta.count}</span>
            </div>
          </div>
          <div class="navcat-arrow" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </div>
        </div>
      `;
    }).join('');

    tableEl.onclick = e => {
      const row = e.target.closest('.navcat-item');
      if (!row) return;
      enterCategory(row.dataset.cat);
    };
    tableEl.onkeydown = e => {
      if (e.key === 'Enter' || e.key === ' ') {
        const row = e.target.closest('.navcat-item');
        if (row) { e.preventDefault(); enterCategory(row.dataset.cat); }
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
      imgWrap.innerHTML = '';
      const imgEl = document.createElement('img');
      imgEl.className = 'exam-q-image';
      imgEl.src = q.image;
      imgEl.alt = '题目图片';
      imgEl.loading = 'lazy';
      imgEl.addEventListener('error', () => {
        imgWrap.innerHTML = '[ 图片加载失败 ]';
      });
      imgWrap.appendChild(imgEl);
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

  /** 考试答题 */
  function onExamAnswer(idx, selected) {
    State.exam.answers[idx] = selected;
    saveExamState();
    renderExamQuestion();
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
