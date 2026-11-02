// Renders README.md as the portfolio page.
//   # Heading 1          -> your name (hero title + page title)
//   text before first ## -> hero intro (tagline, summary, links)
//   ## Heading 2         -> a section, with a link in the top nav
//   ### Heading 3        -> a card inside that section ("Role — Company" splits in two)
//   *italic line*        -> under a ### heading, shown as a date badge
//   list of short items  -> shown as tags (and fed into the scrolling marquee)

const hero = document.getElementById('hero');
const heroInner = document.getElementById('hero-inner');
const content = document.getElementById('content');
const nav = document.getElementById('nav');
const header = document.getElementById('header');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

document.getElementById('year').textContent = new Date().getFullYear();
setupThemeToggle();
setupHeader();

// Carry main.js's ?v= cache-busting stamp over to scene.js.
import('./scene.js' + new URL(import.meta.url).search)
  .then((m) => m.initScene(document.getElementById('scene'), { reduceMotion }))
  .catch((err) => console.warn('3D scene unavailable, using gradient fallback.', err));

fetch('README.md', { cache: 'no-cache' })
  .then((res) => {
    if (!res.ok) throw new Error('Could not load README.md (' + res.status + ')');
    return res.text();
  })
  .then(render)
  .catch((err) => {
    heroInner.innerHTML = '<div class="empty"><h1>Couldn\'t load content</h1><p></p></div>';
    heroInner.querySelector('p').textContent = err.message +
      '. If you opened index.html directly, serve the folder instead (see SETUP.md).';
  });

function render(markdown) {
  if (!markdown.trim()) {
    heroInner.innerHTML =
      '<div class="empty"><h1>Your portfolio is almost ready</h1>' +
      '<p>Add your content to <code>README.md</code> and this page will fill in automatically. ' +
      'Start with <code># Your Name</code>, a short intro, then <code>## Sections</code> like About, Projects and Contact.</p></div>';
    return;
  }

  const tpl = document.createElement('template');
  tpl.innerHTML = DOMPurify.sanitize(marked.parse(markdown));

  heroInner.innerHTML = '';
  content.innerHTML = '';

  let current = heroInner;
  const used = new Set();

  Array.from(tpl.content.childNodes).forEach((node) => {
    if (node.nodeName === 'H1' && current === heroInner) {
      const name = node.textContent.trim();
      document.title = name;
      document.getElementById('brand').textContent = name;
      document.getElementById('footer-name').textContent = name;
    }
    if (node.nodeName === 'H2') {
      const label = node.textContent.trim();
      current = document.createElement('section');
      current.className = 'section';
      current.id = slugify(label, used);
      content.appendChild(current);

      const link = document.createElement('a');
      link.href = '#' + current.id;
      link.textContent = label;
      nav.appendChild(link);
    }
    current.appendChild(node);
  });

  decorateHero();
  markDatesAndTags();
  buildSections();
  buildMarquee();

  // External links and PDFs open in a new tab.
  document.querySelectorAll('main a[href^="http"], main a[href$=".pdf"]').forEach((a) => {
    a.target = '_blank';
    a.rel = 'noopener';
  });
  setupLightbox();

  highlightActiveSection();
  animate();
}

function decorateHero() {
  const h1 = heroInner.querySelector('h1');
  if (h1) splitChars(h1);

  const paragraphs = heroInner.querySelectorAll('p');
  if (paragraphs[0] && !isLinkRow(paragraphs[0])) paragraphs[0].classList.add('kicker');
  markLinkRows(heroInner);
}

// Wrap each character so the name can slide in letter by letter.
function splitChars(el) {
  const text = el.textContent.trim();
  el.setAttribute('aria-label', text);
  el.textContent = '';
  text.split(' ').forEach((word, i) => {
    if (i) el.appendChild(document.createTextNode(' '));
    const w = document.createElement('span');
    w.className = 'word';
    w.setAttribute('aria-hidden', 'true');
    for (const ch of word) {
      const c = document.createElement('span');
      c.className = 'char';
      c.textContent = ch;
      w.appendChild(c);
    }
    el.appendChild(w);
  });
}

// A paragraph made only of links (separated by · or |) becomes a row of pill buttons.
function isLinkRow(p) {
  const links = p.querySelectorAll('a');
  if (!links.length || Array.from(p.children).some((c) => c.nodeName !== 'A')) return false;
  let rest = p.textContent;
  links.forEach((a) => { rest = rest.replace(a.textContent, ''); });
  return /^[\s·|•,\-–—]*$/.test(rest);
}

function markLinkRows(scope) {
  scope.querySelectorAll('p').forEach((p) => {
    if (!isLinkRow(p)) return;
    const links = Array.from(p.querySelectorAll('a'));
    p.textContent = '';
    p.className = 'link-row';
    links.forEach((a, i) => {
      a.className = i === 0 ? 'btn btn-solid' : 'btn';
      p.appendChild(a);
    });
  });
}

