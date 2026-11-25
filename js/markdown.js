// 마크다운 → HTML 변환기 (외부 라이브러리 없이 직접 구현)
//
// 지원: 제목, 문단, 줄바꿈, 굵게/기울임/취소선, 인라인 코드, 링크, 이미지,
//       순서 있는/없는 목록(중첩, 체크박스), 인용문, 수평선, 펜스 코드 블록, GFM 표
//
// 보안: 모든 원문 텍스트는 HTML 이스케이프 후 출력하며, 링크·이미지 URL은
//       http, https, mailto 및 상대 경로만 허용한다.

const RE = {
  fence: /^ {0,3}(`{3,}|~{3,})\s*([^\s`]*)/,
  heading: /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/,
  hr: /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/,
  quote: /^ {0,3}>[ \t]?/,
  list: /^( *)([-*+]|\d{1,9}[.)])[ \t]+(.*)$/,
  tableSep: /^ *\|? *:?-+:? *(?:\| *:?-+:? *)*\|? *$/,
};

const ALLOWED_SCHEMES = ['http', 'https', 'mailto'];

/** HTML 특수문자를 이스케이프한다. */
export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 파일 맨 위의 front matter(--- 로 감싼 영역)를 분리한다.
 * @returns {{ meta: Record<string, string | string[]>, body: string }}
 */
export function parseFrontMatter(text) {
  const src = normalize(text);
  const match = src.match(/^---\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
  if (!match) return { meta: {}, body: src };

  const meta = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^([\w-]+)\s*:\s*(.*)$/);
    if (kv) meta[kv[1]] = parseValue(kv[2].trim());
  }
  return { meta, body: src.slice(match[0].length) };
}

/** 마크다운 문자열을 HTML 문자열로 변환한다. */
export function renderMarkdown(markdown) {
  const ctx = { usedIds: new Map() };
  const lines = normalize(markdown).replace(/\t/g, '    ').split('\n');
  return parseBlocks(lines, ctx).join('\n');
}

// ---------------------------------------------------------------------------
// 블록 단위 파싱
// ---------------------------------------------------------------------------

