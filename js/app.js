/* ============================================================
   AI 产品经理学堂 · 应用逻辑(纯原生 JS,file:// 可直接运行)
   ============================================================ */
(function () {
  "use strict";

  /* ---------- 数据 ---------- */
  var MODULES = [].concat.apply([], window.DSH_CONTENT || []);
  // 追加「AI 资讯台」实时模块
  MODULES.push({
    id: "news",
    title: "AI 资讯台(实时)",
    icon: "📡",
    desc: "聚合量子位、少数派、InfoQ、OpenAI、Google AI 等实时资讯",
    minutes: 0,
    type: "news",
    lessons: []
  });
  var LESSONS = [];
  var LESSON_INDEX = {}; // "moduleId/lessonId" -> lesson
  MODULES.forEach(function (mod) {
    (mod.lessons || []).forEach(function (lesson) {
      var flat = {
        moduleId: mod.id,
        moduleTitle: mod.title,
        moduleIcon: mod.icon || "📘",
        moduleDesc: mod.desc || "",
        lesson: lesson
      };
      LESSONS.push(flat);
      LESSON_INDEX[mod.id + "/" + lesson.id] = flat;
    });
  });

  /* ---------- 进度存储 ---------- */
  var STORE_KEY = "ai-pm-academy-progress-v1";
  var memProgress = {};
  function loadProgress() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") { memProgress = parsed; return; }
      }
    } catch (e) { /* file:// 或隐私模式下不可用,退回内存 */ }
    memProgress = {};
  }
  function saveProgress() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(memProgress)); } catch (e) { /* noop */ }
  }
  function isDone(key) { return !!memProgress[key]; }
  function setDone(key, done) {
    if (done) memProgress[key] = true; else delete memProgress[key];
    saveProgress();
  }
  function doneCount() { return LESSONS.filter(function (l) { return isDone(l.moduleId + "/" + l.lesson.id); }).length; }
  function percent() {
    if (!LESSONS.length) return 0;
    return Math.round((doneCount() / LESSONS.length) * 100);
  }

  /* ---------- DOM 引用 ---------- */
  var $sidebar = document.getElementById("sidebar");
  var $moduleNav = document.getElementById("moduleNav");
  var $content = document.getElementById("content");
  var $crumb = document.getElementById("crumb");
  var $menuBtn = document.getElementById("menuBtn");
  var $scrim = document.getElementById("scrim");
  var $searchInput = document.getElementById("searchInput");
  var $searchResults = document.getElementById("searchResults");
  var $sbProgressBar = document.getElementById("sbProgressBar");
  var $sbProgressText = document.getElementById("sbProgressText");
  var $resetBtn = document.getElementById("resetProgress");

  /* ---------- 工具 ---------- */
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  /** 轻量行内语法:**粗体**、`代码`、[文字](链接) */
  function inline(text) {
    var s = esc(text);
    // 链接(先处理,避免吞掉加粗)
    s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    return s;
  }
  function plainTextOf(blocks) {
    var out = [];
    (blocks || []).forEach(function (b) {
      if (typeof b.x === "string") out.push(b.x);
      else if (Array.isArray(b.x)) out.push(b.x.join(" "));
      if (b.q) out.push(b.q);
      if (b.a) out.push(b.a);
      if (b.head) out.push(b.head.join(" "));
      if (b.rows) b.rows.forEach(function (r) { out.push(r.join(" ")); });
    });
    return out.join(" ");
  }

  /* ---------- 块渲染 ---------- */
  function renderBlock(b) {
    if (b.t === "h2") return "<h2>" + inline(b.x) + "</h2>";
    if (b.t === "h3") return "<h3>" + inline(b.x) + "</h3>";
    if (b.t === "p") return "<p>" + inline(b.x) + "</p>";
    if (b.t === "quote") return "<blockquote>" + inline(b.x) + "</blockquote>";
    if (b.t === "ul" || b.t === "ol") {
      var tag = b.t === "ul" ? "ul" : "ol";
      var cls = b.check ? ' class="check"' : "";
      return "<" + tag + cls + ">" + b.x.map(function (li) { return "<li>" + inline(li) + "</li>"; }).join("") + "</" + tag + ">";
    }
    if (b.t === "table") {
      var h = "<tr>" + b.head.map(function (c) { return "<th>" + inline(c) + "</th>"; }).join("") + "</tr>";
      var rows = b.rows.map(function (r) {
        return "<tr>" + r.map(function (c) { return "<td>" + inline(c) + "</td>"; }).join("") + "</tr>";
      }).join("");
      return '<div class="table-wrap"><table>' + h + rows + "</table></div>";
    }
    if (b.t === "callout") {
      var kind = b.k || "tip";
      var labels = { tip: "提示", warn: "注意", case: "案例", term: "术语", exam: "面试考点" };
      return '<div class="callout ' + kind + '"><span class="co-label">' + (b.label || labels[kind] || "提示") + "</span>" + inline(b.x) + "</div>";
    }
    if (b.t === "code") {
      var code = esc(b.x);
      // # 注释行变暗
      code = code.replace(/^(#.*)$/gm, '<span class="co-comment">$1</span>');
      return '<div class="code-block">' + code + "</div>";
    }
    if (b.t === "quiz") {
      return '<details class="quiz"><summary>' + inline(b.q) + "</summary><div class=\"quiz-answer\">" + inline(b.a) + "</div></details>";
    }
    return "";
  }

  /* ---------- 侧边栏 ---------- */
  function renderSidebar(activeKey) {
    var html = "";
    MODULES.forEach(function (mod) {
      if (mod.type === "news") {
        // 实时资讯模块:直接跳转,没有课程列表
        html +=
          '<div class="mod-group">' +
          '<a class="mod-head" href="#/news"' + (activeKey === "news" ? ' style="background:var(--accent);color:#fff"' : "") + ">" +
          '<span class="mod-icon">' + (mod.icon || "📘") + "</span>" +
          "<span>" + esc(mod.title) + "</span>" +
          '<span class="mod-count">LIVE</span></a></div>';
        return;
      }
      var modDone = 0;
      var lessonsHtml = "";
      mod.lessons.forEach(function (lesson) {
        var key = mod.id + "/" + lesson.id;
        if (isDone(key)) modDone++;
        lessonsHtml +=
          '<a href="#/' + mod.id + "/" + lesson.id + '" data-key="' + key + '"' +
          (key === activeKey ? ' class="active"' : "") + ">" +
          '<span class="lesson-check' + (isDone(key) ? " done" : "") + '">' + (isDone(key) ? "✓" : "") + "</span>" +
          "<span>" + esc(lesson.title) + "</span></a>";
      });
      var open = activeKey && activeKey.indexOf(mod.id + "/") === 0;
      html +=
        '<div class="mod-group' + (open ? " open" : "") + '">' +
        '<button class="mod-head" data-mod="' + mod.id + '">' +
        '<span class="mod-icon">' + (mod.icon || "📘") + "</span>" +
        "<span>" + esc(mod.title) + "</span>" +
        '<span class="mod-count">' + modDone + "/" + mod.lessons.length + "</span>" +
        '<span class="mod-arrow">▶</span></button>' +
        '<div class="mod-lessons">' + lessonsHtml + "</div></div>";
    });
    $moduleNav.innerHTML = html;
    $sbProgressBar.style.width = percent() + "%";
    $sbProgressText.textContent = percent() + "%(" + doneCount() + "/" + LESSONS.length + ")";
  }

  /* ---------- 首页 ---------- */
  function renderHome() {
    var cards = MODULES.map(function (mod) {
      if (mod.type === "news") {
        return (
          '<a class="module-card" href="#/news" style="border-color:#818cf8">' +
          '<div class="mc-top"><span class="mc-icon">' + (mod.icon || "📘") + "</span>" +
          '<span class="mc-title">' + esc(mod.title) + "</span></div>" +
          '<div class="mc-desc">' + esc(mod.desc || "") + "</div>" +
          '<div class="mc-meta"><span>📡 实时抓取 · 来自 8 个优质信息源</span><span style="color:var(--accent);font-weight:700">立即查看 →</span></div>' +
          "</a>"
        );
      }
      var modDone = 0;
      mod.lessons.forEach(function (l) { if (isDone(mod.id + "/" + l.id)) modDone++; });
      var p = mod.lessons.length ? Math.round((modDone / mod.lessons.length) * 100) : 0;
      return (
        '<a class="module-card" href="#/' + mod.id + '">' +
        '<div class="mc-top"><span class="mc-icon">' + (mod.icon || "📘") + "</span>" +
        '<span class="mc-title">' + esc(mod.title) + "</span></div>" +
        '<div class="mc-desc">' + esc(mod.desc || "") + "</div>" +
        '<div class="mc-progress"><div class="mc-progress-fill" style="width:' + p + '%"></div></div>' +
        '<div class="mc-meta"><span>' + mod.lessons.length + " 节课 · 约 " + mod.minutes + " 分钟</span><span>" + modDone + "/" + mod.lessons.length + " 完成</span></div>" +
        "</a>"
      );
    }).join("");

    var resume = LESSONS.find(function (l) { return l.lesson.id === "resume"; });
    var resumeHref = resume ? "#/" + resume.moduleId + "/resume" : "#/";

    $crumb.innerHTML = "首页";
    $content.innerHTML =
      '<div class="hero"><h1>从工小智到 AI 产品经理 🚀</h1>' +
      "<p>这个网站为你定制:把你在工商银行网络金融部「工小智」智能客服的产品经验," +
      "系统性地翻译成 AI 产品经理的语言,补齐大模型时代的知识与方法论,最终完成简历、面试与 offer 的冲刺。</p>" +
      '<div class="hero-tags"><span>🎯 智能客服 → AI PM</span><span>🧠 大模型 / RAG / Agent</span><span>📊 评测与指标体系</span><span>💼 国内 + 外企求职</span></div></div>' +
      '<div class="stats-row">' +
      '<div class="stat-card"><div class="stat-num">' + MODULES.length + '</div><div class="stat-label">学习模块</div></div>' +
      '<div class="stat-card"><div class="stat-num">' + LESSONS.length + '</div><div class="stat-label">课程节数</div></div>' +
      '<div class="stat-card"><div class="stat-num">' + doneCount() + '</div><div class="stat-label">已完成</div></div>' +
      '<div class="stat-card"><div class="stat-num">' + percent() + '%</div><div class="stat-label">总进度</div></div>' +
      "</div>" +
      '<div class="section-title">📚 学习模块</div><div class="module-grid">' + cards + "</div>" +
      '<div class="resume-card">💼 <b>求职冲刺入口:</b>' +
      '先完成前四个模块的知识储备,再进入 <a href="' + resumeHref + '">「求职准备」</a> 模块,按模板重写简历、复盘工小智案例、刷面试题库。' +
      "<br>建议节奏:每天 60–90 分钟,6–8 周走完全程。所有进度自动保存在本机浏览器。</div>";
  }

  /* ---------- 课程页 ---------- */
  function renderLesson(key) {
    var flat = LESSON_INDEX[key];
    if (!flat) { renderHome(); return; }
    var mod = MODULES.filter(function (m) { return m.id === flat.moduleId; })[0];
    var lesson = flat.lesson;
    var idx = LESSONS.indexOf(flat);
    var prev = idx > 0 ? LESSONS[idx - 1] : null;
    var next = idx < LESSONS.length - 1 ? LESSONS[idx + 1] : null;
    var done = isDone(key);

    $crumb.innerHTML =
      '<a href="#/' + mod.id + '">' + esc(mod.title) + "</a> / <b>" + esc(lesson.title) + "</b>";

    var body = (lesson.blocks || []).map(renderBlock).join("");
    var tags = (lesson.tags || []).map(function (t) { return "<span>#" + esc(t) + "</span>"; }).join(" ");

    $content.innerHTML =
      '<div class="lesson-head">' +
      '<div class="lesson-kicker">' + (mod.icon || "📘") + " " + esc(mod.title) + "</div>" +
      '<h1 class="lesson-title">' + esc(lesson.title) + "</h1>" +
      '<div class="lesson-meta"><span>⏱ 约 ' + (lesson.minutes || 8) + " 分钟</span><span>" + tags + "</span></div></div>" +
      '<div class="blocks">' + body + "</div>" +
      '<div class="lesson-footer">' +
      '<div class="done-row">' +
      '<button id="doneBtn" class="done-btn' + (done ? " completed" : "") + '">' + (done ? "✓ 已完成 · 点击取消" : "标记为已完成") + "</button>" +
      '<span class="done-hint">进度保存在本机浏览器</span></div>' +
      '<div class="pager">' +
      (prev
        ? '<a href="#/' + prev.moduleId + "/" + prev.lesson.id + '"><span class="pg-dir">← 上一节</span><span>' + esc(prev.lesson.title) + "</span></a>"
        : '<a class="pg-disabled" href="#"><span class="pg-dir">← 上一节</span><span>已经是第一节</span></a>') +
      (next
        ? '<a class="pg-next" href="#/' + next.moduleId + "/" + next.lesson.id + '"><span class="pg-dir">下一节 →</span><span>' + esc(next.lesson.title) + "</span></a>"
        : '<a class="pg-disabled" href="#"><span class="pg-dir">下一节 →</span><span>恭喜,已是最后一节</span></a>') +
      "</div></div>";

    var doneBtn = document.getElementById("doneBtn");
    doneBtn.addEventListener("click", function () {
      var nowDone = isDone(key);
      setDone(key, !nowDone);
      renderLesson(key);
      renderSidebar(key);
    });

    // 页面标题跟随
    document.title = lesson.title + " · AI 产品经理学堂";
    // 滚动到顶部
    window.scrollTo(0, 0);
    // 当前高亮
    renderSidebar(key);
  }

  /* ---------- AI 资讯台(实时 RSS) ---------- */
  var NEWS_FEEDS = [
    { id: "qbitai", title: "量子位", cat: "zh", url: "https://www.qbitai.com/feed" },
    { id: "sspai", title: "少数派", cat: "zh", url: "https://sspai.com/feed" },
    { id: "infoq", title: "InfoQ 中文", cat: "zh", url: "https://www.infoq.cn/feed" },
    { id: "ifanr", title: "爱范儿", cat: "zh", url: "https://www.ifanr.com/feed" },
    { id: "leiphone", title: "雷锋网", cat: "zh", url: "https://www.leiphone.com/feed" },
    { id: "openai", title: "OpenAI", cat: "en", url: "https://openai.com/news/rss.xml" },
    { id: "googleai", title: "Google AI", cat: "en", url: "https://blog.google/technology/ai/rss/" },
    { id: "hn", title: "Hacker News", cat: "en", url: "https://hnrss.org/frontpage" }
  ];
  var NEWS_TTL = 45 * 60 * 1000; // 缓存 45 分钟
  var newsState = { tab: "all", items: [], loading: false, fetchedAt: 0, failed: [] };

  function newsCacheKey(feedId) { return "ai-pm-news-" + feedId; }

  function stripHtml(html) {
    var div = document.createElement("div");
    div.innerHTML = html || "";
    return div.textContent || div.innerText || "";
  }

  /** 解析 rss2json 的 items 为统一结构 */
  function normalizeItems(list, source) {
    return (list || []).slice(0, 14).map(function (it) {
      var date = null;
      try { date = new Date(it.pubDate); if (isNaN(date.getTime())) date = null; } catch (e) { date = null; }
      var desc = stripHtml(it.description || it.content || "").trim();
      if (desc.length > 140) desc = desc.slice(0, 140) + "…";
      return { title: (it.title || "").trim(), link: it.link || "", date: date, desc: desc, source: source };
    }).filter(function (it) { return it.title && it.link; });
  }

  /** 备用代理:allorigins(返回原始 XML,需要自行解析) */
  function parseXmlItems(xmlText, source) {
    var items = [];
    try {
      var doc = new DOMParser().parseFromString(xmlText, "text/xml");
      var nodes = doc.querySelectorAll("item, entry");
      for (var i = 0; i < nodes.length && i < 14; i++) {
        var n = nodes[i];
        var title = n.querySelector("title");
        var link = n.querySelector("link");
        var desc = n.querySelector("description, summary, content");
        var date = n.querySelector("pubDate, published, updated");
        if (!title || !link) continue;
        items.push({
          title: title.textContent.trim(),
          link: link.getAttribute("href") || link.textContent.trim(),
          date: date ? new Date(date.textContent) : null,
          desc: stripHtml(desc ? desc.textContent : "").slice(0, 140),
          source: source
        });
      }
    } catch (e) { /* 解析失败忽略 */ }
    return items;
  }

  function fetchFeed(feed) {
    var rss2json = "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(feed.url);
    return fetch(rss2json, { signal: AbortSignal.timeout ? AbortSignal.timeout(12000) : undefined })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.status === "ok" && data.items) return normalizeItems(data.items, feed.title);
        throw new Error("rss2json failed");
      })
      .catch(function () {
        // 备用:allorigins
        var ao = "https://api.allorigins.win/get?url=" + encodeURIComponent(feed.url);
        return fetch(ao, { signal: AbortSignal.timeout ? AbortSignal.timeout(12000) : undefined })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (data && data.contents) {
              var items = parseXmlItems(data.contents, feed.title);
              if (items.length) return items;
            }
            throw new Error("allorigins failed");
          });
      });
  }

  function loadNews(force) {
    var now = Date.now();
    if (!force && newsState.items.length && now - newsState.fetchedAt < NEWS_TTL) {
      renderNewsList();
      return;
    }
    // 先渲染缓存(若有)
    var cached = [];
    NEWS_FEEDS.forEach(function (feed) {
      try {
        var raw = localStorage.getItem(newsCacheKey(feed.id));
        if (raw) {
          var parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.items)) cached = cached.concat(parsed.items);
        }
      } catch (e) { /* noop */ }
    });
    if (!newsState.items.length && cached.length) {
      newsState.items = cached;
      newsState.fetchedAt = now;
    }
    newsState.loading = true;
    renderNewsList();

    Promise.allSettled(NEWS_FEEDS.map(function (feed) {
      return fetchFeed(feed).then(function (items) {
        try { localStorage.setItem(newsCacheKey(feed.id), JSON.stringify({ ts: Date.now(), items: items })); } catch (e) { /* noop */ }
        return items;
      });
    })).then(function (results) {
      var all = [];
      var failed = [];
      results.forEach(function (res, i) {
        if (res.status === "fulfilled" && res.value.length) all = all.concat(res.value);
        else failed.push(NEWS_FEEDS[i].title);
      });
      newsState.items = all;
      newsState.failed = failed;
      newsState.fetchedAt = Date.now();
      newsState.loading = false;
      renderNewsList();
    });
  }

  function fmtDate(d) {
    if (!d) return "";
    var now = new Date();
    var sameDay = d.toDateString() === now.toDateString();
    var mm = (d.getMonth() + 1) + "月" + d.getDate() + "日";
    if (sameDay) {
      var hh = d.getHours() + ":" + (d.getMinutes() < 10 ? "0" : "") + d.getMinutes();
      return "今天 " + hh;
    }
    return mm;
  }

  function renderNewsList() {
    var holder = document.getElementById("newsList");
    var status = document.getElementById("newsStatus");
    if (!holder) return;
    var items = newsState.items;
    if (newsState.tab === "zh") items = items.filter(function (it) {
      return ["量子位", "少数派", "InfoQ 中文", "爱范儿", "雷锋网"].indexOf(it.source) !== -1;
    });
    if (newsState.tab === "en") items = items.filter(function (it) {
      return ["OpenAI", "Google AI", "Hacker News"].indexOf(it.source) !== -1;
    });
    items = items.slice().sort(function (a, b) {
      return (b.date ? b.date.getTime() : 0) - (a.date ? a.date.getTime() : 0);
    });

    if (status) {
      var parts = [];
      if (newsState.loading) parts.push("🔄 正在抓取最新资讯…");
      if (newsState.fetchedAt) {
        var t = new Date(newsState.fetchedAt);
        parts.push("更新于 " + t.getHours() + ":" + (t.getMinutes() < 10 ? "0" : "") + t.getMinutes());
      }
      if (newsState.failed.length) parts.push("⚠ " + newsState.failed.join("、") + " 暂时不可用");
      if (!parts.length) parts.push("点击刷新获取实时资讯");
      status.textContent = parts.join(" · ");
    }

    if (!items.length) {
      holder.innerHTML = '<div class="news-empty">暂无数据。请点击右上角「刷新」按钮重试;若持续失败,可能是网络或代理服务暂时不可用。</div>';
      return;
    }
    holder.innerHTML = items.map(function (it) {
      return '<a class="news-card" href="' + esc(it.link) + '" target="_blank" rel="noopener">' +
        '<div class="news-source">' + esc(it.source) + (it.date ? '<span class="news-date">' + esc(fmtDate(it.date)) + "</span>" : "") + "</div>" +
        '<div class="news-title">' + esc(it.title) + "</div>" +
        (it.desc ? '<div class="news-desc">' + esc(it.desc) + "</div>" : "") +
        "</a>";
    }).join("");
  }

  function renderNews() {
    $crumb.innerHTML = "📡 AI 资讯台(实时)";
    document.title = "AI 资讯台 · AI 产品经理学堂";
    window.scrollTo(0, 0);
    renderSidebar("news");
    $content.innerHTML =
      '<div class="news-head">' +
      '<h1 class="lesson-title">📡 AI 资讯台</h1>' +
      '<p class="news-intro">实时聚合 8 个优质信息源(量子位、少数派、InfoQ、爱范儿、雷锋网、OpenAI、Google AI、Hacker News)。' +
      "数据通过公共代理抓取并缓存 45 分钟,无需后端。**建议每周挑一条新闻,用「前沿与热点」模块的三步转化法写成面试谈资。**</p>" +
      '<div class="news-toolbar">' +
      '<div class="news-tabs">' +
      '<button class="news-tab" data-tab="all">全部</button>' +
      '<button class="news-tab" data-tab="zh">中文源</button>' +
      '<button class="news-tab" data-tab="en">英文源</button>' +
      "</div>" +
      '<button id="newsRefresh" class="done-btn">🔄 刷新</button></div>' +
      '<div id="newsStatus" class="news-status"></div>' +
      '<div id="newsList" class="news-list"></div>' +
      '<div class="news-foot-note">资讯内容版权归原站点所有,链接直达原文。代理服务偶尔波动,失败源会自动跳过。</div>';

    document.querySelectorAll(".news-tab").forEach(function (btn) {
      if (btn.dataset.tab === newsState.tab) btn.classList.add("active");
      btn.addEventListener("click", function () {
        newsState.tab = btn.dataset.tab;
        document.querySelectorAll(".news-tab").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        renderNewsList();
      });
    });
    document.getElementById("newsRefresh").addEventListener("click", function () {
      newsState.items = [];
      loadNews(true);
    });

    loadNews(false);
    renderNewsList();
  }

  /* ---------- 路由 ---------- */
  function route() {
    var hash = location.hash.replace(/^#\/?/, ""); // "module/lesson"
    var parts = hash.split("/").filter(Boolean);
    closeMenu();
    if (parts.length === 0) {
      document.title = "AI 产品经理学堂 · 从工小智到 AI PM";
      renderHome();
      renderSidebar(null);
      return;
    }
    if (parts.length === 1) {
      if (parts[0] === "news") { renderNews(); return; }
      var mod = MODULES.filter(function (m) { return m.id === parts[0]; })[0];
      if (mod && mod.lessons.length) {
        location.replace("#/" + mod.id + "/" + mod.lessons[0].id);
        return;
      }
      renderHome(); renderSidebar(null); return;
    }
    renderLesson(parts[0] + "/" + parts[1]);
  }

  /* ---------- 搜索 ---------- */
  function doSearch(query) {
    query = (query || "").trim().toLowerCase();
    if (!query) { $searchResults.classList.add("hidden"); return; }
    var hits = [];
    LESSONS.forEach(function (flat) {
      var hay = (flat.moduleTitle + " " + flat.lesson.title + " " + plainTextOf(flat.lesson.blocks)).toLowerCase();
      var score = 0;
      if (flat.lesson.title.toLowerCase().indexOf(query) !== -1) score += 3;
      if (hay.indexOf(query) !== -1) score += 1;
      if (score > 0) {
        // 摘录包含关键词的片段
        var snippet = "";
        var hayIdx = hay.indexOf(query);
        if (hayIdx !== -1) {
          var plain = plainTextOf(flat.lesson.blocks);
          var start = Math.max(0, hayIdx - 20);
          snippet = plain.substr(start, 80).replace(/\s+/g, " ");
          if (start > 0) snippet = "…" + snippet;
          if (start + 80 < plain.length) snippet += "…";
        }
        hits.push({ flat: flat, score: score, snippet: snippet });
      }
    });
    hits.sort(function (a, b) { return b.score - a.score; });
    hits = hits.slice(0, 12);
    if (!hits.length) {
      $searchResults.innerHTML = '<div class="sr-empty">没有找到相关内容,换个关键词试试</div>';
    } else {
      $searchResults.innerHTML = hits.map(function (h) {
        return '<a class="sr-item" href="#/' + h.flat.moduleId + "/" + h.flat.lesson.id + '">' +
          '<div class="sr-title">' + esc(h.flat.lesson.title) + "</div>" +
          '<div class="sr-module">' + esc(h.flat.moduleTitle) + "</div>" +
          '<div class="sr-snippet">' + esc(h.snippet) + "</div></a>";
      }).join("");
    }
    $searchResults.classList.remove("hidden");
  }

  /* ---------- 移动端侧栏 ---------- */
  function openMenu() { $sidebar.classList.add("open"); $scrim.classList.add("show"); }
  function closeMenu() { $sidebar.classList.remove("open"); $scrim.classList.remove("show"); }

  /* ---------- 事件绑定 ---------- */
  $moduleNav.addEventListener("click", function (e) {
    var head = e.target.closest(".mod-head");
    if (head) {
      var group = head.parentElement;
      group.classList.toggle("open");
    }
  });
  $menuBtn.addEventListener("click", openMenu);
  $scrim.addEventListener("click", closeMenu);
  window.addEventListener("hashchange", route);
  $searchInput.addEventListener("input", function () { doSearch($searchInput.value); });
  $searchInput.addEventListener("focus", function () { if ($searchInput.value.trim()) doSearch($searchInput.value); });
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".search-box")) $searchResults.classList.add("hidden");
  });
  $resetBtn.addEventListener("click", function () {
    if (confirm("确定要清空所有学习进度吗?")) {
      memProgress = {};
      saveProgress();
      route();
    }
  });

  /* ---------- 启动 ---------- */
  loadProgress();
  route();
})();