function markDatesAndTags() {
  content.querySelectorAll('h3 + p').forEach((p) => {
    if (p.childNodes.length === 1 && p.firstChild.nodeName === 'EM') p.classList.add('meta');
  });
  content.querySelectorAll('ul').forEach((ul) => {
    const items = Array.from(ul.children);
    if (items.length > 1 && items.every((li) => li.textContent.length <= 48 && !li.querySelector('ul'))) {
      ul.classList.add('tags');
    }
  });
}

// Number each section and group "### heading + what follows" into cards.
function buildSections() {
  const sections = Array.from(content.querySelectorAll('.section'));
  sections.forEach((section, i) => {
    const h2 = section.querySelector('h2');
    const num = document.createElement('span');
    num.className = 'section-num';
    num.textContent = String(i + 1).padStart(2, '0');
    h2.prepend(num);

    const body = document.createElement('div');
    body.className = 'section-body';
    let cards = null;
    let card = null;
    Array.from(section.childNodes).forEach((node) => {
      if (node === h2) return;
      if (node.nodeName === 'H3') {
        if (!cards) {
          cards = document.createElement('div');
          cards.className = 'cards';
          body.appendChild(cards);
        }
        card = document.createElement('article');
        card.className = 'card';
        cards.appendChild(card);
        splitRole(node);
      }
      (card || body).appendChild(node);
    });
    section.appendChild(body);
    markLinkRows(body);
    if (cards) {
      Array.from(cards.children).forEach(addCardMedia);
      addFilters(cards);
    }

    // Cards that are just a heading plus tags read better as full-width rows.
    if (cards && Array.from(cards.children).every((c) =>
      Array.from(c.children).every((el) => el.nodeName === 'H3' || el.matches('ul.tags')))) {
      cards.classList.add('cards-rows');
    }

    if (i === sections.length - 1 && sections.length > 1) section.classList.add('finale');
  });
}

// An image on its own line inside a card becomes the card's cover; clicking it
// opens the card's first link.
function addCardMedia(card) {
  const p = Array.from(card.querySelectorAll('p')).find((el) =>
    el.children.length === 1 && el.firstElementChild.nodeName === 'IMG' && !el.textContent.trim());
  if (!p) return;
  const img = p.firstElementChild;
  img.loading = 'lazy';
  img.decoding = 'async';
  const media = document.createElement('div');
  media.className = 'card-media';
  media.appendChild(img);
  p.remove();
  card.prepend(media);
  card.classList.add('has-media');

  const first = card.querySelector('.link-row a, p a');
  if (first) {
    media.addEventListener('click', () => first.click());
    if (isVideo(first.href)) media.classList.add('is-video');
  }
}

// Long card lists get filter chips built from the first part of each card's
// *Category · Detail* line.
function addFilters(cards) {
  const items = Array.from(cards.children);
  const category = (card) => (card.querySelector('.meta')?.textContent.split('·')[0] || '').trim();
  const names = [...new Set(items.map(category).filter(Boolean))];
  if (items.length < 8 || names.length < 2) return;

  items.forEach((card) => { card.dataset.category = category(card); });
  const bar = document.createElement('div');
  bar.className = 'filters';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Filter projects');
  ['All', ...names].forEach((name, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filter' + (i === 0 ? ' active' : '');
    btn.textContent = name;
    btn.setAttribute('aria-pressed', String(i === 0));
    btn.addEventListener('click', () => {
      bar.querySelectorAll('.filter').forEach((b) => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });
      const shown = items.filter((c) => name === 'All' || c.dataset.category === name);
      items.forEach((c) => { c.hidden = !shown.includes(c); });
      if (window.gsap && !reduceMotion) {
        gsap.fromTo(shown, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', stagger: 0.04, overwrite: true, clearProps: 'transform' });
        ScrollTrigger.refresh();
      }
    });
    bar.appendChild(btn);
  });
  cards.before(bar);
}

function isVideo(href) { return /\.(mp4|m4v|mov|webm)$/i.test(new URL(href, location.href).pathname); }
function isImage(href) { return /\.(jpe?g|png|webp|gif)$/i.test(new URL(href, location.href).pathname); }

// Videos and full-length editorial images open in an on-page viewer;
// PDFs open in a new tab with the browser's own viewer.
function setupLightbox() {
  const box = document.createElement('div');
  box.className = 'lightbox';
  box.hidden = true;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.innerHTML = '<button class="lightbox-close" type="button" aria-label="Close">✕</button><div class="lightbox-stage"></div>';
  document.body.appendChild(box);
  const stage = box.querySelector('.lightbox-stage');
  let lastFocus = null;

  const close = () => {
    box.hidden = true;
    stage.innerHTML = '';
    document.documentElement.classList.remove('lightbox-open');
    if (lastFocus) lastFocus.focus();
  };
  const open = (href, label) => {
    lastFocus = document.activeElement;
    stage.innerHTML = '';
    if (isVideo(href)) {
      const video = document.createElement('video');
      video.src = href;
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      stage.appendChild(video);
    } else {
      const scroller = document.createElement('div');
      scroller.className = 'lightbox-scroll';
      const img = document.createElement('img');
      img.src = href;
      img.alt = label;
      scroller.appendChild(img);
      stage.appendChild(scroller);
    }
    box.setAttribute('aria-label', label);
    box.hidden = false;
    document.documentElement.classList.add('lightbox-open');
    box.querySelector('.lightbox-close').focus();
  };

  box.addEventListener('click', (e) => { if (e.target === box || e.target.closest('.lightbox-close')) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !box.hidden) close(); });
  content.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || !(isVideo(a.href) || isImage(a.href))) return;
    e.preventDefault();
    const title = a.closest('.card')?.querySelector('h3')?.textContent || a.textContent;
    open(a.href, title);
  });
}

