document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("spaceAccessForm");
  const message = document.getElementById("portalMessage");

  if (!form) {
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const submitter = event.submitter;
    const target = submitter?.dataset.target || "booking";
    const slug = AppUtils.normalizeSlugInput(form.elements.slug.value);

    if (!slug) {
      AppUtils.showMessage(message, "Informe o slug do espaco para continuar.", "error");
      return;
    }

    const urls = AppUtils.buildTenantUrls(slug);
    window.location.href = target === "login" ? urls.login : urls.booking;
  });
});
