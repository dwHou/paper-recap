const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { renderMarkdown } = require("../assets/markdown.js");

test("VAR note renders quoted formulas, lists, and tables", () => {
  const note = fs.readFileSync(path.join(__dirname, "../content/papers/2025-05-27-visual-autoregressive-modeling.md"), "utf8");
  const body = note.split(/^---\s*$/m).slice(2).join("---");
  const html = renderMarkdown(body);
  assert.ok((html.match(/class="math-block"/g) || []).length >= 8);
  assert.ok((html.match(/<table>/g) || []).length >= 2);
  assert.match(html, /<ol><li><strong>重建损失<\/strong>.*?<div class="math-block">\$\$/s);
  assert.doesNotMatch(html, /<p>&gt;<\/p>|<blockquote>\s*\$\$/);
});

test("quoted lists and nested lists keep their structure", () => {
  const html = renderMarkdown(">- first\n>- second\n>\n> 1. outer\n>    - inner");
  assert.match(html, /<blockquote><ul><li>first<\/li><li>second<\/li><\/ul><ol><li>outer<ul><li>inner<\/li><\/ul><\/li><\/ol><\/blockquote>/);
});

test("ordered items stay in one list across blank lines and keep indented explanations", () => {
  const markdown = "ViT的特性：\n\n1. 全局特性\n\n   这是第一项的说明。\n\n\n\n2. 多模态融合\n\n   这是第二项的说明。\n\n\n\n3. 多任务\n\n\n\n4. 表征能力";
  const html = renderMarkdown(markdown);
  assert.equal((html.match(/<ol>/g) || []).length, 1);
  assert.equal((html.match(/<li>/g) || []).length, 4);
  assert.match(html, /<li>全局特性<p>这是第一项的说明。<\/p><\/li><li>多模态融合<p>这是第二项的说明。<\/p><\/li>/);
  assert.match(renderMarkdown("3. 第三项\n\n4. 第四项"), /<ol start="3"><li>第三项<\/li><li>第四项<\/li><\/ol>/);
});

test("GIF figures and local paths render safely", () => {
  const html = renderMarkdown('![orientation](media/pwlf/orientation-classification.gif "旧笔记图 1")');
  assert.match(html, /<img src="media\/pwlf\/orientation-classification\.gif"/);
  assert.doesNotMatch(html, /<p>!\[/);
});

test("Markdown input cannot inject HTML or script URLs", () => {
  const html = renderMarkdown('<script>alert(1)</script> [bad](javascript:alert(1)) [good](https://example.com)');
  assert.doesNotMatch(html, /<script>|href="javascript:/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /href="https:\/\/example\.com"/);
});
