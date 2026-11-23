# Webapp — 매일 웹앱 3종 아카이브

매일 3개씩 만드는 웹앱을 날짜별로 쌓는 정적 사이트입니다.

- 허브: https://paradevlab7-cmyk.github.io/Webapp/
- 앱 경로: `apps/YYYY-MM-DD/{slug}/`
- 2026-11-23: [칼로리 코치](https://paradevlab7-cmyk.github.io/Webapp/apps/2026-11-23/calorie-coach/) ·
  [패턴 읽는 AI](https://paradevlab7-cmyk.github.io/Webapp/apps/2026-11-23/rps-mind/) ·
  [구독 지옥 대시보드](https://paradevlab7-cmyk.github.io/Webapp/apps/2026-11-23/subs-dashboard/)

## 새 날짜 추가

1. `apps/YYYY-MM-DD/{slug}/index.html` 에 앱 배치 (순수 HTML/CSS/JS 단일 파일, 외부 CDN 없음)
2. `apps/YYYY-MM-DD/index.html` 에 그날 3종 목록 페이지 배치
3. 루트 `index.html` 의 `DAYS:START ~ DAYS:END` 블록 안에 새 `<section class="day" id="dYYYY-MM-DD">` 추가 (날짜 내림차순, 최신이 위)
4. 상단 chip의 앱 개수·일수 갱신 후 커밋·푸시

GitHub Pages는 `main` 브랜치 루트를 그대로 서빙합니다(Jekyll 미사용, `.nojekyll` 있음). 빌드·Actions 설정은 필요 없습니다.
