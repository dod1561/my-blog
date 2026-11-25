---
title: 오늘 배운 것
date: 2026-11-24
tags: [HTML, CSS, JavaScript, 회고]
description: 클로드 코드로 블로그를 만들면서 배운 HTML, CSS, JavaScript의 역할을 정리했습니다.
---

클로드 코드와 함께 프레임워크 없이 이 블로그를 만들었습니다. 만들면서 가장 크게 와닿은 건, 웹페이지가 **세 가지 언어가 각자 맡은 일을 나눠서** 완성된다는 점이었습니다.

한 문장으로 줄이면 이렇습니다.

> HTML은 **뼈대**, CSS는 **옷**, JavaScript는 **움직임**이다.

## HTML: 무엇이 있는지

HTML은 페이지에 **어떤 내용이 있는지**와 그 내용이 **무슨 의미인지**를 정합니다.

이 블로그의 `index.html`에는 헤더, 메뉴, 본문, 푸터가 들어 있습니다.

```html
<header class="site-header">
  <a class="site-title" href="#/">나의 블로그</a>
  <nav class="site-nav" aria-label="주 메뉴">
    <a class="site-nav__link" href="#/">글 목록</a>
  </nav>
</header>
<main id="main"></main>
<footer class="site-footer">...</footer>
```

배운 점:

- `<div>`만 쓰지 않고 `<header>`, `<nav>`, `<main>`, `<article>`처럼 **의미 있는 태그**를 쓰면 화면 읽기 프로그램과 검색 엔진이 페이지를 더 잘 이해한다.
- `<meta name="viewport">` 한 줄이 없으면 휴대폰에서 페이지가 작게 축소되어 보인다.

## CSS: 어떻게 보이는지

CSS는 HTML로 만든 내용이 **어떻게 보일지**를 정합니다. 색, 글꼴, 여백, 배치가 모두 CSS의 일입니다.

이번에 가장 유용했던 건 **CSS 변수**입니다. 색을 한곳에 모아 두고 이름으로 가져다 씁니다.

```css
:root {
  --bg: #fdfdfc;
  --text: #1f2328;
}

:root[data-theme="dark"] {
  --bg: #16181d;
  --text: #e3e5e8;
}

body {
  background-color: var(--bg);
  color: var(--text);
}
```

배운 점:

- 다크 모드는 화면을 새로 만드는 게 아니라 **변수 값만 바꾸는 것**이다.
- 소개 문구를 초록색으로 바꿀 때도 `--green` 변수를 하나 추가하고, 라이트·다크 모드에 각각 어울리는 초록색을 넣었다.
- `@media (min-width: 640px)`로 화면이 넓을 때만 여백을 늘리면, 작은 화면부터 먼저 만드는 **모바일 우선** 레이아웃이 된다.
- 한글은 `word-break: keep-all`을 줘야 단어 중간에서 줄이 끊기지 않는다.

## JavaScript: 무엇을 하는지

JavaScript는 페이지가 **동작하게** 만듭니다. 클릭에 반응하고, 파일을 불러오고, 화면 내용을 바꿉니다.

이 블로그에서 JavaScript가 하는 일은 이렇습니다.

1. `posts/index.json`을 불러와 글 목록을 보여준다.
2. 글을 누르면 해당 `.md` 파일을 불러와 HTML로 바꿔서 보여준다.
3. 달 모양 버튼을 누르면 다크 모드로 바꾸고, 그 선택을 기억한다.

다크 모드 버튼의 핵심은 몇 줄뿐입니다.

```javascript
button.addEventListener('click', () => {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('theme', next);
});
```

JavaScript는 `data-theme` 값만 바꾸고, 실제 색 변화는 CSS가 맡습니다. **역할이 나뉘어 있어서** 코드가 짧아집니다.

배운 점:

- `fetch()`로 파일을 불러오기 때문에 `index.html`을 더블클릭해서 열면 동작하지 않는다. `python -m http.server`처럼 **로컬 서버**로 열어야 한다.
- 마크다운 파일 내용을 화면에 그대로 넣으면 그 안의 `<script>`가 실행될 수 있다. 그래서 변환기가 먼저 특수문자를 바꿔 **안전하게** 만든다.

## 한눈에 비교

| 언어 | 역할 | 이 블로그에서 한 일 |
| :--- | :--- | :--- |
| HTML | 내용과 구조 | 헤더, 메뉴, 본문, 푸터의 뼈대 |
| CSS | 모양과 배치 | 색, 글꼴, 다크 모드, 모바일 레이아웃 |
| JavaScript | 동작 | 글 불러오기, 화면 전환, 테마 전환 |

## 마치며

처음에는 세 언어가 뒤섞여 보였지만, "이건 내용인가, 모양인가, 동작인가?"를 물어보면 어느 파일을 고쳐야 할지 바로 보였습니다. 다음에는 글 검색 기능을 직접 붙여 보려고 합니다.
