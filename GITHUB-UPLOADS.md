# Saving uploads to GitHub

GitHub Pages cannot receive files by itself. This site can **write uploads into your GitHub repository** using the GitHub API.

## Setup (once per browser)

1. On GitHub: **Settings → Developer settings → Personal access tokens → Tokens (classic)**.
2. Create a token with the **`repo`** scope.
3. On the site, click **GitHub save** (bottom-left).
4. Enter your username (`ofirx`), repo (`Reading-comprehension`), branch (`main`), and the token.
5. Click **Save connection**.

The token is stored only in **session storage** for this tab (not in the public site code).

## When you upload a file

- It is saved in this browser (IndexedDB) immediately.
- If GitHub is connected, it is also committed to `assets/uploads/` in the repo.
- Run **Deploy to GitHub** (`deploy-to-github.ps1`) or push manually so GitHub Pages rebuilds.
- After 1–2 minutes, everyone opening the live site sees the files from `assets/uploads/`.

## Limits

- Very large videos may fail (GitHub API size limits). Prefer shorter clips or host large video elsewhere.
- Never share your token or commit it to the repository.
