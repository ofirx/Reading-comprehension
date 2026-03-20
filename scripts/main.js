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
})();

