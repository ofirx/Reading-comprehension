(() => {
  const body = document.body;
  const page = (body && body.dataset && body.dataset.page) || "";
  const uploadStore = window.ReadingUploadStore;
  const ghSave = window.ReadingGitHubSave;
  let publishedFilesCache = null;

  window.showGitHubSaveStatus = function (msg, isError) {
    var el = document.getElementById("githubSaveStatus");
    if (!el) {
      el = document.createElement("div");
      el.id = "githubSaveStatus";
      el.className = "github-save-status";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.toggle("is-err", !!isError);
    el.classList.toggle("is-ok", !isError);
    el.hidden = false;
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(function () {
      el.hidden = true;
    }, 6000);
  };

  function saveToGitHub(id, data) {
    if (!ghSave || !ghSave.isConfigured()) return;
    ghSave
      .saveUpload(id, data)
      .then(function () {
        publishedFilesCache = null;
        window.showGitHubSaveStatus(
          "Saved to GitHub. Run Deploy to GitHub so the live site updates.",
          false
        );
      })
      .catch(function (err) {
        window.showGitHubSaveStatus(err.message || "GitHub save failed", true);
      });
  }

  function saveBlob(id, file) {
    if (!uploadStore || !file) return Promise.resolve();
    return uploadStore.setBlob(id, file).then(function () {
      saveToGitHub(id, file);
    }).catch(function () {});
  }

  function saveText(id, text) {
    if (!uploadStore) return;
    uploadStore.setText(id, text).catch(() => {});
    saveToGitHub(id, text);
  }

  function removeUpload(id) {
    if (!uploadStore) return;
    uploadStore.remove(id).catch(() => {});
    if (ghSave && ghSave.isConfigured()) {
      ghSave.removeUpload(id).catch(function () {});
      publishedFilesCache = null;
    }
    try {
      localStorage.removeItem("reading-comprehension-upload-" + id + "-text");
      localStorage.removeItem("reading-comprehension-upload-" + id + "-num");
    } catch (_) {
      /* ignore */
    }
  }

  function whenPublishedFiles() {
    if (publishedFilesCache) return Promise.resolve(publishedFilesCache);
    if (!ghSave) return Promise.resolve({});
    return ghSave.fetchPublishedManifest().then(function (m) {
      publishedFilesCache = (m && m.files) || {};
      return publishedFilesCache;
    }).catch(function () {
      return {};
    });
  }

  /** Load file from assets/uploads/ on the live site (after deploy). Returns true if loaded. */
  function tryLoadPublished(id, onText, onUrl) {
    return whenPublishedFiles().then(function (files) {
      var entry = files[id];
      if (!entry || !entry.path) return false;
      if (entry.kind === "text" && onText) {
        return fetch(entry.path + "?t=" + Date.now())
          .then(function (r) {
            if (!r.ok) return false;
            return r.text();
          })
          .then(function (text) {
            if (text == null) return false;
            onText(text);
            return true;
          })
          .catch(function () {
            return false;
          });
      }
      if (onUrl) {
        return fetch(entry.path, { method: "HEAD" })
          .then(function (res) {
            if (!res.ok) return false;
            onUrl(entry.path);
            return true;
          })
          .catch(function () {
            return false;
          });
      }
      return false;
    });
  }

  // Quiz uploads stay off (static site — no server). Other pages: file pickers work locally.
  function disableQuizUploads() {
    const quizRoot = document.getElementById("testingQuiz");
    if (!quizRoot) return;

    quizRoot.querySelectorAll('input[type="file"]').forEach((input) => {
      input.disabled = true;
      input.setAttribute("aria-disabled", "true");
      input.tabIndex = -1;

      const uploadBox = input.closest(".quiz-upload");
      if (uploadBox) {
        uploadBox.classList.add("is-upload-disabled");
        uploadBox.setAttribute("aria-disabled", "true");
      }
    });
  }

  disableQuizUploads();

  // Highlight active link based on data-page.
  if (page) {
    document
      .querySelectorAll("[data-nav]")
      .forEach((a) => a.classList.toggle("is-active", a.dataset.nav === page));
  }

  // Mobile menu toggle (optional).
  const menuBtn = document.querySelector("[data-menu-button]");
  const menu = document.querySelector("[data-mobile-menu]");
  if (menuBtn && menu) {
    menuBtn.addEventListener("click", () => {
      menu.classList.toggle("is-open");
      const expanded = menu.classList.contains("is-open");
      menuBtn.setAttribute("aria-expanded", String(expanded));
    });

    // Close menu after clicking a link.
    menu.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => {
        menu.classList.remove("is-open");
        menuBtn.setAttribute("aria-expanded", "false");
      });
    });
  }

  // Contact form (front-end only).
  const form = document.querySelector("[data-contact-form]");
  if (form) {
    const status = form.querySelector("[data-form-status]");

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      // Let browser validation run first for required fields.
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const firstName = (form.querySelector('input[name="name"]')?.value || "").trim().split(/\s+/)[0];
      const nameText = firstName ? `, ${firstName}` : "";

      if (status) {
        status.style.color = "rgba(16, 185, 129, 0.95)"; // green
        status.textContent = `Thanks${nameText}! Your message is ready to be sent. (Demo form)`;
      }

      form.reset();
    });
  }

  // Home page: video file upload + play / pause / stop (saved in this browser).
  if (page === "home") {
    const video = document.getElementById("homePageVideo");
    const fileInput = document.getElementById("homeVideoFile");
    const btnPlay = document.getElementById("homeVideoPlay");
    const btnPause = document.getElementById("homeVideoPause");
    const btnStop = document.getElementById("homeVideoStop");
    if (video && fileInput && btnPlay && btnPause && btnStop) {
      let blobUrl = "";
      const HOME_VIDEO_KEY = "home-video";

      function applyHomeVideoUrl(url) {
        if (blobUrl && blobUrl !== url) URL.revokeObjectURL(blobUrl);
        blobUrl = url;
        video.querySelectorAll("source").forEach((s) => s.remove());
        video.src = url;
        video.load();
      }

      tryLoadPublished(HOME_VIDEO_KEY, null, applyHomeVideoUrl).then(function (loaded) {
        if (loaded || !uploadStore) return;
        uploadStore.getBlob(HOME_VIDEO_KEY).then((rec) => {
          if (!rec) return;
          const url = uploadStore.createObjectUrl(rec);
          if (url) applyHomeVideoUrl(url);
        });
      });

      fileInput.addEventListener("change", () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file || !file.type.startsWith("video/")) return;
        saveBlob(HOME_VIDEO_KEY, file);
        applyHomeVideoUrl(URL.createObjectURL(file));
      });
      btnPlay.addEventListener("click", () => {
        video.play().catch(() => {});
      });
      btnPause.addEventListener("click", () => {
        video.pause();
      });
      btnStop.addEventListener("click", () => {
        video.pause();
        video.currentTime = 0;
      });
    }
  }

  // Presentation (about.html): gallery uploads — saved in this browser until Remove.
  document.querySelectorAll(".gallery-item").forEach((root, index) => {
    const input = root.querySelector(".gallery-file-input");
    const img = root.querySelector(".gallery-photo img");
    const clearBtn = root.querySelector(".gallery-upload-clear");
    if (!input || !img) return;
    const storeKey = "gallery-" + index;
    const originalSrc = img.dataset.originalSrc || img.getAttribute("src") || "";
    const originalAlt = img.getAttribute("alt") || "";
    let lastUrl = "";

    let lastUrlIsObject = false;

    function applyGalleryImage(url, altText, isObjectUrl) {
      if (lastUrl && lastUrlIsObject && lastUrl !== url) URL.revokeObjectURL(lastUrl);
      lastUrl = isObjectUrl ? url : "";
      lastUrlIsObject = !!isObjectUrl;
      img.src = url;
      img.alt = altText || img.alt;
      if (clearBtn) clearBtn.hidden = false;
    }

    tryLoadPublished(storeKey, null, function (path) {
      applyGalleryImage(path, originalAlt, false);
    }).then(function (loaded) {
      if (loaded || !uploadStore) return;
      uploadStore.getBlob(storeKey).then((rec) => {
        if (!rec) return;
        const url = uploadStore.createObjectUrl(rec);
        if (url) applyGalleryImage(url, rec.name || originalAlt, true);
      });
    });

    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      if (!file || !file.type.startsWith("image/")) return;
      saveBlob(storeKey, file);
      applyGalleryImage(URL.createObjectURL(file), file.name, true);
    });
    clearBtn?.addEventListener("click", () => {
      if (lastUrl && lastUrlIsObject) {
        URL.revokeObjectURL(lastUrl);
        lastUrl = "";
        lastUrlIsObject = false;
      }
      removeUpload(storeKey);
      input.value = "";
      if (originalSrc) {
        img.src = originalSrc;
        img.alt = originalAlt;
      }
      if (clearBtn) clearBtn.hidden = true;
    });
  });

  // Divider image uploads (While reading) — saved in this browser until Remove.
  document.querySelectorAll(".divider-upload").forEach((root, index) => {
    const input = root.querySelector(".divider-file-input");
    const img = root.querySelector(".divider-upload-img");
    const placeholder = root.querySelector(".divider-upload-placeholder");
    const clearBtn = root.querySelector(".divider-upload-clear");
    if (!input || !img) return;
    const storeKey = "divider-" + index;
    let lastUrl = "";
    let lastUrlIsObject = false;

    function showDividerImage(url, altText, isObjectUrl) {
      if (lastUrl && lastUrlIsObject && lastUrl !== url) URL.revokeObjectURL(lastUrl);
      lastUrl = isObjectUrl ? url : "";
      lastUrlIsObject = !!isObjectUrl;
      img.src = url;
      img.hidden = false;
      img.alt = altText || "";
      if (placeholder) placeholder.hidden = true;
      if (clearBtn) clearBtn.hidden = false;
    }

    tryLoadPublished(storeKey, null, function (path) {
      showDividerImage(path, "", false);
    }).then(function (loaded) {
      if (loaded || !uploadStore) return;
      uploadStore.getBlob(storeKey).then((rec) => {
        if (!rec) return;
        const url = uploadStore.createObjectUrl(rec);
        if (url) showDividerImage(url, rec.name, true);
      });
    });

    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      if (!file || !file.type.startsWith("image/")) return;
      saveBlob(storeKey, file);
      showDividerImage(URL.createObjectURL(file), file.name, true);
    });
    clearBtn?.addEventListener("click", () => {
      if (lastUrl && lastUrlIsObject) URL.revokeObjectURL(lastUrl);
      lastUrl = "";
      lastUrlIsObject = false;
      removeUpload(storeKey);
      img.removeAttribute("src");
      img.hidden = true;
      input.value = "";
      if (placeholder) placeholder.hidden = false;
      clearBtn.hidden = true;
    });
  });

  // Practicing 3: paste Wordwall iframe HTML or embed URL → load adjacent iframe.
  // Persists full paste + URL in localStorage until you load a different embed (Load activity).
  if (page === "practicing") {
    const listeningTextFile = document.getElementById("listeningTextFile");
    const listeningTextPreview = document.getElementById("listeningTextPreview");
    const listeningTextZoomIn = document.getElementById("listeningTextZoomIn");
    const listeningTextZoomOut = document.getElementById("listeningTextZoomOut");
    const listeningAudio = document.getElementById("listeningPageAudio");
    const listeningAudioFile = document.getElementById("listeningAudioFile");
    const listeningAudioPlay = document.getElementById("listeningAudioPlay");
    const listeningAudioPause = document.getElementById("listeningAudioPause");
    const listeningAudioStop = document.getElementById("listeningAudioStop");

    const LISTENING_TEXT_KEY = "listening-text";
    const LISTENING_AUDIO_KEY = "listening-audio";
    const LISTENING_ZOOM_KEY = "listening-text-zoom";

    if (listeningTextPreview && listeningTextZoomIn && listeningTextZoomOut) {
      const zoomMin = 12;
      const zoomMax = 36;
      const zoomStep = 2;
      let listeningTextFontPx = uploadStore
        ? uploadStore.getNumber(LISTENING_ZOOM_KEY, 15)
        : 15;
      function applyListeningTextZoom() {
        listeningTextPreview.style.fontSize = listeningTextFontPx + "px";
        if (uploadStore) uploadStore.setNumber(LISTENING_ZOOM_KEY, listeningTextFontPx);
      }
      applyListeningTextZoom();
      listeningTextZoomIn.addEventListener("click", () => {
        listeningTextFontPx = Math.min(zoomMax, listeningTextFontPx + zoomStep);
        applyListeningTextZoom();
      });
      listeningTextZoomOut.addEventListener("click", () => {
        listeningTextFontPx = Math.max(zoomMin, listeningTextFontPx - zoomStep);
        applyListeningTextZoom();
      });
    }

    if (listeningTextFile && listeningTextPreview) {
      function restoreListeningText() {
        if (!uploadStore) {
          return tryLoadPublished(LISTENING_TEXT_KEY, function (text) {
            listeningTextPreview.textContent = text;
          });
        }
        return uploadStore.getText(LISTENING_TEXT_KEY).then(function (text) {
          if (text) {
            listeningTextPreview.textContent = text;
            return true;
          }
          return tryLoadPublished(LISTENING_TEXT_KEY, function (t) {
            listeningTextPreview.textContent = t;
          });
        });
      }
      restoreListeningText();

      listeningTextFile.addEventListener("change", () => {
        const file = listeningTextFile.files && listeningTextFile.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const content = typeof reader.result === "string" ? reader.result : "";
          listeningTextPreview.textContent = content;
          saveText(LISTENING_TEXT_KEY, content);
        };
        reader.onerror = () => {
          listeningTextPreview.textContent = "Could not read this file.";
        };
        reader.readAsText(file);
      });
    }

    let listeningAudioBlobUrl = "";
    if (listeningAudio && listeningAudioFile && listeningAudioPlay && listeningAudioPause && listeningAudioStop) {
      function revokeListeningAudioUrl() {
        if (listeningAudioBlobUrl && listeningAudioBlobUrl.indexOf("blob:") === 0) {
          URL.revokeObjectURL(listeningAudioBlobUrl);
        }
        listeningAudioBlobUrl = "";
      }

      function applyListeningAudioUrl(url) {
        revokeListeningAudioUrl();
        listeningAudioBlobUrl = url;
        listeningAudio.src = url;
        listeningAudio.load();
        listeningAudioPlay.disabled = false;
        listeningAudioPause.disabled = false;
        listeningAudioStop.disabled = false;
      }

      listeningAudioPlay.disabled = true;
      listeningAudioPause.disabled = true;
      listeningAudioStop.disabled = true;

      function restoreListeningAudio() {
        if (!uploadStore) {
          return tryLoadPublished(LISTENING_AUDIO_KEY, null, applyListeningAudioUrl);
        }
        return uploadStore.getBlob(LISTENING_AUDIO_KEY).then(function (rec) {
          if (rec) {
            const url = uploadStore.createObjectUrl(rec);
            if (url) {
              applyListeningAudioUrl(url);
              return true;
            }
          }
          return tryLoadPublished(LISTENING_AUDIO_KEY, null, applyListeningAudioUrl);
        });
      }
      restoreListeningAudio();

      listeningAudioFile.addEventListener("change", () => {
        const file = listeningAudioFile.files && listeningAudioFile.files[0];
        if (!file) return;
        applyListeningAudioUrl(URL.createObjectURL(file));
        saveBlob(LISTENING_AUDIO_KEY, file).catch(function () {
          if (window.showGitHubSaveStatus) {
            window.showGitHubSaveStatus("Could not save audio in this browser.", true);
          }
        });
      });
      listeningAudioPlay.addEventListener("click", () => {
        listeningAudio.play().catch(() => {});
      });
      listeningAudioPause.addEventListener("click", () => {
        listeningAudio.pause();
      });
      listeningAudioStop.addEventListener("click", () => {
        listeningAudio.pause();
        listeningAudio.currentTime = 0;
      });
    }

    const wordwallUrlKey = (iframeId) => "reading-comprehension-wordwall-url-" + iframeId;
    const wordwallPasteKey = (iframeId) => "reading-comprehension-wordwall-paste-" + iframeId;
    /** @deprecated legacy single-key URL storage */
    const wordwallLegacyKey = (iframeId) => "reading-comprehension-wordwall-" + iframeId;

    function wordwallUrlFromPaste(text) {
      const t = text.trim();
      if (!t) return "";
      if (/^https?:\/\//i.test(t) && !/[<>]/.test(t)) {
        return t.split(/\s/)[0];
      }
      try {
        const doc = new DOMParser().parseFromString(t, "text/html");
        const iframe = doc.querySelector("iframe");
        const src = iframe && iframe.getAttribute("src");
        if (src) return src.trim();
      } catch (_) {
        /* ignore */
      }
      const m = t.match(/src\s*=\s*["']([^"']+)["']/i);
      return m ? m[1].trim() : "";
    }

    function isWordwallEmbedUrl(u) {
      try {
        const host = new URL(u).hostname;
        return host === "wordwall.net" || host.endsWith(".wordwall.net");
      } catch (_) {
        return false;
      }
    }

    /** Maps e.g. wordwallEmbed2 → wordwallPaste2 (explicit so Activity 2 always restores). */
    function wordwallPasteFieldId(iframeId) {
      const m = /^wordwallEmbed(\d+)$/.exec(iframeId);
      return m ? "wordwallPaste" + m[1] : null;
    }

    function restoreWordwallEmbedsFromStorage() {
      ["wordwallEmbed1", "wordwallEmbed2"].forEach((iframeId) => {
        let pasteRaw = "";
        let urlOnly = "";
        try {
          pasteRaw = localStorage.getItem(wordwallPasteKey(iframeId)) || "";
          urlOnly = localStorage.getItem(wordwallUrlKey(iframeId)) || "";
          if (!pasteRaw && !urlOnly) {
            const legacy = localStorage.getItem(wordwallLegacyKey(iframeId)) || "";
            if (legacy) {
              urlOnly = legacy;
              pasteRaw = legacy;
            }
          }
        } catch (_) {
          return;
        }
        const resolvedUrl = wordwallUrlFromPaste(pasteRaw) || urlOnly;
        if (!resolvedUrl || !isWordwallEmbedUrl(resolvedUrl)) return;
        const iframe = document.getElementById(iframeId);
        if (!iframe) return;
        iframe.src = resolvedUrl;
        const pasteId = wordwallPasteFieldId(iframeId);
        const ta = pasteId ? document.getElementById(pasteId) : null;
        if (ta) ta.value = pasteRaw || urlOnly || resolvedUrl;
      });
    }
    restoreWordwallEmbedsFromStorage();

    document.querySelectorAll("[data-wordwall-open]").forEach((btn) => {
      const id = btn.getAttribute("data-wordwall-open");
      const dlg = document.getElementById("wordwallDialog" + id);
      const ta = document.getElementById("wordwallPaste" + id);
      const err = document.getElementById("wordwallError" + id);
      if (!dlg || !ta) return;

      btn.addEventListener("click", () => {
        if (err) {
          err.hidden = true;
          err.textContent = "";
        }
        if (typeof dlg.showModal === "function") {
          dlg.showModal();
        } else {
          dlg.setAttribute("open", "");
        }
        ta.focus();
      });
    });

    document.querySelectorAll("[data-wordwall-close]").forEach((btn) => {
      const id = btn.getAttribute("data-wordwall-close");
      const dlg = document.getElementById("wordwallDialog" + id);
      if (!dlg) return;
      btn.addEventListener("click", () => {
        if (typeof dlg.close === "function") dlg.close();
        else dlg.removeAttribute("open");
      });
    });

    document.querySelectorAll("[data-wordwall-load]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-wordwall-load");
        const targetId = btn.getAttribute("data-wordwall-target");
        const iframe = targetId ? document.getElementById(targetId) : null;
        const ta = document.getElementById("wordwallPaste" + id);
        const err = document.getElementById("wordwallError" + id);
        const dlg = document.getElementById("wordwallDialog" + id);
        if (!iframe || !ta || !dlg) return;

        const url = wordwallUrlFromPaste(ta.value);
        if (!url) {
          if (err) {
            err.textContent = "Paste the iframe code from Wordwall or the embed URL.";
            err.hidden = false;
          }
          return;
        }
        if (!isWordwallEmbedUrl(url)) {
          if (err) {
            err.textContent = "Use a Wordwall embed URL (https://wordwall.net/embed/…).";
            err.hidden = false;
          }
          return;
        }
        if (err) err.hidden = true;
        iframe.src = url;
        try {
          localStorage.setItem(wordwallUrlKey(targetId), url);
          localStorage.setItem(wordwallPasteKey(targetId), ta.value);
          localStorage.removeItem(wordwallLegacyKey(targetId));
        } catch (_) {
          /* quota / private mode */
        }
        if (typeof dlg.close === "function") dlg.close();
        else dlg.removeAttribute("open");
      });
    });
  }
})();

