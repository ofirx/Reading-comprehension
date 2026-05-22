# Saving uploads to GitHub

GitHub Pages cannot receive files by itself. This site can **write uploads into your GitHub repository** using the GitHub API.

## Setup (once per browser)

1. On GitHub: **Settings → Developer settings → Personal access tokens → Tokens (classic)**.
2. Create a token with the **`repo`** scope.
3. On the site, click **GitHub save** (bottom-left).
4. Enter your username (`ofirx`), repo (`Reading-comprehension`), branch (`main`), and the token.
5. Click **Save connection**.

The token is stored only in **session storage** for this tab (not in the public site code).

## When you upload on Pre reading (gallery pictures)

1. Connect **GitHub save** (bottom-left) with a `repo` token.
2. On [about.html](https://ofirx.github.io/Reading-comprehension/about.html), upload each picture.
3. Each file is saved under `assets/uploads/gallery-0.jpg` (etc.) and **`about.html`** is updated with the image path.
4. The live site updates in about 1–2 minutes (no extra deploy needed if the API push succeeds).

**Or use the script:** copy images into `assets/uploads-staging/` as `gallery-0.jpg` … `gallery-5.jpg`, then run `Auto save to GitHub.bat`.

## When you upload on While reading (text or audio)

- It is saved in this browser immediately (works after refresh on the same computer).
- If **GitHub save** is connected, it also:
  - Saves the file under `assets/uploads/`
  - Updates **`services.html`** with the audio `src` and the text inside the page
- Run **Deploy to GitHub** (`deploy-to-github.ps1`) so the live site updates for everyone.

## Automatic script (easiest — Option A)

1. Copy your files into `assets/uploads-staging/`:
   - `listening-text.txt`
   - `listening-audio.mp3` (or `.wav`, `.ogg`, `.webm`)
2. Double-click **`Auto save to GitHub.bat`** (or run `.\auto-save-to-github.ps1`).
3. Press Enter when asked — the script updates `services.html`, commits, and pushes.

Or with explicit paths:

```powershell
.\auto-save-to-github.ps1 -AudioPath "C:\path\audio.mp3" -TextPath "C:\path\story.txt"
```

Without a token: use **Download services.html** on the site, or the script above (uses git, not the browser).

## Limits

- Very large videos may fail (GitHub API size limits). Prefer shorter clips or host large video elsewhere.
- Never share your token or commit it to the repository.
