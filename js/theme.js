// 다크 모드 전환 및 저장
// 기본값은 시스템 설정을 따르고, 사용자가 토글하면 그 선택을 localStorage에 저장한다.
// (첫 렌더링 전 테마 적용은 index.html의 인라인 스크립트가 담당)

const STORAGE_KEY = 'theme';
const root = document.documentElement;
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

function currentTheme() {
  return root.dataset.theme || (systemDark.matches ? 'dark' : 'light');
}

function saveTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // 저장소를 쓸 수 없으면 이번 방문 동안만 유지한다
  }
}

export function initTheme(button) {
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');

  const sync = () => {
    const label = currentTheme() === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환';
    button.setAttribute('aria-label', label);
    button.title = label;
    if (themeColorMeta) {
      const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
      if (bg) themeColorMeta.setAttribute('content', bg);
    }
  };

  button.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    saveTheme(next);
    sync();
  });

  systemDark.addEventListener('change', sync);
  sync();
}
