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
    'tools-events': 'tools-events.html',
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

  // Show a loading state while the publications sheet is being fetched
  list.innerHTML = '<div class="pub-empty" role="status"><p>Loading publications…</p></div>';


  /* ── 9. BIBTEX AUTO-LOAD FROM GOOGLE SHEET ────────────────
     Fetches a shared Google Sheet (published as CSV) — the sole
     source of publications. The sheet has one column, "BIB Entry",
     holding one full BibTeX entry per row.

     To add/remove publications: edit the Google Sheet only. The
     sheet must stay shared as "Anyone with the link — Viewer" so
     this CSV export endpoint stays readable without a login/API key.

     Sheet: https://docs.google.com/spreadsheets/d/1cxf-A2i6YgPBAwZ9L_K7ES4rKDCvmp8ckpk28g_pDec/edit
     ─────────────────────────────────────────────────────── */
  const SHEET_ID  = '1cxf-A2i6YgPBAwZ9L_K7ES4rKDCvmp8ckpk28g_pDec';
  const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;
  const BIB_COLUMN_NAME = 'BIB Entry';

  // Extracts the BIB Entry column from the sheet's CSV and joins every
  // row's BibTeX entry into one blob, so the existing BibTeX parser
  // below can run over it unchanged (it already matches multiple
  // "@type{...}" blocks in a single string).
  function bibEntriesFromCsv (csvText) {
    const rows = parseCsv(csvText);
    if (rows.length === 0) return '';

    const header = rows[0].map(h => h.trim().toLowerCase());
    const col    = header.indexOf(BIB_COLUMN_NAME.toLowerCase());
    if (col === -1) return '';

    return rows.slice(1)
        .map(r => (r[col] || '').trim())
        .filter(Boolean)
        .join('\n');
  }

  function parseBibtex (text) {
    const entries = [];
    const entryRx = /@(\w+)\s*\{([^,]+),([^@]*)\}/gs;
    let match;

    while ((match = entryRx.exec(text)) !== null) {
      const entryType = match[1].toLowerCase();
      const fields    = match[3];

      const get = key => {
        // \b avoids e.g. "title" matching inside "booktitle"
        const rx = new RegExp('\\b' + key + '\\s*=\\s*[{"]([^}"]*)[}"]', 'i');
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

  // Fetch the Google Sheet (as CSV) — replaces currentData entirely
  fetch(SHEET_CSV_URL)
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.text(); })
      .then(csvText => {
        const bibText = bibEntriesFromCsv(csvText);
        const parsed  = parseBibtex(bibText);
        currentData   = parsed.sort((a, b) => b.year - a.year);
        applyFilter(currentFilter);
      })
      .catch(err => {
        console.warn('DECO Lab: could not load publications from the Google Sheet —', err.message);
        list.innerHTML = `
          <div class="pub-empty" role="status">
            <p>Could not load publications from the shared Google Sheet — ${err.message}.<br>
            Make sure the sheet is shared as "Anyone with the link — Viewer" and still has a
            "${BIB_COLUMN_NAME}" column.</p>
          </div>`;
      });
})();


/* ── 10. UTILITY ─────────────────────────────────────────── */

// Minimal RFC4180-style CSV parser — handles quoted fields that
// contain commas, newlines, and escaped ("") quotes, which is what
// Google's CSV export produces for multi-line cells. Shared by
// every Google-Sheet-backed section on the site.
function parseCsv (text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\r') {
      // skip — paired \n below ends the row
    } else if (c === '\n') {
      row.push(field); field = '';
      rows.push(row); row = [];
    } else {
      field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// Turns a CSV blob into an array of { header: value } objects, keyed
// by the trimmed, lower-cased header row — so sheet columns can be
// read by name regardless of their order.
function csvToObjects (text) {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const headers = rows[0].map(h => h.trim().toLowerCase());
  return rows.slice(1)
      .filter(r => r.some(cell => cell.trim() !== ''))
      .map(r => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = (r[i] || '').trim(); });
        return obj;
      });
}

function escapeHtml (str) {
  return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
}


