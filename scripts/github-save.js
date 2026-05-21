/**
 * Save uploads to the GitHub repo via Contents API (optional PAT in session).
 * After push + Pages deploy, files load from assets/uploads/ for all visitors.
 */
(function (global) {
  var CONFIG_KEY = "reading-comp-github-config";
  var MANIFEST_PATH = "assets/uploads/manifest.json";
  var UPLOAD_PREFIX = "assets/uploads/";
  var MAX_BYTES = 45 * 1024 * 1024;

  function getConfig() {
    try {
      var raw = sessionStorage.getItem(CONFIG_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setConfig(cfg) {
    sessionStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  }

  function clearConfig() {
    sessionStorage.removeItem(CONFIG_KEY);
  }

  function isConfigured() {
    var c = getConfig();
    return !!(c && c.token && c.owner && c.repo && c.branch);
  }

  function apiUrl(path, cfg) {
    return (
      "https://api.github.com/repos/" +
      encodeURIComponent(cfg.owner) +
      "/" +
      encodeURIComponent(cfg.repo) +
      "/contents/" +
      path.replace(/^\//, "")
    );
  }

  function headers(cfg) {
    return {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + cfg.token,
      "X-GitHub-Api-Version": "2022-11-28",
    };
  }

  function extFromMime(mime, fallback) {
    if (!mime) return fallback || "bin";
    if (mime.indexOf("jpeg") !== -1 || mime === "image/jpg") return "jpg";
    if (mime.indexOf("png") !== -1) return "png";
    if (mime.indexOf("gif") !== -1) return "gif";
    if (mime.indexOf("webp") !== -1) return "webp";
    if (mime.indexOf("mpeg") !== -1 || mime === "audio/mp3") return "mp3";
    if (mime.indexOf("wav") !== -1) return "wav";
    if (mime.indexOf("ogg") !== -1) return "ogg";
    if (mime.indexOf("webm") !== -1 && mime.indexOf("audio") !== -1) return "webm";
    if (mime.indexOf("mp4") !== -1) return "mp4";
    if (mime.indexOf("text") !== -1) return "txt";
    var part = mime.split("/")[1];
    return part ? part.replace(/[^a-z0-9]/gi, "") : fallback || "bin";
  }

  function uploadPathForId(id, mime, name) {
    if (id === "listening-text") return UPLOAD_PREFIX + "listening-text.txt";
    var ext = "";
    if (name && name.indexOf(".") !== -1) {
      ext = name.split(".").pop().toLowerCase();
    }
    if (!ext) ext = extFromMime(mime, "bin");
    return UPLOAD_PREFIX + id + "." + ext;
  }

  function arrayBufferToBase64(buffer) {
    var bytes = new Uint8Array(buffer);
    var chunk = 0x8000;
    var binary = "";
    for (var i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var dataUrl = reader.result;
        var base64 = String(dataUrl).split(",")[1] || "";
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function getFileMeta(path, cfg) {
    var url = apiUrl(path, cfg) + "?ref=" + encodeURIComponent(cfg.branch);
    return fetch(url, { headers: headers(cfg) }).then(function (res) {
      if (res.status === 404) return null;
      if (!res.ok) return res.json().then(function (j) { throw new Error(j.message || res.statusText); });
      return res.json();
    });
  }

  function putContent(path, contentBase64, message, cfg, sha) {
    var body = {
      message: message,
      content: contentBase64,
      branch: cfg.branch,
    };
    if (sha) body.sha = sha;
    return fetch(apiUrl(path, cfg), {
      method: "PUT",
      headers: Object.assign({ "Content-Type": "application/json" }, headers(cfg)),
      body: JSON.stringify(body),
    }).then(function (res) {
      if (!res.ok) {
        return res.json().then(function (j) {
          throw new Error(j.message || res.statusText);
        });
      }
      return res.json();
    });
  }

  function fetchManifestFromRepo(cfg) {
    return getFileMeta(MANIFEST_PATH, cfg).then(function (meta) {
      if (!meta || !meta.content) return { version: 1, files: {} };
      var json = atob(meta.content.replace(/\n/g, ""));
      return JSON.parse(json);
    });
  }

  function putManifest(manifest, cfg) {
    var content = btoa(unescape(encodeURIComponent(JSON.stringify(manifest, null, 2))));
    return getFileMeta(MANIFEST_PATH, cfg).then(function (meta) {
      return putContent(
        MANIFEST_PATH,
        content,
        "Update uploads manifest",
        cfg,
        meta && meta.sha
      );
    });
  }

  function saveUpload(id, data) {
    var cfg = getConfig();
    if (!cfg) return Promise.reject(new Error("GitHub not connected"));

    var path;
    var base64;
    var message = "Upload: " + id;

    if (typeof data === "string") {
      path = uploadPathForId(id, "text/plain", "text.txt");
      base64 = btoa(unescape(encodeURIComponent(data)));
      return getFileMeta(path, cfg)
        .then(function (meta) {
          return putContent(path, base64, message, cfg, meta && meta.sha);
        })
        .then(function () {
          return updateManifestEntry(id, path, "text", "text/plain", cfg);
        });
    }

    var blob = data instanceof Blob ? data : null;
    if (!blob) return Promise.reject(new Error("Invalid upload data"));

    if (blob.size > MAX_BYTES) {
      return Promise.reject(
        new Error("File is too large for GitHub API (max ~45 MB). Use a smaller file.")
      );
    }

    path = uploadPathForId(id, blob.type, blob.name || id);
    return blobToBase64(blob).then(function (b64) {
      return getFileMeta(path, cfg).then(function (meta) {
        return putContent(path, b64, message, cfg, meta && meta.sha);
      });
    }).then(function () {
      return updateManifestEntry(id, path, "blob", blob.type, cfg);
    });
  }

  function updateManifestEntry(id, path, kind, mimeType, cfg) {
    return fetchManifestFromRepo(cfg).then(function (manifest) {
      if (!manifest.files) manifest.files = {};
      manifest.files[id] = {
        path: path,
        kind: kind,
        mimeType: mimeType || "",
        updatedAt: new Date().toISOString(),
      };
      return putManifest(manifest, cfg);
    });
  }

  function removeUpload(id) {
    var cfg = getConfig();
    if (!cfg) return Promise.resolve();
    return fetchManifestFromRepo(cfg).then(function (manifest) {
      var entry = manifest.files && manifest.files[id];
      if (!entry) return;
      delete manifest.files[id];
      return getFileMeta(entry.path, cfg).then(function (meta) {
        if (!meta || !meta.sha) return putManifest(manifest, cfg);
        return fetch(apiUrl(entry.path, cfg), {
          method: "DELETE",
          headers: Object.assign({ "Content-Type": "application/json" }, headers(cfg)),
          body: JSON.stringify({
            message: "Remove upload: " + id,
            sha: meta.sha,
            branch: cfg.branch,
          }),
        }).then(function () {
          return putManifest(manifest, cfg);
        });
      });
    });
  }

  function decodeGitHubContent(b64) {
    var bin = atob(b64.replace(/\n/g, ""));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  }

  function encodeGitHubContent(text) {
    return btoa(unescape(encodeURIComponent(text)));
  }

  function getHtmlFromRepo(path, cfg) {
    return getFileMeta(path, cfg).then(function (meta) {
      if (!meta || !meta.content) return { html: null, sha: null };
      return { html: decodeGitHubContent(meta.content), sha: meta.sha };
    });
  }

  function putHtmlFile(path, htmlString, message, cfg, sha) {
    return putContent(path, encodeGitHubContent(htmlString), message, cfg, sha);
  }

  /** Write audio src + text into services.html in the repository. */
  function updateServicesHtml(patch, cfg) {
    var patcher = global.ReadingHtmlPatch;
    if (!patcher) return Promise.reject(new Error("HTML patch module missing"));
    cfg = cfg || getConfig();
    if (!cfg) return Promise.reject(new Error("GitHub not connected"));

    return getHtmlFromRepo("services.html", cfg).then(function (file) {
      if (!file.html) throw new Error("services.html not found in repository");
      var current = {
        audioSrc: patcher.readAudioSrcFromHtml(file.html),
        text: patcher.readTextFromHtml(file.html),
      };
      var merged = {
        audioSrc: patch.audioSrc !== undefined ? patch.audioSrc : current.audioSrc,
        text: patch.text !== undefined ? patch.text : current.text,
      };
      var updated = patcher.patchServicesHtml(file.html, merged);
      return putHtmlFile("services.html", updated, "Update listening activity in services.html", cfg, file.sha);
    });
  }

  function saveUploadAndHtml(id, data) {
    return saveUpload(id, data).then(function () {
      var cfg = getConfig();
      if (!cfg) return;
      if (id === "listening-audio" && data instanceof Blob) {
        var path = uploadPathForId(id, data.type, data.name || id);
        return updateServicesHtml({ audioSrc: path }, cfg);
      }
      if (id === "listening-text" && typeof data === "string") {
        return updateServicesHtml({ text: data }, cfg);
      }
    });
  }

  /** Load manifest published on the live site (after deploy). */
  function fetchPublishedManifest() {
    var url = MANIFEST_PATH + "?t=" + Date.now();
    return fetch(url).then(function (res) {
      if (!res.ok) return { version: 1, files: {} };
      return res.json();
    });
  }

  global.ReadingGitHubSave = {
    getConfig: getConfig,
    setConfig: setConfig,
    clearConfig: clearConfig,
    isConfigured: isConfigured,
    saveUpload: saveUpload,
    saveUploadAndHtml: saveUploadAndHtml,
    updateServicesHtml: updateServicesHtml,
    removeUpload: removeUpload,
    fetchPublishedManifest: fetchPublishedManifest,
    MANIFEST_PATH: MANIFEST_PATH,
  };
})(typeof window !== "undefined" ? window : globalThis);
