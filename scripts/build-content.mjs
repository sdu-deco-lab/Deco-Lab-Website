#!/usr/bin/env node
/* ============================================================
   DECO Lab · scripts/build-content.mjs
   ============================================================
   Fetches the three public Google Sheets (Publications, Openings,
   Tools & Events) and bakes their current content as static HTML
   into publications.html / openings.html / tools-events.html,
   between the <!-- SSR:START:<id> / SSR:END:<id> --> markers in
   each file.

   WHY: those three pages render their lists with client-side JS
   (assets/script.js). That's fine for real visitors, but a crawler
   that doesn't execute JavaScript — true of most SEO/GEO bots —
   sees an empty page. This script gives them real, crawlable HTML
   while leaving the live client-side fetch in place for visitors
   (it still overwrites this snapshot with fresh data on page load).

   Run manually with: node scripts/build-content.mjs
   Run automatically by: .github/workflows/build-content.yml (daily)

   IMPORTANT: the parsing/rendering logic below intentionally
   mirrors assets/script.js (CSV parsing, BibTeX parsing, the
   per-page render functions). If the Google Sheet column schema,
   or the rendered markup, ever changes there, update it here too.
   ============================================================ */

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const PUBLICATIONS_SHEET_ID = '1cxf-A2i6YgPBAwZ9L_K7ES4rKDCvmp8ckpk28g_pDec';
const OPENINGS_SHEET_ID     = '17FfyO8rpIe9OoRW80KJ_q0-zDXU7T79hfy68vMS6EW4';
const TOOLS_EVENTS_SHEET_ID = '1wiH0L-UVuAURJO5VeMKwvMy9gWdsjqPel5r9zdNMTVs';
const BIB_COLUMN_NAME       = 'BIB Entry';
const DEFAULT_APPLY_MAIL    = 'mtmo@mmmi.sdu.dk';

const csvUrl = id => `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv`;

/* ── shared parsers (mirror assets/script.js, section 10) ──── */

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

/* ── Publications (BibTeX, mirrors section 8/9) ─────────────── */

function bibEntriesFromCsv (csvText) {
  const rows = parseCsv(csvText);
  if (rows.length === 0) return '';
  const header = rows[0].map(h => h.trim().toLowerCase());
  const col = header.indexOf(BIB_COLUMN_NAME.toLowerCase());
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
    const fields = match[3];

    const get = key => {
      // \b avoids e.g. "title" matching inside "booktitle". The
      // capture group also tolerates one level of nested braces
      // (e.g. author = {Marco {De Luca}}) and backslash-escaped
      // braces (\{De Luca\}) — both common ways BibTeX protects
      // compound names — instead of truncating at the first "}".
      const rx = new RegExp('\\b' + key + String.raw`\s*=\s*[{"]((?:\{[^{}]*\}|\\.|[^}"\\])*)[}"]`, 'i');
      const m = rx.exec(fields);
      if (!m) return '';
      return m[1]
          .replace(/\\([{}])/g, '$1')
          .replace(/[{}]/g, '')
          .trim()
          .replace(/\s+/g, ' ');
    };

    const typeMap = {
      article: 'journal', inproceedings: 'conference', proceedings: 'conference',
      workshop: 'workshop', misc: 'preprint', techreport: 'preprint', unpublished: 'preprint'
    };

    entries.push({
      title: get('title') || '(No title)',
      authors: get('author') || get('authors') || '',
      venue: get('booktitle') || get('journal') || get('howpublished') || '',
      year: parseInt(get('year'), 10) || new Date().getFullYear(),
      type: typeMap[entryType] || 'conference',
      doi: get('doi'),
      url: get('url'),
      pdf: get('pdf')
    });
  }
  return entries;
}

function renderPublications (data) {
  if (data.length === 0) {
    return `
        <div class="pub-empty" role="status">
          <p>No publications yet.</p>
        </div>`;
  }
  return data.map(pub => {
    const typeLabel = pub.type.charAt(0).toUpperCase() + pub.type.slice(1);
    const titleHtml = pub.url
        ? `<a href="${pub.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(pub.title)}</a>`
        : escapeHtml(pub.title);

    const linksHtml = [
      pub.doi ? `<a class="pub-link" href="https://doi.org/${pub.doi}" target="_blank" rel="noopener noreferrer">DOI</a>` : '',
      pub.url ? `<a class="pub-link" href="${pub.url}" target="_blank" rel="noopener noreferrer">Link</a>` : '',
      pub.pdf ? `<a class="pub-link" href="${pub.pdf}" target="_blank" rel="noopener noreferrer">PDF</a>` : ''
    ].filter(Boolean).join('');

    return `
        <div class="pub-item" role="listitem">
          <div class="pub-header">
            <span class="pub-type-badge ${pub.type}">${typeLabel}</span>
            <div class="pub-title">${titleHtml}</div>
          </div>
          <div class="pub-authors">${escapeHtml(pub.authors)}</div>
          <div class="pub-venue">${escapeHtml(pub.venue)}</div>
          <div class="pub-footer">
            <span class="pub-year">${pub.year}</span>
            ${linksHtml ? `<div class="pub-links">${linksHtml}</div>` : ''}
          </div>
        </div>`;
  }).join('');
}

/* ── Openings (mirrors section 11) ───────────────────────────── */

function isPastDeadline (dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const todayStr = new Date().toISOString().slice(0, 10);
  return dateStr < todayStr;
}

function formatDeadline (dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return 'Rolling basis';
  const d = new Date(dateStr + 'T00:00:00Z');
  const formatted = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  return `Deadline: ${formatted}`;
}

