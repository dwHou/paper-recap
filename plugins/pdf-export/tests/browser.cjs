"use strict";
// Browser-only integration tests; Playwright is never used by the site build or runtime plugin.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const http = require("node:http");
const { chromium } = require("playwright");
const ROOT = path.resolve(__dirname, "../../..");
const GIF = "R0lGODlhBAAEAIEAAP8AAAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQACgAAACwAAAAABAAEAAAICQABCBxIsCCAgAAh+QQBCgABACwAAAAABAAEAIEAAP8AAAAAAAAAAAAICQABCBxIsCCAgAA7";

async function armPrint(page) {
  await page.evaluate(() => {
    window.__printCalls = 0;
    window.__printObserver = new MutationObserver(() => {
      const frame = document.querySelector(".pdf-export-frame");
      if (!frame || frame.dataset.tested) return;
      frame.dataset.tested = "true";
      frame.contentWindow.print = () => { window.__printCalls += 1; };
    });
    window.__printObserver.observe(document.body, { childList: true });
  });
}

async function getPrintFrame(page) {
  await page.waitForFunction(() => window.__printCalls > 0);
  return (await page.locator(".pdf-export-frame").elementHandle()).contentFrame();
}

async function finishPrint(page, frame) {
  await page.evaluate(() => document.querySelector(".pdf-export-frame").contentWindow.dispatchEvent(new Event("afterprint")));
  await page.waitForFunction(() => !document.querySelector(".pdf-export-frame"));
  assert.equal(await page.locator(".pdf-export-download").isEnabled(), true);
}

