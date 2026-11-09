/* Mermaid 12.3.0 (MIT), loaded on demand from its versioned npm CDN bundle with SRI. */
(() => {
  "use strict";

  let libraryPromise;
  let renderQueue = Promise.resolve();
  let diagramId = 0;
  const maxTextSize = 50_000;

  function loadMermaid() {
    if (globalThis.mermaid?.render) return Promise.resolve(globalThis.mermaid);
    if (!libraryPromise) {
      libraryPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        const timer = setTimeout(() => {
          script.remove();
          reject(new Error("Mermaid load timed out"));
        }, 20_000);
        script.src = "https://cdn.jsdelivr.net/npm/mermaid@12.3.0/dist/mermaid.min.js";
        script.integrity = "sha384-HHW54r639fK42Ip0coGF3mz8oSiGn0eEoWNTLs75X7H63pLSDBa0Tqs0RwGmLlXE";
        script.crossOrigin = "anonymous";
        script.addEventListener("load", () => {
          clearTimeout(timer);
          if (globalThis.mermaid?.render) resolve(globalThis.mermaid);
          else { script.remove(); reject(new Error("Mermaid is unavailable")); }
        }, { once: true });
        script.addEventListener("error", () => {
          clearTimeout(timer);
          script.remove();
          reject(new Error("Mermaid failed to load"));
        }, { once: true });
        document.head.append(script);
      }).catch((error) => {
        libraryPromise = null;
        throw error;
      });
    }
    return libraryPromise;
  }

  function showFallback(figure, message) {
    if (!figure.isConnected) return;
    const preview = figure.querySelector(".mermaid-diagram");
    preview.textContent = message;
    preview.removeAttribute("aria-busy");
    preview.classList.add("mermaid-error");
    figure.querySelector(".mermaid-source").open = true;
  }

  function renderMermaid(container) {
    const figures = [...container.querySelectorAll(".mermaid-figure")];
    if (!figures.length) return Promise.resolve();
    // Serialize layout work and ignore note elements replaced while the library was loading.
    renderQueue = renderQueue.then(async () => {
      const pending = figures.filter((figure) => figure.isConnected);
      if (!pending.length) return;
      const library = await loadMermaid();
      await document.fonts?.ready;
      const theme = document.documentElement.dataset.theme === "dark" ? "dark" : "default";
      library.initialize({
        startOnLoad: false, securityLevel: "strict", suppressErrorRendering: true,
        maxTextSize, maxEdges: 500, theme, layout: "dagre", look: "classic",
        fontFamily: 'Inter, "PingFang SC", "Microsoft YaHei", sans-serif',
        secure: ["secure", "securityLevel", "startOnLoad", "maxTextSize", "maxEdges", "suppressErrorRendering", "dompurifyConfig"],
      });
      for (const figure of pending) {
        if (!figure.isConnected) continue;
        const source = figure.querySelector(".mermaid-source code").textContent;
        const preview = figure.querySelector(".mermaid-diagram");
        if (preview.dataset.theme === theme && preview.querySelector("svg")) continue;
        if (source.length > maxTextSize) {
          showFallback(figure, "图表源码过长，请精简后重试；原始源码已保留在下方。");
          continue;
        }
        preview.setAttribute("aria-busy", "true");
        try {
          const { svg } = await library.render(`paper-mermaid-${++diagramId}`, source);
          if (!figure.isConnected) continue;
          // Mermaid's strict mode sanitizes the generated SVG; raw note HTML is never inserted here.
          preview.innerHTML = svg;
          const graphic = preview.querySelector("svg");
          const width = Number(graphic?.getAttribute("viewBox")?.trim().split(/\s+/)[2]);
          // Keep a readable natural size available when the reader expands a wide graph.
          if (Number.isFinite(width) && width > 0) graphic.style.setProperty("--mermaid-width", `${Math.min(Math.ceil(width), 10_000)}px`);
          preview.dataset.theme = theme;
          preview.classList.remove("mermaid-error");
          preview.removeAttribute("aria-busy");
        } catch {
          showFallback(figure, "图表语法无法解析，请检查下方源码。");
        }
      }
    }).catch(() => {
      figures.forEach((figure) => showFallback(figure, "图表组件未能加载，请检查网络后重新打开笔记；源码已保留在下方。"));
    });
    return renderQueue;
  }

  const api = { renderMermaid };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else globalThis.PaperRecapDiagrams = api;
})();
