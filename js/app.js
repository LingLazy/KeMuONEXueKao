/**
 * 科目一教考在线学习 - 应用逻辑模块
 *
 * 功能职责：
 * 1. 管理SPA模块切换（首页、口诀、练习、考试、记分、标志、新变化）
 * 2. 口诀背记模块的渲染与分类筛选
 * 3. 题目练习模块的答题交互与进度统计
 * 4. 模拟考试模块的随机抽题与成绩计算
 * 5. 记分管理、标志识别、2026新变化的数据渲染
 *
 * 数据来源：js/data.js 中定义的全局数据对象
 */

(function () {
  'use strict';

  // ==================== 应用状态管理 ====================

  /**
   * 全局应用状态对象
   * 记录当前模块、练习进度、考试状态等
   */
  const appState = {
    currentModule: 'home',
    practice: {
      currentIndex: 0,
      answered: 0,
      correct: 0,
      filter: 'all',
      filteredQuestions: []
    },
    exam: {
      questions: [],
      currentIndex: 0,
      answered: 0,
      correct: 0,
      userAnswers: [],
      isActive: false,
      isFinished: false
    }
  };

  // ==================== 工具函数 ====================

  /**
   * 安全地获取DOM元素
   * @param {string} selector - CSS选择器
   * @returns {Element|null} DOM元素或null
   */
  function getElement(selector) {
    return document.querySelector(selector);
  }

  /**
   * 创建带类名的DOM元素
   * @param {string} tag - 标签名
   * @param {string} className - 类名
   * @returns {HTMLElement} 创建的元素
   */
  function createElement(tag, className) {
    const el = document.createElement(tag);
    if (className) {
      el.className = className;
    }
    return el;
  }

  /**
   * HTML转义，防止XSS
   * @param {string} text - 需要转义的文本
   * @returns {string} 转义后的安全文本
   */
  function escapeHtml(text) {
    const div = createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Fisher-Yates 洗牌算法，用于随机打乱数组
   * @param {Array} arr - 待打乱的数组
   * @returns {Array} 打乱后的新数组
   */
  function shuffleArray(arr) {
    const result = arr.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  // ==================== 模块切换逻辑 ====================

  /**
   * 切换显示的模块
   * @param {string} moduleName - 模块名称
   */
  function switchModule(moduleName) {
    appState.currentModule = moduleName;

    // 切换导航标签激活状态
    document.querySelectorAll('.nav-tab').forEach(function (tab) {
      tab.classList.toggle('active', tab.dataset.module === moduleName);
    });

    // 切换模块内容显示
    document.querySelectorAll('.module-section').forEach(function (section) {
      section.classList.toggle('active', section.id === 'module-' + moduleName);
    });

    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ==================== 首页模块 ====================

  /**
   * 渲染首页统计数据与功能卡片
   */
  function renderHome() {
    // 统计口诀条数（所有口诀条目总数）
    const mnemonicCount = mnemonicsData.reduce(function (total, cat) {
      return total + cat.items.length;
    }, 0);

    // 统计题目数
    const questionCount = questionsData.length;

    // 统计记分规则项数
    const scoreRuleCount = scoreRulesData.reduce(function (total, rule) {
      return total + rule.items.length;
    }, 0);

    // 更新统计数字
    const statMnemonic = getElement('#stat-mnemonics');
    const statQuestion = getElement('#stat-questions');
    const statScore = getElement('#stat-score');

    if (statMnemonic) statMnemonic.textContent = mnemonicCount;
    if (statQuestion) statQuestion.textContent = questionCount;
    if (statScore) statScore.textContent = scoreRuleCount;
  }

  /**
   * 首页功能卡片点击跳转
   * @param {string} moduleName - 目标模块名
   */
  function navigateTo(moduleName) {
    switchModule(moduleName);
  }

  // ==================== 口诀背记模块 ====================

  /**
   * 渲染口诀背记模块
   * @param {string} filter - 分类筛选条件，'all' 表示全部
   */
  function renderMnemonics(filter) {
    appState.practice.filter = filter || 'all';
    const container = getElement('#mnemonics-container');
    if (!container) return;

    container.innerHTML = '';

    // 根据筛选条件过滤分类
    const filteredData = appState.practice.filter === 'all'
      ? mnemonicsData
      : mnemonicsData.filter(function (cat) {
        return cat.category === appState.practice.filter;
      });

    // 遍历分类渲染
    filteredData.forEach(function (category) {
      const categoryDiv = createElement('div', 'mnemonic-category');

      // 分类标题
      const title = createElement('h3', 'mnemonic-category-title');
      title.textContent = category.category;
      categoryDiv.appendChild(title);

      // 口诀卡片网格
      const grid = createElement('div', 'mnemonic-grid');

      category.items.forEach(function (item) {
        const card = createElement('div', 'mnemonic-card');

        // 口诀标题
        const cardTitle = createElement('h4', 'mnemonic-card-title');
        cardTitle.textContent = item.title;
        card.appendChild(cardTitle);

        // 口诀原文（高亮显示）
        const textDiv = createElement('div', 'mnemonic-text');
        textDiv.textContent = item.text;
        card.appendChild(textDiv);

        // 解释说明
        const explain = createElement('p', 'mnemonic-explain');
        explain.textContent = item.explain;
        card.appendChild(explain);

        // 详细条目列表
        const detailsList = createElement('ul', 'mnemonic-details');
        item.details.forEach(function (detail) {
          const li = createElement('li');
          li.textContent = detail;
          detailsList.appendChild(li);
        });
        card.appendChild(detailsList);

        grid.appendChild(card);
      });

      categoryDiv.appendChild(grid);
      container.appendChild(categoryDiv);
    });
  }

  /**
   * 初始化口诀分类筛选按钮
   */
  function initMnemonicFilters() {
    const filterBar = getElement('#mnemonic-filters');
    if (!filterBar) return;

    // "全部" 按钮
    const allBtn = createElement('button', 'filter-btn active');
    allBtn.textContent = '全部';
    allBtn.dataset.category = 'all';
    filterBar.appendChild(allBtn);

    // 各分类按钮
    mnemonicsData.forEach(function (cat) {
      const btn = createElement('button', 'filter-btn');
      btn.textContent = cat.category;
      btn.dataset.category = cat.category;
      filterBar.appendChild(btn);
    });

    // 绑定点击事件
    filterBar.addEventListener('click', function (e) {
      if (e.target.classList.contains('filter-btn')) {
        filterBar.querySelectorAll('.filter-btn').forEach(function (btn) {
          btn.classList.remove('active');
        });
        e.target.classList.add('active');
        renderMnemonics(e.target.dataset.category);
      }
    });
  }

  // ==================== 题目练习模块 ====================

  /**
   * 初始化题目练习模块
   * 根据筛选条件加载题目
   */
  function initPractice() {
    appState.practice.currentIndex = 0;
    appState.practice.answered = 0;
    appState.practice.correct = 0;
    appState.practice.filteredQuestions = getFilteredQuestions('all');
    renderPracticeQuestion();
  }

  /**
   * 根据筛选条件获取题目列表
   * @param {string} filter - 筛选条件
   * @returns {Array} 过滤后的题目数组
   */
  function getFilteredQuestions(filter) {
    if (filter === 'all') {
      return questionsData.slice();
    }
    if (filter === 'judge') {
      return questionsData.filter(function (q) { return q.type === 'judge'; });
    }
    if (filter === 'single') {
      return questionsData.filter(function (q) { return q.type === 'single'; });
    }
    // 按分类筛选
    return questionsData.filter(function (q) { return q.category === filter; });
  }

  /**
   * 切换练习题分类
   * @param {string} filter - 筛选条件
   */
  function changePracticeFilter(filter) {
    appState.practice.filter = filter;
    appState.practice.currentIndex = 0;
    appState.practice.answered = 0;
    appState.practice.correct = 0;
    appState.practice.filteredQuestions = getFilteredQuestions(filter);
    renderPracticeQuestion();
  }

  /**
   * 渲染当前练习题目
   */
  function renderPracticeQuestion() {
    const container = getElement('#practice-container');
    if (!container) return;

    const questions = appState.practice.filteredQuestions;
    const index = appState.practice.currentIndex;

    // 无题目处理
    if (questions.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:#64748b;padding:40px;">该分类暂无题目</p>';
      return;
    }

    const question = questions[index];

    // 更新进度信息
    const progressInfo = getElement('#practice-progress');
    if (progressInfo) {
      const rate = appState.practice.answered > 0
        ? Math.round((appState.practice.correct / appState.practice.answered) * 100)
        : 0;
      progressInfo.innerHTML = '第 <strong>' + (index + 1) + '</strong>/' + questions.length +
        ' 题　已答 <strong>' + appState.practice.answered + '</strong> 题　正确率 <strong>' + rate + '%</strong>';
    }

    // 更新进度条
    const progressFill = getElement('#practice-progress-fill');
    if (progressFill) {
      const percent = ((index + 1) / questions.length) * 100;
      progressFill.style.width = percent + '%';
    }

    // 构建题目HTML
    let html = '<div class="question-card" id="current-question">';

    // 题型标签
    const typeLabel = question.type === 'judge' ? '判断题' : '单选题';
    html += '<span class="question-type-badge ' + question.type + '">' + typeLabel + '</span>';

    // 题干
    html += '<div class="question-text">' + escapeHtml(question.question) + '</div>';

    if (question.type === 'judge') {
      // 判断题选项
      html += '<div class="judge-options">';
      html += '<button class="judge-btn" data-answer="true">正确</button>';
      html += '<button class="judge-btn" data-answer="false">错误</button>';
      html += '</div>';
    } else {
      // 单选题选项
      html += '<div class="options-list">';
      const labels = ['A', 'B', 'C', 'D'];
      question.options.forEach(function (opt, i) {
        html += '<div class="option-item" data-answer="' + i + '">';
        html += '<span class="option-label">' + labels[i] + '</span>';
        html += '<span>' + escapeHtml(opt) + '</span>';
        html += '</div>';
      });
      html += '</div>';
    }

    // 解析区域
    html += '<div class="analysis-box" id="practice-analysis">';
    html += '<strong>解析：</strong>' + escapeHtml(question.analysis);
    html += '</div>';

    // 导航按钮
    html += '<div class="question-nav">';
    html += '<button class="btn btn-secondary" id="practice-prev"' + (index === 0 ? ' disabled' : '') + '>上一题</button>';
    html += '<button class="btn btn-primary" id="practice-next"' + (index === questions.length - 1 ? ' disabled' : '') + '>下一题</button>';
    html += '</div>';

    html += '</div>';

    container.innerHTML = html;

    // 绑定答题事件
    bindPracticeAnswerEvents(question);
  }

  /**
   * 绑定练习题答题事件
   * @param {Object} question - 当前题目对象
   */
  function bindPracticeAnswerEvents(question) {
    const container = getElement('#current-question');
    if (!container) return;

    if (question.type === 'judge') {
      // 判断题：点击正确/错误按钮
      container.querySelectorAll('.judge-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const userAnswer = btn.dataset.answer === 'true';
          handlePracticeAnswer(question, userAnswer, btn);
        });
      });
    } else {
      // 单选题：点击选项
      container.querySelectorAll('.option-item').forEach(function (item) {
        item.addEventListener('click', function () {
          const userAnswer = parseInt(item.dataset.answer, 10);
          handlePracticeAnswer(question, userAnswer, item);
        });
      });
    }

    // 上一题/下一题
    const prevBtn = getElement('#practice-prev');
    const nextBtn = getElement('#practice-next');
    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        if (appState.practice.currentIndex > 0) {
          appState.practice.currentIndex--;
          renderPracticeQuestion();
        }
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        const maxIndex = appState.practice.filteredQuestions.length - 1;
        if (appState.practice.currentIndex < maxIndex) {
          appState.practice.currentIndex++;
          renderPracticeQuestion();
        }
      });
    }
  }

  /**
   * 处理练习题答题结果
   * @param {Object} question - 题目对象
   * @param {*} userAnswer - 用户答案
   * @param {Element} clickedEl - 被点击的元素
   */
  function handlePracticeAnswer(question, userAnswer, clickedEl) {
    const container = getElement('#current-question');
    if (!container) return;

    // 防止重复答题
    if (container.querySelector('.answered')) return;
    container.classList.add('answered');

    const isCorrect = userAnswer === question.answer;
    appState.practice.answered++;
    if (isCorrect) {
      appState.practice.correct++;
    }

    // 标记答题状态
    if (question.type === 'judge') {
      container.querySelectorAll('.judge-btn').forEach(function (btn) {
        btn.classList.add('disabled');
        const btnAnswer = btn.dataset.answer === 'true';
        if (btnAnswer === question.answer) {
          btn.classList.add('correct');
        }
        if (btn === clickedEl && !isCorrect) {
          btn.classList.add('wrong');
        }
      });
    } else {
      container.querySelectorAll('.option-item').forEach(function (item) {
        item.classList.add('disabled');
        const itemAnswer = parseInt(item.dataset.answer, 10);
        if (itemAnswer === question.answer) {
          item.classList.add('correct');
        }
        if (item === clickedEl && !isCorrect) {
          item.classList.add('wrong');
        }
      });
    }

    // 显示解析
    const analysis = getElement('#practice-analysis');
    if (analysis) {
      analysis.classList.add('show');
    }

    // 更新进度信息
    const progressInfo = getElement('#practice-progress');
    if (progressInfo) {
      const rate = Math.round((appState.practice.correct / appState.practice.answered) * 100);
      progressInfo.innerHTML = '第 <strong>' + (appState.practice.currentIndex + 1) + '</strong>/' +
        appState.practice.filteredQuestions.length + ' 题　已答 <strong>' +
        appState.practice.answered + '</strong> 题　正确率 <strong>' + rate + '%</strong>';
    }
  }

  /**
   * 初始化练习题筛选按钮
   */
  function initPracticeFilters() {
    const filterBar = getElement('#practice-filters');
    if (!filterBar) return;

    const filters = [
      { key: 'all', label: '全部' },
      { key: 'judge', label: '判断题' },
      { key: 'single', label: '单选题' },
      { key: 'score', label: '记分题' },
      { key: 'speed', label: '限速题' },
      { key: 'lights', label: '灯光题' },
      { key: 'yield', label: '让行题' },
      { key: 'sign', label: '标志题' },
      { key: 'newenergy', label: '新能源题' }
    ];

    filters.forEach(function (f, i) {
      const btn = createElement('button', 'filter-btn');
      if (i === 0) btn.classList.add('active');
      btn.textContent = f.label;
      btn.dataset.filter = f.key;
      filterBar.appendChild(btn);
    });

    filterBar.addEventListener('click', function (e) {
      if (e.target.classList.contains('filter-btn')) {
        filterBar.querySelectorAll('.filter-btn').forEach(function (btn) {
          btn.classList.remove('active');
        });
        e.target.classList.add('active');
        changePracticeFilter(e.target.dataset.filter);
      }
    });
  }

  // ==================== 模拟考试模块 ====================

  /**
   * 开始模拟考试
   * 从题库随机抽取100题（判断题和单选题按比例混合）
   * 题库不足100题时重复抽取补足
   */
  function startExam() {
    // 获取判断题和单选题
    const judgeQuestions = questionsData.filter(function (q) { return q.type === 'judge'; });
    const singleQuestions = questionsData.filter(function (q) { return q.type === 'single'; });

    // 按比例混合：约50%判断题，50%单选题
    const targetJudge = 50;
    const targetSingle = 50;

    // 生成考试题目（题库不足时循环抽取）
    const examQuestions = [];
    const shuffledJudge = shuffleArray(judgeQuestions);
    const shuffledSingle = shuffleArray(singleQuestions);

    for (let i = 0; i < targetJudge; i++) {
      examQuestions.push(shuffledJudge[i % shuffledJudge.length]);
    }
    for (let i = 0; i < targetSingle; i++) {
      examQuestions.push(shuffledSingle[i % shuffledSingle.length]);
    }

    // 打乱顺序
    appState.exam.questions = shuffleArray(examQuestions);
    appState.exam.currentIndex = 0;
    appState.exam.answered = 0;
    appState.exam.correct = 0;
    appState.exam.userAnswers = new Array(examQuestions.length).fill(null);
    appState.exam.isActive = true;
    appState.exam.isFinished = false;

    renderExamQuestion();
  }

  /**
   * 渲染考试题目
   */
  function renderExamQuestion() {
    const container = getElement('#exam-container');
    if (!container) return;

    const index = appState.exam.currentIndex;
    const question = appState.exam.questions[index];

    // 更新进度信息
    const progressInfo = getElement('#exam-progress');
    if (progressInfo) {
      progressInfo.innerHTML = '第 <strong>' + (index + 1) + '</strong>/' +
        appState.exam.questions.length + ' 题　已答 <strong>' +
        appState.exam.answered + '</strong> 题';
    }

    // 更新进度条
    const progressFill = getElement('#exam-progress-fill');
    if (progressFill) {
      const percent = ((index + 1) / appState.exam.questions.length) * 100;
      progressFill.style.width = percent + '%';
    }

    let html = '<div class="question-card" id="exam-question">';

    // 题型标签
    const typeLabel = question.type === 'judge' ? '判断题' : '单选题';
    html += '<span class="question-type-badge ' + question.type + '">' + typeLabel + '</span>';

    // 题干
    html += '<div class="question-text">' + escapeHtml(question.question) + '</div>';

    if (question.type === 'judge') {
      html += '<div class="judge-options">';
      html += '<button class="judge-btn" data-answer="true">正确</button>';
      html += '<button class="judge-btn" data-answer="false">错误</button>';
      html += '</div>';
    } else {
      html += '<div class="options-list">';
      const labels = ['A', 'B', 'C', 'D'];
      question.options.forEach(function (opt, i) {
        html += '<div class="option-item" data-answer="' + i + '">';
        html += '<span class="option-label">' + labels[i] + '</span>';
        html += '<span>' + escapeHtml(opt) + '</span>';
        html += '</div>';
      });
      html += '</div>';
    }

    // 解析区域（答题后显示）
    html += '<div class="analysis-box" id="exam-analysis">';
    html += '<strong>解析：</strong>' + escapeHtml(question.analysis);
    html += '</div>';

    // 导航按钮
    html += '<div class="question-nav">';
    html += '<button class="btn btn-secondary" id="exam-prev"' + (index === 0 ? ' disabled' : '') + '>上一题</button>';
    if (index === appState.exam.questions.length - 1) {
      html += '<button class="btn btn-success" id="exam-submit">提交考试</button>';
    } else {
      html += '<button class="btn btn-primary" id="exam-next">下一题</button>';
    }
    html += '</div>';

    html += '</div>';

    container.innerHTML = html;

    bindExamAnswerEvents(question);
  }

  /**
   * 绑定考试答题事件
   * @param {Object} question - 当前题目
   */
  function bindExamAnswerEvents(question) {
    const container = getElement('#exam-question');
    if (!container) return;

    if (question.type === 'judge') {
      container.querySelectorAll('.judge-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const userAnswer = btn.dataset.answer === 'true';
          handleExamAnswer(question, userAnswer, btn);
        });
      });
    } else {
      container.querySelectorAll('.option-item').forEach(function (item) {
        item.addEventListener('click', function () {
          const userAnswer = parseInt(item.dataset.answer, 10);
          handleExamAnswer(question, userAnswer, item);
        });
      });
    }

    const prevBtn = getElement('#exam-prev');
    const nextBtn = getElement('#exam-next');
    const submitBtn = getElement('#exam-submit');

    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        if (appState.exam.currentIndex > 0) {
          appState.exam.currentIndex--;
          renderExamQuestion();
        }
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        if (appState.exam.currentIndex < appState.exam.questions.length - 1) {
          appState.exam.currentIndex++;
          renderExamQuestion();
        }
      });
    }
    if (submitBtn) {
      submitBtn.addEventListener('click', function () {
        finishExam();
      });
    }
  }

  /**
   * 处理考试答题
   * @param {Object} question - 题目
   * @param {*} userAnswer - 用户答案
   * @param {Element} clickedEl - 被点击元素
   */
  function handleExamAnswer(question, userAnswer, clickedEl) {
    const container = getElement('#exam-question');
    if (!container) return;
    if (container.querySelector('.answered')) return;
    container.classList.add('answered');

    const index = appState.exam.currentIndex;
    const isCorrect = userAnswer === question.answer;

    // 记录用户答案（仅首次答题计入）
    if (appState.exam.userAnswers[index] === null) {
      appState.exam.userAnswers[index] = userAnswer;
      appState.exam.answered++;
      if (isCorrect) {
        appState.exam.correct++;
      }
    }

    // 标记对错
    if (question.type === 'judge') {
      container.querySelectorAll('.judge-btn').forEach(function (btn) {
        btn.classList.add('disabled');
        const btnAnswer = btn.dataset.answer === 'true';
        if (btnAnswer === question.answer) {
          btn.classList.add('correct');
        }
        if (btn === clickedEl && !isCorrect) {
          btn.classList.add('wrong');
        }
      });
    } else {
      container.querySelectorAll('.option-item').forEach(function (item) {
        item.classList.add('disabled');
        const itemAnswer = parseInt(item.dataset.answer, 10);
        if (itemAnswer === question.answer) {
          item.classList.add('correct');
        }
        if (item === clickedEl && !isCorrect) {
          item.classList.add('wrong');
        }
      });
    }

    // 显示解析
    const analysis = getElement('#exam-analysis');
    if (analysis) {
      analysis.classList.add('show');
    }

    // 更新进度
    const progressInfo = getElement('#exam-progress');
    if (progressInfo) {
      progressInfo.innerHTML = '第 <strong>' + (index + 1) + '</strong>/' +
        appState.exam.questions.length + ' 题　已答 <strong>' +
        appState.exam.answered + '</strong> 题';
    }
  }

  /**
   * 完成考试，计算成绩并显示结果
   */
  function finishExam() {
    appState.exam.isFinished = true;
    appState.exam.isActive = false;

    const total = appState.exam.questions.length;
    const correct = appState.exam.correct;
    const score = Math.round((correct / total) * 100);
    const passed = score >= 90;

    // 收集错题
    const wrongQuestions = [];
    appState.exam.questions.forEach(function (q, i) {
      const userAns = appState.exam.userAnswers[i];
      if (userAns !== q.answer) {
        wrongQuestions.push(q);
      }
    });

    renderExamResult(score, passed, total, correct, wrongQuestions);
  }

  /**
   * 渲染考试结果
   * @param {number} score - 得分
   * @param {boolean} passed - 是否及格
   * @param {number} total - 总题数
   * @param {number} correct - 正确数
   * @param {Array} wrongQuestions - 错题列表
   */
  function renderExamResult(score, passed, total, correct, wrongQuestions) {
    const container = getElement('#exam-container');
    if (!container) return;

    const wrongCount = total - correct;
    const statusText = passed ? '恭喜通过考试' : '未通过，请继续努力';
    const statusClass = passed ? 'pass' : 'fail';

    let html = '<div class="exam-result-card">';
    html += '<div class="result-score ' + statusClass + '">' + score + '分</div>';
    html += '<div class="result-status" style="color:' + (passed ? '#16a34a' : '#dc2626') + '">' + statusText + '</div>';
    html += '<div class="result-detail">';
    html += '<div class="result-detail-item"><div class="result-detail-value">' + total + '</div><div class="result-detail-label">总题数</div></div>';
    html += '<div class="result-detail-item"><div class="result-detail-value" style="color:#16a34a">' + correct + '</div><div class="result-detail-label">答对</div></div>';
    html += '<div class="result-detail-item"><div class="result-detail-value" style="color:#dc2626">' + wrongCount + '</div><div class="result-detail-label">答错</div></div>';
    html += '<div class="result-detail-item"><div class="result-detail-value">' + (passed ? '及格' : '不及格') + '</div><div class="result-detail-label">90分及格</div></div>';
    html += '</div>';
    html += '<div style="margin-top:24px"><button class="btn btn-primary" id="exam-restart">重新考试</button></div>';
    html += '</div>';

    // 错题列表
    if (wrongQuestions.length > 0) {
      html += '<h3 style="margin:24px 0 16px;color:#1e293b">错题回顾（共' + wrongQuestions.length + '题）</h3>';
      html += '<div class="wrong-questions-list">';
      wrongQuestions.forEach(function (q, i) {
        html += '<div class="wrong-question-item">';
        html += '<div class="wrong-question-text">' + (i + 1) + '. ' + escapeHtml(q.question) + '</div>';
        let correctAnswer = '';
        if (q.type === 'judge') {
          correctAnswer = q.answer ? '正确' : '错误';
        } else {
          const labels = ['A', 'B', 'C', 'D'];
          correctAnswer = labels[q.answer] + '. ' + q.options[q.answer];
        }
        html += '<div class="wrong-question-answer">正确答案：' + escapeHtml(correctAnswer) + '</div>';
        html += '<div class="wrong-question-analysis">解析：' + escapeHtml(q.analysis) + '</div>';
        html += '</div>';
      });
      html += '</div>';
    }

    container.innerHTML = html;

    const restartBtn = getElement('#exam-restart');
    if (restartBtn) {
      restartBtn.addEventListener('click', function () {
        showExamStart();
      });
    }
  }

  /**
   * 显示考试开始页面
   */
  function showExamStart() {
    const container = getElement('#exam-container');
    if (!container) return;

    container.innerHTML =
      '<div class="exam-start-card">' +
      '<h2>模拟考试</h2>' +
      '<p>从题库随机抽取100题，90分及格，模拟真实考试环境</p>' +
      '<div class="exam-info-grid">' +
      '<div class="exam-info-item"><div class="exam-info-value">100</div><div class="exam-info-label">题目数量</div></div>' +
      '<div class="exam-info-item"><div class="exam-info-value">90</div><div class="exam-info-label">及格分数</div></div>' +
      '<div class="exam-info-item"><div class="exam-info-value">45</div><div class="exam-info-label">考试分钟</div></div>' +
      '<div class="exam-info-item"><div class="exam-info-value">判断+单选</div><div class="exam-info-label">题型</div></div>' +
      '</div>' +
      '<button class="btn btn-primary" id="start-exam-btn" style="font-size:16px;padding:12px 36px">开始考试</button>' +
      '</div>';

    const startBtn = getElement('#start-exam-btn');
    if (startBtn) {
      startBtn.addEventListener('click', function () {
        startExam();
      });
    }
  }

  // ==================== 记分管理模块 ====================

  /**
   * 渲染记分管理模块
   */
  function renderScoreRules() {
    const container = getElement('#score-container');
    if (!container) return;

    container.innerHTML = '';
    const cardsDiv = createElement('div', 'score-cards');

    scoreRulesData.forEach(function (rule) {
      const card = createElement('div', 'score-card');
      card.style.borderTopColor = rule.color;

      // 头部：分值圆圈 + 口诀
      const header = createElement('div', 'score-card-header');
      const pointsDiv = createElement('div', 'score-points');
      pointsDiv.style.background = rule.color;
      pointsDiv.textContent = rule.points + '分';
      header.appendChild(pointsDiv);

      const info = createElement('div', 'score-card-info');
      info.innerHTML = '<h3>记' + rule.points + '分</h3><div class="score-mnemonic">口诀：' + escapeHtml(rule.mnemonic) + '</div>';
      header.appendChild(info);

      card.appendChild(header);

      // 违法情形列表
      const list = createElement('ol', 'score-items-list');
      rule.items.forEach(function (item) {
        const li = createElement('li');
        li.textContent = item;
        li.style.setProperty('--bullet-color', rule.color);
        list.appendChild(li);
      });

      // 设置列表序号圆圈颜色
      list.querySelectorAll('li').forEach(function (li) {
        const style = document.createElement('style');
        style.textContent = '.score-items-list li:nth-child(' + (Array.from(list.children).indexOf(li) + 1) + ')::before { background: ' + rule.color + '; }';
      });

      card.appendChild(list);
      cardsDiv.appendChild(card);
    });

    container.appendChild(cardsDiv);

    // 为每张卡片设置序号圆圈颜色（通过内联样式表）
    const styleSheet = document.createElement('style');
    let cssRules = '';
    scoreRulesData.forEach(function (rule, idx) {
      cssRules += '.score-card:nth-child(' + (idx + 1) + ') .score-items-list li::before { background: ' + rule.color + '; }';
    });
    styleSheet.textContent = cssRules;
    container.appendChild(styleSheet);
  }

  // ==================== 标志识别模块 ====================

  /**
   * 渲染标志识别模块
   */
  function renderSigns() {
    const container = getElement('#signs-container');
    if (!container) return;

    container.innerHTML = '';

    // 交通标志部分
    const signsTitle = createElement('h3', 'module-title');
    signsTitle.textContent = '交通标志';
    signsTitle.style.fontSize = '20px';
    signsTitle.style.marginBottom = '20px';
    container.appendChild(signsTitle);

    signsData.forEach(function (category) {
      const catDiv = createElement('div', 'sign-category');

      // 分类标题
      const header = createElement('div', 'sign-category-header');
      const colorBox = createElement('div', 'sign-category-color');
      colorBox.style.background = category.color;
      header.appendChild(colorBox);

      const titleDiv = createElement('div');
      titleDiv.innerHTML = '<div class="sign-category-title">' + escapeHtml(category.category) + '</div>' +
        '<div class="sign-category-desc">' + escapeHtml(category.description) + '</div>';
      header.appendChild(titleDiv);

      catDiv.appendChild(header);

      // 标志网格
      const grid = createElement('div', 'sign-grid');

      // 根据分类决定标志形状
      let shape = 'circle';
      if (category.category === '警告标志') shape = 'triangle';
      if (category.category === '指示标志' || category.category === '指路标志' || category.category === '旅游区标志' || category.category === '解除限制标志') shape = 'square';

      category.items.forEach(function (sign) {
        const card = createElement('div', 'sign-card');

        // 标志图形（CSS绘制）
        const shapeDiv = createElement('div', 'sign-shape ' + shape);
        if (shape === 'triangle') {
          // 警告标志：黄底黑边三角形
          shapeDiv.style.background = category.color;
          shapeDiv.style.borderBottom = '4px solid #000';
          shapeDiv.style.color = '#000';
        } else if (category.category === '禁令标志') {
          // 禁令标志：白底红圈
          shapeDiv.style.background = '#fff';
          shapeDiv.style.border = '4px solid ' + category.color;
          shapeDiv.style.color = category.color;
        } else {
          // 其他：对应颜色底
          shapeDiv.style.background = category.color;
          shapeDiv.style.color = '#fff';
        }
        shapeDiv.textContent = sign.symbol;
        card.appendChild(shapeDiv);

        const name = createElement('div', 'sign-name');
        name.textContent = sign.name;
        card.appendChild(name);

        const meaning = createElement('div', 'sign-meaning');
        meaning.textContent = sign.meaning;
        card.appendChild(meaning);

        grid.appendChild(card);
      });

      catDiv.appendChild(grid);
      container.appendChild(catDiv);
    });

    // 标线部分
    const markingTitle = createElement('h3', 'module-title');
    markingTitle.textContent = '道路标线';
    markingTitle.style.fontSize = '20px';
    markingTitle.style.marginTop = '32px';
    markingTitle.style.marginBottom = '20px';
    container.appendChild(markingTitle);

    const markingGrid = createElement('div', 'marking-grid');
    roadMarkingsData.forEach(function (marking) {
      const card = createElement('div', 'marking-card');

      const visual = createElement('div', 'marking-visual');
      visual.style.background = marking.color;
      if (marking.type === '虚线') {
        visual.style.backgroundImage = 'repeating-linear-gradient(90deg, ' + marking.color + ' 0, ' + marking.color + ' 10px, transparent 10px, transparent 16px)';
        visual.style.backgroundColor = '#f8fafc';
        visual.style.border = '1px solid #cbd5e1';
      } else if (marking.type === '图案') {
        visual.style.background = '#f8fafc';
        visual.style.border = '1px solid #cbd5e1';
        visual.textContent = marking.name.indexOf('菱形') >= 0 ? '◇' : '▽';
        visual.style.fontSize = '24px';
        visual.style.color = '#64748b';
      } else {
        visual.style.border = '1px solid #cbd5e1';
      }
      card.appendChild(visual);

      const info = createElement('div', 'marking-info');
      info.innerHTML = '<h4>' + escapeHtml(marking.name) + '</h4><p>' + escapeHtml(marking.meaning) + '</p>';
      card.appendChild(info);

      markingGrid.appendChild(card);
    });
    container.appendChild(markingGrid);

    // 交警手势部分
    const gestureTitle = createElement('h3', 'module-title');
    gestureTitle.textContent = '交警手势信号';
    gestureTitle.style.fontSize = '20px';
    gestureTitle.style.marginTop = '32px';
    gestureTitle.style.marginBottom = '20px';
    container.appendChild(gestureTitle);

    const gestureGrid = createElement('div', 'gesture-grid');
    policeGesturesData.forEach(function (gesture) {
      const card = createElement('div', 'gesture-card');

      const icon = createElement('div', 'gesture-icon');
      icon.textContent = '✋';
      card.appendChild(icon);

      const name = createElement('div', 'gesture-name');
      name.textContent = gesture.name;
      card.appendChild(name);

      const action = createElement('div', 'gesture-action');
      action.textContent = gesture.action;
      card.appendChild(action);

      const meaning = createElement('div', 'gesture-meaning');
      meaning.textContent = gesture.meaning;
      card.appendChild(meaning);

      gestureGrid.appendChild(card);
    });
    container.appendChild(gestureGrid);
  }

  // ==================== 2026新变化模块 ====================

  /**
   * 渲染2026新变化模块
   */
  function renderNewChanges() {
    const container = getElement('#changes-container');
    if (!container) return;

    container.innerHTML = '';
    const list = createElement('div', 'changes-list');

    newChanges2026.forEach(function (change) {
      const card = createElement('div', 'change-card');

      const tag = createElement('span', 'change-tag ' + change.tag);
      tag.textContent = change.tag;
      card.appendChild(tag);

      const content = createElement('div', 'change-content');
      content.innerHTML = '<h3>' + escapeHtml(change.title) + '</h3><p>' + escapeHtml(change.detail) + '</p>';
      card.appendChild(content);

      list.appendChild(card);
    });

    container.appendChild(list);
  }

  // ==================== 事件绑定与初始化 ====================

  /**
   * 绑定导航标签点击事件
   */
  function bindNavEvents() {
    document.querySelectorAll('.nav-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        switchModule(tab.dataset.module);
      });
    });
  }

  /**
   * 绑定首页功能卡片点击事件
   */
  function bindHomeCardEvents() {
    document.querySelectorAll('.nav-card').forEach(function (card) {
      card.addEventListener('click', function () {
        const module = card.dataset.module;
        if (module) {
          navigateTo(module);
        }
      });
    });
  }

  /**
   * 应用初始化入口
   * 在DOM加载完成后执行
   */
  function initApp() {
    // 绑定导航事件
    bindNavEvents();
    bindHomeCardEvents();

    // 渲染首页
    renderHome();

    // 初始化口诀模块
    initMnemonicFilters();
    renderMnemonics('all');

    // 初始化练习模块
    initPracticeFilters();
    initPractice();

    // 初始化考试模块
    showExamStart();

    // 渲染记分管理
    renderScoreRules();

    // 渲染标志识别
    renderSigns();

    // 渲染2026新变化
    renderNewChanges();
  }

  // DOM加载完成后初始化应用
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