async function main() {
  await fs.mkdir(path.join(ROOT, "tmp"), { recursive: true });
  const site = await fs.mkdtemp(path.join(ROOT, "tmp/pdf-runtime-tests-"));
  for (const name of ["index.html", "assets", "plugins"]) {
    await fs.cp(path.join(ROOT, "dist", name), path.join(site, name), { recursive: true });
  }
  assert.ok(!(await fs.readdir(path.join(site, "plugins/pdf-export"))).some((name) => name.endsWith(".pdf") || name === "manifest.json"));
  await fs.mkdir(path.join(site, "media/fixture"), { recursive: true });
  await fs.writeFile(path.join(site, "media/fixture/animation.gif"), Buffer.from(GIF, "base64"));
  const dataFile = path.join(site, "assets/papers.js");
  const data = JSON.parse((await fs.readFile(dataFile, "utf8")).match(/^window\.PAPER_RECAP_DATA = (\{[^]*\});\s*$/)[1]);
  const paragraph = "跨页验证，保留当前笔记的文字、公式 $x_t=a_tx_0+b_t\\epsilon$ 和层次结构。";
  const body = [
    "## 研究问题", "当前笔记 [另一篇](2026-11-01-second-note.md)。", "https://example.com/" + "unbroken".repeat(80),
    "## 核心方法", "$$\n\\mathcal{L} = \\mathbb{E}_{x,t} \\lVert \\epsilon_\\theta(x_t,t)-\\epsilon \\rVert_2^2\n$$",
    "```mermaid\nflowchart LR\nA[输入] --> B[模型] --> C[输出]\n```",
    ["```mermaid", "flowchart TD", ...Array.from({ length: 12 }, (_, i) => `N${i}[步骤 ${i}] --> N${i + 1}[步骤 ${i + 1}]`), "```"].join("\n"),
    '![GIF fixture](media/fixture/animation.gif "GIF fixture caption")',
    '```python\nprint("' + "wide-code ".repeat(50) + '")\n```',
    ["| First | Second | Third | Fourth |", "| --- | --- | --- | --- |", `| ${"column".repeat(20)} | ${"column".repeat(20)} | ${"column".repeat(20)} | ${"column".repeat(20)} |`].join("\n"),
    "$$\n\\text{" + "wide-formula-".repeat(35) + "}\n$$", "## 关键发现",
    '<iframe src="https://platform.twitter.com/embed/Tweet.html?id=1940248521111961988&lang=zh-cn&theme=light&dnt=true" width="550" height="650"></iframe>',
    "## 我的提问", ...Array.from({ length: 85 }, (_, i) => `### 第 ${i + 1} 个段落\n\n${paragraph}`),
    "## 局限与疑问", "分页与静态媒体。", "## 我的判断", "Native searchable text.", "## 下次只看这些", "FINAL_RUNTIME_MARKER",
  ].join("\n\n");
  const template = data.papers[0];
  data.papers = [
    { ...template, slug: "pdf-fixture", title: "PDF fixture 中文", display_title: "PDF fixture", body },
    { ...template, slug: "second-note", title: "Second note", display_title: "Second note", body: "## 研究问题\n\nOTHER_NOTE_ONLY" },
  ];
  await fs.writeFile(dataFile, `window.PAPER_RECAP_DATA = ${JSON.stringify(data)};\n`);
  const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".gif": "image/gif" };
  const server = http.createServer(async (request, response) => {
    try {
      const raw = decodeURIComponent((request.url || "").split("?")[0]);
      if (raw.includes("\\") || raw.split("/").includes("..")) throw new Error("invalid-path");
      const file = path.resolve(site, raw === "/" ? "index.html" : raw.slice(1));
      if (!file.startsWith(site + path.sep) || !mime[path.extname(file)]) throw new Error("invalid-file");
      const bytes = await fs.readFile(file);
      response.writeHead(200, { "Content-Type": mime[path.extname(file)] }); response.end(bytes);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, chromiumSandbox: true, executablePath: chromium.executablePath() });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: "light" });
    await page.route("https://platform.twitter.com/**", (route) => route.abort());
    const requests = []; const errors = [];
    page.on("request", (request) => requests.push(request.url()));
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${origin}/#paper=pdf-fixture`, { waitUntil: "networkidle" });
    await page.locator(".pdf-export-download").waitFor();
    assert.equal(await page.locator(".pdf-export-download").count(), 1);
    assert.equal(await page.locator(".pdf-export-frame").count(), 0);
    assert.ok(!requests.some((url) => /manifest\.json|\.pdf(?:\?|$)/.test(url)));
    await page.evaluate(() => window.PaperRecapDiagrams.renderMermaid(document.querySelector("#dialog-content")));
    const original = await page.locator(".detail-body").innerHTML();
    await armPrint(page);
    await page.locator(".pdf-export-download").click();
    const frame = await getPrintFrame(page);
    assert.equal(await frame.locator("button, iframe, script, .note-outline, .mermaid-source").count(), 0);
    assert.equal(await frame.locator(".mermaid-diagram svg").count(), 2);
    assert.equal(await frame.locator(".paper-detail").evaluate((el) => el.getBoundingClientRect().width), 820);
    assert.ok((await frame.locator(".paper-detail").innerText()).includes("FINAL_RUNTIME_MARKER"));
    assert.ok(!(await frame.locator(".paper-detail").innerText()).includes("OTHER_NOTE_ONLY"));
    assert.equal(await frame.locator("html").getAttribute("data-theme"), "light");
    assert.ok((await frame.locator("img").getAttribute("src")).startsWith("data:image/png"));
    const pixel = await frame.locator("img").evaluate((img) => {
      const canvas = document.createElement("canvas"); canvas.width = 1; canvas.height = 1;
      canvas.getContext("2d").drawImage(img, 0, 0); return [...canvas.getContext("2d").getImageData(0, 0, 1, 1).data];
    });
    assert.deepEqual(pixel, [255, 0, 0, 255]);
    assert.equal(await page.locator(".detail-body").innerHTML(), original);
    await page.screenshot({ path: path.join(site, "runtime-ui.png") });
    // Produce a QA PDF from the already prepared print DOM; never part of the product build.
    const html = await frame.evaluate(() => document.documentElement.outerHTML);
    const proof = await browser.newPage();
    await proof.setContent(html, { waitUntil: "networkidle" });
    await proof.evaluate(() => document.fonts.ready);
    await proof.pdf({ path: path.join(site, "runtime-proof.pdf"), width: "820px", height: "1160px", printBackground: true,
      margin: { top: "24px", bottom: "24px", left: 0, right: 0 }, tagged: true });
    await proof.close(); await finishPrint(page, frame);
    const explanations = await page.locator(".pdf-export-policy").textContent();
    for (const text of ["第一帧", "动态嵌入已替换", "超宽代码", "超宽表格", "超宽公式", "超长连续文字", "超高图片"]) assert.ok(explanations.includes(text), text);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
    await page.evaluate(() => window.PaperRecapDiagrams.renderMermaid(document.querySelector("#dialog-content")));
    await page.locator(".pdf-export-download").click();
    await page.waitForFunction(() => window.__printCalls === 2);
    const mobileFrame = await (await page.locator(".pdf-export-frame").elementHandle()).contentFrame();
    assert.equal(await mobileFrame.locator("html").getAttribute("data-theme"), "dark");
    assert.equal(await mobileFrame.locator(".paper-detail").evaluate((el) => el.getBoundingClientRect().width), 820);
    assert.equal(await mobileFrame.locator("#dialog-title").evaluate((el) => getComputedStyle(el).fontSize), "64px");
    assert.ok(await page.evaluate(() => document.querySelector(".detail-kicker").getBoundingClientRect().top
      >= document.querySelector(".pdf-export-actions").getBoundingClientRect().bottom + 8));
    await finishPrint(page, mobileFrame);
    await page.setViewportSize({ width: 1280, height: 900 });

    await page.locator(".detail-body img").evaluate((img) => { img.src = "media/fixture/missing.gif"; });
    await page.locator(".pdf-export-download").click();
    await page.waitForFunction(() => document.querySelector(".pdf-export-status").textContent.includes("失败"));
    assert.equal(await page.locator(".pdf-export-frame").count(), 0);
    assert.equal(await page.evaluate(() => window.__printCalls), 2);
    assert.ok(await page.locator(".pdf-export-download").isEnabled());
    await page.locator('a[data-paper-slug="second-note"]').click();
    assert.equal(await page.locator(".pdf-export-download").count(), 1);
    await page.goBack();
    await page.waitForFunction(() => document.querySelector("#dialog-title")?.textContent === "PDF fixture");
    assert.equal(await page.locator(".pdf-export-download").count(), 1);
    let releaseStyle, styleRequested;
    const held = new Promise((resolve) => { releaseStyle = resolve; });
    const requested = new Promise((resolve) => { styleRequested = resolve; });
    await page.route("**/export.css?*", async (route) => {
      styleRequested(); await held;
      try { await route.abort(); } catch { /* The cancelled frame may already be gone. */ }
    });
    await page.locator(".pdf-export-download").click();
    await requested;
    await page.locator(".pdf-export-download").dispatchEvent("click");
    assert.equal(await page.locator(".pdf-export-frame").count(), 1);
    await page.locator('a[data-paper-slug="second-note"]').click();
    assert.equal(await page.locator(".pdf-export-frame").count(), 0);
    assert.equal(await page.evaluate(() => window.__printCalls), 2);
    releaseStyle(); await page.unroute("**/export.css?*");
    await page.goBack();
    await page.waitForFunction(() => document.querySelector("#dialog-title")?.textContent === "PDF fixture");
    await page.route("**/export.css?*", (route) => route.abort());
    await page.locator(".pdf-export-download").click();
    await page.waitForFunction(() => document.querySelector(".pdf-export-status").textContent.includes("失败"));
    assert.equal(await page.locator(".pdf-export-frame").count(), 0);
    await page.unroute("**/export.css?*");
    await page.evaluate(() => window.PaperRecapPdfExport.destroy());
    assert.equal(await page.locator(".pdf-export-actions").count(), 0);
    await page.locator("#dialog-close").click(); await page.locator(".paper-card").first().click();
    assert.equal(await page.locator(".pdf-export-actions").count(), 0);
    assert.ok(await page.locator("#paper-dialog").evaluate((el) => el.open));
    assert.deepEqual(errors, []);
    await fs.writeFile(path.join(ROOT, "tmp/pdf-runtime-test-site.txt"), site);
    console.log(`Runtime browser checks passed: ${path.relative(ROOT, site)}`);
  } finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
