(() => {
  const data = window.PAPER_RECAP_DATA || { generated_at: "", papers: [] };
  const tagGroups = data.tag_groups || [];
  const tagDefinitions = new Map(tagGroups.flatMap((group) => group.tags.map((tag) => [tag.key, tag])));
  const state = { query: "", tags: new Set(), sort: "newest", showTagKeys: false };
  let lockedScrollY = 0;
  const elements = {
    grid: document.querySelector("#paper-grid"),
    tags: document.querySelector("#tag-list"),
    search: document.querySelector("#search-input"),
    sort: document.querySelector("#sort-select"),
    count: document.querySelector("#result-count"),
    empty: document.querySelector("#empty-state"),
    reset: document.querySelector("#reset-filters"),
    keyToggle: document.querySelector("#tag-key-toggle"),
    authoring: document.querySelector("#tag-authoring"),
    tagSnippet: document.querySelector("#tag-frontmatter"),
    copyTags: document.querySelector("#copy-tags"),
    authoringStatus: document.querySelector("#tag-authoring-status"),
    dialog: document.querySelector("#paper-dialog"),
    dialogContent: document.querySelector("#dialog-content"),
    imageDialog: document.querySelector("#image-dialog"),
    imageDialogImage: document.querySelector("#image-dialog-image"),
    imageDialogCaption: document.querySelector("#image-dialog-caption"),
  };

  const { escapeHtml, renderMarkdown } = window.PaperRecapMarkdown;

  function renderMath(container) {
    if (typeof window.renderMathInElement !== "function") return;
    window.renderMathInElement(container, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false },
        { left: "\\[", right: "\\]", display: true },
        { left: "\\begin{equation}", right: "\\end{equation}", display: true },
        { left: "\\begin{align}", right: "\\end{align}", display: true },
        { left: "\\begin{gather}", right: "\\end{gather}", display: true },
      ],
      throwOnError: false,
      strict: "warn",
    });
  }

  function formatDate(value) {
    if (!value) return "日期未知";
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return "日期未知";
    return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "short", day: "numeric" })
      .format(parsed);
  }

  function syncDialogScrollLock() {
    const root = document.documentElement;
    const body = document.body;
    const shouldLock = elements.dialog.open || elements.imageDialog.open;
    const isLocked = root.classList.contains("dialog-open");

    if (shouldLock && !isLocked) {
      lockedScrollY = window.scrollY;
      root.classList.add("dialog-open");
      body.style.top = `-${lockedScrollY}px`;
      return;
    }

    if (!shouldLock && isLocked) {
      root.classList.add("restoring-scroll");
      root.classList.remove("dialog-open");
      body.style.removeProperty("top");
      window.scrollTo(0, lockedScrollY);
      requestAnimationFrame(() => root.classList.remove("restoring-scroll"));
    }
  }

  function allTags() {
    const counts = new Map();
    data.papers.forEach((paper) => paper.tags.forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }

  const tagLabel = (key) => tagDefinitions.get(key)?.label || key;

  function readFiltersFromUrl() {
    const params = new URLSearchParams(location.search);
    state.query = params.get("q") || "";
    state.tags = new Set(params.getAll("tag").filter((tag) => tagDefinitions.has(tag)));
    state.sort = params.get("sort") === "title" ? "title" : "newest";
    elements.search.value = state.query;
    elements.sort.value = state.sort;
  }

  function syncFilterUrl() {
    const params = new URLSearchParams(location.search);
    params.delete("tag"); params.delete("q"); params.delete("sort");
    state.tags.forEach((tag) => params.append("tag", tag));
    if (state.query) params.set("q", state.query);
    if (state.sort !== "newest") params.set("sort", state.sort);
    const query = params.toString();
    history.replaceState(history.state, "", `${location.pathname}${query ? `?${query}` : ""}${location.hash}`);
  }

  function filterButton(tag, count) {
    const active = state.tags.has(tag.key);
    return `<button class="tag-button ${active ? "active" : ""} ${state.showTagKeys ? "key-visible" : ""}" type="button" data-tag="${escapeHtml(tag.key)}" aria-pressed="${active}" title="${escapeHtml(tag.description)}">
      <span>${escapeHtml(tag.label)} <span class="tag-count">${count}</span></span>
      ${state.showTagKeys ? `<span class="tag-key">${escapeHtml(tag.key)}</span>` : ""}
    </button>`;
  }

  function selectedTagSnippet() {
    const keys = tagGroups.flatMap((group) => group.tags.map((tag) => tag.key))
      .filter((key) => state.tags.has(key));
    return `tags: [${keys.map((key) => JSON.stringify(key)).join(", ")}]`;
  }

  function renderTags() {
    const counts = new Map(allTags());
    elements.tags.innerHTML = tagGroups.map((group) => `<div class="tag-group" role="group" aria-label="${escapeHtml(group.label)}">
      <span class="tag-group-label">${escapeHtml(group.label)}</span>
      <div class="tag-list">${group.tags.map((tag) => filterButton(tag, counts.get(tag.key) ?? 0)).join("")}</div>
    </div>`).join("");
    elements.keyToggle.textContent = state.showTagKeys ? "收起速查" : "标签速查";
    elements.keyToggle.setAttribute("aria-expanded", String(state.showTagKeys));
    elements.authoring.hidden = !state.showTagKeys;
    elements.tagSnippet.value = state.tags.size ? selectedTagSnippet() : "";
    elements.copyTags.disabled = state.tags.size === 0 || state.tags.size > 5;
    elements.authoringStatus.textContent = state.tags.size > 5 ? `已选 ${state.tags.size} 个标签，笔记最多允许 5 个。` : "";
  }

  function filteredPapers() {
    const needle = state.query.trim().toLocaleLowerCase();
    const filtered = data.papers.filter((paper) => {
      const tagMatch = [...state.tags].every((tag) => paper.tags.includes(tag));
      const tagTerms = paper.tags.flatMap((key) => {
        const definition = tagDefinitions.get(key);
        return [key, definition?.label || "", ...(definition?.aliases || [])];
      });
      const haystack = [paper.title, paper.display_title || "", paper.authors, paper.venue, paper.one_liner, paper.body, ...(paper.search_terms || []), ...tagTerms].join(" ").toLocaleLowerCase();
      return tagMatch && (!needle || haystack.includes(needle));
    });
    return filtered.sort((a, b) => {
      if (state.sort === "title") return (a.display_title || a.title).localeCompare(b.display_title || b.title);
      return b.read_date.localeCompare(a.read_date)
        || (b.read_at || "").localeCompare(a.read_at || "")
        || a.title.localeCompare(b.title);
    });
  }

  function paperCard(paper) {
    const tags = paper.tags.map((tag) => `<button class="card-tag" type="button" data-tag="${escapeHtml(tag)}" title="筛选：${escapeHtml(tagLabel(tag))}">#${escapeHtml(tagLabel(tag))}</button>`).join("");
    return `<article class="paper-card">
      <button class="card-button" type="button" data-slug="${escapeHtml(paper.slug)}" aria-label="打开《${escapeHtml(paper.title)}》详情">
        <div class="card-top"><span class="status">${escapeHtml(paper.status)}</span><span>${formatDate(paper.read_date)}</span></div>
        <h3>${escapeHtml(paper.display_title || paper.title)}</h3>
        <p class="authors">${escapeHtml(paper.authors)}${paper.venue ? ` · ${escapeHtml(paper.venue)}` : ""}</p>
        ${paper.one_liner ? `<p class="one-liner">${escapeHtml(paper.one_liner)}</p>` : ""}
      </button>
      <div class="card-bottom"><div class="card-tags">${tags}</div><button class="arrow" type="button" data-slug="${escapeHtml(paper.slug)}" aria-label="打开《${escapeHtml(paper.title)}》详情">↗</button></div>
    </article>`;
  }

  function renderPapers() {
    const papers = filteredPapers();
    elements.grid.innerHTML = papers.map(paperCard).join("");
    const selection = [...state.tags].map(tagLabel).join(" + ");
    elements.count.textContent = `显示 ${papers.length} / ${data.papers.length} 篇记录${selection ? ` · ${selection}` : " · 全部主题"}`;
    elements.reset.disabled = !state.tags.size && !state.query;
    elements.empty.hidden = papers.length !== 0;
    elements.grid.hidden = papers.length === 0;
  }

  function toggleTag(tag) {
    if (!tagDefinitions.has(tag)) return;
    if (state.tags.has(tag)) state.tags.delete(tag);
    else state.tags.add(tag);
    renderTags(); renderPapers(); syncFilterUrl();
    // Rendering replaces the button; keep keyboard focus on the same filter.
    [...elements.tags.querySelectorAll("[data-tag]")].find((button) => button.dataset.tag === tag)?.focus({ preventScroll: true });
  }

  function selectSingleTag(tag) {
    if (!tagDefinitions.has(tag)) return;
    state.tags = new Set([tag]);
    state.query = ""; elements.search.value = "";
    closePaper();
    renderTags(); renderPapers(); syncFilterUrl();
    document.querySelector("#library-title").scrollIntoView({ block: "start" });
  }

  function clearFilters() {
    state.query = ""; state.tags.clear(); elements.search.value = "";
    renderTags(); renderPapers(); syncFilterUrl();
  }

  function openPaper(slug, updateHash = true) {
    const paper = data.papers.find((item) => item.slug === slug);
    if (!paper) return;
    elements.dialogContent.innerHTML = `
      <p class="detail-kicker">${escapeHtml(paper.status)} · ${formatDate(paper.read_date)}</p>
      <h2 id="dialog-title">${escapeHtml(paper.display_title || paper.title)}</h2>
      ${paper.display_title && paper.display_title !== paper.title ? `<p class="detail-full-title">${escapeHtml(paper.title)}</p>` : ""}
      <div class="detail-meta"><span>${escapeHtml(paper.authors)}</span><span>${escapeHtml(paper.venue)}</span><span>${escapeHtml(paper.published)}</span></div>
      <div class="detail-tags" aria-label="相关主题">${paper.tags.map((tag) => `<button class="tag-button" type="button" data-tag="${escapeHtml(tag)}">${escapeHtml(tagLabel(tag))} ↗</button>`).join("")}</div>
      ${paper.one_liner ? `<p class="detail-summary">${escapeHtml(paper.one_liner)}</p>` : ""}
      <div class="detail-body">${renderMarkdown(paper.body)}</div>
      ${paper.paper_url ? `<a class="paper-link" href="${escapeHtml(paper.paper_url)}" target="_blank" rel="noopener">查看原论文 ↗</a>` : ""}`;
    renderMath(elements.dialogContent);
    if (!elements.dialog.open) elements.dialog.showModal();
    syncDialogScrollLock();
    if (updateHash) history.pushState({ slug }, "", `#paper=${encodeURIComponent(slug)}`);
  }

  function closePaper(updateHash = true) {
    if (elements.dialog.open) elements.dialog.close();
    if (updateHash && location.hash.startsWith("#paper=")) history.pushState({}, "", location.pathname + location.search);
  }

  function openImage(button) {
    elements.imageDialogImage.src = button.dataset.imageSrc;
    elements.imageDialogImage.alt = button.dataset.imageAlt || "论文图片";
    elements.imageDialogCaption.textContent = button.dataset.imageCaption || "";
    elements.imageDialogCaption.hidden = !button.dataset.imageCaption;
    elements.imageDialog.showModal();
    syncDialogScrollLock();
  }

  function openFromHash() {
    const match = location.hash.match(/^#paper=(.+)$/);
    if (match) openPaper(decodeURIComponent(match[1]), false);
    else closePaper(false);
  }

  function initStats() {
    const uniqueDays = new Set(data.papers.map((paper) => paper.read_date)).size;
    document.querySelector("#stat-papers").textContent = data.papers.length;
    document.querySelector("#stat-tags").textContent = tagDefinitions.size;
    document.querySelector("#stat-days").textContent = uniqueDays;
    document.querySelector("#last-updated").textContent = data.generated_at ? `更新于 ${formatDate(data.generated_at.slice(0, 10))}` : "";
  }

  function initTheme() {
    const saved = localStorage.getItem("paper-recap-theme");
    const preferred = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = saved || preferred;
    document.querySelector("#theme-toggle").addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      localStorage.setItem("paper-recap-theme", next);
    });
  }

  elements.search.addEventListener("input", (event) => { state.query = event.target.value; renderPapers(); syncFilterUrl(); });
  elements.sort.addEventListener("change", (event) => { state.sort = event.target.value; renderPapers(); syncFilterUrl(); });
  elements.tags.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tag]");
    if (button) toggleTag(button.dataset.tag);
  });
  elements.keyToggle.addEventListener("click", () => {
    state.showTagKeys = !state.showTagKeys;
    renderTags();
  });
  elements.copyTags.addEventListener("click", async () => {
    if (state.tags.size === 0 || state.tags.size > 5) return;
    try {
      await navigator.clipboard.writeText(selectedTagSnippet());
      elements.authoringStatus.textContent = "已复制，可以粘贴到笔记头信息。";
    } catch {
      elements.tagSnippet.focus();
      elements.tagSnippet.select();
      elements.authoringStatus.textContent = "自动复制失败，已选中文本，请手动复制。";
    }
  });
  elements.grid.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (button?.dataset.tag) selectSingleTag(button.dataset.tag);
    else if (button?.dataset.slug) openPaper(button.dataset.slug);
  });
  elements.reset.addEventListener("click", clearFilters);
  document.querySelector("#clear-filters").addEventListener("click", clearFilters);
  document.querySelector("#dialog-close").addEventListener("click", () => closePaper());
  elements.dialog.addEventListener("click", (event) => { if (event.target === elements.dialog) closePaper(); });
  elements.dialog.addEventListener("close", () => {
    syncDialogScrollLock();
    if (location.hash.startsWith("#paper=")) closePaper();
  });
  elements.dialogContent.addEventListener("click", (event) => {
    const noteLink = event.target.closest("a[data-paper-slug]");
    if (noteLink) {
      event.preventDefault();
      openPaper(noteLink.dataset.paperSlug);
      elements.dialog.scrollTop = 0;
      return;
    }
    const button = event.target.closest(".paper-image-button");
    if (button) openImage(button);
    const tag = event.target.closest("[data-tag]");
    if (tag) selectSingleTag(tag.dataset.tag);
  });
  document.querySelector("#image-dialog-close").addEventListener("click", () => elements.imageDialog.close());
  elements.imageDialog.addEventListener("close", () => {
    elements.imageDialogImage.removeAttribute("src");
    syncDialogScrollLock();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement !== elements.search) { event.preventDefault(); elements.search.focus(); }
  });
  addEventListener("popstate", () => {
    readFiltersFromUrl(); renderTags(); renderPapers(); openFromHash();
  });

  readFiltersFromUrl(); initTheme(); initStats(); renderTags(); renderPapers(); openFromHash();
})();