function renderOpenings (rows) {
  const openings = rows.filter(r => r.title);
  if (openings.length === 0) {
    return `
        <div class="empty-state fade-in" role="status">
          <i data-lucide="inbox" aria-hidden="true"></i>
          <h3>No open positions right now</h3>
          <p>We are always open to spontaneous applications — drop us an email!</p>
          <a href="mailto:${DEFAULT_APPLY_MAIL}" class="btn btn-primary">Contact us</a>
        </div>`;
  }

  return openings.map(row => {
    const deadlineDate = (row['deadline date'] || '').trim();
    const statusClosed = (row.status || '').trim().toLowerCase() === 'closed';
    const isClosed = statusClosed || isPastDeadline(deadlineDate);
    const badge = isClosed ? 'Closed' : 'Open';
    const title = row.title || '';
    const deadline = formatDeadline(deadlineDate);
    const location = row.location || '';
    const type = row.type || '';
    const desc = row.description || '';
    const email = row['apply email'] || DEFAULT_APPLY_MAIL;
    const link = (row.link || '').trim();

    return `
        <article class="opening-card fade-in${isClosed ? ' closed' : ''}">
          <div class="opening-header">
            <div>
              <span class="opening-badge ${isClosed ? 'closed' : 'open'}">${escapeHtml(badge)}</span>
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
            ${link ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm">View posting</a>` : ''}
            <a href="mailto:${escapeHtml(email)}" class="btn btn-primary btn-sm">Apply / enquire</a>
          </div>
        </article>`;
  }).join('');
}

/* ── Tools & Events (mirrors section 12) ─────────────────────── */

const ICONS = { tool: 'package', workshop: 'users', summerschool: 'graduation-cap' };
const EMPTY_MSG = {
  tool: 'No tools listed yet.',
  workshop: 'No workshops listed yet.',
  summerschool: 'No summer schools yet.'
};

function normalizeCategory (raw) {
  const c = (raw || '').trim().toLowerCase();
  if (c === 'tool' || c === 'tools') return 'tool';
  if (c === 'workshop' || c === 'workshops') return 'workshop';
  if (c === 'summer school' || c === 'summer schools' || c === 'summerschool') return 'summerschool';
  return null;
}

function teCardHtml (item) {
  const isExternal = /^https?:\/\//i.test(item.link);
  const titleHtml = item.link
      ? `<a href="${escapeHtml(item.link)}"${isExternal ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(item.title)}</a>`
      : escapeHtml(item.title);

  return `
      <article class="te-card fade-in">
        <div class="te-card-icon"><i data-lucide="${ICONS[item.category]}" aria-hidden="true"></i></div>
        <h4 class="te-card-title">${titleHtml}</h4>
        ${item.date ? `<span class="te-card-date">${escapeHtml(item.date)}</span>` : ''}
        ${item.description ? `<p class="te-card-desc">${escapeHtml(item.description)}</p>` : ''}
      </article>`;
}

function renderTeGrid (items, category) {
  if (items.length === 0) return `<p class="te-empty">${escapeHtml(EMPTY_MSG[category])}</p>`;
  return items.map(teCardHtml).join('');
}

/* ── file I/O: replace content between SSR markers ───────────── */

async function replaceBetweenMarkers (relPath, markerId, innerHtml) {
  const filePath = join(ROOT, relPath);
  const html = await readFile(filePath, 'utf8');
  const startTag = `<!-- SSR:START:${markerId} -->`;
  const endTag = `<!-- SSR:END:${markerId} -->`;
  const start = html.indexOf(startTag);
  const end = html.indexOf(endTag);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`Markers for "${markerId}" not found (or out of order) in ${relPath}`);
  }
  const before = html.slice(0, start + startTag.length);
  const after = html.slice(end);
  const updated = `${before}\n${innerHtml}\n        ${after}`;
  await writeFile(filePath, updated, 'utf8');
  console.log(`Updated ${relPath} (#${markerId})`);
}

async function fetchText (url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

/* ── main ─────────────────────────────────────────────────────── */

async function main () {
  // Publications
  try {
    const csvText = await fetchText(csvUrl(PUBLICATIONS_SHEET_ID));
    const bibText = bibEntriesFromCsv(csvText);
    const pubs = parseBibtex(bibText).sort((a, b) => b.year - a.year);
    await replaceBetweenMarkers('publications.html', 'pub-list', renderPublications(pubs));
  } catch (err) {
    console.error('Publications build failed, leaving existing content as-is:', err.message);
  }

  // Openings
  try {
    const csvText = await fetchText(csvUrl(OPENINGS_SHEET_ID));
    const rows = csvToObjects(csvText);
    await replaceBetweenMarkers('openings.html', 'openings-list', renderOpenings(rows));
  } catch (err) {
    console.error('Openings build failed, leaving existing content as-is:', err.message);
  }

  // Tools & Events
  try {
    const csvText = await fetchText(csvUrl(TOOLS_EVENTS_SHEET_ID));
    const buckets = { tool: [], workshop: [], summerschool: [] };
    csvToObjects(csvText).forEach(row => {
      const category = normalizeCategory(row.category);
      const title = (row.title || '').trim();
      if (!category || !title) return;
      buckets[category].push({
        category, title,
        description: (row.description || '').trim(),
        link: (row.link || '').trim(),
        date: (row.date || '').trim()
      });
    });
    await replaceBetweenMarkers('tools-events.html', 'te-tools-grid', renderTeGrid(buckets.tool, 'tool'));
    await replaceBetweenMarkers('tools-events.html', 'te-workshops-grid', renderTeGrid(buckets.workshop, 'workshop'));
    await replaceBetweenMarkers('tools-events.html', 'te-summerschools-grid', renderTeGrid(buckets.summerschool, 'summerschool'));
  } catch (err) {
    console.error('Tools & Events build failed, leaving existing content as-is:', err.message);
  }

  console.log('Done.');
}

main();
