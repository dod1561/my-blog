// 글 목록(posts/index.json)과 개별 글(.md) 로드

import { parseFrontMatter, renderMarkdown } from './markdown.js';

export class NotFoundError extends Error {}

let listPromise = null;

/** 글 목록을 날짜 내림차순으로 반환한다. 한 번 불러오면 캐시한다. */
export function getPostList() {
  if (!listPromise) {
    listPromise = fetch('posts/index.json')
      .then((res) => {
        if (!res.ok) throw new Error(`글 목록을 불러오지 못했습니다 (${res.status})`);
        return res.json();
      })
      .then((list) => list.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))))
      .catch((err) => {
        listPromise = null; // 실패하면 다음에 다시 시도
        throw err;
      });
  }
  return listPromise;
}

/** slug에 해당하는 글을 불러와 HTML로 변환한다. */
export async function getPost(slug) {
  if (!/^[\p{L}\p{N}_-]+$/u.test(slug)) throw new NotFoundError(slug);

  const res = await fetch(`posts/${encodeURIComponent(slug)}.md`);
  if (res.status === 404) throw new NotFoundError(slug);
  if (!res.ok) throw new Error(`글을 불러오지 못했습니다 (${res.status})`);

  const { meta, body } = parseFrontMatter(await res.text());
  return {
    slug,
    title: meta.title || slug,
    date: meta.date || '',
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    description: meta.description || '',
    html: renderMarkdown(body),
    readingMinutes: estimateReadingMinutes(body),
  };
}

/** 한글은 분당 약 500자, 영문은 분당 약 200단어 기준으로 읽는 시간을 추정한다. */
function estimateReadingMinutes(text) {
  const plain = text.replace(/```[\s\S]*?```/g, '');
  const hangul = (plain.match(/[가-힣]/g) || []).length;
  const words = (plain.replace(/[가-힣]/g, ' ').match(/[A-Za-z0-9]+/g) || []).length;
  return Math.max(1, Math.round(hangul / 500 + words / 200));
}

/** "2026-11-23" → "2026년 11월 23일" */
export function formatDate(value) {
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(value);
  return `${m[1]}년 ${Number(m[2])}월 ${Number(m[3])}일`;
}
