/* ============================================================
   DECO Lab · script.js
   ============================================================ */

'use strict';

/* ── 1. THEME TOGGLE ──────────────────────────────────────── */
(function () {
  const root   = document.documentElement;
  const toggle = document.querySelector('[data-theme-toggle]');
  const SUN_ICON  = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;
  const MOON_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

  let theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  root.setAttribute('data-theme', theme);

  function applyTheme (t) {
    theme = t;
    root.setAttribute('data-theme', t);
    if (toggle) {
      toggle.innerHTML = t === 'dark' ? SUN_ICON : MOON_ICON;
      toggle.setAttribute('aria-label', `Switch to ${t === 'dark' ? 'light' : 'dark'} mode`);
    }
  }
  applyTheme(theme);

  if (toggle) toggle.addEventListener('click', () => applyTheme(theme === 'dark' ? 'light' : 'dark'));
})();


/* ── 2. LANGUAGE TOGGLE (EN / DA) ────────────────────────── */
(function () {
  let lang = 'en';
  const btn   = document.getElementById('lang-toggle');
  const label = document.getElementById('lang-label');

  function applyLang (l) {
    lang = l;
    label.textContent = l === 'en' ? 'DA' : 'EN';
    document.documentElement.lang = l;

    document.querySelectorAll('[data-en]').forEach(el => {
      const text = el.getAttribute(`data-${l}`);
      if (text) el.textContent = text;
    });
  }

  if (btn) btn.addEventListener('click', () => applyLang(lang === 'en' ? 'da' : 'en'));
})();


/* ── 3. MOBILE NAV ───────────────────────────────────────── */
function closeMobileNav () {
  const nav = document.getElementById('nav-mobile');
  const btn = document.getElementById('hamburger');
  if (nav) { nav.classList.remove('open'); nav.setAttribute('aria-hidden', 'true'); }
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

(function () {
  const hamburger = document.getElementById('hamburger');
  const navMobile = document.getElementById('nav-mobile');
  if (!hamburger || !navMobile) return;

  hamburger.addEventListener('click', () => {
    const isOpen = navMobile.classList.toggle('open');
    navMobile.setAttribute('aria-hidden', String(!isOpen));
    hamburger.setAttribute('aria-expanded', String(isOpen));
  });

  // Close on outside click
  document.addEventListener('click', e => {
    if (!e.target.closest('#nav-mobile') && !e.target.closest('#hamburger')) {
      closeMobileNav();
    }
  });
})();


/* ── 4. SCROLLED HEADER ──────────────────────────────────── */
(function () {
  const header = document.getElementById('site-header');
  if (!header) return;
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 10);
  window.addEventListener('scroll', onScroll, { passive: true });
})();


/* ── 5. ACTIVE NAV LINK (page-based) ────────────────────── */
(function () {
  // Each page sets data-page on <body>; match it to the nav href filename.
  const page = document.body.dataset.page;
  if (!page) return;

  const pageMap = {
    home:         'index.html',
    team:         'team.html',
    publications: 'publications.html',
    openings:     'openings.html',
    contact:      'contact.html'
  };

  const href = pageMap[page];
  if (!href) return;

  document.querySelectorAll('.nav-desktop a, .nav-mobile a').forEach(a => {
    if (a.getAttribute('href') === href) a.classList.add('active');
  });
})();


/* ── 6. CONTACT FORM ─────────────────────────────────────── */
(function () {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    const name    = form.querySelector('#cf-name');
    const email   = form.querySelector('#cf-email');
    const message = form.querySelector('#cf-message');
    let valid = true;

    [name, email, message].forEach(el => {
      el.classList.remove('error');
      if (!el.value.trim()) { el.classList.add('error'); valid = false; }
    });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      email.classList.add('error'); valid = false;
    }
    if (!valid) return;

    const subject  = encodeURIComponent(`Message from ${name.value}`);
    const body     = encodeURIComponent(`Name: ${name.value}\nEmail: ${email.value}\n\n${message.value}`);
    window.location.href = `mailto:mtmo@mmmi.sdu.dk?subject=${subject}&body=${body}`;
  });
})();


/* ── 7. PUBLICATIONS DATA ────────────────────────────────────
   HOW TO ADD / REMOVE A PUBLICATION MANUALLY:
     Copy one object in the array, fill in the fields, save.
     Supported types: 'conference' | 'journal' | 'workshop' | 'preprint'
     Optional fields: doi, url, pdf — remove if not available.
   ─────────────────────────────────────────────────────────── */
const publicationsData = [];


