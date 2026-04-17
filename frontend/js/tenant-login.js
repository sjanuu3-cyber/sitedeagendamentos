document.addEventListener("DOMContentLoaded", async () => {
  const slug = AppUtils.getTenantSlugFromPath();
  const urls = AppUtils.buildTenantUrls(slug);
  const title = document.getElementById("tenantLoginTitle");
  const subtitle = document.getElementById("tenantLoginSubtitle");
  const bookingUrl = document.getElementById("tenantBookingUrl");
  const adminUrl = document.getElementById("tenantAdminUrl");
  const bookingLink = document.getElementById("goToBookingLink");
  const form = document.getElementById("loginForm");
  const message = document.getElementById("loginMessage");
  const session = Api.getSession();

  if (!slug) {
    window.location.href = "/";
    return;
  }

  bookingLink.href = urls.booking;
  bookingUrl.textContent = `Agenda publica: ${urls.booking}`;
  adminUrl.textContent = `Painel administrativo: ${urls.admin}`;

  if (session?.company?.slug === slug) {
    window.location.href = urls.admin;
    return;
  }

  try {
    const data = await Api.request(`/public/companies/${slug}/catalog`);
    title.textContent = `Painel da empresa ${data.company.name}`;
    subtitle.textContent = `Entre para administrar o espaco ${data.company.slug}.`;
  } catch (error) {
    title.textContent = "Espaco nao encontrado";
    subtitle.textContent = "Confira o slug informado ou volte ao portal.";
    AppUtils.showMessage(message, error.message, "error");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    AppUtils.showMessage(message, "");

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      const data = await Api.request("/auth/login", {
        method: "POST",
        body: payload,
      });

      Api.saveSession(data);
      AppUtils.showMessage(message, "Login realizado. Abrindo o painel...", "success");

      const targetUrls = AppUtils.buildTenantUrls(data.company.slug);
      window.setTimeout(() => {
        window.location.href = targetUrls.admin;
      }, 400);
    } catch (error) {
      AppUtils.showMessage(message, error.message, "error");
    }
  });
});