function splitRole(h3) {
  const parts = h3.textContent.split(/\s+[—–]\s+/);
  if (parts.length < 2) return;
  h3.textContent = parts[0];
  const company = document.createElement('span');
  company.className = 'company';
  company.textContent = parts.slice(1).join(' — ');
  h3.appendChild(company);
}

function buildMarquee() {
  const words = Array.from(content.querySelectorAll('ul.tags li')).map((li) => li.textContent.trim());
  if (!words.length) return;
  const marquee = document.createElement('div');
  marquee.className = 'marquee';
  marquee.setAttribute('aria-hidden', 'true');
  const track = document.createElement('div');
  track.className = 'marquee-track';
  for (let copy = 0; copy < 2; copy++) {
    words.forEach((word) => {
      const span = document.createElement('span');
      span.textContent = word;
      track.appendChild(span);
    });
  }
  marquee.appendChild(track);
  hero.after(marquee);
}

function animate() {
  if (reduceMotion || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  gsap.from('.hero h1 .char', { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.035, delay: 0.15 });
  gsap.from('.hero-inner > :not(h1)', { y: 30, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12, delay: 0.6 });

  // Hero content drifts up and fades as you scroll past it.
  gsap.to('.hero-inner', {
    yPercent: -18, opacity: 0.2, ease: 'none',
    scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
  });

  // Marquee picks up speed in the direction you scroll.
  const track = document.querySelector('.marquee-track');
  if (track) {
    const loop = gsap.to(track, { xPercent: -50, duration: 40, ease: 'none', repeat: -1 });
    ScrollTrigger.create({
      onUpdate: (self) => {
        const boost = gsap.utils.clamp(-6, 6, self.getVelocity() / 300);
        gsap.to(loop, { timeScale: boost || 1, duration: 0.2, overwrite: true });
        gsap.to(loop, { timeScale: self.direction < 0 ? -1 : 1, duration: 1, delay: 0.25 });
      },
    });
  }

  gsap.utils.toArray('.section h2').forEach((h2) => {
    gsap.from(h2, {
      y: 80, opacity: 0, duration: 1, ease: 'expo.out',
      scrollTrigger: { trigger: h2, start: 'top 88%' },
    });
  });

  gsap.set('.card', { opacity: 0 });
  ScrollTrigger.batch('.card', {
    start: 'top 90%',
    onEnter: (batch) => gsap.fromTo(batch,
      { y: 70, opacity: 0, rotate: 1.5 },
      { y: 0, opacity: 1, rotate: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1, overwrite: true, clearProps: 'transform' }),
  });

  gsap.utils.toArray('ul.tags').forEach((ul) => {
    gsap.fromTo(ul.children, { scale: 0.5, opacity: 0 }, {
      scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(2)', stagger: 0.04, clearProps: 'transform',
      scrollTrigger: { trigger: ul, start: 'top 92%' },
    });
  });

  const finale = document.querySelector('.finale');
  if (finale) {
    gsap.fromTo(finale, { scale: 0.9, borderRadius: '80px' }, {
      scale: 1, borderRadius: '40px', ease: 'none',
      scrollTrigger: { trigger: finale, start: 'top bottom', end: 'top 40%', scrub: true },
    });
  }
}

function slugify(text, used) {
  const base = text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
  let id = base;
  for (let i = 2; used.has(id); i++) id = base + '-' + i;
  used.add(id);
  return id;
}

// The active section is the last one whose top has passed 40% of the viewport
// (or the last section once you hit the bottom of the page).
function highlightActiveSection() {
  const links = Array.from(nav.querySelectorAll('a'));
  const sections = Array.from(content.querySelectorAll('.section'));
  const update = () => {
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    let active = null;
    sections.forEach((s) => {
      if (s.getBoundingClientRect().top <= window.innerHeight * 0.4) active = s;
    });
    if (atBottom) active = sections[sections.length - 1];
    links.forEach((l) => l.classList.toggle('active', !!active && l.getAttribute('href') === '#' + active.id));
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

// Header is see-through over the hero and turns solid once you scroll past it.
function setupHeader() {
  const update = () => header.classList.toggle('solid', window.scrollY > hero.offsetHeight - 80);
  window.addEventListener('scroll', update, { passive: true });
  update();
}

function setupThemeToggle() {
  const root = document.documentElement;
  try {
    const saved = localStorage.getItem('theme');
    if (saved) root.dataset.theme = saved;
  } catch (e) {}

  document.getElementById('theme-toggle').addEventListener('click', () => {
    const current = root.dataset.theme ||
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = current === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
    window.dispatchEvent(new Event('themechange'));
  });
}
