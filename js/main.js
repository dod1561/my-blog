// 진입점: 해시 라우팅과 화면 렌더링

import { getPostList, getPost, formatDate, NotFoundError } from './posts.js';

const SITE_TITLE = '나의 블로그';
const SITE_INTRO = '배우고 만든 것들을 기록합니다.';

const main = document.getElementById('main');
let renderToken = 0;

// ---------------------------------------------------------------------------
// 라우팅
// ---------------------------------------------------------------------------

function parseRoute() {
  const hash = location.hash.replace(/^#/, '');
  if (hash === '' || hash === '/') return { name: 'home' };

  let m = hash.match(/^\/post\/([^/]+)\/?$/);
  if (m) return { name: 'post', slug: safeDecode(m[1]) };

  m = hash.match(/^\/tag\/([^/]+)\/?$/);
  if (m) return { name: 'tag', tag: safeDecode(m[1]) };

  // "#/"로 시작하지 않는 해시는 페이지 내 앵커이므로 홈으로 취급
  if (!hash.startsWith('/')) return { name: 'home' };
  return { name: 'notfound' };
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

async function router() {
  const token = ++renderToken;
  const route = parseRoute();
  main.setAttribute('aria-busy', 'true');

  let view;
  try {
    if (route.name === 'home') view = await homeView();
    else if (route.name === 'tag') view = await tagView(route.tag);
    else if (route.name === 'post') view = await postView(route.slug);
    else view = notFoundView();
  } catch (err) {
    view = err instanceof NotFoundError ? notFoundView() : errorView(err);
  }

  // 더 최근 라우팅이 시작됐다면 이 결과는 버린다
  if (token !== renderToken) return;

  main.replaceChildren(view.node);
  document.title = view.title ? `${view.title} · ${SITE_TITLE}` : SITE_TITLE;
  main.removeAttribute('aria-busy');
  window.scrollTo(0, 0);
  main.focus({ preventScroll: true });
}

// ---------------------------------------------------------------------------
// 화면
// ---------------------------------------------------------------------------

async function homeView() {
  const posts = await getPostList();
  const node = el('div', { class: 'page' });

  node.append(hero('ls -t posts/', SITE_TITLE, SITE_INTRO));
  node.append(posts.length ? postGrid(posts) : message('아직 글이 없어요', 'posts 폴더에 첫 글을 추가해 보세요.'));
  return { node, title: '' };
}

async function tagView(tag) {
  const posts = (await getPostList()).filter((p) => (p.tags || []).includes(tag));
  const node = el('div', { class: 'page' });

  node.append(hero(`grep -l "#${tag}" posts/`, `#${tag}`, `${posts.length}개의 글`));
  node.append(posts.length ? postGrid(posts) : message('이 태그의 글이 없어요', ''));
  node.append(backLink('← 모든 글 보기', 'message__action'));
  return { node, title: `#${tag}` };
}

async function postView(slug) {
  const post = await getPost(slug);
  const article = el('article', { class: 'post' });

  const header = el('header', { class: 'post-header' });
  header.append(el('h1', { class: 'post-header__title' }, post.title));

  const meta = el('div', { class: 'post-header__meta' });
  if (post.date) {
    meta.append(el('time', { datetime: post.date }, formatDate(post.date)));
    meta.append(el('span', { 'aria-hidden': 'true' }, '·'));
  }
  meta.append(el('span', {}, `${post.readingMinutes}분 읽기`));
  header.append(meta);
  if (post.tags.length) header.append(tagList(post.tags));
  article.append(header);

  // 본문: markdown.js가 이스케이프 처리한 결과만 innerHTML로 넣는다
  const body = el('div', { class: 'prose' });
  body.innerHTML = post.html;
  enhanceCodeBlocks(body);
  article.append(body);

  const footer = el('footer', { class: 'post-footer' });
  footer.append(backLink('← 글 목록으로'));
  article.append(footer);

  return { node: article, title: post.title };
}

function notFoundView() {
  const node = message('페이지를 찾을 수 없어요', '주소가 바뀌었거나 삭제된 글일 수 있습니다.');
  node.append(backLink('홈으로 가기', 'message__action'));
  return { node, title: '찾을 수 없음' };
}

function errorView(err) {
  console.error(err);
  const hint = location.protocol === 'file:'
    ? '파일을 직접 열면 글을 불러올 수 없습니다. 로컬 서버(예: python -m http.server)로 열어 주세요.'
    : '잠시 후 다시 시도해 주세요.';
  const node = message('글을 불러오지 못했어요', hint);
  node.append(backLink('홈으로 가기', 'message__action'));
  return { node, title: '오류' };
}

// ---------------------------------------------------------------------------
// 구성 요소
// ---------------------------------------------------------------------------

function hero(command, title, text) {
  const section = el('section', { class: 'hero' });
  section.append(
    el('p', { class: 'hero__command', 'aria-hidden': 'true' }, command),
    el('h1', { class: 'intro__title' }, title),
    el('p', { class: 'intro__text' }, text),
  );
  return section;
}

function postGrid(posts) {
  const list = el('ul', { class: 'post-grid' });
  for (const post of posts) {
    const item = el('li');
    const card = el('article', { class: 'post-card' });
    if (post.date) {
      card.append(el('time', { class: 'post-card__date', datetime: post.date }, formatDate(post.date)));
    }
    const title = el('h2', { class: 'post-card__title' });
    title.append(el('a', { class: 'post-card__link', href: `#/post/${encodeURIComponent(post.slug)}` }, post.title));
    card.append(title);
    if (post.description) card.append(el('p', { class: 'post-card__desc' }, post.description));
    if (post.tags?.length) card.append(tagList(post.tags));
    item.append(card);
    list.append(item);
  }
  return list;
}

/** 사이드바에 전체 태그와 글 수를 표시한다. */
function renderSidebarTags(posts) {
  const container = document.querySelector('.sidebar__tags');
  if (!container) return;

  const counts = new Map();
  for (const post of posts) {
    for (const tag of post.tags || []) counts.set(tag, (counts.get(tag) || 0) + 1);
  }

  const sorted = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'));
  container.replaceChildren(...sorted.map(([tag, count]) => {
    const li = el('li');
    const link = el('a', { class: 'tag', href: `#/tag/${encodeURIComponent(tag)}` }, `#${tag}`);
    link.append(el('span', { class: 'sidebar__tag-count' }, String(count)));
    li.append(link);
    return li;
  }));
}

function tagList(tags) {
  const list = el('ul', { class: 'tag-list', 'aria-label': '태그' });
  for (const tag of tags) {
    const li = el('li');
    li.append(el('a', { class: 'tag', href: `#/tag/${encodeURIComponent(tag)}` }, `#${tag}`));
    list.append(li);
  }
  return list;
}

function message(title, text) {
  const node = el('section', { class: 'message' });
  node.append(el('h1', { class: 'message__title' }, title));
  if (text) node.append(el('p', { class: 'message__text' }, text));
  return node;
}

function backLink(label, extraClass = '') {
  return el('a', { class: `back-link ${extraClass}`.trim(), href: '#/' }, label);
}

/** 코드 블록에 언어 표시와 복사 버튼을 붙인다. */
function enhanceCodeBlocks(container) {
  for (const pre of container.querySelectorAll('pre')) {
    const code = pre.querySelector('code');
    const lang = code?.className.match(/language-(\S+)/)?.[1] || '';

    const wrapper = el('div', { class: 'code-block' });
    const bar = el('div', { class: 'code-block__bar' });
    bar.append(el('span', {}, lang || 'code'));

    const button = el('button', { class: 'code-block__copy', type: 'button' }, '복사');
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code ? code.textContent : pre.textContent);
        button.textContent = '복사됨';
      } catch {
        button.textContent = '복사 실패';
      }
      setTimeout(() => { button.textContent = '복사'; }, 1500);
    });
    bar.append(button);

    pre.replaceWith(wrapper);
    wrapper.append(bar, pre);
  }
}

/** 요소를 만든다. 텍스트는 항상 textContent로 넣어 안전하게 처리한다. */
function el(tag, attrs = {}, text) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  if (text !== undefined) node.textContent = text;
  return node;
}

// ---------------------------------------------------------------------------
// 초기화
// ---------------------------------------------------------------------------

// 본문 안의 페이지 내 앵커(#제목)는 해시 라우팅과 충돌하므로 직접 스크롤한다
main.addEventListener('click', (event) => {
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;
  const href = link.getAttribute('href');
  if (href.startsWith('#/')) return;
  event.preventDefault();
  const target = document.getElementById(safeDecode(href.slice(1)));
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

const year = document.querySelector('.site-footer__year');
if (year) year.textContent = new Date().getFullYear();

getPostList().then(renderSidebarTags).catch(() => { /* 목록 오류는 본문에서 안내한다 */ });
window.addEventListener('hashchange', router);
router();