function parseBlocks(lines, ctx) {
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // 펜스 코드 블록
    const fence = line.match(RE.fence);
    if (fence) {
      const marker = fence[1];
      const close = new RegExp(`^ {0,3}${marker[0] === '`' ? '`' : '~'}{${marker.length},}[ \\t]*$`);
      const lang = (fence[2] || '').replace(/[^\w+#-]/g, '');
      const code = [];
      i++;
      while (i < lines.length && !close.test(lines[i])) {
        code.push(lines[i]);
        i++;
      }
      i++; // 닫는 펜스 건너뛰기
      const cls = lang ? ` class="language-${escapeHtml(lang)}"` : '';
      blocks.push(`<pre><code${cls}>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    // 제목
    const heading = line.match(RE.heading);
    if (heading) {
      const level = heading[1].length;
      const content = renderInline(heading[2] || '');
      const id = uniqueId(slugify(content), ctx);
      blocks.push(`<h${level} id="${id}">${content}</h${level}>`);
      i++;
      continue;
    }

    // 수평선 (목록보다 먼저 검사: "- - -" 같은 경우)
    if (RE.hr.test(line)) {
      blocks.push('<hr>');
      i++;
      continue;
    }

    // 인용문
    if (RE.quote.test(line)) {
      const inner = [];
      while (i < lines.length && (RE.quote.test(lines[i]) || (lines[i].trim() && !startsBlock(lines[i])))) {
        inner.push(lines[i].replace(RE.quote, ''));
        i++;
      }
      blocks.push(`<blockquote>\n${parseBlocks(inner, ctx).join('\n')}\n</blockquote>`);
      continue;
    }

    // 표
    if (isTableStart(lines, i)) {
      const result = parseTable(lines, i);
      blocks.push(result.html);
      i = result.next;
      continue;
    }

    // 목록
    if (RE.list.test(line)) {
      const result = parseList(lines, i, ctx);
      blocks.push(result.html);
      i = result.next;
      continue;
    }

    // 문단
    const para = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !startsBlock(lines[i]) && !isTableStart(lines, i)) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(`<p>${renderInline(para.map((l) => l.replace(/^ +/, '')).join('\n'))}</p>`);
  }

  return blocks;
}

function startsBlock(line) {
  return RE.fence.test(line) || RE.heading.test(line) || RE.hr.test(line)
    || RE.quote.test(line) || RE.list.test(line);
}

// ---------------------------------------------------------------------------
// 목록
// ---------------------------------------------------------------------------

function parseList(lines, start, ctx) {
  const first = lines[start].match(RE.list);
  const baseIndent = first[1].length;
  const ordered = /\d/.test(first[2]);
  const items = [];
  let current = null;
  let loose = false;
  let sawBlank = false;
  let i = start;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      sawBlank = true;
      if (current) current.lines.push('');
      i++;
      continue;
    }

    const indent = line.match(/^ */)[0].length;
    const marker = line.match(RE.list);

    // 같은 깊이의 새 항목
    if (marker && marker[1].length === baseIndent && /\d/.test(marker[2]) === ordered) {
      if (sawBlank && current) loose = true;
      current = { lines: [marker[3]], contentIndent: baseIndent + marker[2].length + 1 };
      items.push(current);
      sawBlank = false;
      i++;
      continue;
    }

    // 들여쓰기된 줄: 현재 항목의 하위 내용 (중첩 목록, 이어지는 문단 등)
    if (current && indent > baseIndent) {
      if (sawBlank) loose = true;
      current.lines.push(line.slice(Math.min(indent, current.contentIndent)));
      sawBlank = false;
      i++;
      continue;
    }

    // 들여쓰기 없이 이어지는 문단 줄 (lazy continuation)
    if (current && !sawBlank && !startsBlock(line)) {
      current.lines.push(line.trim());
      i++;
      continue;
    }

    break;
  }

  const startAttr = ordered && parseInt(first[2], 10) !== 1 ? ` start="${parseInt(first[2], 10)}"` : '';
  const tag = ordered ? 'ol' : 'ul';
  const lis = items.map((item) => renderListItem(item, loose, ctx));
  return { html: `<${tag}${startAttr}>\n${lis.join('\n')}\n</${tag}>`, next: i };
}

function renderListItem(item, loose, ctx) {
  const lines = trimTrailingBlank(item.lines);
  let checkbox = '';
  const task = lines[0].match(/^\[([ xX])\][ \t]+/);
  if (task) {
    const checked = task[1] !== ' ' ? ' checked' : '';
    checkbox = `<input type="checkbox" disabled${checked}> `;
    lines[0] = lines[0].slice(task[0].length);
  }

  let blocks = parseBlocks(lines, ctx);
  if (!loose) {
    // 촘촘한 목록은 <p>로 감싸지 않는다
    blocks = blocks.map((b) => b.replace(/^<p>([\s\S]*)<\/p>$/, '$1'));
  }

  let content = blocks.join('\n');
  if (checkbox) {
    content = content.startsWith('<p>') ? `<p>${checkbox}${content.slice(3)}` : checkbox + content;
  }
  return `<li${task ? ' class="task-item"' : ''}>${content}</li>`;
}

function trimTrailingBlank(lines) {
  const copy = lines.slice();
  while (copy.length && !copy[copy.length - 1].trim()) copy.pop();
  return copy;
}

// ---------------------------------------------------------------------------
// 표 (GFM)
// ---------------------------------------------------------------------------

function isTableStart(lines, i) {
  const next = lines[i + 1];
  return lines[i].includes('|') && next !== undefined && next.includes('|') && RE.tableSep.test(next);
}

function parseTable(lines, start) {
  const header = splitRow(lines[start]);
  const aligns = splitRow(lines[start + 1]).map((cell) => {
    const left = cell.startsWith(':');
    const right = cell.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'right';
    if (left) return 'left';
    return '';
  });

  const cell = (tag, text, col) => {
    const align = aligns[col] ? ` style="text-align:${aligns[col]}"` : '';
    return `<${tag}${align}>${renderInline(text)}</${tag}>`;
  };

  const rows = [];
  let i = start + 2;
  while (i < lines.length && lines[i].trim() && lines[i].includes('|')) {
    const cells = splitRow(lines[i]);
    rows.push(`<tr>${header.map((_, col) => cell('td', cells[col] ?? '', col)).join('')}</tr>`);
    i++;
  }

  const thead = `<thead><tr>${header.map((text, col) => cell('th', text, col)).join('')}</tr></thead>`;
  const tbody = rows.length ? `<tbody>\n${rows.join('\n')}\n</tbody>` : '';
  return { html: `<div class="table-wrap"><table>\n${thead}\n${tbody}\n</table></div>`, next: i };
}

function splitRow(line) {
  return line.trim()
    .replace(/^\|/, '')
    .replace(/(?<!\\)\|$/, '')
    .split(/(?<!\\)\|/)
    .map((c) => c.trim().replace(/\\\|/g, '|'));
}

// ---------------------------------------------------------------------------
// 인라인 요소
// ---------------------------------------------------------------------------

function renderInline(text) {
  const store = [];
  // 이미 변환한 HTML 조각은 자리표시자로 보관해, 이후 정규식이 건드리지 않게 한다
  const keep = (html) => `\u0000${store.push(html) - 1}\u0000`;

  let s = text;

  // 1) 인라인 코드 (내부는 다른 문법을 해석하지 않음)
  s = s.replace(/(`+)(?!`)([\s\S]*?[^`])\1(?!`)/g, (_, __, code) => keep(`<code>${escapeHtml(code.trim())}</code>`));

  // 2) 백슬래시 이스케이프
  s = s.replace(/\\([\\`*_{}[\]()#+\-.!|~>])/g, (_, ch) => keep(escapeHtml(ch)));

  // 3) 나머지 원문 이스케이프
  s = escapeHtml(s);

  // 4) 이미지
  s = s.replace(/!\[([^\]]*)\]\(\s*([^\s)]+)(?:\s+&quot;(.*?)&quot;)?\s*\)/g, (_, alt, url, title) => {
    const titleAttr = title ? ` title="${title}"` : '';
    return keep(`<img src="${safeUrl(url)}" alt="${alt}"${titleAttr} loading="lazy">`);
  });

  // 5) 링크
  s = s.replace(/\[([^\]]+)\]\(\s*([^\s)]+)(?:\s+&quot;(.*?)&quot;)?\s*\)/g, (_, label, url, title) => {
    const href = safeUrl(url);
    const titleAttr = title ? ` title="${title}"` : '';
    const external = /^https?:/i.test(href) ? ' target="_blank" rel="noopener noreferrer"' : '';
    return keep(`<a href="${href}"${titleAttr}${external}>${emphasis(label)}</a>`);
  });

  // 6) 자동 링크 <https://...>
  s = s.replace(/&lt;(https?:\/\/[^\s<>]+?)&gt;/g, (_, url) => {
    const href = safeUrl(url);
    return keep(`<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`);
  });

  // 7) 강조
  s = emphasis(s);

  // 8) 강제 줄바꿈 (줄 끝 공백 2칸 또는 백슬래시)
  s = s.replace(/(?: {2,}|\\)\n/g, '<br>\n');

  // 자리표시자 복원 (중첩된 경우가 있으므로 반복)
  for (let n = 0; n < 5 && s.includes('\u0000'); n++) {
    s = s.replace(/\u0000(\d+)\u0000/g, (_, idx) => store[Number(idx)]);
  }
  return s;
}

