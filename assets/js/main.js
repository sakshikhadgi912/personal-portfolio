// Renders README.md as the portfolio page.
//   # Heading 1        -> your name (hero title + page title)
//   text before first ## -> hero intro (tagline, photo, links)
//   ## Heading 2       -> a section, with a link in the top nav

(function () {
  const hero = document.getElementById('hero');
  const content = document.getElementById('content');
  const nav = document.getElementById('nav');

  document.getElementById('year').textContent = new Date().getFullYear();
  setupThemeToggle();

  fetch('README.md', { cache: 'no-cache' })
    .then((res) => {
      if (!res.ok) throw new Error('Could not load README.md (' + res.status + ')');
      return res.text();
    })
    .then(render)
    .catch((err) => {
      hero.innerHTML = '<div class="empty"><h1>Couldn\'t load content</h1><p></p></div>';
      hero.querySelector('p').textContent = err.message +
        '. If you opened index.html directly, serve the folder instead (see SETUP.md).';
    });

  function render(markdown) {
    if (!markdown.trim()) {
      hero.innerHTML =
        '<div class="empty"><h1>Your portfolio is almost ready</h1>' +
        '<p>Add your content to <code>README.md</code> and this page will fill in automatically. ' +
        'Start with <code># Your Name</code>, a short intro, then <code>## Sections</code> like About, Projects and Contact.</p></div>';
      return;
    }

    const html = DOMPurify.sanitize(marked.parse(markdown));
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    const nodes = Array.from(tpl.content.childNodes);

    hero.innerHTML = '';
    content.innerHTML = '';

    let current = hero;
    const used = new Set();

    nodes.forEach((node) => {
      if (node.nodeName === 'H1' && current === hero) {
        const name = node.textContent.trim();
        document.title = name;
        document.getElementById('brand').textContent = name;
        document.getElementById('footer-name').textContent = name;
      }
      if (node.nodeName === 'H2') {
        const id = slugify(node.textContent, used);
        current = document.createElement('section');
        current.className = 'section';
        current.id = id;
        content.appendChild(current);

        const link = document.createElement('a');
        link.href = '#' + id;
        link.textContent = node.textContent;
        nav.appendChild(link);
      }
      current.appendChild(node);
    });

    // A paragraph that is only *italic text* right under a ### heading is a date line.
    content.querySelectorAll('h3 + p').forEach((p) => {
      if (p.childNodes.length === 1 && p.firstChild.nodeName === 'EM') p.classList.add('meta');
    });

    // Lists of short items (skills, tools) render as tags.
    content.querySelectorAll('ul').forEach((ul) => {
      const items = Array.from(ul.children);
      if (items.length > 1 && items.every((li) => li.textContent.length <= 48 && !li.querySelector('ul'))) {
        ul.classList.add('tags');
      }
    });

    // External links open in a new tab.
    document.querySelectorAll('main a[href^="http"]').forEach((a) => {
      a.target = '_blank';
      a.rel = 'noopener';
    });

    highlightActiveSection();
  }

  function slugify(text, used) {
    let base = text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
    let id = base;
    for (let i = 2; used.has(id); i++) id = base + '-' + i;
    used.add(id);
    return id;
  }

  function highlightActiveSection() {
    if (!('IntersectionObserver' in window)) return;
    const links = Array.from(nav.querySelectorAll('a'));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((l) => l.classList.toggle('active', l.getAttribute('href') === '#' + entry.target.id));
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    content.querySelectorAll('.section').forEach((s) => observer.observe(s));
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
    });
  }
})();
