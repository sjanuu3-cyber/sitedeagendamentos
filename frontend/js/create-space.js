document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");
  const message = document.getElementById("registerMessage");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    AppUtils.showMessage(message, "");

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    payload.companySlug = AppUtils.normalizeSlugInput(payload.companySlug);

    try {
      const data = await Api.request("/auth/register", {
        method: "POST",
        body: payload,
      });

      Api.saveSession(data);
      AppUtils.showMessage(message, "Espaco criado. Abrindo o painel da empresa...", "success");

      const urls = AppUtils.buildTenantUrls(data.company.slug);
      window.setTimeout(() => {
        window.location.href = `${urls.admin}?novo=1`;
      }, 500);
    } catch (error) {
      AppUtils.showMessage(message, error.message, "error");
    }
  });
});
