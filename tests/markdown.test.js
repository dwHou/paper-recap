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

test("GitHub-style alerts render all five types and preserve Markdown bodies", () => {
  for (const type of ["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"]) {
    const markdown = [
      ">   [!" + type + "]",
      ">",
      "> **要点**：请看下面两项。",
      ">",
      "> - 第一项",
      "> - 第二项",
    ].join("\n");
    const html = renderMarkdown(markdown);
    assert.match(html, new RegExp('class="markdown-alert markdown-alert-' + type.toLowerCase() + '"'));
    assert.match(html, /<div class="markdown-alert-title">(?:Note|Tip|Important|Warning|Caution)<\/div>/);
    assert.match(html, /<strong>要点<\/strong>/);
    assert.match(html, /<ul><li>第一项<\/li><li>第二项<\/li><\/ul>/);
    assert.doesNotMatch(html, /\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/);
  }
});

test("alerts can contain code and nested quotes without changing ordinary quotes", () => {
  const markdown = [
    "> [!tip]",
    "> 这里有 \x60code\x60。",
    ">",
    "> &#96;&#96;&#96;python",
    "> print(1)",
    "> &#96;&#96;&#96;",
    ">",
    "> > 嵌套引用",
  ].join("\n").replaceAll("&#96;", "\x60");
  const html = renderMarkdown(markdown);
  assert.match(html, /markdown-alert-tip/);
  assert.match(html, /<code>code<\/code>/);
  assert.match(html, /data-language="Python"/);
  assert.match(html, /<blockquote><p>嵌套引用<\/p><\/blockquote>/);
  assert.match(renderMarkdown("> 普通引用"), /^<blockquote><p>普通引用<\/p><\/blockquote>$/);
  assert.match(renderMarkdown("> [!UNKNOWN]\n> 原文"), /<blockquote><p>\[!UNKNOWN\] 原文<\/p><\/blockquote>/);
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

test("the video world models X post renders as an isolated embed", () => {
  const note = fs.readFileSync(path.join(__dirname, "../content/papers/2026-10-26-towards-video-world-models.md"), "utf8");
  const body = note.split(/^---\s*$/m).slice(2).join("---");
  const html = renderMarkdown(body);
  assert.match(html, /<figure class="tweet-embed"><iframe src="https:\/\/platform\.twitter\.com\/embed\/Tweet\.html\?id=1940248521111961988&amp;lang=zh-cn&amp;theme=light&amp;dnt=true"/);
  assert.match(html, /href="https:\/\/x\.com\/i\/web\/status\/1940248521111961988"/);
  assert.doesNotMatch(html, /&lt;iframe|<p><iframe/);
  assert.match(html, /<\/figure><p>但为什么当前的视频生成模型/);
});

test("unapproved iframes stay escaped", () => {
  const attempts = [
    '<iframe src="https://evil.example/embed/Tweet.html?id=1940248521111961988&lang=zh-cn&theme=light&dnt=true"></iframe>',
    '<iframe src="javascript:alert(1)"></iframe>',
    '<iframe src="https://platform.twitter.com/embed/Tweet.html?id=1940248521111961988&lang=zh-cn&theme=light&dnt=true" onload="alert(1)"></iframe>',
    '<iframe src="https://platform.twitter.com/embed/Tweet.html?id=1940248521111961988&lang=zh-cn&theme=light&dnt=true&extra=1"></iframe>',
  ];
  for (const attempt of attempts) {
    const html = renderMarkdown(attempt);
    assert.doesNotMatch(html, /<iframe\b/);
    assert.match(html, /&lt;iframe/);
  }
});

test("Python and pseudocode highlight tokens without changing or executing code", () => {
  const source = [
    "&#96;&#96;&#96;python",
    "@decorator",
    "def greet(name: str) -> bool:",
    "    \"\"\"A # docstring",
    "    across lines\"\"\"",
    "    value = \"# stays a string\"",
    "    return print(name, 42) # a comment",
    "<script>alert(1)</script>",
    "&#96;&#96;&#96;",
  ].join("\n").replaceAll("&#96;", "\x60");
  const html = renderMarkdown(source);
  assert.match(html, /data-language="Python"/);
  assert.match(html, /syntax-decorator">@decorator/);
  assert.match(html, /syntax-keyword">def/);
  assert.match(html, /syntax-definition">greet/);
  assert.match(html, /syntax-docstring">&quot;&quot;&quot;A # docstring\n    across lines&quot;&quot;&quot;/);
  assert.match(html, /syntax-string">&quot;# stays a string&quot;/);
  assert.match(html, /syntax-number">42/);
  assert.match(html, /syntax-comment"># a comment/);
  assert.doesNotMatch(html, /<script>|syntax-comment"># stays/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(renderMarkdown("&#96;&#96;&#96;pseudocode\nif ready:\n    return True\n&#96;&#96;&#96;".replaceAll("&#96;", "\x60")), /data-language="Pseudo"/);
});

test("shell, YAML, and C++ fences receive language-specific highlighting", () => {
  const fence = "\x60\x60\x60";
  const shell = renderMarkdown([fence + "bash", "export NAME=\"a#b\" # comment", "echo \"$NAME\" --verbose", "!wget file#part", fence].join("\n"));
  assert.match(shell, /data-language="Shell"/);
  assert.match(shell, /syntax-keyword">export/);
  assert.match(shell, /syntax-string">&quot;a#b&quot;/);
  assert.match(shell, /syntax-comment"># comment/);
  assert.match(shell, /syntax-option">--verbose/);
  assert.match(shell, /syntax-function">wget/);
  assert.doesNotMatch(shell, /syntax-comment">#part/);
  const yaml = renderMarkdown([fence + "yml", "name: \"value # text\" # comment", "enabled: true", "count: 3", fence].join("\n"));
  assert.match(yaml, /data-language="YAML"/);
  assert.match(yaml, /syntax-key">name/);
  assert.match(yaml, /syntax-string">&quot;value # text&quot;/);
  assert.match(yaml, /syntax-comment"># comment/);
  assert.match(yaml, /syntax-constant">true/);
  assert.match(yaml, /syntax-constant">3/);
  const cpp = renderMarkdown([fence + "c++", "#include <vector>", "int main() {", "  /* note */ std::cout << \"// not comment <script>\"; // comment", "  auto raw = R\"(// still a string)\";", "}", fence].join("\n"));
  assert.match(cpp, /data-language="C\+\+"/);
  assert.match(cpp, /syntax-preprocessor">#include/);
  assert.match(cpp, /syntax-keyword">int/);
  assert.match(cpp, /syntax-function">main/);
  assert.match(cpp, /syntax-comment">\/\* note \*\//);
  assert.match(cpp, /syntax-string">&quot;\/\/ not comment &lt;script&gt;&quot;/);
  assert.match(cpp, /syntax-comment">\/\/ comment/);
  assert.match(cpp, /syntax-string">R&quot;\(\/\/ still a string\)&quot;/);
  assert.doesNotMatch(cpp, /<script>/);
});

test("unknown code fences remain escaped plain text", () => {
  const html = renderMarkdown("\x60\x60\x60unknown\n<script>alert(1)</script>\n\x60\x60\x60");
  assert.match(html, /<pre class="code-block"><code>&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>|syntax-/);
});
