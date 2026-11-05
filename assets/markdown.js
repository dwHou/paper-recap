/* Small, dependency-free Markdown subset used by paper notes. All note text is escaped. */
(() => {
  "use strict";

  const escapeHtml = (value = "") => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function plainInline(text) {
    return escapeHtml(text)
      .replace(/\[([^\]]+)\]\((\d{4}-\d{2}-\d{2}-([a-z0-9-]+)\.md)\)/g,
        (_match, label, _filename, slug) => `<a href="#paper=${slug}" data-paper-slug="${slug}">${label}</a>`)
      .replace(/\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/~~(.+?)~~/g, "<del>$1</del>")
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>")
      // The note format uses this one legacy color tag; all other HTML stays escaped.
      .replace(/&lt;font color=&quot;brown&quot;&gt;([\s\S]*?)&lt;\/font&gt;/gi,
        '<span class="note-color-brown">$1</span>');
  }

  function inlineMarkdown(text) {
    const pieces = [];
    const protectedHtml = [];
    // Spaces keep protected content out of link destinations; the prefix cannot collide with note text.
    let tokenPrefix = "\u0000paper-recap-inline ";
    while (text.includes(tokenPrefix)) tokenPrefix += "\u0000";
    let plain = "";
    for (let index = 0; index < text.length;) {
      const marker = text[index] === "`"
        ? (text.slice(index).match(/^`+/) || [""])[0]
        : text[index] === "$" ? (text[index + 1] === "$" ? "$$" : "$") : "";
      if (!marker || (index > 0 && text[index - 1] === "\\")) {
        plain += text[index];
        index += 1;
        continue;
      }
      const close = text.indexOf(marker, index + marker.length);
      if (close < 0) {
        plain += marker;
        index += marker.length;
        continue;
      }
      if (plain) pieces.push(plain);
      plain = "";
      const value = text.slice(index + marker.length, close);
      const token = protectedHtml.length;
      protectedHtml.push(marker[0] === "`"
        ? `<code>${escapeHtml(value)}</code>`
        : escapeHtml(`${marker}${value}${marker}`));
      pieces.push(`${tokenPrefix}${token}\u0000`);
      index = close + marker.length;
    }
    if (plain) pieces.push(plain);
    // Parse emphasis across protected formulas/code, then restore only escaped, renderer-owned HTML.
    return plainInline(pieces.join("")).replace(
      new RegExp(`${tokenPrefix}(\\d+)\u0000`, "g"),
      (_match, token) => protectedHtml[Number(token)],
    );
  }

  const quoteLine = (line) => line.match(/^ {0,3}> ?(.*)$/);
  const alertType = (line) => line.match(/^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/i);
  const alertLabels = { NOTE: "Note", TIP: "Tip", IMPORTANT: "Important", WARNING: "Warning", CAUTION: "Caution" };
  const listLine = (line) => line.match(/^([ \t]*)([-*+]|\d+[.)])\s+(.+)$/);
  const indentOf = (text) => text.replace(/\t/g, "    ").length;
  const listKind = (marker) => /^\d/.test(marker) ? "ol" : "ul";
  const divider = (line) => /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
  const imageLine = (line) => line.match(/^!\[([^\]]+)\]\((media\/[a-z0-9-]+\/[a-z0-9][a-z0-9._-]*\.(?:png|jpe?g|webp|gif))(?:\s+"([^"]+)")?\)$/i);

  function tweetIframe(lines, start) {
    if (!/^<iframe(?:\s|>|$)/i.test(lines[start].trim())) return null;
    const parts = [];
    let next = start;
    while (next < lines.length && next - start < 8) {
      parts.push(lines[next].trim());
      next += 1;
      if (/<\/iframe>\s*$/i.test(parts[parts.length - 1])) break;
    }
    const source = parts.join(" ");
    if (source.length > 1024 || !/<\/iframe>\s*$/i.test(source)) return null;
    const block = source.match(/^<iframe\b([\s\S]*?)>\s*<\/iframe>$/i);
    if (!block) return null;

    // Accept only the known X embed shape, then construct fresh HTML from its numeric post ID.
    const allowed = new Set(["src", "width", "height", "frameborder", "scrolling", "style"]);
    const attributes = Object.create(null);
    const attributePattern = /\s+([a-z][a-z0-9-]*)="([^"]*)"/gi;
    let cursor = 0;
    for (const match of block[1].matchAll(attributePattern)) {
      if (match.index !== cursor) return null;
      const name = match[1].toLowerCase();
      if (!allowed.has(name) || Object.hasOwn(attributes, name)) return null;
      attributes[name] = match[2];
      cursor += match[0].length;
    }
    if (block[1].slice(cursor).trim()) return null;
    if (attributes.width && (!/^\d{1,4}$/.test(attributes.width) || Number(attributes.width) > 800)) return null;
    if (attributes.height && (!/^\d{1,4}$/.test(attributes.height) || Number(attributes.height) > 1200)) return null;
    if (attributes.frameborder && attributes.frameborder !== "0") return null;
    if (attributes.scrolling && attributes.scrolling !== "no") return null;
    if (attributes.style && attributes.style !== "display:block;margin:0 auto;border:none;overflow:hidden;") return null;

    let url;
    try { url = new URL(attributes.src); } catch { return null; }
    if (url.protocol !== "https:" || url.hostname !== "platform.twitter.com"
      || url.pathname !== "/embed/Tweet.html" || url.port || url.hash) return null;
    const params = [...url.searchParams.entries()];
    if (params.length !== 4 || new Set(params.map(([key]) => key)).size !== 4
      || !/^\d{15,20}$/.test(url.searchParams.get("id") || "")
      || url.searchParams.get("lang") !== "zh-cn"
      || url.searchParams.get("theme") !== "light"
      || url.searchParams.get("dnt") !== "true") return null;

    const id = url.searchParams.get("id");
    const embedUrl = `https://platform.twitter.com/embed/Tweet.html?id=${id}&lang=zh-cn&theme=light&dnt=true`;
    const postUrl = `https://x.com/i/web/status/${id}`;
    return {
      html: `<figure class="tweet-embed"><iframe src="${escapeHtml(embedUrl)}" title="X 推文 ${id}" loading="lazy" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-popups" allowfullscreen></iframe><figcaption><a href="${postUrl}" target="_blank" rel="noopener noreferrer">在 X 查看原帖</a></figcaption></figure>`,
      next,
    };
  }

  const pythonKeywords = new Set([
    "and", "as", "assert", "async", "await", "break", "case", "class", "continue", "def", "del",
    "elif", "else", "except", "finally", "for", "from", "global", "if", "import", "in", "is",
    "lambda", "match", "nonlocal", "not", "or", "pass", "raise", "return", "try", "while", "with", "yield",
  ]);
  const pythonConstants = new Set(["True", "False", "None", "NotImplemented", "Ellipsis"]);
  const pythonStringStart = /^(?:(?:br|rb|fr|rf|r|u|b|f))?(?:'''|"""|'|")/i;
  const pythonNumber = /^(?:0[xX][\da-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(?:\d[\d_]*(?:\.\d[\d_]*)?|\.\d[\d_]*)(?:[eE][+-]?\d[\d_]*)?j?)/;

  function pythonStringEnd(code, start, opening) {
    const delimiter = opening.slice(opening.search(/['"]/));
    let index = start + opening.length;
    while (index < code.length) {
      if (code[index] === "\\") { index += 2; continue; }
      if (code.startsWith(delimiter, index)) return index + delimiter.length;
      if (delimiter.length === 1 && code[index] === "\n") return index;
      index += 1;
    }
    return code.length;
  }

  function highlightPython(code) {
    const output = [];
    let index = 0;
    let plainStart = 0;
    let definition = false;
    const emit = (end, tokenClass) => {
      if (plainStart < index) output.push(escapeHtml(code.slice(plainStart, index)));
      output.push(`<span class="syntax-${tokenClass}">${escapeHtml(code.slice(index, end))}</span>`);
      index = end;
      plainStart = end;
    };
    while (index < code.length) {
      const char = code[index];
      if (char === "\n") definition = false;
      if (char === "#") {
        const end = code.indexOf("\n", index);
        emit(end < 0 ? code.length : end, "comment");
        definition = false;
        continue;
      }
      const string = code.slice(index).match(pythonStringStart);
      if (string) {
        emit(pythonStringEnd(code, index, string[0]), string[0].includes("'''") || string[0].includes('"""') ? "docstring" : "string");
        definition = false;
        continue;
      }
      if (char === "@" && /^[ \t]*$/.test(code.slice(code.lastIndexOf("\n", index - 1) + 1, index))) {
        const decorator = code.slice(index).match(/^@[A-Za-z_][\w.]*/);
        if (decorator) { emit(index + decorator[0].length, "decorator"); continue; }
      }
      const number = code.slice(index).match(pythonNumber);
      if (number) { emit(index + number[0].length, "number"); continue; }
      const identifier = code.slice(index).match(/^[A-Za-z_][\w]*/);
      if (identifier) {
        const word = identifier[0];
        const end = index + word.length;
        if (definition) { emit(end, "definition"); definition = false; }
        else if (pythonConstants.has(word)) emit(end, "constant");
        else if (pythonKeywords.has(word)) { emit(end, "keyword"); definition = word === "def" || word === "class"; }
        else if (/^[ \t]*\(/.test(code.slice(end))) emit(end, "function");
        else index = end;
        continue;
      }
      if (definition && !/[ \t]/.test(char)) definition = false;
      index += 1;
    }
    if (plainStart < code.length) output.push(escapeHtml(code.slice(plainStart)));
    return output.join("");
  }

  const shellKeywords = new Set([
    "if", "then", "else", "elif", "fi", "for", "in", "do", "done", "while", "case", "esac",
    "function", "select", "until", "export", "local", "readonly", "unset", "return",
  ]);
  const shellCommands = new Set(["cd", "echo", "printf", "git", "python", "python3", "pip", "pip3", "bash", "sh", "zsh", "curl", "make", "cmake", "npm", "node", "cat", "grep", "rg", "sed", "awk"]);
  const cppKeywords = new Set([
    "alignas", "auto", "bool", "break", "case", "catch", "char", "class", "const", "constexpr",
    "continue", "decltype", "default", "delete", "do", "double", "else", "enum", "explicit",
    "extern", "false", "float", "for", "friend", "if", "inline", "int", "long", "namespace",
    "new", "noexcept", "nullptr", "operator", "private", "protected", "public", "return",
    "short", "signed", "sizeof", "static", "struct", "switch", "template", "this", "throw",
    "true", "try", "typedef", "typename", "union", "unsigned", "using", "virtual", "void",
    "volatile", "while",
  ]);

  function quotedEnd(code, start, quote, multiline = false) {
    let index = start + 1;
    while (index < code.length) {
      if (code[index] === "\\") { index += 2; continue; }
      if (code[index] === quote) return index + 1;
      if (!multiline && code[index] === "\n") return index;
      index += 1;
    }
    return code.length;
  }

  function highlightShell(code) {
    const output = [];
    let index = 0;
    let plainStart = 0;
    const emit = (end, tokenClass) => {
      if (plainStart < index) output.push(escapeHtml(code.slice(plainStart, index)));
      output.push('<span class="syntax-' + tokenClass + '">' + escapeHtml(code.slice(index, end)) + "</span>");
      index = end;
      plainStart = end;
    };
    while (index < code.length) {
      const char = code[index];
      if (char === "#" && (index === 0 || /[\s;|&(){}]/.test(code[index - 1]))) {
        const end = code.indexOf("\n", index);
        emit(end < 0 ? code.length : end, "comment");
        continue;
      }
      if (char === "'" || char === '"') {
        emit(quotedEnd(code, index, char), "string");
        continue;
      }
      if (char === "$") {
        const variable = code.slice(index).match(/^\$(?:\{[A-Za-z_][\w]*(?::-[^}]*)?\}|[A-Za-z_][\w]*|[0-9@?#$!])/);
        if (variable) { emit(index + variable[0].length, "variable"); continue; }
      }
      const option = code.slice(index).match(/^--?[A-Za-z][\w-]*/);
      if (option && (index === 0 || /[\s=]/.test(code[index - 1]))) {
        emit(index + option[0].length, "option");
        continue;
      }
      const lineStart = code.lastIndexOf("\n", index - 1) + 1;
      if (/^[ \t]*(?:[!$][ \t]*)?$/.test(code.slice(lineStart, index))) {
        const command = code.slice(index).match(/^[A-Za-z_][\w.-]*/);
        if (command && code[index + command[0].length] !== "=" && !shellKeywords.has(command[0])) {
          emit(index + command[0].length, "function");
          continue;
        }
      }
      const identifier = code.slice(index).match(/^[A-Za-z_][\w]*/);
      if (identifier) {
        const word = identifier[0];
        const end = index + word.length;
        if (shellKeywords.has(word)) emit(end, "keyword");
        else if (shellCommands.has(word)) emit(end, "function");
        else index = end;
        continue;
      }
      index += 1;
    }
    if (plainStart < code.length) output.push(escapeHtml(code.slice(plainStart)));
    return output.join("");
  }

  function highlightYaml(code) {
    const output = [];
    let index = 0;
    let plainStart = 0;
    const emit = (end, tokenClass) => {
      if (plainStart < index) output.push(escapeHtml(code.slice(plainStart, index)));
      output.push('<span class="syntax-' + tokenClass + '">' + escapeHtml(code.slice(index, end)) + "</span>");
      index = end;
      plainStart = end;
    };
    while (index < code.length) {
      const char = code[index];
      const lineStart = code.lastIndexOf("\n", index - 1) + 1;
      if (index === lineStart || /^[ \t]*(?:-\s+)?$/.test(code.slice(lineStart, index))) {
        const key = code.slice(index).match(/^[A-Za-z_][\w.-]*(?=\s*:)/);
        if (key) { emit(index + key[0].length, "key"); continue; }
      }
      if (char === "#" && (index === lineStart || /\s/.test(code[index - 1]))) {
        const end = code.indexOf("\n", index);
        emit(end < 0 ? code.length : end, "comment");
        continue;
      }
      if (char === "'" || char === '"') {
        if (char === "'") {
          let end = index + 1;
          while (end < code.length && code[end] !== "\n") {
            if (code[end] === "'" && code[end + 1] === "'") { end += 2; continue; }
            if (code[end] === "'") { end += 1; break; }
            end += 1;
          }
          emit(end, "string");
        } else emit(quotedEnd(code, index, char), "string");
        continue;
      }
      const scalar = code.slice(index).match(/^(?:true|false|null|yes|no|on|off|~|[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)(?![\w.-])/i);
      if (scalar && (index === 0 || /[\s:,\[\]{}-]/.test(code[index - 1]))) {
        emit(index + scalar[0].length, "constant");
        continue;
      }
      index += 1;
    }
    if (plainStart < code.length) output.push(escapeHtml(code.slice(plainStart)));
    return output.join("");
  }

  function highlightCpp(code) {
    const output = [];
    let index = 0;
    let plainStart = 0;
    const emit = (end, tokenClass) => {
      if (plainStart < index) output.push(escapeHtml(code.slice(plainStart, index)));
      output.push('<span class="syntax-' + tokenClass + '">' + escapeHtml(code.slice(index, end)) + "</span>");
      index = end;
      plainStart = end;
    };
    while (index < code.length) {
      if (code.startsWith("//", index)) {
        const end = code.indexOf("\n", index);
        emit(end < 0 ? code.length : end, "comment");
        continue;
      }
      if (code.startsWith("/*", index)) {
        const end = code.indexOf("*/", index + 2);
        emit(end < 0 ? code.length : end + 2, "comment");
        continue;
      }
      const char = code[index];
      if (code.startsWith('R"', index)) {
        const raw = code.slice(index).match(/^R"([^()\s\\]{0,16})\(/);
        if (raw) {
          const closing = ")" + raw[1] + '"';
          const end = code.indexOf(closing, index + raw[0].length);
          emit(end < 0 ? code.length : end + closing.length, "string");
          continue;
        }
      }
      if (char === '"' || char === "'") {
        emit(quotedEnd(code, index, char), "string");
        continue;
      }
      if (char === "#" && /^[ \t]*$/.test(code.slice(code.lastIndexOf("\n", index - 1) + 1, index))) {
        const directive = code.slice(index).match(/^#[ \t]*[A-Za-z_]+/);
        if (directive) { emit(index + directive[0].length, "preprocessor"); continue; }
      }
      const number = code.slice(index).match(/^(?:0[xX][\da-fA-F']+|0[bB][01']+|\d[\d']*(?:\.\d[\d']*)?(?:[eE][+-]?\d+)?)(?:[uUlLfF]+)?/);
      if (number && (index === 0 || !/[\w]/.test(code[index - 1]))) {
        emit(index + number[0].length, "number");
        continue;
      }
      const identifier = code.slice(index).match(/^[A-Za-z_][\w]*/);
      if (identifier) {
        const word = identifier[0];
        const end = index + word.length;
        if (cppKeywords.has(word)) emit(end, ["true", "false", "nullptr"].includes(word) ? "constant" : "keyword");
        else if (/^[ \t]*\(/.test(code.slice(end))) emit(end, "function");
        else index = end;
        continue;
      }
      index += 1;
    }
    if (plainStart < code.length) output.push(escapeHtml(code.slice(plainStart)));
    return output.join("");
  }

  function tableCells(line) {
    const cells = [];
    let cell = "";
    const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
    for (let index = 0; index < trimmed.length; index += 1) {
      const char = trimmed[index];
      if (char === "|" && trimmed[index - 1] !== "\\") {
        cells.push(cell.trim());
        cell = "";
      } else cell += char;
    }
    cells.push(cell.trim());
    return cells;
  }

  function renderTable(lines, start) {
    const headers = tableCells(lines[start]);
    const alignments = tableCells(lines[start + 1]).map((cell) => {
      if (cell.startsWith(":") && cell.endsWith(":")) return "center";
      if (cell.endsWith(":")) return "right";
      return "left";
    });
    const head = headers.map((cell, index) => `<th class="align-${alignments[index] || "left"}" scope="col">${inlineMarkdown(cell)}</th>`).join("");
    const rows = [];
    let index = start + 2;
    while (index < lines.length && lines[index].includes("|")) {
      const cells = tableCells(lines[index]);
      if (cells.length !== headers.length) break;
      rows.push(`<tr>${cells.map((cell, cellIndex) => `<td class="align-${alignments[cellIndex] || "left"}">${inlineMarkdown(cell)}</td>`).join("")}</tr>`);
      index += 1;
    }
    return { html: `<div class="table-scroll"><table><thead><tr>${head}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`, next: index };
  }

  function renderList(lines, start, depth) {
    const first = listLine(lines[start]);
    const base = indentOf(first[1]);
    const kind = listKind(first[2]);
    const firstNumber = kind === "ol" ? Number.parseInt(first[2], 10) : 1;
    const startAttribute = Number.isSafeInteger(firstNumber) && firstNumber !== 1 ? ` start="${firstNumber}"` : "";
    const items = [];
    let index = start;
    while (index < lines.length) {
      const match = listLine(lines[index]);
      if (!match || indentOf(match[1]) !== base || listKind(match[2]) !== kind) break;
      index += 1;
      const children = [];
      const contentIndent = base + match[2].length + 1;
      while (index < lines.length) {
        const current = lines[index];
        if (!current.trim()) {
          let nextIndex = index + 1;
          while (nextIndex < lines.length && !lines[nextIndex].trim()) nextIndex += 1;
          if (nextIndex === lines.length) { index = nextIndex; break; }
          const next = lines[nextIndex];
          const nextMatch = listLine(next);
          if (nextMatch && indentOf(nextMatch[1]) === base && listKind(nextMatch[2]) === kind) { index = nextIndex; break; }
          if (indentOf((next.match(/^[ \t]*/) || [""])[0]) > base) { children.push(""); index = nextIndex; continue; }
          break;
        }
        const leading = (current.match(/^[ \t]*/) || [""])[0];
        if (indentOf(leading) <= base) break;
        children.push(current.slice(Math.min(leading.length, contentIndent)));
        index += 1;
      }
      items.push(`<li>${inlineMarkdown(match[3])}${children.length ? renderBlocks(children, depth + 1) : ""}</li>`);
    }
    return { html: `<${kind}${startAttribute}>${items.join("")}</${kind}>`, next: index };
  }

  function blockStart(lines, index) {
    const line = lines[index];
    const trimmed = line.trim();
    return /^```|^~~~/.test(trimmed) || quoteLine(line) || /^\$\$|^\\\[/.test(trimmed)
      || imageLine(trimmed) || /^<iframe(?:\s|>|$)/i.test(trimmed) || /^#{1,6}\s+/.test(trimmed)
      || /^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed) || listLine(line)
      || (index + 1 < lines.length && line.includes("|") && divider(lines[index + 1]));
  }

  function renderBlocks(lines, depth) {
    if (depth > 24) return `<p>${escapeHtml(lines.join(" "))}</p>`;
    const output = [];
    for (let index = 0; index < lines.length;) {
      const raw = lines[index];
      const line = raw.trim();
      if (!line) { index += 1; continue; }

      const fence = line.match(/^(`{3,}|~{3,})[^`~]*$/);
      if (fence) {
        const language = (line.slice(fence[1].length).trim().match(/^[A-Za-z0-9_+-]+/) || [""])[0].toLowerCase();
        const highlighters = {
          python: [highlightPython, "Python"], python3: [highlightPython, "Python"], py: [highlightPython, "Python"],
          pseudo: [highlightPython, "Pseudo"], pseudocode: [highlightPython, "Pseudo"],
          shell: [highlightShell, "Shell"], sh: [highlightShell, "Shell"], bash: [highlightShell, "Shell"], zsh: [highlightShell, "Shell"],
          yaml: [highlightYaml, "YAML"], yml: [highlightYaml, "YAML"],
          cpp: [highlightCpp, "C++"], "c++": [highlightCpp, "C++"], cxx: [highlightCpp, "C++"], cc: [highlightCpp, "C++"],
        };
        const highlighter = Object.hasOwn(highlighters, language) ? highlighters[language] : null;
        const code = [];
        index += 1;
        while (index < lines.length && !new RegExp(`^${fence[1][0]}{${fence[1].length},}\\s*$`).test(lines[index].trim())) {
          code.push(lines[index]);
          index += 1;
        }
        if (index < lines.length) index += 1;
        const source = code.join("\n");
        const highlighted = highlighter && source.length <= 100_000 ? highlighter[0](source) : escapeHtml(source);
        const label = highlighter ? ' data-language="' + highlighter[1] + '"' : "";
        output.push('<pre class="code-block' + (highlighter ? ' code-highlighted' : '') + '"' + label + '><code>' + highlighted + '</code></pre>');
        continue;
      }

      if (quoteLine(raw)) {
        const quoted = [];
        while (index < lines.length) {
          const match = quoteLine(lines[index]);
          if (!match) break;
          quoted.push(match[1]);
          index += 1;
        }
        const alert = quoted.length ? alertType(quoted[0]) : null;
        if (alert) {
          const type = alert[1].toUpperCase();
          output.push('<aside class="markdown-alert markdown-alert-' + type.toLowerCase()
            + '" aria-label="' + alertLabels[type] + '"><div class="markdown-alert-title">' + alertLabels[type]
            + '</div><div class="markdown-alert-body">' + renderBlocks(quoted.slice(1), depth + 1) + "</div></aside>");
        } else output.push(`<blockquote>${renderBlocks(quoted, depth + 1)}</blockquote>`);
        continue;
      }

      const delimiter = line.startsWith("$$") ? "$$" : line.startsWith("\\[") ? "\\[" : "";
      if (delimiter) {
        const closing = delimiter === "$$" ? "$$" : "\\]";
        const math = [raw];
        index += 1;
        if (!(line.length > delimiter.length && line.endsWith(closing))) {
          while (index < lines.length) {
            math.push(lines[index]);
            index += 1;
            if (math[math.length - 1].trim().endsWith(closing)) break;
          }
        }
        output.push(`<div class="math-block">${escapeHtml(math.join("\n"))}</div>`);
        continue;
      }

      if (index + 1 < lines.length && raw.includes("|") && divider(lines[index + 1])) {
        const table = renderTable(lines, index);
        output.push(table.html);
        index = table.next;
        continue;
      }

      const image = imageLine(line);
      if (image) {
        const [, alt, path, caption = ""] = image;
        output.push(`<figure class="paper-figure"><button class="paper-image-button" type="button" data-image-src="${escapeHtml(path)}" data-image-alt="${escapeHtml(alt)}" data-image-caption="${escapeHtml(caption)}" aria-label="放大查看：${escapeHtml(alt)}"><img src="${escapeHtml(path)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async" /></button>${caption ? `<figcaption>${inlineMarkdown(caption)}</figcaption>` : ""}</figure>`);
        index += 1;
        continue;
      }

      const tweet = tweetIframe(lines, index);
      if (tweet) {
        output.push(tweet.html);
        index = tweet.next;
        continue;
      }

      const heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        output.push(`<h${heading[1].length} data-outline-label="${escapeHtml(heading[2])}">${inlineMarkdown(heading[2])}</h${heading[1].length}>`);
        index += 1;
        continue;
      }
      if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(line)) { output.push("<hr />"); index += 1; continue; }
      if (listLine(raw)) {
        const list = renderList(lines, index, depth);
        output.push(list.html);
        index = list.next;
        continue;
      }

      const paragraph = [line];
      index += 1;
      while (index < lines.length && lines[index].trim() && !blockStart(lines, index)) {
        paragraph.push(lines[index].trim());
        index += 1;
      }
      output.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    }
    return output.join("");
  }

  const renderMarkdown = (markdown = "") => renderBlocks(String(markdown).replace(/\r\n?/g, "\n").split("\n"), 0);
  const api = { escapeHtml, renderMarkdown };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else globalThis.PaperRecapMarkdown = api;
})();
