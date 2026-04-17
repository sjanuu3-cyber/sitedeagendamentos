document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("registerForm");
  const loginForm = document.getElementById("loginForm");
  const bookingForm = document.getElementById("bookingForm");
  const registerMessage = document.getElementById("registerMessage");
  const loginMessage = document.getElementById("loginMessage");
  const bookingMessage = document.getElementById("bookingMessage");
  const bookingCompany = document.getElementById("bookingCompany");
  const bookingService = document.getElementById("bookingService");
  const bookingProfessional = document.getElementById("bookingProfessional");
  const bookingDate = document.getElementById("bookingDate");
  const bookingCompanyCard = document.getElementById("bookingCompanyCard");
  const slotList = document.getElementById("slotList");
  const selectedSlotText = document.getElementById("selectedSlotText");

  const state = {
    companies: [],
    catalog: null,
    selectedSlot: "",
  };

  bookingDate.min = AppUtils.todayString();

  registerForm.addEventListener("submit", handleRegister);
  loginForm.addEventListener("submit", handleLogin);
  bookingCompany.addEventListener("change", handleCompanyChange);
  bookingService.addEventListener("change", refreshAvailability);
  bookingProfessional.addEventListener("change", refreshAvailability);
  bookingDate.addEventListener("change", refreshAvailability);
  bookingForm.addEventListener("submit", handleAppointmentSubmit);

  loadCompanies();

  async function loadCompanies() {
    try {
      const data = await Api.request("/public/companies");
      const urlSlug = new URLSearchParams(window.location.search).get("empresa");

      state.companies = data.companies;
      bookingCompany.innerHTML = '<option value="">Selecione uma empresa</option>';

      state.companies.forEach((company) => {
        const option = document.createElement("option");
        option.value = company.slug;
        option.textContent = `${company.name} (${company.segment})`;

        if (urlSlug && urlSlug === company.slug) {
          option.selected = true;
        }

        bookingCompany.appendChild(option);
      });

      if (urlSlug) {
        await handleCompanyChange();
      }
    } catch (error) {
      AppUtils.showMessage(
        bookingMessage,
        `Não foi possível carregar as empresas: ${error.message}`,
        "error"
      );
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    AppUtils.showMessage(registerMessage, "");

    const formData = new FormData(registerForm);
    const payload = Object.fromEntries(formData.entries());

    try {
      const data = await Api.request("/auth/register", {
        method: "POST",
        body: payload,
      });

      Api.saveSession(data);
      AppUtils.showMessage(registerMessage, "Cadastro concluído. Abrindo o painel...", "success");
      window.setTimeout(() => {
        window.location.href = "/admin";
      }, 500);
    } catch (error) {
      AppUtils.showMessage(registerMessage, error.message, "error");
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    AppUtils.showMessage(loginMessage, "");

    const formData = new FormData(loginForm);
    const payload = Object.fromEntries(formData.entries());

    try {
      const data = await Api.request("/auth/login", {
        method: "POST",
        body: payload,
      });

      Api.saveSession(data);
      AppUtils.showMessage(loginMessage, "Login realizado. Abrindo o painel...", "success");
      window.setTimeout(() => {
        window.location.href = "/admin";
      }, 500);
    } catch (error) {
      AppUtils.showMessage(loginMessage, error.message, "error");
    }
  }

  async function handleCompanyChange() {
    resetBookingSelections();
    AppUtils.showMessage(bookingMessage, "");

    if (!bookingCompany.value) {
      bookingService.disabled = true;
      bookingProfessional.disabled = true;
      bookingCompanyCard.innerHTML = `
        <h3>Selecione uma empresa</h3>
        <p>Ao escolher a empresa, os serviços e profissionais ativos serão carregados.</p>
      `;
      return;
    }

    try {
      const data = await Api.request(`/public/companies/${bookingCompany.value}/catalog`);

      state.catalog = data;

      AppUtils.populateSelect(
        bookingService,
        data.services,
        "Selecione um serviço",
        (service) =>
          `${service.name} • ${service.durationMinutes} min • ${AppUtils.formatCurrency(service.price)}`
      );
      AppUtils.populateSelect(
        bookingProfessional,
        data.professionals,
        "Selecione um profissional",
        (professional) =>
          professional.specialty
            ? `${professional.name} • ${professional.specialty}`
            : professional.name
      );

      bookingService.disabled = false;
      bookingProfessional.disabled = false;

      renderCompanyCard(data);
      syncCompanyQueryString();
    } catch (error) {
      AppUtils.showMessage(bookingMessage, error.message, "error");
    }
  }

  function renderCompanyCard(data) {
    const servicesHtml =
      data.services.length > 0
        ? data.services
            .slice(0, 4)
            .map(
              (service) =>
                `<li>${AppUtils.escapeHtml(service.name)} - ${service.durationMinutes} min</li>`
            )
            .join("")
        : "<li>Nenhum serviço ativo cadastrado.</li>";

    const professionalsHtml =
      data.professionals.length > 0
        ? data.professionals
            .slice(0, 4)
            .map(
              (professional) =>
                `<li>${AppUtils.escapeHtml(professional.name)}${
                  professional.specialty
                    ? ` - ${AppUtils.escapeHtml(professional.specialty)}`
                    : ""
                }</li>`
            )
            .join("")
        : "<li>Nenhum profissional ativo cadastrado.</li>";

    bookingCompanyCard.innerHTML = `
      <h3>${AppUtils.escapeHtml(data.company.name)}</h3>
      <p>
        Segmento: <strong>${AppUtils.escapeHtml(data.company.segment)}</strong>
        ${data.company.phone ? `• Telefone: ${AppUtils.escapeHtml(data.company.phone)}` : ""}
      </p>
      <div class="card-meta">
        <span><strong>Serviços ativos:</strong></span>
        <ul>${servicesHtml}</ul>
        <span><strong>Profissionais ativos:</strong></span>
        <ul>${professionalsHtml}</ul>
      </div>
    `;
  }

  async function refreshAvailability() {
    AppUtils.showMessage(bookingMessage, "");
    state.selectedSlot = "";
    bookingForm.elements.selectedSlot.value = "";
    selectedSlotText.textContent = "Nenhum horário selecionado.";

    if (!bookingCompany.value || !bookingService.value || !bookingProfessional.value || !bookingDate.value) {
      slotList.innerHTML = '<p class="empty-state">Escolha empresa, serviço, profissional e data.</p>';
      return;
    }

    try {
      const params = new URLSearchParams({
        serviceId: bookingService.value,
        professionalId: bookingProfessional.value,
        date: bookingDate.value,
      });

      const data = await Api.request(
        `/public/companies/${bookingCompany.value}/availability?${params.toString()}`
      );

      renderSlots(data.slots);
    } catch (error) {
      slotList.innerHTML = '<p class="empty-state">Não foi possível carregar os horários.</p>';
      AppUtils.showMessage(bookingMessage, error.message, "error");
    }
  }

  function renderSlots(slots) {
    if (!slots || slots.length === 0) {
      slotList.innerHTML = '<p class="empty-state">Nenhum horário disponível para esta combinação.</p>';
      return;
    }

    slotList.innerHTML = slots
      .map(
        (slot) =>
          `<button class="slot-button" type="button" data-slot="${slot.startTime}">
            ${slot.startTime} - ${slot.endTime}
          </button>`
      )
      .join("");

    slotList.querySelectorAll("[data-slot]").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedSlot = button.dataset.slot;
        bookingForm.elements.selectedSlot.value = button.dataset.slot;
        selectedSlotText.textContent = `Horário selecionado: ${button.dataset.slot}`;

        slotList.querySelectorAll("[data-slot]").forEach((item) => {
          item.classList.toggle("active", item === button);
        });
      });
    });
  }

  async function handleAppointmentSubmit(event) {
    event.preventDefault();
    AppUtils.showMessage(bookingMessage, "");

    if (!state.selectedSlot) {
      AppUtils.showMessage(bookingMessage, "Escolha um horário disponível antes de confirmar.", "error");
      return;
    }

    const formData = new FormData(bookingForm);

    const payload = {
      serviceId: bookingService.value,
      professionalId: bookingProfessional.value,
      appointmentDate: bookingDate.value,
      startTime: formData.get("selectedSlot"),
      clientName: formData.get("clientName"),
      clientPhone: formData.get("clientPhone"),
      clientEmail: formData.get("clientEmail"),
      notes: formData.get("notes"),
    };

    try {
      const data = await Api.request(`/public/companies/${bookingCompany.value}/appointments`, {
        method: "POST",
        body: payload,
      });

      AppUtils.showMessage(
        bookingMessage,
        `Agendamento confirmado para ${data.appointment.appointmentDate} às ${data.appointment.startTime}.`,
        "success"
      );

      bookingForm.reset();
      bookingForm.elements.selectedSlot.value = "";
      state.selectedSlot = "";
      selectedSlotText.textContent = "Nenhum horário selecionado.";
      await refreshAvailability();
    } catch (error) {
      AppUtils.showMessage(bookingMessage, error.message, "error");
    }
  }

  function resetBookingSelections() {
    state.selectedSlot = "";
    state.catalog = null;
    bookingForm.elements.selectedSlot.value = "";
    selectedSlotText.textContent = "Nenhum horário selecionado.";
    slotList.innerHTML = '<p class="empty-state">Escolha empresa, serviço, profissional e data.</p>';
    bookingService.innerHTML = '<option value="">Selecione um serviço</option>';
    bookingProfessional.innerHTML = '<option value="">Selecione um profissional</option>';
    bookingService.disabled = true;
    bookingProfessional.disabled = true;
  }

  function syncCompanyQueryString() {
    const url = new URL(window.location.href);

    if (bookingCompany.value) {
      url.searchParams.set("empresa", bookingCompany.value);
    } else {
      url.searchParams.delete("empresa");
    }

    window.history.replaceState({}, "", url);
  }
});