function emphasis(s) {
  return s
    .replace(/\*\*\*(?=\S)([\s\S]*?\S)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^\w])__(?=\S)([\s\S]*?\S)__(?!\w)/g, '$1<strong>$2</strong>')
    .replace(/\*(?=\S)([\s\S]*?\S)\*/g, '<em>$1</em>')
    .replace(/(^|[^\w])_(?=\S)([\s\S]*?\S)_(?!\w)/g, '$1<em>$2</em>')
    .replace(/~~(?=\S)([\s\S]*?\S)~~/g, '<del>$1</del>');
}

/** 허용되지 않은 스킴(javascript:, data: 등)의 URL을 차단한다. 입력은 이미 이스케이프된 상태. */
function safeUrl(escapedUrl) {
  const raw = escapedUrl.replace(/&amp;/g, '&');
  const scheme = raw.match(/^([a-z][a-z0-9+.-]*):/i);
  if (scheme && !ALLOWED_SCHEMES.includes(scheme[1].toLowerCase())) return '#';
  return escapedUrl;
}

// ---------------------------------------------------------------------------
// 유틸리티
// ---------------------------------------------------------------------------

function normalize(text) {
  return String(text).replace(/^﻿/, '').replace(/\r\n?/g, '\n').replace(/\u0000/g, '');
}

function parseValue(value) {
  if (/^\[.*\]$/.test(value)) {
    return value.slice(1, -1).split(',').map((v) => unquote(v.trim())).filter(Boolean);
  }
  return unquote(value);
}

function unquote(value) {
  return value.replace(/^(['"])(.*)\1$/, '$2');
}

/** 제목 HTML에서 앵커용 id를 만든다. 한글은 그대로 유지한다. */
function slugify(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z0-9#]+;/gi, '')
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-') || 'section';
}

function uniqueId(base, ctx) {
  const count = ctx.usedIds.get(base) || 0;
  ctx.usedIds.set(base, count + 1);
  return count ? `${base}-${count}` : base;
}
