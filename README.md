# Webapp — 매일 웹앱 3종 아카이브

매일 3개씩 만드는 웹앱을 날짜별로 쌓는 정적 사이트입니다.

- 허브: https://paradevlab7-cmyk.github.io/Webapp/
- 앱 경로: `apps/YYYY-MM-DD/{slug}/`
- 2026-11-23: [칼로리 코치](https://paradevlab7-cmyk.github.io/Webapp/apps/2026-11-23/calorie-coach/) ·
  [패턴 읽는 AI](https://paradevlab7-cmyk.github.io/Webapp/apps/2026-11-23/rps-mind/) ·
  [구독 지옥 대시보드](https://paradevlab7-cmyk.github.io/Webapp/apps/2026-11-23/subs-dashboard/)
- 포트폴리오: <https://paradevlab7-cmyk.github.io/Webapp/portfolio/>

## 포트폴리오 (portfolio/)

누적된 앱을 검색·필터·즐겨찾기로 둘러보는 전용 페이지: <https://paradevlab7-cmyk.github.io/Webapp/portfolio/>

```
portfolio/
  index.html      페이지 골격 (허브 → 포트폴리오 배지는 루트 index.html 상단)
  styles.css      다크/라이트 테마·반응형 그리드·카드·모달 스타일
  app.js          apps.json 로드, 검색·필터·정렬·통계·모달·즐겨찾기(localStorage)
  apps.json       ★ 누적 데이터 — 새 앱은 여기에만 추가하면 화면·통계가 자동 갱신
```

### 새 앱을 포트폴리오에 추가하는 법

`portfolio/apps.json` 의 `apps` 배열 맨 앞에 항목을 추가하고 `meta.updated` 를 그날 날짜로 바꿉니다.

```json
{
  "slug": "sleep-timer",
  "name": "수면 타이머",
  "date": "2026-11-24",
  "category": "util",
  "icon": "⏰",
  "accent": "#5ee9a6",
  "summary": "한 줄 소개 (카드에 표시)",
  "description": "상세 모달에 표시할 2~3문장 설명",
  "features": ["핵심 기능 1", "핵심 기능 2"],
  "tags": ["태그1", "태그2"],
  "url": "https://paradevlab7-cmyk.github.io/Webapp/apps/2026-11-24/sleep-timer/",
  "path": "apps/2026-11-24/sleep-timer/"
}
```

- `category` 는 `categories` 에 선언된 `util`(실용·계산) / `game`(게임·두뇌) / `finance`(금융·생산성) / `life`(일상·도구) 중 하나. 새 분류가 필요하면 `categories` 에 `{id,label,icon}` 을 먼저 추가합니다(칩은 앱이 있는 분류만 자동 표시).
- `date` 는 `YYYY-MM-DD`. 통계(총 앱·누적 일수·연속 일수·카테고리 수·최근 업데이트)는 모두 이 데이터에서 자동 계산됩니다.
- JSON 문법(쉼표·따옴표)을 꼭 확인하세요. 깨지면 페이지가 "앱 목록을 불러오지 못했어요"를 표시합니다.

### 보기 방식 (리스트 / 그리드)

- 포트폴리오 툴바의 `리스트 | 그리드` 세그먼트(`.seg`, `#layoutToggle`)와 허브의 같은 스위치(`.viewswitch`)로 보기 방식을 바꿉니다. 선택은 `portfolio:layout:v1` / `hub:layout:v1` 에 저장되어 새로고침 후에도 유지됩니다.
- **리스트**: 아이콘·앱명·한 줄 소개·분류/날짜/NEW·태그·즐겨찾기가 한 줄에 읽히는 행(데스크톱은 와이드 행).
- **그리드**: 앱 런처 타일처럼 **아이콘과 앱명만** 노출(모바일 2~3열, 데스크톱 5~6열). 클릭하면 기존 상세 모달이 열립니다.
- `html[data-layout]` 속성으로 CSS가 전환하므로 카드 마크업은 하나만 유지하면 됩니다. 카드에 정보를 추가할 때는 그리드에서 숨길 요소를 `html[data-layout="grid"]` 규칙에 함께 넣으세요.
- 포트폴리오의 `날짜별` 그룹 토글(`portfolio:view:v1`)과 조합해도 동작합니다(그룹 안에서 타일/행이 함께 바뀜).

## 새 날짜 추가

1. `apps/YYYY-MM-DD/{slug}/index.html` 에 앱 배치 (순수 HTML/CSS/JS 단일 파일, 외부 CDN 없음)
2. `apps/YYYY-MM-DD/index.html` 에 그날 3종 목록 페이지 배치
3. 루트 `index.html` 의 `DAYS:START ~ DAYS:END` 블록 안에 새 `<section class="day" id="dYYYY-MM-DD">` 추가 (날짜 내림차순, 최신이 위)
4. 상단 chip의 앱 개수·일수 갱신 후 커밋·푸시

GitHub Pages는 `main` 브랜치 루트를 그대로 서빙합니다(Jekyll 미사용, `.nojekyll` 있음). 빌드·Actions 설정은 필요 없습니다.