/* ── 11. OPENINGS AUTO-LOAD FROM GOOGLE SHEET ─────────────
   Fetches a shared Google Sheet (published as CSV) — the sole
   source of open positions. One row per position.

   To add/remove/edit a position: edit the Google Sheet only.
   The sheet must stay shared as "Anyone with the link — Viewer"
   so this CSV export endpoint stays readable without a login/API key.

   Expected columns (header row, any order) — English-only, no
   bilingual columns needed:
     Status          "Open" or "Closed" — manual override; "Closed"
                      always wins, even if Deadline Date is in the future.
     Title            e.g. "PhD Fellowship — TinyML for Edge Inference"
     Deadline Date    optional, format YYYY-MM-DD. Drives two things:
                      (1) the displayed deadline text, auto-formatted as
                      "Deadline: 15 March 2027", and (2) auto-closing —
                      once this date has passed, the position auto-shows
                      as Closed even if Status still says "Open". Leave
                      blank for positions with no fixed deadline — shown
                      as "Rolling basis" and never auto-closes.
     Location         e.g. "Odense, Denmark (SDU)"
     Type             e.g. "Full-time · 3 years"
     Description
     Apply Email      optional — defaults to mtmo@mmmi.sdu.dk if blank
     Link             optional — URL to the official job ad (e.g. the
                      SDU careers listing). Shown as a secondary
                      "View posting" button if present.

   Sheet: https://docs.google.com/spreadsheets/d/17FfyO8rpIe9OoRW80KJ_q0-zDXU7T79hfy68vMS6EW4/edit
   ─────────────────────────────────────────────────────────── */
