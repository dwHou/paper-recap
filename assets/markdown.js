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
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");
  }

  function inlineMarkdown(text) {
    const pieces = [];
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
      if (plain) pieces.push(plainInline(plain));
      plain = "";
      const value = text.slice(index + marker.length, close);
      pieces.push(marker[0] === "`"
        ? `<code>${escapeHtml(value)}</code>`
        : escapeHtml(`${marker}${value}${marker}`));
      index = close + marker.length;
    }
    if (plain) pieces.push(plainInline(plain));
    return pieces.join("");
  }

  const quoteLine = (line) => line.match(/^ {0,3}> ?(.*)$/);
  const listLine = (line) => line.match(/^([ \t]*)([-*+]|\d+[.)])\s+(.+)$/);
  const indentOf = (text) => text.replace(/\t/g, "    ").length;
  const listKind = (marker) => /^\d/.test(marker) ? "ol" : "ul";
  const divider = (line) => /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
  const imageLine = (line) => line.match(/^!\[([^\]]+)\]\((media\/[a-z0-9-]+\/[a-z0-9][a-z0-9._-]*\.(?:png|jpe?g|webp|gif))(?:\s+"([^"]+)")?\)$/i);

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
          const next = lines[index + 1];
          if (next === undefined) { index += 1; break; }
          const nextMatch = listLine(next);
          if (nextMatch && indentOf(nextMatch[1]) === base && listKind(nextMatch[2]) === kind) { index += 1; break; }
          if (indentOf((next.match(/^[ \t]*/) || [""])[0]) > base) { children.push(""); index += 1; continue; }
          break;
        }
        const leading = (current.match(/^[ \t]*/) || [""])[0];
        if (indentOf(leading) <= base) break;
        children.push(current.slice(Math.min(leading.length, contentIndent)));
        index += 1;
      }
      items.push(`<li>${inlineMarkdown(match[3])}${children.length ? renderBlocks(children, depth + 1) : ""}</li>`);
    }
    return { html: `<${kind}>${items.join("")}</${kind}>`, next: index };
  }

  function blockStart(lines, index) {
    const line = lines[index];
    const trimmed = line.trim();
    return /^```|^~~~/.test(trimmed) || quoteLine(line) || /^\$\$|^\\\[/.test(trimmed)
      || imageLine(trimmed) || /^#{1,6}\s+/.test(trimmed)
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
        const code = [];
        index += 1;
        while (index < lines.length && !new RegExp(`^${fence[1][0]}{${fence[1].length},}\\s*$`).test(lines[index].trim())) {
          code.push(lines[index]);
          index += 1;
        }
        if (index < lines.length) index += 1;
        output.push(`<pre class="code-block"><code>${escapeHtml(code.join("\n"))}</code></pre>`);
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
        output.push(`<blockquote>${renderBlocks(quoted, depth + 1)}</blockquote>`);
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

      const heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        output.push(`<h${heading[1].length}>${inlineMarkdown(heading[2])}</h${heading[1].length}>`);
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
