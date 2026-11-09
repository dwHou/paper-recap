const assert = require("node:assert/strict");
const test = require("node:test");
const { renderMermaid } = require("../assets/diagrams.js");

function figure(source) {
  const classes = new Set();
  const graphic = { getAttribute: () => "0 0 1800 700", style: { setProperty(name, value) { this[name] = value; } } };
  const preview = {
    dataset: {}, innerHTML: "", textContent: "",
    classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name) },
    setAttribute() {}, removeAttribute() {},
    querySelector: () => preview.innerHTML.includes("<svg") ? graphic : null,
  };
  const details = { open: false };
  const code = { textContent: source };
  return {
    isConnected: true, preview, details, code,
    querySelector: (selector) => ({ ".mermaid-diagram": preview, ".mermaid-source": details, ".mermaid-source code": code })[selector],
  };
}

test("Mermaid handles multiple diagrams, invalid source, theme changes, and detached notes", async () => {
  const previousDocument = global.document;
  const previousMermaid = global.mermaid;
  const configs = [];
  const calls = [];
  global.document = { documentElement: { dataset: { theme: "light" } }, fonts: { ready: Promise.resolve() } };
  global.mermaid = {
    initialize: (config) => configs.push(config),
    render: async (id, source) => {
      calls.push({ id, source });
      if (source === "invalid") throw new Error("parse failed");
      return { svg: "<svg></svg>" };
    },
  };
  try {
    const good = figure("flowchart LR\nA --> B");
    const bad = figure("invalid");
    const detached = figure("flowchart LR\nC --> D");
    detached.isConnected = false;
    const container = { querySelectorAll: () => [bad, good, detached] };
    await renderMermaid(container);
    assert.equal(good.preview.innerHTML, "<svg></svg>");
    assert.equal(good.preview.querySelector("svg").style["--mermaid-width"], "1800px");
    assert.equal(bad.details.open, true);
    assert.equal(bad.code.textContent, "invalid");
    assert.match(bad.preview.textContent, /语法无法解析/);
    assert.equal(calls.length, 2);
    assert.notEqual(calls[0].id, calls[1].id);
    assert.equal(configs[0].securityLevel, "strict");
    assert.equal(configs[0].startOnLoad, false);
    assert.equal(configs[0].suppressErrorRendering, true);
    assert.ok(configs[0].secure.includes("securityLevel"));
    global.document.documentElement.dataset.theme = "dark";
    await renderMermaid({ querySelectorAll: () => [good] });
    assert.equal(configs.at(-1).theme, "dark");
    assert.equal(calls.length, 3);
    assert.equal(good.preview.dataset.theme, "dark");
  } finally {
    global.document = previousDocument;
    global.mermaid = previousMermaid;
  }
});

test("a failed CDN load preserves source and resolves without an unhandled rejection", async () => {
  const previousDocument = global.document;
  const previousMermaid = global.mermaid;
  const handlers = {};
  const script = { addEventListener: (name, handler) => { handlers[name] = handler; }, remove() {} };
  global.mermaid = undefined;
  global.document = {
    createElement: () => script,
    head: { append: () => queueMicrotask(() => handlers.error()) },
  };
  try {
    const note = figure("flowchart LR\nA --> B");
    await renderMermaid({ querySelectorAll: () => [note] });
    assert.match(script.src, /^https:\/\/cdn\.jsdelivr\.net\/npm\/mermaid@12\.3\.0\//);
    assert.match(script.integrity, /^sha384-/);
    assert.equal(script.crossOrigin, "anonymous");
    assert.equal(note.details.open, true);
    assert.match(note.preview.textContent, /组件未能加载/);
    assert.equal(note.code.textContent, "flowchart LR\nA --> B");
  } finally {
    global.document = previousDocument;
    global.mermaid = previousMermaid;
  }
});
