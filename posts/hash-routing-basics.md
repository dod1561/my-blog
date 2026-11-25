---
title: 해시 라우팅으로 페이지 한 장에 여러 화면 만들기
date: 2026-11-24
tags: [JavaScript, 라우팅, 입문]
description: 주소의 # 뒷부분만 바꿔서 서버 설정 없이 글 목록과 글 상세 화면을 오가는 원리를 정리했습니다.
---

이 블로그에는 HTML 파일이 `index.html` 하나뿐입니다. 그런데 글 목록, 글 상세, 태그별 목록처럼 여러 화면이 있습니다. 파일은 하나인데 어떻게 화면이 바뀔까요?

비밀은 주소창의 `#` 뒷부분, 즉 **해시(hash)** 에 있습니다. 이번 글에서는 이 블로그가 쓰는 **해시 라우팅**의 원리를 정리합니다.

## 해시란 무엇인가

주소 `https://example.com/#/post/hello-world`에서 `#`부터 끝까지가 해시입니다. 해시에는 두 가지 특별한 성질이 있습니다.

- 해시가 바뀌어도 브라우저는 **서버에 새 페이지를 요청하지 않는다.**
- 해시는 **서버로 전송되지 않는다.** 서버는 항상 `index.html`만 받으면 된다.

원래 해시는 페이지 안의 특정 위치로 이동하는 데 쓰였습니다. 해시 라우팅은 이 성질을 빌려서 "지금 어떤 화면을 보여줄지"를 해시에 적어 두는 방법입니다.

## 해시를 읽고 화면 고르기

JavaScript에서는 `location.hash`로 현재 해시를 읽을 수 있습니다. 이 블로그의 `js/main.js`는 해시를 보고 어떤 화면인지 판단합니다. 핵심만 줄이면 이렇습니다.

```javascript
function parseRoute() {
  const hash = location.hash.replace(/^#/, '');
  if (hash === '' || hash === '/') return { name: 'home' };

  const m = hash.match(/^\/post\/([^/]+)\/?$/);
  if (m) return { name: 'post', slug: decodeURIComponent(m[1]) };

  return { name: 'notfound' };
}
```

정규식으로 `/post/글이름` 모양인지 확인하고, 맞으면 괄호 안에 잡힌 부분을 글의 slug로 씁니다. 어느 모양에도 맞지 않으면 `notfound`를 돌려주는데, 그래서 없는 주소로 들어가도 친절한 안내 화면이 나옵니다.

## 해시가 바뀔 때 다시 그리기

해시가 바뀌면 브라우저는 `hashchange` 이벤트를 보냅니다. 이 이벤트를 듣고 있다가 화면을 다시 그리면 됩니다.

```javascript
async function router() {
  const route = parseRoute();
  // route.name에 맞는 화면을 만들어 main 영역에 넣는다
}

window.addEventListener('hashchange', router);
router(); // 처음 열었을 때도 한 번 실행
```

마지막 줄의 `router()` 호출을 빼먹기 쉽습니다. `hashchange`는 해시가 **바뀔 때만** 일어나므로, 주소를 직접 입력해 처음 들어온 경우에는 직접 한 번 실행해 줘야 합니다.

링크는 평범한 `a` 태그에 `href="#/post/hello-world"`처럼 해시만 적으면 됩니다. 클릭하면 해시가 바뀌고, 이벤트가 일어나고, 화면이 바뀝니다. 브라우저의 **뒤로 가기** 버튼도 그대로 동작합니다.

## 해시 라우팅과 History API 비교

해시 없이 `/post/hello-world`처럼 깔끔한 주소를 쓰는 방법도 있습니다. `history.pushState()`를 쓰는 **History API 방식**입니다. 두 방식을 비교하면 이렇습니다.

| 항목 | 해시 라우팅 | History API |
| :--- | :--- | :--- |
| 주소 모양 | `/#/post/hello` | `/post/hello` |
| 화면 변경 감지 | `hashchange` 이벤트 | `popstate` 이벤트 + 링크 클릭 직접 처리 |
| 서버 설정 | 필요 없음 | 모든 주소에 `index.html`을 돌려주도록 설정 필요 |
| 새로고침 | 그대로 동작 | 서버 설정이 없으면 404 |

History API 방식은 주소가 보기 좋지만, 사용자가 `/post/hello`에서 새로고침하면 서버가 그 경로의 파일을 찾으려 합니다. 정적 호스팅에서는 그런 파일이 없으니 404가 납니다. 해시 라우팅은 서버가 항상 `index.html`만 주면 되기 때문에 **GitHub Pages 같은 정적 호스팅에 바로 올릴 수 있습니다.** 이 블로그가 해시 라우팅을 고른 이유입니다.

## 마치며

해시 라우팅은 세 가지만 기억하면 됩니다.

1. `location.hash`로 현재 주소를 읽는다.
2. 해시 모양에 따라 보여줄 화면을 고른다.
3. `hashchange` 이벤트로 바뀔 때마다 다시 그리고, 처음에 한 번 직접 실행한다.

프레임워크의 라우터도 결국 이 원리를 더 편하게 감싼 것입니다. 직접 몇 줄로 만들어 보면 라우터가 하는 일이 훨씬 잘 보입니다.
