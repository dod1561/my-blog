---
title: 특수문자 이스케이프로 XSS 막기
date: 2026-11-24
tags: [JavaScript, 보안, 입문]
description: 마크다운 글을 화면에 넣기 전에 특수문자를 바꾸고 위험한 링크를 막아, 글 속 코드가 실행되지 않게 하는 방법을 정리했습니다.
---

이 블로그는 `.md` 파일을 불러와 HTML로 바꾼 뒤 화면에 넣습니다. 그런데 글 안에 `<script>` 같은 문자열이 들어 있다면 어떻게 될까요? 아무 처리 없이 넣으면 그 코드가 **실제로 실행**될 수 있습니다. 이런 공격을 **XSS(Cross-Site Scripting)**라고 합니다.

이번 글에서는 이 블로그의 `js/markdown.js`가 XSS를 어떻게 막는지 살펴봅니다.

## innerHTML이 위험한 이유

화면에 내용을 넣는 방법은 크게 두 가지입니다.

```javascript
const box = document.querySelector('.box');
const text = '<img src="x" onerror="alert(1)">';

box.textContent = text; // 글자 그대로 보인다
box.innerHTML = text;   // 태그로 해석되어 onerror가 실행된다
```

- `textContent`는 넣은 값을 **글자**로만 다룹니다. 태그가 섞여 있어도 화면에 그대로 찍힐 뿐입니다.
- `innerHTML`은 넣은 값을 **HTML로 해석**합니다. 그래서 이벤트 속성이 붙은 태그가 들어오면 브라우저가 그 코드를 실행합니다.

마크다운은 결국 HTML로 바꿔야 하므로 `innerHTML`을 피할 수 없습니다. 그래서 이 블로그는 **"innerHTML에는 마크다운 변환기의 출력만 넣는다"**는 규칙을 정했습니다. 목록의 제목이나 날짜처럼 그냥 글자인 값은 `textContent`로 넣습니다.

## 특수문자를 먼저 바꿔 두기

변환기는 원문을 HTML로 만들기 전에, HTML에서 특별한 뜻을 가진 문자 다섯 개를 **문자 참조(entity)**로 바꿉니다. 실제 코드는 이렇습니다.

```javascript
export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

이렇게 바꾸면 `<script>`는 `&lt;script&gt;`가 되고, 브라우저는 이것을 태그가 아니라 **꺾쇠 모양의 글자**로 보여 줍니다.

여기서 눈여겨볼 점은 `&`를 **가장 먼저** 바꾼다는 것입니다. 만약 `<`를 먼저 `&lt;`로 바꾼 뒤에 `&`를 바꾸면, 방금 만든 `&lt;`의 `&`까지 다시 바뀌어 `&amp;lt;`가 되어 버립니다. 순서 하나로 결과가 달라지는 셈입니다.

| 원래 문자 | 바뀐 결과 | 막아 주는 문제 |
| :--- | :--- | :--- |
| `&` | `&amp;` | 문자 참조로 잘못 해석되는 것 |
| `<` | `&lt;` | 새 태그가 시작되는 것 |
| `>` | `&gt;` | 태그가 닫히는 것 |
| `"` | `&quot;` | 속성 값 밖으로 빠져나가는 것 |
| `'` | `&#39;` | 작은따옴표 속성 값 밖으로 빠져나가는 것 |

변환기는 원문을 먼저 이스케이프한 다음, 그 위에서 `**굵게**`나 `[링크](주소)` 같은 마크다운 문법만 골라 **자기가 직접** 태그로 만듭니다. 그래서 화면에 나오는 태그는 모두 변환기가 만든 것뿐입니다.

## 링크 주소도 검사하기

특수문자를 바꿔도 막을 수 없는 경우가 하나 있습니다. 바로 링크 주소입니다.

```markdown
[눌러 보세요](javascript:alert(1))
```

이 주소에는 꺾쇠도 따옴표도 없어서 이스케이프를 거쳐도 그대로 남습니다. 그런데 `href`에 `javascript:`가 들어가면 링크를 누르는 순간 코드가 실행됩니다.

그래서 변환기는 주소의 **스킴**(콜론 앞부분)을 확인해 허용한 것만 통과시킵니다.

```javascript
const ALLOWED_SCHEMES = ['http', 'https', 'mailto'];

function safeUrl(escapedUrl) {
  const raw = escapedUrl.replace(/&amp;/g, '&');
  const scheme = raw.match(/^([a-z][a-z0-9+.-]*):/i);
  if (scheme && !ALLOWED_SCHEMES.includes(scheme[1].toLowerCase())) return '#';
  return escapedUrl;
}
```

- "위험한 것을 막는다"가 아니라 **"허용한 것만 통과시킨다"** 방식입니다. 이렇게 하면 `data:`나 `vbscript:`처럼 미처 생각하지 못한 스킴도 함께 막힙니다.
- 스킴이 없는 주소(`#/post/hello-world`, `assets/photo.png` 같은 상대 경로)는 그대로 쓸 수 있습니다.
- `toLowerCase()`로 비교하므로 `JavaScript:`처럼 대소문자를 섞어도 걸러집니다.

## 마치며

정리하면 이 블로그의 XSS 방어는 세 단계입니다.

1. 글자로 충분한 곳에는 `textContent`를 쓴다.
2. HTML이 필요한 곳은 원문을 **먼저 이스케이프**하고, 변환기가 만든 태그만 남긴다.
3. 링크와 이미지 주소는 **허용 목록**에 있는 스킴만 통과시킨다.

내가 쓴 글이라 안전하다고 생각하기 쉽지만, 다른 곳에서 복사해 온 예시 코드 한 줄이 문제가 될 수도 있습니다. 화면에 넣는 모든 문자열을 "이건 글자인가, HTML인가?" 하고 한 번 더 묻는 습관을 들이면 좋습니다.
