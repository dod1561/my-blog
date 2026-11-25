# CLAUDE.md

이 파일은 이 저장소에서 작업할 때 Claude Code가 따라야 할 지침입니다.

## 프로젝트 개요

마크다운(`.md`) 파일로 작성한 글을 읽어 블로그 웹사이트로 보여주는 정적 사이트입니다.
**프레임워크와 빌드 도구 없이** 순수 HTML, CSS, JavaScript(ES 모듈)만 사용합니다.

핵심 목표:
- 깔끔하고 읽기 좋은 디자인 (본문 가독성이 최우선)
- 검은 배경에 네온 색 글자를 쓰는 단일 다크 테마 (라이트 모드·테마 전환 없음)
- 모바일 우선 반응형 레이아웃

## 기술 제약 (반드시 지킬 것)

- React, Vue, Svelte 등 UI 프레임워크 금지. CSS 프레임워크(Tailwind, Bootstrap 등)도 금지.
- 번들러·트랜스파일러(webpack, Vite, Babel, TypeScript) 금지. 브라우저가 그대로 실행하는 코드만 작성.
- `npm install`이 필요한 의존성을 추가하지 않는다. `package.json`을 만들지 않는다.
- 마크다운 파서는 `js/markdown.js`에 직접 구현한다. 외부 라이브러리가 꼭 필요하다고 판단되면 먼저 사용자에게 묻는다.
- 최신 브라우저(Chrome, Safari, Firefox, Edge 최신 2개 버전) 기준. `var`, jQuery, IE 대응 코드 사용 금지.

## 디렉터리 구조

```
my-blog/
├── index.html          # 단일 진입점 (글 목록 + 글 상세를 모두 렌더링)
├── css/
│   ├── base.css        # 리셋, CSS 변수(네온 색상·빛 번짐·폰트·간격)
│   ├── layout.css      # 사이드바/위쪽 바, 본문 영역, 글 카드 그리드, 태그, 푸터
│   └── post.css        # 본문 타이포그래피, 코드 블록, 표, 인용문
├── js/
│   ├── main.js         # 진입점: 라우팅, 화면 렌더링, 사이드바 태그 목록
│   ├── markdown.js     # 마크다운 → HTML 변환기 (front matter 파싱 포함)
│   └── posts.js        # posts/index.json 및 .md 파일 로드
├── posts/
│   ├── index.json      # 글 목록 메타데이터
│   └── *.md            # 블로그 글
└── assets/             # 이미지 등 정적 파일
```

새 파일을 추가할 때는 위 구조를 따르고, 구조를 바꿔야 하면 이 문서도 함께 수정한다.

## 동작 방식

1. `index.html`이 `js/main.js`를 `<script type="module">`로 불러온다.
2. `posts.js`가 `fetch('posts/index.json')`으로 글 목록을 가져와 홈 화면에 날짜 내림차순으로 표시한다.
3. 글을 클릭하면 해시 라우팅(`#/post/<slug>`)으로 이동하고, `posts/<slug>.md`를 fetch해서 `markdown.js`로 변환 후 렌더링한다.
4. 해시 라우팅을 쓰는 이유: 서버 설정 없이 GitHub Pages 같은 정적 호스팅에서 바로 동작하게 하기 위함.

### 글 작성 형식

각 `.md` 파일 맨 위에 front matter를 둔다:

```markdown
---
title: 글 제목
date: 2026-11-23
tags: [javascript, css]
description: 목록에 표시될 한 줄 요약
---

본문 내용...
```

`posts/index.json`의 항목은 `{ "slug", "title", "date", "tags", "description" }` 형태이며, front matter와 내용이 일치해야 한다. 새 글을 추가하면 `index.json`에도 반드시 추가한다.

### 마크다운 파서 지원 범위