(function () {
  const list = document.getElementById('openings-list');
  if (!list) return;

  const OPENINGS_SHEET_ID  = '17FfyO8rpIe9OoRW80KJ_q0-zDXU7T79hfy68vMS6EW4';
  const OPENINGS_CSV_URL   = `https://docs.google.com/spreadsheets/d/${OPENINGS_SHEET_ID}/gviz/tq?tqx=out:csv`;
  const DEFAULT_APPLY_MAIL = 'mtmo@mmmi.sdu.dk';

  const currentLang = () => (document.documentElement.lang === 'da' ? 'da' : 'en');
  const refreshIcons = () => { if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons(); };

  // True once a "Deadline Date" (YYYY-MM-DD) has fully passed. ISO-format
  // date strings compare correctly as plain strings, so no Date parsing
  // (and its timezone pitfalls) is needed. Today still counts as open —
  // a position closes the day *after* its deadline.
  function isPastDeadline (dateStr) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    const todayStr = new Date().toISOString().slice(0, 10);
    return dateStr < todayStr;
  }

  // Turns "2027-03-15" into "Deadline: 15 March 2027"; blank/invalid
  // dates read as a rolling, no-fixed-deadline position.
  function formatDeadline (dateStr) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return 'Rolling basis';
    const d = new Date(dateStr + 'T00:00:00Z');
    const formatted = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    return `Deadline: ${formatted}`;
  }

  function emptyStateHtml () {
    return `
      <div class="empty-state fade-in" role="status">
        <i data-lucide="inbox" aria-hidden="true"></i>
        <h3 data-en="No open positions right now" data-da="Ingen ledige stillinger i øjeblikket">No open positions right now</h3>
        <p data-en="We are always open to spontaneous applications — drop us an email!"
           data-da="Vi er altid åbne for spontane ansøgninger — send os en e-mail!">We are always open to spontaneous applications — drop us an email!</p>
        <a href="mailto:${DEFAULT_APPLY_MAIL}" class="btn btn-primary" data-en="Contact us" data-da="Kontakt os">Contact us</a>
      </div>`;
  }

  function renderOpenings (rows) {
    const openings = rows.filter(r => r.title);
    if (openings.length === 0) { list.innerHTML = emptyStateHtml(); refreshIcons(); return; }

    const lang = currentLang();

    list.innerHTML = openings.map(row => {
      const deadlineDate = (row['deadline date'] || '').trim();
      const statusClosed = (row.status || '').trim().toLowerCase() === 'closed';
      const isClosed   = statusClosed || isPastDeadline(deadlineDate);
      const badgeEn    = isClosed ? 'Closed' : 'Open';
      const badgeDa    = isClosed ? 'Lukket' : 'Åben';
      const badge      = lang === 'da' ? badgeDa : badgeEn;
      const title      = row.title             || '';
      const deadline   = formatDeadline(deadlineDate);
      const location   = row.location          || '';
      const type       = row.type              || '';
      const desc       = row.description       || '';
      const email      = row['apply email'] || DEFAULT_APPLY_MAIL;
      const link       = (row.link || '').trim();

      return `
        <article class="opening-card fade-in${isClosed ? ' closed' : ''}">
          <div class="opening-header">
            <div>
              <span class="opening-badge ${isClosed ? 'closed' : 'open'}" data-en="${escapeHtml(badgeEn)}" data-da="${escapeHtml(badgeDa)}">${escapeHtml(badge)}</span>
              <h3 class="opening-title">${escapeHtml(title)}</h3>
            </div>
            <span class="opening-deadline">${escapeHtml(deadline)}</span>
          </div>
          ${desc ? `<p class="opening-desc">${escapeHtml(desc)}</p>` : ''}
          <div class="opening-meta">
            ${location ? `<span><i data-lucide="map-pin" aria-hidden="true"></i><span>${escapeHtml(location)}</span></span>` : ''}
            ${type ? `<span><i data-lucide="clock" aria-hidden="true"></i><span>${escapeHtml(type)}</span></span>` : ''}
          </div>
          <div class="opening-actions">
            ${link ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm" data-en="View posting" data-da="Se opslag">${lang === 'da' ? 'Se opslag' : 'View posting'}</a>` : ''}
            <a href="mailto:${escapeHtml(email)}" class="btn btn-primary btn-sm" data-en="Apply / enquire" data-da="Ansøg / forespørg">${lang === 'da' ? 'Ansøg / forespørg' : 'Apply / enquire'}</a>
          </div>
        </article>`;
    }).join('');

    refreshIcons();
  }

  fetch(OPENINGS_CSV_URL)
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.text(); })
      .then(csvText => renderOpenings(csvToObjects(csvText)))
      .catch(err => {
        console.warn('DECO Lab: could not load openings from the Google Sheet —', err.message);
        list.innerHTML = `
          <div class="empty-state fade-in" role="status">
            <p>Could not load openings from the shared Google Sheet — ${escapeHtml(err.message)}.<br>
            Make sure the sheet is shared as "Anyone with the link — Viewer" and still has the expected columns.</p>
          </div>`;
      });
})();


/* ── 12. TOOLS & EVENTS AUTO-LOAD FROM GOOGLE SHEET ───────
   Fetches a shared Google Sheet (published as CSV) — the sole
   source for the Tools & Events page. One row per tool, workshop,
   or summer school; the Category column routes it into the right
   subsection below.

   To add/remove/edit an entry: edit the Google Sheet only. The
   sheet must stay shared as "Anyone with the link — Viewer" so
   this CSV export endpoint stays readable without a login/API key.

   Expected columns (header row, any order). Everything but
   Category and Title is optional, and a row with an unrecognized
   Category or a blank Title is simply skipped — it will never
   break the page:
     Category      "Tool" | "Workshop" | "Summer School"
     Title
     Description    optional
     Link            optional — internal relative links (e.g.
                     "./tools/foo.html") open in the same tab;
                     external links (http/https) open in a new tab.
     Date            optional free text, e.g. "2024" or "June 2026"

   Sheet: https://docs.google.com/spreadsheets/d/1wiH0L-UVuAURJO5VeMKwvMy9gWdsjqPel5r9zdNMTVs/edit
   ─────────────────────────────────────────────────────────── */
(function () {
  const toolsGrid    = document.getElementById('te-tools-grid');
  const workshopGrid  = document.getElementById('te-workshops-grid');
  const summerGrid    = document.getElementById('te-summerschools-grid');
  if (!toolsGrid && !workshopGrid && !summerGrid) return;

  const TOOLS_EVENTS_SHEET_ID = '1wiH0L-UVuAURJO5VeMKwvMy9gWdsjqPel5r9zdNMTVs';
  const TOOLS_EVENTS_CSV_URL  = `https://docs.google.com/spreadsheets/d/${TOOLS_EVENTS_SHEET_ID}/gviz/tq?tqx=out:csv`;

  const ICONS = { tool: 'package', workshop: 'users', summerschool: 'graduation-cap' };
  const EMPTY_MSG = {
    tool:         { en: 'No tools listed yet. Check back soon.',     da: 'Ingen værktøjer endnu. Kig forbi igen snart.' },
    workshop:     { en: 'No workshops listed yet. Check back soon.', da: 'Ingen workshops endnu. Kig forbi igen snart.' },
    summerschool: { en: 'No summer schools yet. Check back soon.',   da: 'Ingen sommerskoler endnu. Kig forbi igen snart.' }
  };

  const refreshIcons = () => { if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons(); };

  // Filter bar — shows only the clicked category's block ("all" shows every block).
  document.querySelectorAll('.te-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.te-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      document.querySelectorAll('.te-block').forEach(block => {
        block.style.display = (filter === 'all' || block.dataset.category === filter) ? '' : 'none';
      });
    });
  });

  // Accepts a few spellings per category so a typo in the sheet
  // doesn't need a code change; anything else is skipped.
  function normalizeCategory (raw) {
    const c = (raw || '').trim().toLowerCase();
    if (c === 'tool' || c === 'tools') return 'tool';
    if (c === 'workshop' || c === 'workshops') return 'workshop';
    if (c === 'summer school' || c === 'summer schools' || c === 'summerschool') return 'summerschool';
    return null;
  }

  function cardHtml (item) {
    const isExternal = /^https?:\/\//i.test(item.link);
    const titleHtml  = item.link
        ? `<a href="${escapeHtml(item.link)}"${isExternal ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(item.title)}</a>`
        : escapeHtml(item.title);

    return `
      <article class="te-card fade-in">
        <div class="te-card-icon"><i data-lucide="${ICONS[item.category]}" aria-hidden="true"></i></div>
        <h4 class="te-card-title">${titleHtml}</h4>
        ${item.date        ? `<span class="te-card-date">${escapeHtml(item.date)}</span>`       : ''}
        ${item.description ? `<p class="te-card-desc">${escapeHtml(item.description)}</p>`      : ''}
      </article>`;
  }

  function renderGrid (grid, items, category) {
    if (!grid) return;
    if (items.length === 0) {
      const msg = EMPTY_MSG[category];
      grid.innerHTML = `<p class="te-empty" data-en="${escapeHtml(msg.en)}" data-da="${escapeHtml(msg.da)}">${escapeHtml(msg.en)}</p>`;
      return;
    }
    grid.innerHTML = items.map(cardHtml).join('');
  }

  fetch(TOOLS_EVENTS_CSV_URL)
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.text(); })
      .then(csvText => {
        const buckets = { tool: [], workshop: [], summerschool: [] };

        csvToObjects(csvText).forEach(row => {
          const category = normalizeCategory(row.category);
          const title     = (row.title || '').trim();
          if (!category || !title) return; // can't meaningfully place this row — skip it

          buckets[category].push({
            category,
            title,
            description: (row.description || '').trim(),
            link:        (row.link || '').trim(),
            date:        (row.date || '').trim()
          });
        });

        renderGrid(toolsGrid,    buckets.tool,         'tool');
        renderGrid(workshopGrid, buckets.workshop,     'workshop');
        renderGrid(summerGrid,  buckets.summerschool,  'summerschool');
        refreshIcons();
      })
      .catch(err => {
        console.warn('DECO Lab: could not load Tools & Events from the Google Sheet —', err.message);
        const msg = `<p class="te-empty">Could not load this section — ${escapeHtml(err.message)}.</p>`;
        if (toolsGrid)    toolsGrid.innerHTML    = msg;
        if (workshopGrid) workshopGrid.innerHTML = msg;
        if (summerGrid)   summerGrid.innerHTML   = msg;
      });
})();