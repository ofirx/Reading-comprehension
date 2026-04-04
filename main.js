(() => {
  const body = document.body;
  const page = (body && body.dataset && body.dataset.page) || "";

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
})();

