(() => {
  const body = document.body;
  const page = (body && body.dataset && body.dataset.page) || "";

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

  // Home page: video file upload + play / pause / stop (local preview only).
  if (page === "home") {
    const video = document.getElementById("homePageVideo");
    const fileInput = document.getElementById("homeVideoFile");
    const btnPlay = document.getElementById("homeVideoPlay");
    const btnPause = document.getElementById("homeVideoPause");
    const btnStop = document.getElementById("homeVideoStop");
    if (video && fileInput && btnPlay && btnPause && btnStop) {
      let blobUrl = "";
      fileInput.addEventListener("change", () => {
        const file = fileInput.files && fileInput.files[0];
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
          blobUrl = "";
        }
        if (!file || !file.type.startsWith("video/")) return;
        blobUrl = URL.createObjectURL(file);
        video.querySelectorAll("source").forEach((s) => s.remove());
        video.src = blobUrl;
        video.load();
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

  // Presentation (about.html): per-image gallery uploads — local preview only (not saved to server).
  document.querySelectorAll(".gallery-item").forEach((root) => {
    const input = root.querySelector(".gallery-file-input");
    const img = root.querySelector(".gallery-photo img");
    const clearBtn = root.querySelector(".gallery-upload-clear");
    if (!input || !img) return;
    const originalSrc = img.dataset.originalSrc || img.getAttribute("src") || "";
    const originalAlt = img.getAttribute("alt") || "";
    let lastUrl = "";
    input.addEventListener("change", () => {
      if (lastUrl) {
        URL.revokeObjectURL(lastUrl);
        lastUrl = "";
      }
      const file = input.files && input.files[0];
      if (!file || !file.type.startsWith("image/")) return;
      lastUrl = URL.createObjectURL(file);
      img.src = lastUrl;
      img.alt = file.name;
      if (clearBtn) clearBtn.hidden = false;
    });
    clearBtn?.addEventListener("click", () => {
      if (lastUrl) {
        URL.revokeObjectURL(lastUrl);
        lastUrl = "";
      }
      input.value = "";
      if (originalSrc) {
        img.src = originalSrc;
        img.alt = originalAlt;
      }
      if (clearBtn) clearBtn.hidden = true;
    });
  });

  // Practicing page: local preview for divider image uploads (no server; session only).
  document.querySelectorAll(".divider-upload").forEach((root) => {
    const input = root.querySelector(".divider-file-input");
    const img = root.querySelector(".divider-upload-img");
    const placeholder = root.querySelector(".divider-upload-placeholder");
    const clearBtn = root.querySelector(".divider-upload-clear");
    if (!input || !img) return;
    let lastUrl = "";
    input.addEventListener("change", () => {
      if (lastUrl) {
        URL.revokeObjectURL(lastUrl);
        lastUrl = "";
      }
      const file = input.files && input.files[0];
      if (!file || !file.type.startsWith("image/")) return;
      lastUrl = URL.createObjectURL(file);
      img.src = lastUrl;
      img.hidden = false;
      img.alt = file.name;
      if (placeholder) placeholder.hidden = true;
      if (clearBtn) clearBtn.hidden = false;
    });
    clearBtn?.addEventListener("click", () => {
      if (lastUrl) URL.revokeObjectURL(lastUrl);
      lastUrl = "";
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

    if (listeningTextPreview && listeningTextZoomIn && listeningTextZoomOut) {
      const zoomMin = 12;
      const zoomMax = 36;
      const zoomStep = 2;
      let listeningTextFontPx = 15;
      function applyListeningTextZoom() {
        listeningTextPreview.style.fontSize = listeningTextFontPx + "px";
      }
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
      listeningTextFile.addEventListener("change", () => {
        const file = listeningTextFile.files && listeningTextFile.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          listeningTextPreview.textContent =
            typeof reader.result === "string" ? reader.result : "";
        };
        reader.onerror = () => {
          listeningTextPreview.textContent = "Could not read this file.";
        };
        reader.readAsText(file);
      });
    }

    let listeningAudioBlobUrl = "";
    if (listeningAudio && listeningAudioFile && listeningAudioPlay && listeningAudioPause && listeningAudioStop) {
      listeningAudioFile.addEventListener("change", () => {
        const file = listeningAudioFile.files && listeningAudioFile.files[0];
        if (listeningAudioBlobUrl) {
          URL.revokeObjectURL(listeningAudioBlobUrl);
          listeningAudioBlobUrl = "";
        }
        if (!file) return;
        listeningAudioBlobUrl = URL.createObjectURL(file);
        listeningAudio.src = listeningAudioBlobUrl;
        listeningAudio.load();
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

