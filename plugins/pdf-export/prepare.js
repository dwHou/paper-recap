/* Capture only the open note into a disposable same-origin print document. */
(() => {
  "use strict";
  function waitFor(promise, signal) {
    return new Promise((resolve, reject) => {
      const abort = () => reject(new DOMException("Export cancelled", "AbortError"));
      if (signal.aborted) { abort(); return; }
      signal.addEventListener("abort", abort, { once: true });
      Promise.resolve(promise).then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
    });
  }
  async function prepare({ source, target, styleUrls, publicBaseUrl, signal }) {
    if (!source?.isConnected || !source.querySelector(".detail-body")) throw new Error("note-unavailable");
    if (typeof window.renderMathInElement !== "function") throw new Error("math-unavailable");
    await waitFor(window.PaperRecapDiagrams.renderMermaid(source), signal);
    if (source.querySelector(".mermaid-error, .katex-error, .math-error")
        || [...source.querySelectorAll(".mermaid-diagram")].some((el) => !el.querySelector("svg"))) {
      throw new Error("formula-or-diagram-incomplete");
    }
    if (!source.isConnected || signal.aborted) throw new DOMException("Export cancelled", "AbortError");
    const exceptions = new Set();
    const article = target.importNode(source, true);
    const sourceImages = [...source.querySelectorAll("img")];
    article.querySelectorAll("img").forEach((img, index) => {
      img.src = sourceImages[index].currentSrc || sourceImages[index].src;
      img.loading = "eager";
    });
    article.querySelectorAll(".dialog-close, .pdf-export-actions, .note-outline, .mermaid-expand, .mermaid-source, script").forEach((el) => el.remove());
    article.querySelectorAll(".is-expanded").forEach((el) => el.classList.remove("is-expanded"));
    article.querySelectorAll("button").forEach((button) => {
      const span = target.createElement("span"); span.className = button.className;
      span.append(...button.childNodes); button.replaceWith(span);
    });
    article.querySelectorAll(".tweet-embed, iframe, video, audio").forEach((embed) => {
      if (!article.contains(embed)) return;
      const card = target.createElement("aside"); card.className = "pdf-export-embed";
      const message = target.createElement("p");
      message.textContent = "动态嵌入无法在静态 PDF 中播放，请访问原页面查看。";
      card.append(message);
      const raw = embed.querySelector("a[href]")?.href || embed.getAttribute("src");
      const link = target.createElement("a"); const url = new URL(raw || publicBaseUrl, publicBaseUrl);
      link.href = url.protocol === "https:" && !url.username && !url.password ? url.href : publicBaseUrl;
      link.textContent = "查看原始内容 ↗"; link.rel = "noopener noreferrer";
      card.append(link); embed.replaceWith(card); exceptions.add("external-embed-link");
    });
    article.querySelectorAll("a[href]").forEach((anchor) => {
      if (anchor.getAttribute("href").startsWith("#paper=")) anchor.href = new URL(anchor.getAttribute("href"), publicBaseUrl).href;
    });
    target.documentElement.lang = "zh-CN";
    target.documentElement.dataset.theme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    target.documentElement.classList.add("pdf-export-document");
    const title = target.createElement("title"); title.textContent = source.querySelector("#dialog-title").textContent;
    const charset = target.createElement("meta"); charset.setAttribute("charset", "UTF-8");
    target.head.replaceChildren(charset, title);
    const stylesReady = styleUrls.map((href) => {
      const link = target.createElement("link"); link.rel = "stylesheet"; link.href = href;
      const loaded = new Promise((resolve, reject) => {
        link.addEventListener("load", resolve, { once: true });
        link.addEventListener("error", () => reject(new Error("stylesheet-unavailable")), { once: true });
      });
      target.head.append(link); return loaded;
    });
    target.body.replaceChildren(article);
    await waitFor(Promise.all(stylesReady), signal);
    await waitFor(Promise.all([...article.querySelectorAll("img")].map(async (img) => {
      await img.decode();
      if (!img.naturalWidth || img.naturalWidth * img.naturalHeight > 100_000_000) throw new Error("image-invalid");
      if (new URL(img.src).pathname.toLowerCase().endsWith(".gif")) {
        const canvas = target.createElement("canvas");
        if (typeof ImageDecoder === "function") {
          const response = await fetch(img.src, { signal, credentials: "same-origin" });
          if (!response.ok) throw new Error("gif-unavailable");
          const decoder = new ImageDecoder({ data: await response.arrayBuffer(), type: "image/gif" });
          try {
            const { image } = await decoder.decode({ frameIndex: 0 });
            try {
              canvas.width = image.displayWidth; canvas.height = image.displayHeight;
              canvas.getContext("2d").drawImage(image, 0, 0);
            } finally { image.close(); }
          } finally { decoder.close(); }
          exceptions.add("gif-first-frame");
        } else {
          canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
          canvas.getContext("2d").drawImage(img, 0, 0); exceptions.add("gif-static-frame");
        }
        img.src = canvas.toDataURL("image/png"); await img.decode();
      }
    })), signal);
    article.getBoundingClientRect();
    await waitFor(target.fonts.ready, signal);
    if ([...target.fonts].some((font) => font.status === "error")) throw new Error("font-unavailable");
    const bodyWidth = article.querySelector(".detail-body").clientWidth;
    article.querySelectorAll("pre.code-block").forEach((pre) => {
      pre.style.whiteSpace = "pre";
      if (pre.scrollWidth > pre.clientWidth + 1) exceptions.add("long-code-wrap");
      pre.style.removeProperty("white-space");
    });
    for (const block of article.querySelectorAll(".table-scroll, .math-block")) {
      const available = Math.min(bodyWidth, block.parentElement.clientWidth);
      const inner = block.querySelector("table, .katex-display");
      const width = Math.max(block.scrollWidth, inner?.scrollWidth || 0);
      if (width > available + 1) {
        block.style.width = `${width}px`; block.style.maxWidth = "none"; block.style.zoom = String(available / width);
        exceptions.add(block.matches(".table-scroll") ? "wide-table-fit" : "wide-formula-fit");
      }
    }
    for (const math of article.querySelectorAll(".katex")) {
      if (math.closest(".math-block")) continue;
      const paragraph = math.closest("p, li, h2, h3, h4, h5, h6") || math.parentElement;
      const width = math.getBoundingClientRect().width;
      if (width > paragraph.clientWidth) {
        math.style.display = "inline-block"; math.style.zoom = String((paragraph.clientWidth - 2) / width);
        exceptions.add("wide-formula-fit");
      }
    }
    for (const paragraph of article.querySelectorAll("p, li, h2, h3, h4, h5, h6")) {
      if (paragraph.scrollWidth > paragraph.clientWidth + 1) {
        paragraph.style.overflowWrap = "anywhere"; exceptions.add("long-text-wrap");
      }
    }
    for (const block of article.querySelectorAll(".paper-figure, .mermaid-figure, .math-block")) {
      const height = block.getBoundingClientRect().height;
      if (height > 1020) {
        block.style.zoom = String((Number(block.style.zoom) || 1) * 1020 / height); exceptions.add("tall-figure-fit");
      }
    }
    if (article.scrollWidth > article.clientWidth + 1) throw new Error("unresolved-overflow");
    return { exceptions: [...exceptions].sort() };
  }
  window.PaperRecapPdfSnapshot = Object.freeze({ prepare });
})();
