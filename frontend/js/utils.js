(function attachUtils(windowObject) {
  const weekDays = [
    { key: "0", label: "Domingo" },
    { key: "1", label: "Segunda" },
    { key: "2", label: "Terça" },
    { key: "3", label: "Quarta" },
    { key: "4", label: "Quinta" },
    { key: "5", label: "Sexta" },
    { key: "6", label: "Sábado" },
  ];

  function showMessage(target, message, type = "success") {
    if (!target) {
      return;
    }

    target.textContent = message || "";
    target.className = `form-message ${type}`;
    target.hidden = !message;
  }

  function formatCurrency(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function todayString() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${now.getFullYear()}-${month}-${day}`;
  }

  function buildAvailabilityMap(availability) {
    const map = {};

    weekDays.forEach((day) => {
      map[day.key] = (availability?.[day.key] || [])
        .map((range) => `${range.start}-${range.end}`)
        .join(", ");
    });

    return map;
  }

  function parseAvailabilityInputs(container) {
    const availability = {};

    container.querySelectorAll("[data-day-schedule]").forEach((input) => {
      const rawValue = input.value.trim();

      if (!rawValue) {
        return;
      }

      const ranges = rawValue
        .split(",")
        .map((piece) => piece.trim())
        .filter(Boolean)
        .map((piece) => {
          const [start, end] = piece.split("-").map((value) => value.trim());

          if (!start || !end) {
            throw new Error(
              `Formato inválido em ${input.closest("label").querySelector("span").textContent}.`
            );
          }

          return { start, end };
        });

      if (ranges.length > 0) {
        availability[input.dataset.day] = ranges;
      }
    });

    return availability;
  }

  function fillAvailabilityInputs(container, availability) {
    const map = buildAvailabilityMap(availability);

    container.querySelectorAll("[data-day-schedule]").forEach((input) => {
      input.value = map[input.dataset.day] || "";
    });
  }

  function populateSelect(select, items, placeholder, labelBuilder, selectedValue = "") {
    select.innerHTML = "";

    const placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.textContent = placeholder;
    select.appendChild(placeholderOption);

    items.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = labelBuilder(item);

      if (String(item.id) === String(selectedValue)) {
        option.selected = true;
      }

      select.appendChild(option);
    });
  }

  function normalizeSlugInput(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function getTenantSlugFromPath() {
    const parts = windowObject.location.pathname.split("/").filter(Boolean);

    if (parts[0] === "espaco" && parts[1]) {
      return parts[1];
    }

    return "";
  }

  function buildTenantUrls(slug) {
    return {
      booking: `/espaco/${slug}`,
      login: `/espaco/${slug}/login`,
      admin: `/espaco/${slug}/admin`,
    };
  }

  windowObject.AppUtils = {
    weekDays,
    showMessage,
    formatCurrency,
    escapeHtml,
    todayString,
    buildAvailabilityMap,
    parseAvailabilityInputs,
    fillAvailabilityInputs,
    populateSelect,
    normalizeSlugInput,
    getTenantSlugFromPath,
    buildTenantUrls,
  };
})(window);