/* ── 8. RENDER PUBLICATIONS ──────────────────────────────── */
(function () {
  const list = document.getElementById('pub-list');
  if (!list) return;

  let currentFilter = 'all';
  let currentData   = [...publicationsData];

  // Sort newest-first
  currentData.sort((a, b) => b.year - a.year);

  function renderPublications (data) {
    list.innerHTML = '';

    if (data.length === 0) {
      list.innerHTML = `
        <div class="pub-empty" role="status">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48" aria-hidden="true">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <p>No publications in this category yet.</p>
        </div>`;
      return;
    }

    data.forEach(pub => {
      const item = document.createElement('div');
      item.className = 'pub-item';
      item.setAttribute('role', 'listitem');

      const typeLabel = pub.type.charAt(0).toUpperCase() + pub.type.slice(1);
      const titleHtml = pub.url
          ? `<a href="${pub.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(pub.title)}</a>`
          : escapeHtml(pub.title);

      const linksHtml = [
        pub.doi  ? `<a class="pub-link" href="https://doi.org/${pub.doi}" target="_blank" rel="noopener noreferrer">DOI</a>` : '',
        pub.url  ? `<a class="pub-link" href="${pub.url}"  target="_blank" rel="noopener noreferrer">Link</a>` : '',
        pub.pdf  ? `<a class="pub-link" href="${pub.pdf}"  target="_blank" rel="noopener noreferrer">PDF</a>` : ''
      ].filter(Boolean).join('');

      item.innerHTML = `
        <div class="pub-header">
          <span class="pub-type-badge ${pub.type}">${typeLabel}</span>
          <div class="pub-title">${titleHtml}</div>
        </div>
        <div class="pub-authors">${escapeHtml(pub.authors)}</div>
        <div class="pub-venue">${escapeHtml(pub.venue)}</div>
        <div class="pub-footer">
          <span class="pub-year">${pub.year}</span>
          ${linksHtml ? `<div class="pub-links">${linksHtml}</div>` : ''}
        </div>`;

      list.appendChild(item);
    });
  }

  function applyFilter (filter) {
    currentFilter = filter;
    const filtered = filter === 'all'
        ? currentData
        : currentData.filter(p => p.type === filter);
    renderPublications(filtered);
  }

  // Filter buttons
  document.querySelectorAll('.pub-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pub-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyFilter(btn.dataset.filter);
    });
  });

  // Show a loading state while publications.bib is being fetched
  list.innerHTML = '<div class="pub-empty" role="status"><p>Loading publications…</p></div>';


  /* ── 9. BIBTEX AUTO-LOAD ──────────────────────────────────
     Fetches publications.bib — the sole source of publications.
     To add/remove publications: edit publications.bib only.
     ─────────────────────────────────────────────────────── */
  function parseBibtex (text) {
    const entries = [];
    const entryRx = /@(\w+)\s*\{([^,]+),([^@]*)\}/gs;
    let match;

    while ((match = entryRx.exec(text)) !== null) {
      const entryType = match[1].toLowerCase();
      const fields    = match[3];

      const get = key => {
        const rx = new RegExp(key + '\\s*=\\s*[{"]([^}"]*)[}"]', 'i');
        const m  = rx.exec(fields);
        return m ? m[1].trim().replace(/\s+/g, ' ') : '';
      };

      const typeMap = {
        article:       'journal',
        inproceedings: 'conference',
        proceedings:   'conference',
        workshop:      'workshop',
        misc:          'preprint',
        techreport:    'preprint',
        unpublished:   'preprint'
      };

      entries.push({
        title:   get('title')  || '(No title)',
        authors: get('author') || get('authors') || '',
        venue:   get('booktitle') || get('journal') || get('howpublished') || '',
        year:    parseInt(get('year'), 10) || new Date().getFullYear(),
        type:    typeMap[entryType] || 'conference',
        doi:     get('doi'),
        url:     get('url'),
        pdf:     get('pdf')
      });
    }
    return entries;
  }

  // Fetch publications.bib — replaces currentData entirely
  fetch('./publications.bib')
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.text(); })
      .then(text => {
        const parsed = parseBibtex(text);
        currentData  = parsed.sort((a, b) => b.year - a.year);
        applyFilter(currentFilter);
      })
      .catch(err => {
        console.warn('DECO Lab: could not load publications.bib —', err.message);
        const isFile = window.location.protocol === 'file:';
        list.innerHTML = `
          <div class="pub-empty" role="status">
            <p>${isFile
            ? 'Publications cannot load when the page is opened directly as a file.<br><br>' +
            'Please serve the site with a local web server, for example:<br>' +
            '<code>python3 -m http.server</code><br>' +
            'then open <code>http://localhost:8000/publications.html</code>'
            : 'Could not load <code>publications.bib</code> — ' + err.message + '.<br>' +
            'Make sure the file is in the same folder as <code>publications.html</code>.'
        }</p>
          </div>`;
      });
})();


/* ── 10. UTILITY ─────────────────────────────────────────── */
function escapeHtml (str) {
  return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
}