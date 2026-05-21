# Saving uploads to GitHub

GitHub Pages cannot receive files by itself. This site can **write uploads into your GitHub repository** using the GitHub API.

## Setup (once per browser)

1. On GitHub: **Settings → Developer settings → Personal access tokens → Tokens (classic)**.
2. Create a token with the **`repo`** scope.
3. On the site, click **GitHub save** (bottom-left).
4. Enter your username (`ofirx`), repo (`Reading-comprehension`), branch (`main`), and the token.
5. Click **Save connection**.

The token is stored only in **session storage** for this tab (not in the public site code).

## When you upload on While reading (text or audio)

- It is saved in this browser immediately (works after refresh on the same computer).
- If **GitHub save** is connected, it also:
  - Saves the file under `assets/uploads/`
  - Updates **`services.html`** with the audio `src` and the text inside the page
- Run **Deploy to GitHub** (`deploy-to-github.ps1`) so the live site updates for everyone.

Without a token: use **Download services.html**, copy your audio into `assets/uploads/`, replace `services.html` in the project, then deploy.

## Limits

- Very large videos may fail (GitHub API size limits). Prefer shorter clips or host large video elsewhere.
- Never share your token or commit it to the repository.