`markdown.js`는 최소한 다음을 지원해야 한다:
- 제목(`#`~`######`), 문단, 줄바꿈
- 굵게, 기울임, 취소선, 인라인 코드, 링크, 이미지
- 순서 있는/없는 목록 (중첩 포함)
- 인용문(`>`), 수평선(`---`)
- 펜스 코드 블록(```` ```lang ````) — `class="language-lang"` 부여
- 표 (GFM 문법)

**보안:** 변환 전에 원문의 HTML 특수문자(`< > & " '`)를 이스케이프한다. 링크의 `javascript:` 등 위험한 URL 스킴은 차단한다. 렌더링 결과를 `innerHTML`에 넣는 곳은 반드시 이 파서의 출력만 사용한다.

## 디자인 가이드

### 가독성
- 글 본문(`.post`) 최대 너비 `44rem`, 글 목록(`.page`) 최대 너비 `60rem`, 본문 영역 안에서 가운데 정렬.
- 본문 글꼴 크기 `1.0625rem`~`1.125rem`, 줄 높이 `1.75` 내외.
- 한글 가독성을 위해 시스템 폰트 스택 사용: `-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard", "Noto Sans KR", "Malgun Gothic", sans-serif`. 웹폰트를 쓰면 `font-display: swap`.
- 한글 단어가 중간에 끊기지 않도록 `word-break: keep-all; overflow-wrap: break-word;`.
- 장식은 최소화. 여백과 타이포그래피 위계로 구조를 표현한다.

### 색상: 검은 배경 + 네온
- 배경은 검은색(`--bg: #000`), 카드·사이드바·코드 블록은 그보다 아주 조금 밝은 `--surface` 계열.
- 네온 색은 `--neon-cyan`(제목·브랜드), `--neon-pink`(링크·포인트), `--neon-green`(소개 문구·인용문·인라인 코드), `--neon-yellow`(기울임·포커스 표시) 네 가지만 쓴다.
- 긴 본문 글자는 선명한 네온 대신 옅은 네온 민트(`--text`)를 쓴다. 쨍한 네온으로 긴 글을 읽으면 눈이 피로하다.
- 빛 번짐(`text-shadow`, `box-shadow`)은 `--glow-*` 변수로만 쓰고, 제목·브랜드·hover 같은 강조 요소에만 준다. 본문 문단에는 주지 않는다.
- 모든 색은 `base.css`의 `:root` CSS 변수로 정의하고, 컴포넌트에서는 변수만 사용한다. 하드코딩된 색상값 금지.
- 본문 텍스트 대비는 WCAG AA(4.5:1) 이상을 유지한다.
- 깜빡임 같은 애니메이션은 `prefers-reduced-motion`이면 꺼지게 한다.

### 레이아웃
- 1024px 이상: 왼쪽에 고정 사이드바(브랜드, 메뉴, 전체 태그 목록), 오른쪽에 본문과 푸터.
- 1024px 미만: 사이드바가 화면 위에 붙는 바(브랜드 + 메뉴)로 바뀌고 태그 목록은 숨긴다.
- 홈과 태그 화면은 글 카드 그리드. 640px 이상에서 2열이고, 가장 최근 글은 가로 전체를 차지한다.
- 제목, 날짜, 메뉴, 태그 같은 UI 글자는 고정폭 글꼴(`--font-mono`), 본문은 산세리프(`--font-sans`).

### 반응형
- 모바일 우선으로 작성하고 `min-width` 미디어 쿼리로 확장한다. 주요 브레이크포인트: `640px`, `1024px`.
- 모바일 좌우 여백 최소 `16px`. 어떤 화면 너비에서도 가로 스크롤이 생기면 안 된다.
- 코드 블록과 표는 자체적으로 `overflow-x: auto` 처리해 페이지 전체가 넘치지 않게 한다.
- 이미지는 `max-width: 100%; height: auto;`.
- 터치 대상(버튼, 링크)은 최소 `44×44px`.
- `<meta name="viewport" content="width=device-width, initial-scale=1">` 필수.

### 접근성
- 시맨틱 태그 사용: `<header>`, `<nav>`, `<main>`, `<article>`, `<time>`, `<footer>`.
- 키보드 포커스 표시(`:focus-visible`)를 지우지 않는다.
- `prefers-reduced-motion`이 설정된 경우 전환 애니메이션을 끈다.

## 로컬 실행

`fetch()`는 `file://`에서 동작하지 않으므로 반드시 로컬 서버로 연다. 둘 중 하나:

```powershell
python -m http.server 8000
```

```powershell
npx serve .
```

그 다음 브라우저에서 `http://localhost:8000` 접속.

## 코드 스타일

- JavaScript: ES 모듈, `const`/`let`, 화살표 함수, `async/await`. 세미콜론 사용, 들여쓰기 2칸.
- 함수는 작고 한 가지 일만 하게. 전역 변수 금지 — 모듈 스코프 사용.
- DOM 조작 시 사용자 입력이나 파일 내용을 `innerHTML`에 직접 넣지 않는다 (파서 출력 제외). 텍스트는 `textContent` 사용.
- CSS: 클래스 선택자 위주, ID 선택자로 스타일링하지 않는다. `!important` 지양.
- 주석과 UI 문구는 한국어로 작성한다.

## 작업 후 확인 사항

변경 후에는 다음을 확인한다:
1. 로컬 서버에서 홈(글 목록)과 글 상세 페이지가 모두 정상 표시되는가
2. 1024px 이상에서는 사이드바, 그보다 좁으면 위쪽 바로 제대로 바뀌는가
3. 모바일 너비(375px)에서 가로 스크롤 없이 읽기 좋은가
4. 브라우저 콘솔에 에러가 없는가
5. 존재하지 않는 slug(`#/post/없는글`)로 접근하면 친절한 404 메시지가 나오는가
