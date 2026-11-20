/* Online export: the build only packages assets; one click prints only the current note. */
(() => {
  "use strict";
  if (window.PaperRecapPdfExport || !window.PaperRecapPdfSnapshot) return;
  const script = document.currentScript;
  const dialog = document.querySelector("#paper-dialog");
  const content = document.querySelector("#dialog-content");
  const article = dialog?.querySelector(".paper-detail");
  if (!script?.src || !dialog || !content || !article) return;
  const base = new URL("./", script.src);
  const exportStyle = new URL(script.dataset.exportStyle || "export.css", base);
  let publicBase;
  try { publicBase = new URL(script.dataset.publicBaseUrl); } catch { return; }
  if (base.origin !== location.origin || exportStyle.origin !== location.origin
      || !exportStyle.pathname.endsWith("/plugins/pdf-export/export.css")
      || publicBase.protocol !== "https:" || publicBase.username || publicBase.password) return;
  const labels = new Map([
    ["gif-first-frame", "GIF 已固定为第一帧。"], ["gif-static-frame", "GIF 已转换为静态帧。"],
    ["external-embed-link", "动态嵌入已替换为说明和原始链接。"],
    ["long-code-wrap", "超宽代码已换行。"], ["long-text-wrap", "超长连续文字或链接已换行。"],
    ["wide-table-fit", "超宽表格已缩小以适应页宽。"], ["wide-formula-fit", "超宽公式已缩小以适应页宽。"],
    ["tall-figure-fit", "超高图片或图表已缩小以适应单页。"],
  ]);
  let controls, button, status, policyList, job;
  let destroyed = false;
  function finish() {
    if (!job) return;
    clearTimeout(job.timer); job.abort.abort(); job.frame.remove(); job = null;
    if (button) { button.disabled = false; button.textContent = "导出 PDF"; }
  }
  async function exportCurrent() {
    if (job || destroyed || !dialog.open) return;
    const marker = content.firstElementChild;
    const frame = document.createElement("iframe");
    frame.className = "pdf-export-frame"; frame.title = "论文笔记打印预览"; frame.tabIndex = -1;
    frame.setAttribute("aria-hidden", "true"); frame.setAttribute("sandbox", "allow-same-origin allow-modals");
    const abort = new AbortController();
    const current = { frame, abort, marker, timer: setTimeout(() => abort.abort(), 45000) };
    job = current; button.disabled = true; button.textContent = "正在准备…"; status.textContent = "";
    controls.querySelector("details").open = false;
    document.body.append(frame);
    try {
      const styles = [...document.querySelectorAll('head link[rel="stylesheet"]')].map((link) => new URL(link.href))
        .filter((url) => url.origin === location.origin || (url.protocol === "https:" && url.hostname === "cdn.jsdelivr.net"
          && url.pathname.startsWith("/npm/katex@0.17.0/dist/"))).map((url) => url.href);
      styles.push(exportStyle.href);
      const prepared = await window.PaperRecapPdfSnapshot.prepare({
        source: article, target: frame.contentDocument, styleUrls: styles,
        publicBaseUrl: publicBase.href, signal: abort.signal,
      });
      if (job !== current || destroyed) return;
      if (marker !== content.firstElementChild || !dialog.open || abort.signal.aborted) { finish(); return; }
      policyList.replaceChildren();
      prepared.exceptions.forEach((exception) => {
        const item = document.createElement("li"); item.textContent = labels.get(exception); policyList.append(item);
      });
      clearTimeout(current.timer);
      frame.contentWindow.addEventListener("afterprint", finish, { once: true, signal: abort.signal });
      button.textContent = "打印窗口已打开";
      frame.contentWindow.focus(); frame.contentWindow.print();
    } catch (error) {
      if (job !== current) return;
      finish();
      status.textContent = error.name === "AbortError" ? "准备超时，请检查网络后重试。"
        : "导出准备失败，请确认公式、图表和图片已加载后重试。";
    }
  }
  function update() {
    if (destroyed) return;
    if (job && (!dialog.open || job.marker !== content.firstElementChild)) finish();
    controls?.remove(); controls = null;
    if (!dialog.open || !content.querySelector(".detail-body")) return;
    controls = document.createElement("div"); controls.className = "pdf-export-actions";
    button = document.createElement("button"); button.className = "pdf-export-download"; button.type = "button";
    button.textContent = "导出 PDF"; button.addEventListener("click", exportCurrent);
    const details = document.createElement("details"); details.className = "pdf-export-policy";
    const summary = document.createElement("summary"); summary.textContent = "说明"; summary.setAttribute("aria-label", "PDF 导出说明");
    const box = document.createElement("div"); const policy = document.createElement("p");
    policy.textContent = "点击时仅准备当前笔记，再在浏览器打印窗口选择「另存为 PDF」。沿用当前主题，正文固定桌面宽度 820px；操作按钮、目录和图表源码隐藏。分页、长行换行及宽图缩放可能与网页不同；GIF 转为静态帧，动态嵌入保留原始链接。建议启用背景图形并关闭页眉页脚。";
    policyList = document.createElement("ul"); box.append(policy, policyList); details.append(summary, box);
    status = document.createElement("p"); status.className = "pdf-export-status"; status.setAttribute("role", "status");
    controls.append(button, details, status); article.prepend(controls);
  }
  function destroy() {
    destroyed = true; finish(); observer.disconnect();
    window.removeEventListener("hashchange", update); window.removeEventListener("popstate", update);
    controls?.remove(); delete window.PaperRecapPdfExport;
  }
  const observer = new MutationObserver(update);
  observer.observe(content, { childList: true }); observer.observe(dialog, { attributes: true, attributeFilter: ["open"] });
  window.addEventListener("hashchange", update); window.addEventListener("popstate", update);
  window.PaperRecapPdfExport = { destroy }; update();
})();
