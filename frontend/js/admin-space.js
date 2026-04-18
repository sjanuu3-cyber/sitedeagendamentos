document.addEventListener("DOMContentLoaded", async () => {
  const pathSlug = AppUtils.getTenantSlugFromPath();
  const session = Api.getSession();

  if (pathSlug && session?.company?.slug && session.company.slug !== pathSlug) {
    const urls = AppUtils.buildTenantUrls(session.company.slug);
    window.location.href = urls.admin;
    return;
  }

  if (!session?.token) {
    if (pathSlug) {
      window.location.href = AppUtils.buildTenantUrls(pathSlug).login;
      return;
    }

    window.location.href = "/";
    return;
  }

  const adminCompanyName = document.getElementById("adminCompanyName");
  const adminCompanyMeta = document.getElementById("adminCompanyMeta");
  const serviceCountValue = document.getElementById("serviceCountValue");
  const professionalCountValue = document.getElementById("professionalCountValue");
  const appointmentCountValue = document.getElementById("appointmentCountValue");
  const agendaStatusValue = document.getElementById("agendaStatusValue");
  const publicBookingLink = document.getElementById("publicBookingLink");
  const logoutButton = document.getElementById("logoutButton");
  const shareSpaceMessage = document.getElementById("shareSpaceMessage");
  const publicSpaceUrl = document.getElementById("publicSpaceUrl");
  const publicSpaceOpen = document.getElementById("publicSpaceOpen");
  const publicSpaceCopy = document.getElementById("publicSpaceCopy");
  const loginSpaceUrl = document.getElementById("loginSpaceUrl");
  const loginSpaceOpen = document.getElementById("loginSpaceOpen");
  const loginSpaceCopy = document.getElementById("loginSpaceCopy");
  const adminSpaceUrl = document.getElementById("adminSpaceUrl");
  const adminSpaceCopy = document.getElementById("adminSpaceCopy");

  const serviceForm = document.getElementById("serviceForm");
  const serviceList = document.getElementById("serviceList");
  const serviceMessage = document.getElementById("serviceMessage");
  const resetServiceFormButton = document.getElementById("resetServiceForm");

  const professionalForm = document.getElementById("professionalForm");
  const professionalList = document.getElementById("professionalList");
  const professionalMessage = document.getElementById("professionalMessage");
  const resetProfessionalFormButton = document.getElementById("resetProfessionalForm");

  const appointmentForm = document.getElementById("appointmentForm");
  const appointmentList = document.getElementById("appointmentList");
  const appointmentMessage = document.getElementById("appointmentMessage");
  const resetAppointmentFormButton = document.getElementById("resetAppointmentForm");
  const appointmentFilterDate = document.getElementById("appointmentFilterDate");
  const appointmentFilterStatus = document.getElementById("appointmentFilterStatus");
  const reloadAppointmentsButton = document.getElementById("reloadAppointments");
  const appointmentTimeField = document.getElementById("appointmentTimeField");
  const appointmentTimeHint = document.getElementById("appointmentTimeHint");

  const state = {
    company: null,
    user: null,
    services: [],
    professionals: [],
    appointments: [],
  };

  logoutButton.addEventListener("click", () => {
    const slug = state.company?.slug || pathSlug;
    Api.clearSession();
    window.location.href = slug ? AppUtils.buildTenantUrls(slug).login : "/";
  });

  publicSpaceCopy.addEventListener("click", () => copySpaceLink(publicSpaceUrl.textContent, "Link da agenda copiado."));
  loginSpaceCopy.addEventListener("click", () => copySpaceLink(loginSpaceUrl.textContent, "Link de login copiado."));
  adminSpaceCopy.addEventListener("click", () => copySpaceLink(adminSpaceUrl.textContent, "Link do painel copiado."));

  serviceForm.addEventListener("submit", handleServiceSubmit);
  professionalForm.addEventListener("submit", handleProfessionalSubmit);
  appointmentForm.addEventListener("submit", handleAppointmentSubmit);

  resetServiceFormButton.addEventListener("click", resetServiceForm);
  resetProfessionalFormButton.addEventListener("click", resetProfessionalForm);
  resetAppointmentFormButton.addEventListener("click", resetAppointmentForm);
  reloadAppointmentsButton.addEventListener("click", loadAppointments);
  appointmentFilterDate.addEventListener("change", loadAppointments);
  appointmentFilterStatus.addEventListener("change", loadAppointments);
  appointmentForm.elements.serviceId.addEventListener("change", updateAppointmentTimeFieldState);

  serviceList.addEventListener("click", handleServiceListActions);
  professionalList.addEventListener("click", handleProfessionalListActions);
  appointmentList.addEventListener("click", handleAppointmentListActions);

  try {
    await initializeDashboard();
  } catch (error) {
    Api.clearSession();
    window.location.href = pathSlug ? AppUtils.buildTenantUrls(pathSlug).login : "/";
  }

  async function initializeDashboard() {
    const [profileData, servicesData, professionalsData] = await Promise.all([
      Api.request("/auth/me"),
      Api.request("/admin/services"),
      Api.request("/admin/professionals"),
    ]);

    state.company = profileData.company;
    state.user = profileData.user;
    state.services = servicesData.services;
    state.professionals = professionalsData.professionals;

    if (pathSlug && pathSlug !== state.company.slug) {
      window.location.href = AppUtils.buildTenantUrls(state.company.slug).admin;
      return;
    }

    renderHeader();
    renderServices();
    renderProfessionals();
    populateAppointmentSelects();
    updateAppointmentTimeFieldState();
    updateDashboardMetrics();
    await loadAppointments();
  }

  function renderHeader() {
    const urls = AppUtils.buildTenantUrls(state.company.slug);
    const publicUrl = toAbsoluteUrl(urls.booking);
    const loginUrl = toAbsoluteUrl(urls.login);
    const adminUrl = toAbsoluteUrl(urls.admin);

    adminCompanyName.textContent = state.company.name;
    adminCompanyMeta.textContent =
      `${state.company.segment} | ${state.company.email}` +
      (state.company.phone ? ` | ${state.company.phone}` : "") +
      ` | Agenda: ${publicUrl}`;
    publicBookingLink.href = urls.booking;
    publicSpaceUrl.textContent = publicUrl;
    publicSpaceOpen.href = urls.booking;
    loginSpaceUrl.textContent = loginUrl;
    loginSpaceOpen.href = urls.login;
    adminSpaceUrl.textContent = adminUrl;

    if (new URLSearchParams(window.location.search).get("novo") === "1") {
      AppUtils.showMessage(
        shareSpaceMessage,
        "Espaco criado com sucesso. Compartilhe o link da agenda publica com seus clientes.",
        "success"
      );
    }
  }

  function renderServices() {
    if (state.services.length === 0) {
      serviceList.innerHTML = '<p class="empty-state">Nenhum servico cadastrado.</p>';
      return;
    }

    serviceList.innerHTML = state.services
      .map(
        (service) => `
          <article class="list-card">
            <div class="section-heading">
              <span class="status-badge ${service.active ? "status-agendado" : "status-cancelado"}">
                ${service.active ? "Ativo" : "Inativo"}
              </span>
              <div>
                <h3>${AppUtils.escapeHtml(service.name)}</h3>
                <p>${AppUtils.formatDuration(service.durationMinutes)} - ${AppUtils.formatCurrency(service.price)}</p>
              </div>
            </div>
            <div class="card-meta">
              <span>${AppUtils.escapeHtml(service.description || "Sem descricao informada.")}</span>
            </div>
            <div class="inline-actions">
              <button class="button secondary" type="button" data-action="edit-service" data-id="${service.id}">Editar</button>
              <button class="button ghost" type="button" data-action="delete-service" data-id="${service.id}">Desativar</button>
            </div>
          </article>
        `
      )
      .join("");
  }

  function renderProfessionals() {
    if (state.professionals.length === 0) {
      professionalList.innerHTML = '<p class="empty-state">Nenhum profissional cadastrado.</p>';
      return;
    }

    professionalList.innerHTML = state.professionals
      .map(
        (professional) => `
          <article class="list-card">
            <div class="section-heading">
              <span class="status-badge ${professional.active ? "status-agendado" : "status-cancelado"}">
                ${professional.active ? "Ativo" : "Inativo"}
              </span>
              <div>
                <h3>${AppUtils.escapeHtml(professional.name)}</h3>
                <p>${AppUtils.escapeHtml(professional.specialty || "Sem especialidade")}</p>
              </div>
            </div>
            <div class="card-meta">
              <span>${AppUtils.escapeHtml(professional.email || "Sem e-mail")} - ${AppUtils.escapeHtml(professional.phone || "Sem telefone")}</span>
              <span>${buildAvailabilitySummary(professional.availability)}</span>
            </div>
            <div class="inline-actions">
              <button class="button secondary" type="button" data-action="edit-professional" data-id="${professional.id}">Editar</button>
              <button class="button ghost" type="button" data-action="delete-professional" data-id="${professional.id}">Desativar</button>
            </div>
          </article>
        `
      )
      .join("");
  }

  function renderAppointments() {
    if (state.appointments.length === 0) {
      appointmentList.innerHTML = '<p class="empty-state">Nenhum agendamento encontrado.</p>';
      return;
    }

    appointmentList.innerHTML = state.appointments
      .map(
        (appointment) => `
          <article class="list-card">
            <div class="section-heading">
              <span class="status-badge status-${appointment.status}">
                ${AppUtils.escapeHtml(appointment.status)}
              </span>
              <div>
                <h3>${AppUtils.escapeHtml(appointment.clientName)}</h3>
                <p>
                  ${AppUtils.escapeHtml(formatAppointmentWindow(appointment))}
                  - ${AppUtils.escapeHtml(appointment.serviceName)}
                </p>
              </div>
            </div>
            <div class="card-meta">
              <span><strong>Profissional:</strong> ${AppUtils.escapeHtml(appointment.professionalName)}</span>
              <span><strong>Telefone:</strong> ${AppUtils.escapeHtml(appointment.clientPhone)}</span>
              <span><strong>E-mail:</strong> ${AppUtils.escapeHtml(appointment.clientEmail || "Nao informado")}</span>
              <span><strong>Valor:</strong> ${AppUtils.formatCurrency(appointment.price)}</span>
              <span><strong>Observacoes:</strong> ${AppUtils.escapeHtml(appointment.notes || "Sem observacoes")}</span>
            </div>
            <div class="inline-actions">
              <button class="button secondary" type="button" data-action="edit-appointment" data-id="${appointment.id}">Editar</button>
              ${
                appointment.status !== "cancelado"
                  ? `<button class="button ghost" type="button" data-action="cancel-appointment" data-id="${appointment.id}">Cancelar</button>`
                  : ""
              }
            </div>
          </article>
        `
      )
      .join("");
  }

  async function loadAppointments() {
    const params = new URLSearchParams();

    if (appointmentFilterDate.value) {
      params.set("date", appointmentFilterDate.value);
    }

    if (appointmentFilterStatus.value) {
      params.set("status", appointmentFilterStatus.value);
    }

    const query = params.toString() ? `?${params.toString()}` : "";
    const data = await Api.request(`/admin/appointments${query}`);

    state.appointments = data.appointments;
    renderAppointments();
    updateDashboardMetrics();
  }

  async function handleServiceSubmit(event) {
    event.preventDefault();
    AppUtils.showMessage(serviceMessage, "");

    const formData = new FormData(serviceForm);
    const serviceId = formData.get("id");
    const currentService = state.services.find((service) => String(service.id) === String(serviceId));

    const payload = {
      name: formData.get("name"),
      durationMinutes: Number(formData.get("durationMinutes")),
      price: Number(formData.get("price")),
      description: formData.get("description"),
      active: currentService ? currentService.active : true,
    };

    try {
      if (serviceId) {
        await Api.request(`/admin/services/${serviceId}`, {
          method: "PUT",
          body: payload,
        });
      } else {
        await Api.request("/admin/services", {
          method: "POST",
          body: payload,
        });
      }

      AppUtils.showMessage(serviceMessage, "Servico salvo com sucesso.", "success");
      await refreshServices();
      resetServiceForm();
    } catch (error) {
      AppUtils.showMessage(serviceMessage, error.message, "error");
    }
  }

  async function handleProfessionalSubmit(event) {
    event.preventDefault();
    AppUtils.showMessage(professionalMessage, "");

    const formData = new FormData(professionalForm);
    const professionalId = formData.get("id");
    const currentProfessional = state.professionals.find(
      (professional) => String(professional.id) === String(professionalId)
    );

    try {
      const payload = {
        name: formData.get("name"),
        specialty: formData.get("specialty"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        availability: AppUtils.parseAvailabilityInputs(professionalForm),
        active: currentProfessional ? currentProfessional.active : true,
      };

      if (professionalId) {
        await Api.request(`/admin/professionals/${professionalId}`, {
          method: "PUT",
          body: payload,
        });
      } else {
        await Api.request("/admin/professionals", {
          method: "POST",
          body: payload,
        });
      }

      AppUtils.showMessage(professionalMessage, "Profissional salvo com sucesso.", "success");
      await refreshProfessionals();
      resetProfessionalForm();
    } catch (error) {
      AppUtils.showMessage(professionalMessage, error.message, "error");
    }
  }

  async function handleAppointmentSubmit(event) {
    event.preventDefault();
    AppUtils.showMessage(appointmentMessage, "");

    const formData = new FormData(appointmentForm);
    const appointmentId = formData.get("id");

    if (!appointmentId) {
      AppUtils.showMessage(appointmentMessage, "Selecione um agendamento para editar.", "error");
      return;
    }

    const payload = {
      serviceId: formData.get("serviceId"),
      professionalId: formData.get("professionalId"),
      status: formData.get("status"),
      appointmentDate: formData.get("appointmentDate"),
      startTime: formData.get("startTime"),
      clientName: formData.get("clientName"),
      clientPhone: formData.get("clientPhone"),
      clientEmail: formData.get("clientEmail"),
      notes: formData.get("notes"),
    };

    try {
      await Api.request(`/admin/appointments/${appointmentId}`, {
        method: "PUT",
        body: payload,
      });

      AppUtils.showMessage(appointmentMessage, "Agendamento atualizado com sucesso.", "success");
      await loadAppointments();
      resetAppointmentForm();
    } catch (error) {
      AppUtils.showMessage(appointmentMessage, error.message, "error");
    }
  }

  async function handleServiceListActions(event) {
    const button = event.target.closest("[data-action]");

    if (!button) {
      return;
    }

    const { action, id } = button.dataset;
    const service = state.services.find((item) => String(item.id) === id);

    if (!service) {
      return;
    }

    if (action === "edit-service") {
      serviceForm.elements.id.value = service.id;
      serviceForm.elements.name.value = service.name;
      serviceForm.elements.durationMinutes.value = service.durationMinutes;
      serviceForm.elements.price.value = service.price;
      serviceForm.elements.description.value = service.description || "";
      serviceForm.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (action === "delete-service") {
      const confirmed = window.confirm(`Deseja desativar o servico "${service.name}"?`);

      if (!confirmed) {
        return;
      }

      try {
        await Api.request(`/admin/services/${service.id}`, { method: "DELETE" });
        AppUtils.showMessage(serviceMessage, "Servico desativado com sucesso.", "success");
        await refreshServices();
      } catch (error) {
        AppUtils.showMessage(serviceMessage, error.message, "error");
      }
    }
  }

  async function handleProfessionalListActions(event) {
    const button = event.target.closest("[data-action]");

    if (!button) {
      return;
    }

    const { action, id } = button.dataset;
    const professional = state.professionals.find((item) => String(item.id) === id);

    if (!professional) {
      return;
    }

    if (action === "edit-professional") {
      professionalForm.elements.id.value = professional.id;
      professionalForm.elements.name.value = professional.name;
      professionalForm.elements.specialty.value = professional.specialty || "";
      professionalForm.elements.email.value = professional.email || "";
      professionalForm.elements.phone.value = professional.phone || "";
      AppUtils.fillAvailabilityInputs(professionalForm, professional.availability || {});
      professionalForm.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (action === "delete-professional") {
      const confirmed = window.confirm(
        `Deseja desativar o profissional "${professional.name}"?`
      );

      if (!confirmed) {
        return;
      }

      try {
        await Api.request(`/admin/professionals/${professional.id}`, {
          method: "DELETE",
        });
        AppUtils.showMessage(
          professionalMessage,
          "Profissional desativado com sucesso.",
          "success"
        );
        await refreshProfessionals();
      } catch (error) {
        AppUtils.showMessage(professionalMessage, error.message, "error");
      }
    }
  }

  async function handleAppointmentListActions(event) {
    const button = event.target.closest("[data-action]");

    if (!button) {
      return;
    }

    const { action, id } = button.dataset;
    const appointment = state.appointments.find((item) => String(item.id) === id);

    if (!appointment) {
      return;
    }

    if (action === "edit-appointment") {
      populateAppointmentForm(appointment);
      appointmentForm.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (action === "cancel-appointment") {
      const confirmed = window.confirm(
        `Deseja cancelar o agendamento de "${appointment.clientName}"?`
      );

      if (!confirmed) {
        return;
      }

      try {
        await Api.request(`/admin/appointments/${appointment.id}/cancel`, {
          method: "PATCH",
        });
        AppUtils.showMessage(appointmentMessage, "Agendamento cancelado.", "success");
        await loadAppointments();
      } catch (error) {
        AppUtils.showMessage(appointmentMessage, error.message, "error");
      }
    }
  }

  function populateAppointmentSelects(serviceId = "", professionalId = "") {
    AppUtils.populateSelect(
      appointmentForm.elements.serviceId,
      state.services,
      "Selecione um servico",
      (service) =>
        `${service.name}${service.active ? "" : " (inativo)"} - ${AppUtils.formatDuration(service.durationMinutes)}`,
      serviceId
    );

    AppUtils.populateSelect(
      appointmentForm.elements.professionalId,
      state.professionals,
      "Selecione um profissional",
      (professional) =>
        `${professional.name}${professional.active ? "" : " (inativo)"}${
          professional.specialty ? ` - ${professional.specialty}` : ""
        }`,
      professionalId
    );
  }

  function populateAppointmentForm(appointment) {
    populateAppointmentSelects(appointment.serviceId, appointment.professionalId);
    appointmentForm.elements.id.value = appointment.id;
    appointmentForm.elements.status.value = appointment.status;
    appointmentForm.elements.appointmentDate.value = normalizeDate(appointment.appointmentDate);
    appointmentForm.elements.startTime.value = appointment.startTime;
    appointmentForm.elements.clientName.value = appointment.clientName;
    appointmentForm.elements.clientPhone.value = appointment.clientPhone;
    appointmentForm.elements.clientEmail.value = appointment.clientEmail || "";
    appointmentForm.elements.notes.value = appointment.notes || "";
    updateAppointmentTimeFieldState();
  }

  function resetServiceForm() {
    serviceForm.reset();
    serviceForm.elements.id.value = "";
  }

  function resetProfessionalForm() {
    professionalForm.reset();
    professionalForm.elements.id.value = "";
    AppUtils.fillAvailabilityInputs(professionalForm, {});
  }

  function resetAppointmentForm() {
    appointmentForm.reset();
    appointmentForm.elements.id.value = "";
    populateAppointmentSelects();
    updateAppointmentTimeFieldState();
  }

  function getSelectedAppointmentService() {
    return state.services.find(
      (service) => String(service.id) === String(appointmentForm.elements.serviceId.value)
    );
  }

  function updateAppointmentTimeFieldState() {
    const service = getSelectedAppointmentService();
    const requiresTimeSelection = service?.requiresTimeSelection !== false;

    appointmentTimeField.hidden = !requiresTimeSelection;
    appointmentTimeHint.hidden = requiresTimeSelection;
    appointmentForm.elements.startTime.disabled = !requiresTimeSelection;
    appointmentForm.elements.startTime.required = requiresTimeSelection;

    if (!requiresTimeSelection) {
      appointmentForm.elements.startTime.value = "";
    }
  }

  function formatAppointmentWindow(appointment) {
    if (appointment.requiresTimeSelection !== false) {
      return `${normalizeDate(appointment.appointmentDate)} as ${appointment.startTime}`;
    }

    const endDate = normalizeDate(appointment.endDate || appointment.appointmentDate);

    if (normalizeDate(appointment.appointmentDate) === endDate) {
      return `${normalizeDate(appointment.appointmentDate)} (periodo estendido)`;
    }

    return `${normalizeDate(appointment.appointmentDate)} ate ${endDate}`;
  }

  function buildAvailabilitySummary(availability) {
    const lines = AppUtils.weekDays
      .map((day) => {
        const ranges = availability?.[day.key] || [];

        if (ranges.length === 0) {
          return "";
        }

        return `${day.label}: ${ranges
          .map((range) => `${range.start}-${range.end}`)
          .join(", ")}`;
      })
      .filter(Boolean);

    return lines.length > 0
      ? AppUtils.escapeHtml(lines.join(" | "))
      : "Sem disponibilidade definida";
  }

  async function refreshServices() {
    const data = await Api.request("/admin/services");
    state.services = data.services;
    renderServices();
    populateAppointmentSelects();
    updateAppointmentTimeFieldState();
    updateDashboardMetrics();
  }

  async function refreshProfessionals() {
    const data = await Api.request("/admin/professionals");
    state.professionals = data.professionals;
    renderProfessionals();
    populateAppointmentSelects();
    updateDashboardMetrics();
  }

  function updateDashboardMetrics() {
    if (serviceCountValue) {
      serviceCountValue.textContent = String(
        state.services.filter((service) => service.active).length
      );
    }

    if (professionalCountValue) {
      professionalCountValue.textContent = String(
        state.professionals.filter((professional) => professional.active).length
      );
    }

    if (appointmentCountValue) {
      appointmentCountValue.textContent = String(state.appointments.length);
    }

    if (agendaStatusValue) {
      const hasBaseSetup =
        state.services.some((service) => service.active) &&
        state.professionals.some((professional) => professional.active);

      agendaStatusValue.textContent = hasBaseSetup
        ? "Em operacao"
        : "Configuracao inicial";
    }
  }

  function normalizeDate(value) {
    return String(value || "").slice(0, 10);
  }

  async function copySpaceLink(value, successMessage) {
    try {
      await navigator.clipboard.writeText(value);
      AppUtils.showMessage(shareSpaceMessage, successMessage, "success");
    } catch (error) {
      AppUtils.showMessage(
        shareSpaceMessage,
        "Nao foi possivel copiar automaticamente. Copie o link manualmente.",
        "error"
      );
    }
  }

  function toAbsoluteUrl(pathname) {
    return new URL(pathname, window.location.origin).href;
  }
});
