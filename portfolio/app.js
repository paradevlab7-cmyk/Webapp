/* ==========================================================================
   매일 만드는 웹앱 — 포트폴리오 (app.js)
   데이터: apps.json · 저장: localStorage · 외부 라이브러리 0
   ========================================================================== */
(function () {
  'use strict';

  var FAV_KEY = 'portfolio:favs:v1';
  var THEME_KEY = 'portfolio:theme:v1';
  var VIEW_KEY = 'portfolio:view:v1';
  var LAYOUT_KEY = 'portfolio:layout:v1';
  var FOLD_KEY = 'portfolio:collapsed:v1';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };

  var el = {
    grid: $('#grid'),
    chips: $('#chips'),
    search: $('#search'),
    searchClear: $('#searchClear'),
    sort: $('#sortSelect'),
    favFilter: $('#favFilter'),
    favCount: $('#favCount'),
    groupToggle: $('#groupToggle'),
    layoutToggle: $('#layoutToggle'),
    resultLine: $('#resultLine'),
    empty: $('#empty'),
    resetAll: $('#resetAll'),
    themeToggle: $('#themeToggle'),
    statApps: $('#statApps'),
    statAppsSub: $('#statAppsSub'),
    statDays: $('#statDays'),
    statDaysSub: $('#statDaysSub'),
    statCats: $('#statCats'),
    statCatsSub: $('#statCatsSub'),
    statUpdated: $('#statUpdated'),
    statUpdatedSub: $('#statUpdatedSub'),
    heroCount: $('#heroCount'),
    toolbar: $('.toolbar'),
    modal: $('#modal'),
    modalCard: $('#modal .modal-card'),
    modalBody: $('#modalBody'),
    modalClose: $('#modalClose'),
    modalBackdrop: $('#modalBackdrop'),
    toast: $('#toast')
  };

  var state = {
    meta: {},
    categories: [],
    apps: [],
    cat: 'all',
    query: '',
    sort: 'new',
    favOnly: false,
    group: loadView() === 'day',
    layout: loadLayout(),
    favs: loadFavs(),
    collapsed: loadCollapsed(),
    lastFocus: null,
    openSlug: null
  };

  /* ------------------------------ 저장소 ------------------------------ */
  function loadFavs() {
    try {
      var raw = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
      return Array.isArray(raw) ? raw.filter(function (s) { return typeof s === 'string'; }) : [];
    } catch (e) { return []; }
  }
  function saveFavs() {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(state.favs)); } catch (e) {}
  }
  function isFav(slug) { return state.favs.indexOf(slug) !== -1; }

  function loadView() {
    try { return localStorage.getItem(VIEW_KEY) === 'day' ? 'day' : 'grid'; } catch (e) { return 'grid'; }
  }
  function saveView() {
    try { localStorage.setItem(VIEW_KEY, state.group ? 'day' : 'grid'); } catch (e) {}
  }

  /* 접어 둔 날짜 그룹 (portfolio:collapsed:v1) */
  function loadCollapsed() {
    try {
      var raw = JSON.parse(localStorage.getItem(FOLD_KEY) || '[]');
      return Array.isArray(raw) ? raw.filter(function (d) { return typeof d === 'string'; }) : [];
    } catch (e) { return []; }
  }
  function saveCollapsed() {
    try { localStorage.setItem(FOLD_KEY, JSON.stringify(state.collapsed)); } catch (e) {}
  }
  function isFolded(d) { return state.collapsed.indexOf(d) !== -1; }

  /* 리스트 / 그리드 보기 방식 (portfolio:layout:v1) */
  function loadLayout() {
    try { return localStorage.getItem(LAYOUT_KEY) === 'grid' ? 'grid' : 'list'; } catch (e) { return 'list'; }
  }
  function saveLayout() {
    try { localStorage.setItem(LAYOUT_KEY, state.layout); } catch (e) {}
  }
  function applyLayout() {
    document.documentElement.dataset.layout = state.layout;
    if (!el.layoutToggle) return;
    var btns = el.layoutToggle.querySelectorAll('.seg-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-pressed', btns[i].getAttribute('data-layout') === state.layout ? 'true' : 'false');
    }
  }

  /* ------------------------------ 유틸 ------------------------------ */
  function esc(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function escRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  /** 검색어 토큰을 <mark>로 감싼다(이스케이프 후 처리). */
  function highlight(text, tokens) {
    var out = esc(text);
    if (!tokens.length) return out;
    var re = new RegExp('(' + tokens.map(function (t) { return escRe(esc(t)); }).join('|') + ')', 'gi');
    return out.replace(re, '<mark>$1</mark>');
  }

  function parseDate(iso) { // 'YYYY-MM-DD' → Date (로컬 자정)
    var p = String(iso).split('-');
    return new Date(+p[0], (+p[1] || 1) - 1, +p[2] || 1);
  }
  function fmtDate(iso) {
    var p = String(iso).split('-');
    if (p.length < 3) return iso;
    return p[0] + '.' + p[1] + '.' + p[2];
  }
  function dayNum(d) { return Math.round(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000); }

  function relDays(iso) {
    var today = new Date();
    var diff = dayNum(today) - dayNum(parseDate(iso));
    if (diff <= 0) return '오늘';
    if (diff === 1) return '어제';
    if (diff < 7) return diff + '일 전';
    if (diff < 30) return Math.floor(diff / 7) + '주 전';
    return Math.floor(diff / 30) + '개월 전';
  }

  function catOf(id) {
    for (var i = 0; i < state.categories.length; i++) {
      if (state.categories[i].id === id) return state.categories[i];
    }
    return { id: id, label: id, icon: '•' };
  }

  var toastTimer = null;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.classList.remove('show'); }, 1900);
  }

  /* ------------------------------ 데이터 ------------------------------ */
  function load() {
    el.grid.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
    var url = 'apps.json';
    fetch(url, { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        state.meta = data.meta || {};
        state.categories = Array.isArray(data.categories) ? data.categories : [];
        state.apps = (Array.isArray(data.apps) ? data.apps : []).filter(function (a) { return a && a.slug && a.name; });
        state.apps.forEach(function (a) {
          a.tags = Array.isArray(a.tags) ? a.tags : [];
          a.features = Array.isArray(a.features) ? a.features : [];
        });
        el.grid.setAttribute('aria-busy', 'false');
        renderChips();
        renderStats();
        render();
        deepLink();
      })
      .catch(function (err) {
        el.grid.setAttribute('aria-busy', 'false');
        el.grid.innerHTML = '';
        var box = document.createElement('div');
        box.className = 'load-error';
        box.innerHTML = '앱 목록을 불러오지 못했어요.<br><span style="font-size:12px">' +
          esc(err && err.message ? err.message : '') + '</span>';
        var btn = document.createElement('button');
        btn.className = 'btn btn-quiet';
        btn.type = 'button';
        btn.style.marginTop = '14px';
        btn.textContent = '다시 시도';
        btn.addEventListener('click', load);
        box.appendChild(document.createElement('br'));
        box.appendChild(btn);
        el.grid.appendChild(box);
      });
  }

  /* ------------------------------ 통계 ------------------------------ */
  function renderStats() {
    var apps = state.apps;
    var dates = {};
    apps.forEach(function (a) { dates[a.date] = true; });
    var dateList = Object.keys(dates).sort(); // 오름차순
    var days = dateList.length;

    var streak = 0;
    if (days) {
      streak = 1;
      for (var i = dateList.length - 1; i > 0; i--) {
        if (dayNum(parseDate(dateList[i])) - dayNum(parseDate(dateList[i - 1])) === 1) streak++;
        else break;
      }
    }

    var catSet = {};
    apps.forEach(function (a) { if (a.category) catSet[a.category] = true; });
    var catCount = Object.keys(catSet).length;
    var latest = dateList.length ? dateList[dateList.length - 1] : (state.meta.updated || '');

    var perDay = days ? Math.round((apps.length / days) * 10) / 10 : 0;

    el.statApps.textContent = apps.length + '개';
    el.statAppsSub.textContent = days ? '하루 ' + perDay + '개씩' : '아직 없음';

    el.statDays.textContent = days + '일';
    el.statDaysSub.textContent = days ? '연속 ' + streak + '일째' : '시작 전';

    el.statCats.textContent = catCount + '종';
    el.statCatsSub.textContent = catCount ? state.categories.filter(function (c) { return catSet[c.id]; })
      .map(function (c) { return c.label; }).join(' · ') : '분류 준비 중';

    el.statUpdated.textContent = latest ? fmtDate(latest) : '–';
    el.statUpdatedSub.textContent = latest ? relDays(latest) + ' 등록' : '';

    el.heroCount.textContent = apps.length + '개 앱 · ' + days + '일';
  }

  /* ------------------------------ 칩 ------------------------------ */
  function renderChips() {
    var counts = {};
    state.apps.forEach(function (a) { if (a.category) counts[a.category] = (counts[a.category] || 0) + 1; });

    var html = chipHtml('all', '전체', '✦', state.apps.length, state.cat === 'all');
    state.categories.forEach(function (c) {
      var n = counts[c.id] || 0;
      if (!n) return;
      html += chipHtml(c.id, c.label, c.icon || '', n, state.cat === c.id);
    });
    el.chips.innerHTML = html;
  }

  function chipHtml(id, label, icon, n, active) {
    return '<button type="button" class="chip" data-cat="' + esc(id) + '" aria-pressed="' +
      (active ? 'true' : 'false') + '">' +
      (icon ? '<span aria-hidden="true">' + esc(icon) + '</span>' : '') +
      '<span>' + esc(label) + '</span><span class="n">' + n + '</span></button>';
  }

  /* ------------------------------ 필터 ------------------------------ */
  function tokens(q) {
    return String(q).trim().toLowerCase().split(/\s+/).filter(Boolean);
  }

  function matches(app, toks) {
    if (!toks.length) return true;
    var hay = [app.name, app.summary, app.description, app.category, catOf(app.category).label]
      .concat(app.tags, app.features, [app.slug]).join(' ').toLowerCase();
    return toks.every(function (t) { return hay.indexOf(t) !== -1; });
  }

  function visibleApps() {
    var toks = tokens(state.query);
    var list = state.apps.filter(function (a) {
      if (state.cat !== 'all' && a.category !== state.cat) return false;
      if (state.favOnly && !isFav(a.slug)) return false;
      return matches(a, toks);
    });
    list.sort(function (a, b) {
      if (state.sort === 'name') return a.name.localeCompare(b.name, 'ko');
      var da = a.date || '', db = b.date || '';
      if (da === db) return a.name.localeCompare(b.name, 'ko');
      return state.sort === 'old' ? (da < db ? -1 : 1) : (da > db ? -1 : 1);
    });
    return list;
  }

  /* ------------------------------ 카드 ------------------------------ */
  function latestDate() {
    var d = '';
    state.apps.forEach(function (a) { if (a.date && a.date > d) d = a.date; });
    return d;
  }

  function cardHtml(a, i, toks) {
    var c = catOf(a.category);
    var accent = a.accent || 'var(--accent)';
    var tags = a.tags.slice(0, 3).map(function (t) { return '<span class="tag">' + highlight(t, toks) + '</span>'; });
    if (a.tags.length > 3) tags.push('<span class="tag more">+' + (a.tags.length - 3) + '</span>');
    var fav = isFav(a.slug);
    var isNew = !!state.latest && a.date === state.latest;

    return '' +
      '<article class="card" role="button" tabindex="0" data-slug="' + esc(a.slug) + '"' +
      ' data-cat="' + esc(a.category) + '" data-name="' + esc(a.name) + '" data-date="' + esc(a.date) + '"' +
      ' aria-label="' + esc(a.name + ' 상세 보기') + '"' +
      ' style="--c:' + esc(accent) + ';--d:' + Math.min(i * 45, 320) + 'ms">' +
        '<div class="card-top">' +
          '<div class="app-ico" aria-hidden="true">' + esc(a.icon || '◈') + '</div>' +
          '<div class="card-head">' +
            '<h3 class="app-name">' + highlight(a.name, toks) + '</h3>' +
            '<div class="app-meta">' +
              '<span class="cat-pill">' + esc((c.icon ? c.icon + ' ' : '') + c.label) + '</span>' +
              '<span class="sep" aria-hidden="true">·</span>' +
              '<span>' + fmtDate(a.date) + '</span>' +
              (isNew ? '<span class="new-badge" aria-label="새로 추가됨">NEW</span>' : '') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<button class="fav" type="button" data-fav="' + esc(a.slug) + '" aria-pressed="' + (fav ? 'true' : 'false') + '"' +
          ' aria-label="' + esc(a.name + (fav ? ' 즐겨찾기 해제' : ' 즐겨찾기 추가')) + '" title="즐겨찾기">★</button>' +
        '<p class="app-summary">' + highlight(a.summary || '', toks) + '</p>' +
        '<div class="tags">' + tags.join('') + '</div>' +
        '<div class="card-foot">' +
          '<span class="card-date">' + relDays(a.date) + ' 등록</span>' +
          '<span class="card-open">자세히 <span aria-hidden="true">→</span></span>' +
        '</div>' +
      '</article>';
  }

  /** 날짜별 그룹 보기: 같은 날 만든 앱을 한 묶음으로 보여 준다. */
  function groupHtml(list, toks) {
    var order = [], byDate = {};
    list.forEach(function (a) {
      var d = a.date || '';
      if (!byDate[d]) { byDate[d] = []; order.push(d); }
      byDate[d].push(a);
    });
    order.sort(function (x, y) { return x < y ? 1 : x > y ? -1 : 0; });

    return order.map(function (d) {
      var arr = byDate[d];
      // 그날 만든 앱의 카테고리 요약 (등장 순서 유지)
      var seen = {}, cats = [];
      arr.forEach(function (a) {
        var id = a.category || '';
        if (!seen[id]) { seen[id] = { c: catOf(id), n: 0 }; cats.push(seen[id]); }
        seen[id].n++;
      });
      var catChips = cats.map(function (x) {
        return '<span class="dg-cat" title="' + esc(x.c.label) + ' ' + x.n + '개">' +
          '<span class="ic" aria-hidden="true">' + esc(x.c.icon || '•') + '</span>' +
          esc(x.c.label) + '<span class="n" aria-hidden="true">' + x.n + '</span></span>';
      }).join('');
      var folded = isFolded(d);
      var gid = 'dgc-' + d.replace(/[^0-9]/g, '');
      return '<section class="daygroup' + (folded ? ' folded' : '') + '" data-date="' + esc(d) + '" aria-label="' + fmtDate(d) + ' · ' + arr.length + '개">' +
        '<button class="daygroup-head" type="button" data-day="' + esc(d) + '"' +
          ' aria-expanded="' + (folded ? 'false' : 'true') + '" aria-controls="' + gid + '"' +
          ' title="' + fmtDate(d) + ' 그룹 접기/펼치기">' +
          '<span class="dg-chev" aria-hidden="true">⌄</span>' +
          '<span class="dg-date">' + fmtDate(d) + '</span>' +
          (d === state.latest ? '<span class="new-badge">NEW</span>' : '') +
          '<span class="dg-rel">' + relDays(d) + '</span>' +
          '<span class="dg-cats">' + catChips + '</span>' +
          '<span class="dg-n">' + arr.length + '개</span>' +
        '</button>' +
        '<div class="daygroup-cards" id="' + gid + '"' + (folded ? ' hidden' : '') + '>' +
          arr.map(function (a) { return cardHtml(a, list.indexOf(a), toks); }).join('') +
        '</div>' +
      '</section>';
    }).join('');
  }

  function render() {
    var toks = tokens(state.query);
    var list = visibleApps();
    state.latest = latestDate();

    // 즐겨찾기 필터·개수 표시
    el.favCount.textContent = state.favs.filter(function (s) {
      return state.apps.some(function (a) { return a.slug === s; });
    }).length;
    el.favFilter.setAttribute('aria-pressed', state.favOnly ? 'true' : 'false');

    // 결과 요약
    var label = state.cat === 'all' ? '전체' : catOf(state.cat).label;
    if (list.length) {
      el.resultLine.innerHTML = '<b>' + list.length + '</b>개 앱 · ' + esc(label) +
        (state.favOnly ? ' · 즐겨찾기' : '') +
        (state.query ? ' · “' + esc(state.query) + '” 검색' : '') +
        ' · ' + (state.sort === 'name' ? '이름순' : state.sort === 'old' ? '오래된순' : '최신순') +
        (state.group ? ' · 날짜별' : '') +
        (state.layout === 'grid' ? ' · 그리드 보기' : ' · 리스트 보기');
    } else {
      el.resultLine.textContent = '';
    }

    el.empty.hidden = list.length > 0 || !state.apps.length;
    el.grid.hidden = list.length === 0 && state.apps.length > 0;

    el.grid.classList.toggle('grouped', state.group);
    el.groupToggle.setAttribute('aria-pressed', state.group ? 'true' : 'false');
    el.grid.innerHTML = state.group
      ? groupHtml(list, toks)
      : list.map(function (a, i) { return cardHtml(a, i, toks); }).join('');

    // 모달이 열린 앱이 필터에서 사라졌다면 닫는다
    if (state.openSlug && !list.some(function (a) { return a.slug === state.openSlug; })) closeModal(true);
  }

  /* ------------------------------ 날짜 그룹 접기/펼치기 ------------------------------ */
  function toggleGroup(day) {
    var sec = el.grid.querySelector('.daygroup[data-date="' + day + '"]');
    if (!sec) return;
    var i = state.collapsed.indexOf(day);
    var open;
    if (i === -1) { state.collapsed.push(day); open = false; }
    else { state.collapsed.splice(i, 1); open = true; }
    saveCollapsed();

    var head = sec.querySelector('.daygroup-head');
    var cards = sec.querySelector('.daygroup-cards');
    sec.classList.toggle('folded', !open);
    if (head) head.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (cards) {
      if (open) cards.removeAttribute('hidden');
      else cards.setAttribute('hidden', '');
    }
    toast(open ? fmtDate(day) + ' 그룹을 펼쳤어요' : fmtDate(day) + ' 그룹을 접었어요');
  }

  /* ------------------------------ 모달 ------------------------------ */
  function findApp(slug) {
    for (var i = 0; i < state.apps.length; i++) if (state.apps[i].slug === slug) return state.apps[i];
    return null;
  }

  function openModal(slug, fromHash) {
    var a = findApp(slug);
    if (!a) return;
    var c = catOf(a.category);
    var accent = a.accent || 'var(--accent)';

    state.lastFocus = document.activeElement;
    state.openSlug = slug;

    el.modalBody.innerHTML = '' +
      '<div class="m-head">' +
        '<div class="m-ico" aria-hidden="true">' + esc(a.icon || '◈') + '</div>' +
        '<div>' +
          '<h2 class="m-title" id="modalTitle">' + esc(a.name) + '</h2>' +
          '<div class="m-sub">' +
            '<span class="cat-pill">' + esc((c.icon ? c.icon + ' ' : '') + c.label) + '</span>' +
            '<span>' + fmtDate(a.date) + '</span>' +
            '<span class="sep" aria-hidden="true">·</span>' +
            '<span>' + relDays(a.date) + '</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<p class="m-desc">' + esc(a.description || a.summary || '') + '</p>' +
      (a.features.length ?
        '<p class="m-h">핵심 기능</p><ul class="m-feats">' +
          a.features.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') +
        '</ul>' : '') +
      (a.tags.length ?
        '<p class="m-h">태그</p><div class="m-tags">' +
          a.tags.map(function (t) { return '<span class="tag">#' + esc(t) + '</span>'; }).join('') +
        '</div>' : '') +
      '<div class="m-actions">' +
        '<a class="btn btn-primary" id="runApp" href="' + esc(a.url || a.path || '#') + '" target="_blank" rel="noopener">' +
          '앱 실행 <span aria-hidden="true">↗</span></a>' +
        '<button class="btn btn-quiet" id="copyLink" type="button">링크 복사</button>' +
        '<button class="btn btn-quiet" id="modalFav" type="button" aria-pressed="' + (isFav(a.slug) ? 'true' : 'false') + '">' +
          '<span aria-hidden="true">★</span> ' + (isFav(a.slug) ? '즐겨찾기 해제' : '즐겨찾기') + '</button>' +
      '</div>' +
      '<div class="m-foot">' +
        '<span>경로 <code>' + esc(a.path || a.slug) + '</code></span>' +
        '<span>' + (a.url ? 'GitHub Pages' : '로컬') + '</span>' +
      '</div>';

    el.modalCard.style.setProperty('--c', accent);

    // 모달 내부 이벤트
    $('#copyLink').addEventListener('click', function () { copy(a.url || (location.origin + location.pathname + (a.path || ''))); });
    $('#modalFav').addEventListener('click', function () {
      toggleFav(a.slug);
      var on = isFav(a.slug);
      this.setAttribute('aria-pressed', on ? 'true' : 'false');
      this.innerHTML = '<span aria-hidden="true">★</span> ' + (on ? '즐겨찾기 해제' : '즐겨찾기');
      if (state.favOnly) render();
    });

    el.modal.hidden = false;
    document.body.style.overflow = 'hidden';
    if (!fromHash) {
      try { history.replaceState(null, '', '#app=' + encodeURIComponent(a.slug)); } catch (e) {}
    }
    el.modalClose.focus({ preventScroll: true });
  }

  function closeModal(silent) {
    if (el.modal.hidden) return;
    el.modal.hidden = true;
    document.body.style.overflow = '';
    state.openSlug = null;
    if (!silent) {
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
      if (state.lastFocus && document.contains(state.lastFocus)) state.lastFocus.focus({ preventScroll: true });
    }
  }

  function deepLink() {
    var m = /#app=([^&]+)/.exec(location.hash || '');
    if (!m) return;
    var slug = decodeURIComponent(m[1]);
    if (findApp(slug)) {
      openModal(slug, true);
      var card = el.grid.querySelector('[data-slug="' + slug + '"]');
      if (card) card.scrollIntoView({ block: 'center' });
    }
  }

  /* ------------------------------ 즐겨찾기 ------------------------------ */
  function toggleFav(slug) {
    var i = state.favs.indexOf(slug);
    var on = i === -1;
    if (on) state.favs.push(slug); else state.favs.splice(i, 1);
    saveFavs();

    // 카드 상태 동기화
    var btn = el.grid.querySelector('[data-fav="' + slug + '"]');
    if (btn) {
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      var app = findApp(slug);
      btn.setAttribute('aria-label', (app ? app.name : slug) + (on ? ' 즐겨찾기 해제' : ' 즐겨찾기 추가'));
    }
    el.favCount.textContent = state.favs.filter(function (s) {
      return state.apps.some(function (a) { return a.slug === s; });
    }).length;
    toast(on ? '즐겨찾기에 추가했어요' : '즐겨찾기에서 뺐어요');
  }

  /* ------------------------------ 복사 ------------------------------ */
  function copy(text) {
    function done() { toast('링크를 복사했어요'); }
    function fail() {
      // 클립보드 API가 막힌 환경(http·구형 브라우저) 대비
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok) done(); else toast('복사에 실패했어요');
      } catch (e) { toast('복사에 실패했어요'); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fail);
    } else fail();
  }

  /* ------------------------------ 이벤트 ------------------------------ */
  var searchTimer = null;
  el.search.addEventListener('input', function () {
    var v = this.value;
    el.searchClear.hidden = !v;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () { state.query = v; render(); }, 60);
  });
  el.search.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { this.value = ''; state.query = ''; el.searchClear.hidden = true; render(); }
  });
  el.searchClear.addEventListener('click', function () {
    el.search.value = ''; state.query = ''; el.searchClear.hidden = true; render(); el.search.focus();
  });

  el.sort.addEventListener('change', function () { state.sort = this.value; render(); });

  el.groupToggle.addEventListener('click', function () {
    state.group = !state.group;
    saveView();
    render();
    toast(state.group ? '날짜별로 묶어서 봅니다' : '한 화면으로 봅니다');
  });

  el.layoutToggle.addEventListener('click', function (e) {
    var btn = e.target.closest('.seg-btn');
    if (!btn) return;
    var next = btn.getAttribute('data-layout') === 'grid' ? 'grid' : 'list';
    if (next === state.layout) return;
    state.layout = next;
    saveLayout();
    applyLayout();
    render();
    toast(next === 'grid' ? '그리드로 봅니다 — 아이콘과 이름만' : '리스트로 봅니다 — 소개·태그까지');
  });

  el.favFilter.addEventListener('click', function () {
    state.favOnly = !state.favOnly;
    render();
    if (state.favOnly && !state.favs.length) toast('아직 즐겨찾기한 앱이 없어요');
  });

  el.chips.addEventListener('click', function (e) {
    var chip = e.target.closest('.chip');
    if (!chip) return;
    state.cat = chip.getAttribute('data-cat');
    renderChips();
    render();
  });

  el.grid.addEventListener('click', function (e) {
    var head = e.target.closest('.daygroup-head');
    if (head) {
      e.preventDefault();
      toggleGroup(head.getAttribute('data-day'));
      return;
    }
    var favBtn = e.target.closest('.fav');
    if (favBtn) {
      e.stopPropagation();
      toggleFav(favBtn.getAttribute('data-fav'));
      if (state.favOnly) render();
      return;
    }
    var card = e.target.closest('.card');
    if (card) openModal(card.getAttribute('data-slug'));
  });

  el.grid.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
    if (e.target.closest('.fav')) return;
    var card = e.target.closest('.card');
    if (!card) return;
    e.preventDefault();
    openModal(card.getAttribute('data-slug'));
  });

  el.modalClose.addEventListener('click', function () { closeModal(); });
  el.modalBackdrop.addEventListener('click', function () { closeModal(); });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !el.modal.hidden) { closeModal(); return; }
    if (e.key === '/' && el.modal.hidden) {
      var t = document.activeElement;
      var typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (!typing) { e.preventDefault(); el.search.focus(); el.search.select(); }
    }
    // 모달 내 포커스 가둠
    if (e.key === 'Tab' && !el.modal.hidden) {
      var f = el.modalCard.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  el.resetAll.addEventListener('click', function () {
    state.cat = 'all'; state.query = ''; state.favOnly = false; state.sort = 'new';
    el.search.value = ''; el.searchClear.hidden = true; el.sort.value = 'new';
    renderChips(); render();
  });

  el.themeToggle.addEventListener('click', function () {
    var next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', next === 'light' ? '#f3f6fa' : '#0b0f14');
    toast(next === 'light' ? '라이트 테마' : '다크 테마');
  });

  window.addEventListener('scroll', function () {
    el.toolbar.classList.toggle('stuck', window.scrollY > 8);
  }, { passive: true });

  window.addEventListener('hashchange', function () {
    if (/^#app=/.test(location.hash)) deepLink();
    else closeModal(true);
  });

  applyLayout();
  load();
})();
