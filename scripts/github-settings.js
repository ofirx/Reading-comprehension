/**
 * UI to connect a GitHub token so uploads are saved to the repository.
 */
(function () {
  var gh = window.ReadingGitHubSave;
  if (!gh) return;

  var style = document.createElement("style");
  style.textContent =
    ".github-save-fab{position:fixed;bottom:18px;left:18px;z-index:9000;box-shadow:0 8px 24px rgba(0,0,0,.18)}" +
    ".github-save-dialog{max-width:420px;border:none;border-radius:14px;padding:0}" +
    ".github-save-dialog-inner{padding:20px 22px}" +
    ".github-save-dialog h2{margin:0 0 8px;font-size:1.15rem}" +
    ".github-save-dialog label{display:block;margin:12px 0 4px;font-size:13px;font-weight:650}" +
    ".github-save-dialog input{width:100%;padding:9px 11px;border:1px solid var(--border,#ccc);border-radius:8px;font-size:14px}" +
    ".github-save-dialog-help{font-size:13px;color:var(--muted,#555);line-height:1.5;margin:0 0 12px}" +
    ".github-save-dialog-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}" +
    ".github-save-status{position:fixed;bottom:70px;left:18px;z-index:9001;max-width:280px;padding:10px 14px;border-radius:10px;font-size:13px;background:#1e1b24;color:#fff;box-shadow:0 6px 20px rgba(0,0,0,.2)}" +
    ".github-save-status.is-ok{background:#2e7d32}.github-save-status.is-err{background:#c62828}";
  document.head.appendChild(style);

  var dlg = document.createElement("dialog");
  dlg.className = "github-save-dialog";
  dlg.id = "githubSaveDialog";
  dlg.innerHTML =
    '<div class="github-save-dialog-inner">' +
    "<h2>Save uploads to GitHub</h2>" +
    '<p class="github-save-dialog-help">Connect once with a <strong>Personal Access Token</strong> (classic, <code>repo</code> scope). Uploads are written to <code>assets/uploads/</code> in your repository. Run <strong>Deploy to GitHub</strong> so everyone sees them on the live site. The token stays in this browser tab only.</p>" +
    "<label for=\"ghOwner\">GitHub username</label>" +
    '<input id="ghOwner" type="text" autocomplete="username" placeholder="ofirx" />' +
    "<label for=\"ghRepo\">Repository name</label>" +
    '<input id="ghRepo" type="text" autocomplete="off" placeholder="Reading-comprehension" />' +
    "<label for=\"ghBranch\">Branch</label>" +
    '<input id="ghBranch" type="text" autocomplete="off" placeholder="main" />' +
    "<label for=\"ghToken\">Personal access token</label>" +
    '<input id="ghToken" type="password" autocomplete="off" placeholder="ghp_..." />' +
    '<div class="github-save-dialog-actions">' +
    '<button type="button" class="btn btn-primary" id="ghSaveConfig">Save connection</button>' +
    '<button type="button" class="btn" id="ghDisconnect">Disconnect</button>' +
    '<button type="button" class="btn" id="ghCloseDialog">Close</button>' +
    "</div></div>";
  document.body.appendChild(dlg);

  var fab = document.createElement("button");
  fab.type = "button";
  fab.className = "btn github-save-fab";
  fab.id = "githubSaveFab";
  fab.textContent = "GitHub save";
  fab.setAttribute("aria-haspopup", "dialog");
  fab.setAttribute("aria-controls", "githubSaveDialog");
  document.body.appendChild(fab);

  var owner = dlg.querySelector("#ghOwner");
  var repo = dlg.querySelector("#ghRepo");
  var branch = dlg.querySelector("#ghBranch");
  var token = dlg.querySelector("#ghToken");

  function fillForm() {
    var c = gh.getConfig() || {};
    owner.value = c.owner || "ofirx";
    repo.value = c.repo || "Reading-comprehension";
    branch.value = c.branch || "main";
    token.value = c.token || "";
  }

  fab.addEventListener("click", function () {
    fillForm();
    if (typeof dlg.showModal === "function") dlg.showModal();
    else dlg.setAttribute("open", "");
  });

  dlg.querySelector("#ghCloseDialog").addEventListener("click", function () {
    if (typeof dlg.close === "function") dlg.close();
    else dlg.removeAttribute("open");
  });

  dlg.querySelector("#ghSaveConfig").addEventListener("click", function () {
    var t = (token.value || "").trim();
    if (!t) {
      window.showGitHubSaveStatus("Enter a personal access token.", true);
      return;
    }
    gh.setConfig({
      owner: (owner.value || "ofirx").trim(),
      repo: (repo.value || "Reading-comprehension").trim(),
      branch: (branch.value || "main").trim(),
      token: t,
    });
    window.showGitHubSaveStatus("Connected. New uploads will save to GitHub.", false);
    if (typeof dlg.close === "function") dlg.close();
  });

  dlg.querySelector("#ghDisconnect").addEventListener("click", function () {
    gh.clearConfig();
    token.value = "";
    window.showGitHubSaveStatus("Disconnected. Uploads stay in this browser only.", false);
  });

  function updateFabLabel() {
    fab.textContent = gh.isConfigured() ? "GitHub save ✓" : "GitHub save";
    fab.classList.toggle("btn-primary", gh.isConfigured());
  }
  updateFabLabel();
  setInterval(updateFabLabel, 2000);
})();
