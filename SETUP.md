# Setup & deployment

This is a static site — no build step, no dependencies, no environment variables.
The page (`index.html`) loads `README.md` and renders it, so **all your content lives in `README.md`**.

## How README.md maps to the page

| Markdown                         | Becomes                                   |
| -------------------------------- | ----------------------------------------- |
| `# Your Name`                    | Hero title, browser tab title, nav brand  |
| Text/images before the first `##`| Hero intro (tagline, photo, links)        |
| `## Section` (About, Projects…)  | A page section + a link in the top nav    |
| `### Item`                       | A sub-heading inside a section            |

Put images in `assets/images/` and reference them like `![Me](assets/images/me.jpg)`.

## Preview locally

The page fetches `README.md`, so it must be served (opening `index.html` directly won't work):

```bash
ruby -run -e httpd . -p 8000
```

Then open http://localhost:8000. (`python3 -m http.server 8000` works too once Xcode command line tools are installed.)

## Publish on GitHub Pages

1. Create an empty **public** repo on GitHub (e.g. `personal-portfolio`, or `<username>.github.io` for a root URL).
2. Push this folder:
   ```bash
   git remote add origin https://github.com/<username>/<repo>.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, Branch: `main`, folder: `/ (root)`.
4. After a minute the site is live at `https://<username>.github.io/<repo>/`.

Every push to `main` redeploys automatically.

## Files

- `index.html` — page shell
- `assets/css/style.css` — styles (light/dark theme)
- `assets/js/main.js` — renders README.md into the page
- `404.html` — not-found page
- `.nojekyll` — tells GitHub Pages to serve files as-is (no Jekyll processing)
- `.gitignore` — keeps `.env` files and OS junk out of git. This site is public; never put secrets in it.
