/* ===================================================================
   科目一教考 · 应用逻辑
   - 三视图SPA：题库练习 / 口诀总览 / 分类导航
   - 1964题完整题库 + 76条口诀 + 24分类
   - 关键词高亮 + 口诀提示 + 进度记忆
   =================================================================== */
'use strict';

(function () {

  // ============ 工具函数 ============
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // 安全转义HTML
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
  // 规则：根据题目所属tags取对应关键词列表，匹配则用<kw>包裹
  function highlightKeywords(text, keywords) {
    if (!text || !keywords || !keywords.length) return escapeHtml(text);
    let html = escapeHtml(text);

    // 按长度降序，避免短词覆盖长词
    const sorted = [...new Set(keywords)].sort((a, b) => b.length - a.length);
    // 危险词（红）
    const danger = ['饮酒', '醉酒', '酒驾', '醉驾', '肇事逃逸', '逃逸', '违法', '伪造', '变造', '吊销', '撤销'];
    // 数字类（蓝）
    const numRe = /^(\d+)\s*(km\/h|公里|米|分|元)?$/i;

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

  // ============ 应用状态 ============
  const State = {
    view: 'practice',          // 当前视图 practice/mnemonics/categories
    currentCat: 'all',         // 当前分类
    currentList: [],           // 当前题目列表（按分类筛选后）
    currentIdx: 0,             // 当前题目在list中的索引
    answered: Store.get('kemu1_answered', {}),  // {qid: {selected, correct}}
    searchQuery: '',
    shuffle: false
  };

  // 主题色 → rgba 背景渐变
  function hexToRgba(hex, alpha = 1) {
    const m = hex.replace('#', '');
    const r = parseInt(m.substring(0, 2), 16);
    const g = parseInt(m.substring(2, 4), 16);
    const b = parseInt(m.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // ============ 视图切换 ============
  function switchView(name) {
    State.view = name;
    $$('.view').forEach(v => v.classList.remove('active'));
    $('#view-' + name).classList.add('active');
    $$('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.view === name));
    // 滚动到顶
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // 视图初始化
    if (name === 'mnemonics') renderMnemonics();
    else if (name === 'categories') renderCategories();
  }

  // ============ 分类侧栏渲染 ============
  function renderSidebar() {
    const list = $('#category-list');
    const total = $('#sidebar-total');
    const totalQ = QUESTIONS.length;
    total.textContent = `${Object.keys(CATEGORIES).length} 个分类 / ${totalQ} 题`;

    // "全部" 项
    const allItem = document.createElement('div');
    allItem.className = 'cat-item' + (State.currentCat === 'all' ? ' active' : '');
    allItem.dataset.cat = 'all';
    allItem.innerHTML = `
      <span class="cat-dot" style="background:${hexToRgba('#f59e0b', 0.9)}"></span>
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
  }

  // ============ 渲染当前题目 ============
  function renderQuestion() {
    const list = State.currentList;
    const total = list.length;
    if (total === 0) {
      $('#q-text').innerHTML = '<span style="color:var(--paper-mute)">未找到匹配题目，请尝试其他关键词或分类。</span>';
      $('#q-options').innerHTML = '';
      $('#q-meta').innerHTML = '';
      $('#q-image-wrap').style.display = 'none';
      $('#q-feedback').style.display = 'none';
      $('#q-analysis').style.display = 'none';
      $('#q-mnemonic-hint').style.display = 'none';
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

    // 题干
    const kwList = q.keywords || [];
    $('#q-text').innerHTML = highlightKeywords(q.question, kwList);

    // 图像题：显示实际图片或占位符
    const imgWrap = $('#q-image-wrap');
    if (q.image) {
      imgWrap.style.display = 'block';
      imgWrap.innerHTML = '<img class="q-image" src="' + q.image + '" alt="题目图片" loading="lazy" onerror="this.parentNode.innerHTML=\'[ 图片加载失败 ]\'; this.parentNode.classList.add(\'q-image-placeholder\')">';
    } else if (q.is_image_question) {
      imgWrap.style.display = 'block';
      imgWrap.className = 'q-image-wrap q-image-placeholder';
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

    // 反馈、解析、口诀
    const fbEl = $('#q-feedback');
    const anEl = $('#q-analysis');
    const hintEl = $('#q-mnemonic-hint');

    if (answered) {
      showFeedback(q, record);
    } else {
      fbEl.style.display = 'none';
      anEl.style.display = 'none';
      hintEl.style.display = 'none';
    }

    // 卡片进入动画
    const card = $('#question-card');
    card.classList.remove('active');
    void card.offsetWidth;
    card.classList.add('active');
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

    showFeedback(q, { selected, correct });
    updateNavMeta();

    if (correct) {
      toast('回答正确', 'success');
    } else {
      toast('回答错误', 'error');
    }
  }

  function showFeedback(q, record) {
    const fbEl = $('#q-feedback');
    const anEl = $('#q-analysis');
    const hintEl = $('#q-mnemonic-hint');

    fbEl.style.display = 'flex';
    fbEl.className = 'q-feedback ' + (record.correct ? 'correct' : 'wrong');
    const correctText = q.type === 'judge'
      ? (q.answer ? '正确' : '错误')
      : ['A', 'B', 'C', 'D', 'E', 'F'][q.answer] + ' · ' + (q.options?.[q.answer] || '');
    fbEl.innerHTML = record.correct
      ? `<span>✓</span><span>回答正确</span><span style="margin-left:auto;color:var(--paper-mute);font-size:0.85rem">正确答案：${correctText}</span>`
      : `<span>✗</span><span>回答错误</span><span style="margin-left:auto;color:var(--paper-mute);font-size:0.85rem">正确答案：${correctText}</span>`;

    // 解析
    if (q.analysis) {
      anEl.style.display = 'block';
      $('#analysis-text').innerHTML = highlightKeywords(q.analysis, q.keywords || []);
    } else {
      anEl.style.display = 'none';
    }

    // 口诀提示：根据题目tags匹配相关口诀
    const relatedMnemonics = findRelatedMnemonics(q);
    if (relatedMnemonics.length) {
      hintEl.style.display = 'block';
      const content = $('#hint-content');
      const html = relatedMnemonics.slice(0, 2).map(m => `
        <span class="hint-text">${escapeHtml(m.text)}</span>
        <div>${escapeHtml(m.explain)}</div>
      `).join('<hr style="border:none;border-top:1px dashed var(--line);margin:0.6rem 0">');
      content.innerHTML = html;
    } else {
      hintEl.style.display = 'none';
    }
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
    $('#nav-progress').textContent = answeredCount;
    const acc = answeredCount > 0 ? Math.round(correctCount / answeredCount * 100) + '%' : '—';
    $('#nav-accuracy').textContent = acc;
  }

  // ============ 口诀总览渲染 ============
  function renderMnemonics() {
    const grid = $('#mnemonics-grid');
    const filterBar = $('#mnemonics-filter');

    // 统计每分类口诀数
    const counts = {};
    MNEMONICS.forEach(m => { counts[m.cat] = (counts[m.cat] || 0) + 1; });

    // 渲染筛选器（首次或重建）
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
    grid.innerHTML = list.map((m, i) => {
      const meta = CATEGORIES[m.cat] || { name: m.cat, color: '#f59e0b' };
      const color = meta.color;
      const colorBg = hexToRgba(color, 0.15);
      return `
        <article class="mnemonic-card" style="--card-color:${color};--card-color-bg:${colorBg}">
          <div class="m-card-cat">${meta.name}</div>
          <h3 class="m-card-title">${escapeHtml(m.title)}</h3>
          <span class="m-card-text">${escapeHtml(m.text)}</span>
          <p class="m-card-explain">${escapeHtml(m.explain)}</p>
          <ul class="m-card-details">
            ${(m.details || []).map(d => `<li>${escapeHtml(d)}</li>`).join('')}
          </ul>
        </article>
      `;
    }).join('');
  }

  // ============ 分类导航渲染 ============
  function renderCategories() {
    const grid = $('#categories-grid');
    const entries = Object.entries(CATEGORIES);
    grid.innerHTML = entries.map(([key, meta], i) => {
      const colorBg = hexToRgba(meta.color, 0.10);
      return `
        <article class="category-card" data-cat="${key}" style="--cat-color:${meta.color};--cat-color-bg:${colorBg}">
          <div class="cat-card-num">${String(i + 1).padStart(2, '0')} / ${String(entries.length).padStart(2, '0')}</div>
          <h3 class="cat-card-name">${meta.name}</h3>
          <div class="cat-card-count"><span class="num">${meta.count}</span>道题目</div>
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
      toast(`已切换至「${CATEGORIES[cat].name}」分类`);
    };
  }

  // ============ 事件绑定 ============
  function bindEvents() {
    // 导航切换
    $$('.nav-link').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        switchView(link.dataset.view);
      });
    });

    // 上一题/下一题
    $('#btn-prev').addEventListener('click', () => {
      if (State.currentIdx > 0) {
        State.currentIdx--;
        renderQuestion();
      } else {
        toast('已经是第一题');
      }
    });
    $('#btn-next').addEventListener('click', () => {
      if (State.currentIdx < State.currentList.length - 1) {
        State.currentIdx++;
        renderQuestion();
      } else {
        toast('已经是最后一题');
      }
    });

    // 乱序切换
    $('#btn-shuffle').addEventListener('click', () => {
      State.shuffle = !State.shuffle;
      $('#btn-shuffle').style.color = State.shuffle ? 'var(--amber-glow)' : '';
      $('#btn-shuffle').style.borderColor = State.shuffle ? 'var(--amber)' : '';
      loadQuestionList();
      toast(State.shuffle ? '已开启乱序' : '已关闭乱序');
    });

    // 重置进度
    $('#btn-reset').addEventListener('click', () => {
      if (!confirm('确定要清空所有答题进度吗？此操作不可撤销。')) return;
      State.answered = {};
      Store.set('kemu1_answered', {});
      renderQuestion();
      updateNavMeta();
      toast('进度已重置', 'success');
    });

    // 题号跳转
    $('#jump-btn').addEventListener('click', () => {
      const input = $('#jump-input');
      const n = parseInt(input.value, 10);
      if (isNaN(n) || n < 1 || n > State.currentList.length) {
        toast('请输入有效题号', 'error');
        return;
      }
      State.currentIdx = n - 1;
      renderQuestion();
      input.value = '';
    });
    $('#jump-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') $('#jump-btn').click();
    });

    // 搜索
    let searchTimer = null;
    $('#search-input').addEventListener('input', e => {
      const val = e.target.value;
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        State.searchQuery = val;
        loadQuestionList();
      }, 220);
    });

    // 滚动毛玻璃效果
    const sidebar = $('.practice-main');
    if (sidebar) {
      sidebar.addEventListener('scroll', () => {
        const nav = $('#topnav');
        if (sidebar.scrollTop > 10) nav.classList.add('scrolled');
        else nav.classList.remove('scrolled');
      });
    }
    window.addEventListener('scroll', () => {
      const nav = $('#topnav');
      if (window.scrollY > 10) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    });

    // 键盘快捷键
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (State.view !== 'practice') return;
      if (e.key === 'ArrowLeft') $('#btn-prev').click();
      else if (e.key === 'ArrowRight') $('#btn-next').click();
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
  }

  // ============ 初始化 ============
  function init() {
    renderSidebar();
    loadQuestionList();
    updateNavMeta();
    bindEvents();
    // 默认进入答题视图
    switchView('practice');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
