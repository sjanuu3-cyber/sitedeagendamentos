document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");
  const message = document.getElementById("registerMessage");
  const steps = Array.from(document.querySelectorAll("[data-flow-step]"));
  const progressSteps = Array.from(document.querySelectorAll("[data-flow-progress]"));
  const nextButtons = Array.from(document.querySelectorAll("[data-next-step]"));
  const backButtons = Array.from(document.querySelectorAll("[data-back-step]"));
  const previewTargets = {
    slug: document.getElementById("previewSlugValue"),
    booking: [
      document.getElementById("previewBookingPath"),
      document.getElementById("sidebarBookingUrl"),
      document.getElementById("reviewPublicUrl"),
    ],
    login: [
      document.getElementById("previewLoginPath"),
      document.getElementById("sidebarLoginUrl"),
      document.getElementById("reviewLoginUrl"),
    ],
    admin: [
      document.getElementById("previewAdminPath"),
      document.getElementById("sidebarAdminUrl"),
      document.getElementById("reviewAdminUrl"),
    ],
  };
  const reviewTargets = {
    companyName: document.getElementById("reviewCompanyName"),
    companySegment: document.getElementById("reviewCompanySegment"),
    companyEmail: document.getElementById("reviewCompanyEmail"),
    companyPhone: document.getElementById("reviewCompanyPhone"),
    adminName: document.getElementById("reviewAdminName"),
    adminEmail: document.getElementById("reviewAdminEmail"),
  };
  const state = {
    currentStep: 1,
  };

  if (!form) {
    return;
  }

  form.addEventListener("input", updatePreview);
  form.addEventListener("change", updatePreview);
  form.addEventListener("keydown", handleFlowEnterKey);

  nextButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!validateCurrentStep()) {
        return;
      }

      state.currentStep = Number(button.dataset.nextStep);
      updateFlow();
    });
  });

  backButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.currentStep = Number(button.dataset.backStep);
      updateFlow();
    });
  });

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

  updatePreview();
  updateFlow(false);

  function updateFlow(shouldScroll = true) {
    steps.forEach((stepElement) => {
      const isActive = Number(stepElement.dataset.flowStep) === state.currentStep;
      stepElement.classList.toggle("is-active", isActive);
      stepElement.hidden = !isActive;
    });

    progressSteps.forEach((stepElement) => {
      const stepNumber = Number(stepElement.dataset.flowProgress);
      stepElement.classList.toggle("is-active", stepNumber === state.currentStep);
      stepElement.classList.toggle("is-complete", stepNumber < state.currentStep);
    });

    updateReview();

    if (shouldScroll) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function updatePreview() {
    const resolvedSlug = getResolvedSlug();
    const urls = buildTenantUrls(resolvedSlug);

    setText(previewTargets.slug, resolvedSlug);
    setText(previewTargets.booking, urls.booking);
    setText(previewTargets.login, urls.login);
    setText(previewTargets.admin, urls.admin);
    updateReview();
  }

  function updateReview() {
    setText(reviewTargets.companyName, form.elements.companyName.value || "Nao informado");
    setText(
      reviewTargets.companySegment,
      getSelectedOptionLabel(form.elements.segment) || "Nao informado"
    );
    setText(reviewTargets.companyEmail, form.elements.companyEmail.value || "Nao informado");
    setText(reviewTargets.companyPhone, form.elements.phone.value || "Nao informado");
    setText(reviewTargets.adminName, form.elements.adminName.value || "Nao informado");
    setText(reviewTargets.adminEmail, form.elements.adminEmail.value || "Nao informado");
  }

  function validateCurrentStep() {
    const currentStepElement = document.querySelector(
      `[data-flow-step="${state.currentStep}"]`
    );

    if (!currentStepElement) {
      return true;
    }

    const fields = Array.from(
      currentStepElement.querySelectorAll("input, select, textarea")
    ).filter((field) => !field.disabled && field.type !== "hidden");

    for (const field of fields) {
      if (!field.checkValidity()) {
        field.reportValidity();
        return false;
      }
    }

    return true;
  }

  function handleFlowEnterKey(event) {
    if (event.key !== "Enter" || event.target.tagName === "TEXTAREA") {
      return;
    }

    if (state.currentStep >= steps.length) {
      return;
    }

    event.preventDefault();

    const activeNextButton = document.querySelector(
      `[data-flow-step="${state.currentStep}"] [data-next-step]`
    );

    activeNextButton?.click();
  }

  function getResolvedSlug() {
    return (
      AppUtils.normalizeSlugInput(form.elements.companySlug.value) ||
      AppUtils.normalizeSlugInput(form.elements.companyName.value) ||
      "seu-espaco"
    );
  }

  function buildTenantUrls(slug) {
    const safeSlug = slug || "seu-espaco";

    return {
      booking: `${window.location.origin}/espaco/${safeSlug}`,
      login: `${window.location.origin}/espaco/${safeSlug}/login`,
      admin: `${window.location.origin}/espaco/${safeSlug}/admin`,
    };
  }

  function getSelectedOptionLabel(select) {
    if (!select) {
      return "";
    }

    return select.options[select.selectedIndex]?.textContent || "";
  }

  function setText(targets, value) {
    const elements = Array.isArray(targets) ? targets : [targets];

    elements.filter(Boolean).forEach((element) => {
      element.textContent = value;
    });
  }
});
