document.addEventListener("DOMContentLoaded", async () => {
  const slug = AppUtils.getTenantSlugFromPath();
  const urls = AppUtils.buildTenantUrls(slug);
  const weekdayFormatter = new Intl.DateTimeFormat("pt-BR", { weekday: "long" });
  const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
  const fullDateFormatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    weekday: "long",
  });
  const bookingTitle = document.getElementById("bookingTitle");
  const bookingSubtitle = document.getElementById("bookingSubtitle");
  const bookingCompanyCard = document.getElementById("bookingCompanyCard");
  const bookingMessage = document.getElementById("bookingMessage");
  const bookingExperience = document.getElementById("bookingExperience");
  const bookingSuccess = document.getElementById("bookingSuccess");
  const bookingSuccessSummary = document.getElementById("bookingSuccessSummary");
  const successRestartButton = document.getElementById("successRestartButton");
  const successBackToStartButton = document.getElementById("successBackToStartButton");
  const bookingService = document.getElementById("bookingService");
  const bookingProfessional = document.getElementById("bookingProfessional");
  const serviceCards = document.getElementById("serviceCards");
  const professionalCards = document.getElementById("professionalCards");
  const bookingDate = document.getElementById("bookingDate");
  const bookingForm = document.getElementById("bookingForm");
  const slotList = document.getElementById("slotList");
  const selectedSlotText = document.getElementById("selectedSlotText");
  const quickDateList = document.getElementById("quickDateList");
  const tenantAdminEntryLink = document.getElementById("tenantAdminEntryLink");
  const progressFill = document.getElementById("progressFill");
  const bookingStepHint = document.getElementById("bookingStepHint");
  const mobileStepLabel = document.getElementById("mobileStepLabel");
  const mobileStepStatus = document.getElementById("mobileStepStatus");
  const stepBackButton = document.getElementById("stepBackButton");
  const stepNextButton = document.getElementById("stepNextButton");
  const bookingMobileBar = document.getElementById("bookingMobileBar");
  const stepScreens = Array.from(document.querySelectorAll("[data-step-screen]"));
  const stepIndicators = Array.from(document.querySelectorAll("[data-step-indicator]"));

  const summaryTargets = {
    company: [
      document.getElementById("summaryCompany"),
      document.getElementById("summaryCompanyAside"),
    ],
    service: [
      document.getElementById("summaryService"),
      document.getElementById("summaryServiceAside"),
    ],
    professional: [
      document.getElementById("summaryProfessional"),
      document.getElementById("summaryProfessionalAside"),
    ],
    date: [
      document.getElementById("summaryDate"),
      document.getElementById("summaryDateAside"),
    ],
    time: [
      document.getElementById("summaryTime"),
      document.getElementById("summaryTimeAside"),
    ],
    price: [
      document.getElementById("summaryPrice"),
      document.getElementById("summaryPriceAside"),
    ],
  };

  const stepMeta = {
    1: {
      title: "Escolha um servico",
      cta: "Escolher profissional",
      hint: "Escolha o servico ideal para iniciar a reserva.",
    },
    2: {
      title: "Escolha um profissional",
      cta: "Escolher data",
      hint: "Agora escolha quem vai realizar o atendimento.",
    },
    3: {
      title: "Escolha uma data",
      cta: "Ver horarios",
      hint: "Selecione um dia para liberar os horarios disponiveis.",
    },
    4: {
      title: "Escolha um horario",
      cta: "Revisar reserva",
      hint: "Toque em um horario disponivel para seguir.",
    },
    5: {
      title: "Revise e confirme",
      cta: "Confirmar agendamento",
      hint: "Confira o resumo e finalize sua reserva.",
    },
  };

  const state = {
    catalog: null,
    selectedSlot: "",
    currentStep: 1,
    userPickedDate: false,
    lastAvailabilityContext: null,
    lastAppointment: null,
    submitting: false,
  };

  if (!slug) {
    window.location.href = "/";
    return;
  }

  tenantAdminEntryLink.href = urls.login;
  bookingDate.min = AppUtils.todayString();
  bookingDate.value = AppUtils.todayString();
  renderQuickDates();
  bindEvents();
  updateFlowUI();

  try {
    const data = await Api.request(`/public/companies/${slug}/catalog`);
    state.catalog = data;

    bookingTitle.textContent = `Agenda de ${data.company.name}`;
    bookingSubtitle.textContent =
      `Fluxo guiado de reserva para ${data.company.name}. Escolha com calma e confirme no final.`;
    renderCompanyCard(data);

    AppUtils.populateSelect(
      bookingService,
      data.services,
      "Selecione um servico",
      (service) =>
        `${service.name} - ${service.durationMinutes} min - ${AppUtils.formatCurrency(service.price)}`
    );
    AppUtils.populateSelect(
      bookingProfessional,
      data.professionals,
      "Selecione um profissional",
      (professional) =>
        professional.specialty
          ? `${professional.name} - ${professional.specialty}`
          : professional.name
    );

    renderServiceCards(data.services);
    renderProfessionalCards(data.professionals);

    bookingService.disabled = false;
    bookingProfessional.disabled = false;
    setText(summaryTargets.company, data.company.name);
    updateSummary();
    updateQuickDateAvailability();
    renderSlots([]);
    updateFlowUI();
  } catch (error) {
    bookingTitle.textContent = "Espaco nao encontrado";
    bookingSubtitle.textContent = "Confira a URL ou volte ao portal.";
    bookingCompanyCard.innerHTML = `
      <h2>Espaco indisponivel</h2>
      <p class="muted">${AppUtils.escapeHtml(error.message)}</p>
    `;
    bookingExperience.hidden = true;
    bookingMobileBar.hidden = true;
    AppUtils.showMessage(bookingMessage, error.message, "error");
  }

  function bindEvents() {
    bookingService.addEventListener("change", async () => {
      await handleServiceSelection(bookingService.value);
    });

    bookingProfessional.addEventListener("change", async () => {
      await handleProfessionalSelection(bookingProfessional.value);
    });

    bookingDate.addEventListener("change", async () => {
      state.userPickedDate = true;
      await handleDateSelection(bookingDate.value);
    });

    bookingForm.addEventListener("submit", handleAppointmentSubmit);
    bookingForm.addEventListener("input", updateFlowUI);

    stepBackButton.addEventListener("click", goToPreviousStep);
    stepNextButton.addEventListener("click", handleNextAction);

    stepIndicators.forEach((button) => {
      button.addEventListener("click", () => {
        const requestedStep = Number(button.dataset.stepIndicator);

        if (canOpenStep(requestedStep)) {
          state.currentStep = requestedStep;
          updateFlowUI();
        }
      });
    });

    successRestartButton.addEventListener("click", () => {
      resetFlow();
      bookingSuccess.hidden = true;
      bookingExperience.hidden = false;
      bookingMobileBar.hidden = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    successBackToStartButton.addEventListener("click", () => {
      resetFlow();
      bookingSuccess.hidden = true;
      bookingExperience.hidden = false;
      bookingMobileBar.hidden = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function renderCompanyCard(data) {
    bookingCompanyCard.innerHTML = `
      <div class="booking-company-card__content">
        <div>
          <span class="booking-showcase-card__label">Espaco da empresa</span>
          <h2>${AppUtils.escapeHtml(data.company.name)}</h2>
          <p class="muted">
            ${AppUtils.escapeHtml(data.company.segment)} com agendamento simples, rapido e claro em qualquer tela.
          </p>
        </div>
        <div class="booking-company-card__trust">
          <span>Confirmacao imediata</span>
          <span>Experiencia mobile-first</span>
          <span>Fluxo guiado</span>
        </div>
      </div>
      <div class="booking-company-stats">
        <div class="booking-company-stat">
          <span>Agenda publica</span>
          <strong>${urls.booking}</strong>
        </div>
        <div class="booking-company-stat">
          <span>Servicos</span>
          <strong>${data.services.length}</strong>
        </div>
        <div class="booking-company-stat">
          <span>Profissionais</span>
          <strong>${data.professionals.length}</strong>
        </div>
      </div>
    `;
  }

  function renderServiceCards(services) {
    if (!services || services.length === 0) {
      serviceCards.innerHTML = '<p class="empty-state">Nenhum servico ativo disponivel.</p>';
      return;
    }

    serviceCards.innerHTML = services
      .map(
        (service) => `
          <button class="option-card option-card--service" type="button" data-service-id="${service.id}">
            <span class="option-card__status">Disponivel</span>
            <span class="option-card__title">${AppUtils.escapeHtml(service.name)}</span>
            <span class="option-card__meta">${service.durationMinutes} min</span>
            <span class="option-card__description">${AppUtils.escapeHtml(
              service.description || "Atendimento com reserva imediata."
            )}</span>
            <span class="option-card__footer">
              <strong class="option-card__price">${AppUtils.formatCurrency(service.price)}</strong>
              <span class="option-card__action">Selecionar</span>
            </span>
          </button>
        `
      )
      .join("");

    serviceCards.querySelectorAll("[data-service-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        await handleServiceSelection(button.dataset.serviceId);
      });
    });
  }

  function renderProfessionalCards(professionals) {
    if (!professionals || professionals.length === 0) {
      professionalCards.innerHTML = '<p class="empty-state">Nenhum profissional ativo disponivel.</p>';
      return;
    }

    professionalCards.innerHTML = professionals
      .map(
        (professional) => `
          <button class="option-card option-card--person" type="button" data-professional-id="${professional.id}">
            <span class="option-card__status">${
              hasAnyAvailability(professional.availability) ? "Agenda ativa" : "Sem agenda"
            }</span>
            <span class="option-card__title">${AppUtils.escapeHtml(professional.name)}</span>
            <span class="option-card__meta">${
              professional.specialty
                ? AppUtils.escapeHtml(professional.specialty)
                : "Profissional disponivel"
            }</span>
            <span class="option-card__description">${AppUtils.escapeHtml(
              buildAvailabilityPreview(professional.availability)
            )}</span>
            <span class="option-card__footer">
              <span class="option-card__action">Selecionar profissional</span>
            </span>
          </button>
        `
      )
      .join("");

    professionalCards.querySelectorAll("[data-professional-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        await handleProfessionalSelection(button.dataset.professionalId);
      });
    });
  }

  async function handleServiceSelection(serviceId) {
    bookingService.value = serviceId;
    state.selectedSlot = "";
    bookingForm.elements.selectedSlot.value = "";
    updateServiceSelectionUI();
    updateSummary();
    updateSelectionHint();

    if (bookingService.value) {
      state.currentStep = 2;
    }

    await refreshAvailability();
    updateFlowUI();
  }

  async function handleProfessionalSelection(professionalId) {
    bookingProfessional.value = professionalId;
    state.selectedSlot = "";
    bookingForm.elements.selectedSlot.value = "";
    updateProfessionalSelectionUI();
    updateQuickDateAvailability();
    ensureDateMatchesAvailability();
    updateSummary();
    updateSelectionHint();

    if (bookingProfessional.value) {
      state.currentStep = 3;
    }

    await refreshAvailability();
    updateFlowUI();
  }

  function updateServiceSelectionUI() {
    const selectedId = String(bookingService.value || "");

    serviceCards.querySelectorAll("[data-service-id]").forEach((button) => {
      button.classList.toggle("active", button.dataset.serviceId === selectedId);
    });
  }

  function updateProfessionalSelectionUI() {
    const selectedId = String(bookingProfessional.value || "");

    professionalCards.querySelectorAll("[data-professional-id]").forEach((button) => {
      button.classList.toggle("active", button.dataset.professionalId === selectedId);
    });
  }

  function updateSummary() {
    const selectedService = getSelectedService();
    const selectedProfessional = getSelectedProfessional();
    const selectedDate =
      selectedService && selectedProfessional && bookingDate.value
        ? formatHumanDate(bookingDate.value)
        : "Nao selecionada";

    setText(summaryTargets.service, selectedService ? selectedService.name : "Nao selecionado");
    setText(
      summaryTargets.professional,
      selectedProfessional ? selectedProfessional.name : "Nao selecionado"
    );
    setText(summaryTargets.date, selectedDate);
    setText(summaryTargets.time, state.selectedSlot || "Nao selecionado");
    setText(
      summaryTargets.price,
      selectedService ? AppUtils.formatCurrency(selectedService.price) : "--"
    );
  }

  function renderQuickDates() {
    const baseDate = createLocalDate(AppUtils.todayString());

    quickDateList.innerHTML = Array.from({ length: 8 }, (_, index) => {
      const currentDate = new Date(baseDate);
      currentDate.setDate(baseDate.getDate() + index);
      const isoDate = formatIsoDate(currentDate);
      const weekday = currentDate.toLocaleDateString("pt-BR", { weekday: "short" });
      const dayMonth = currentDate.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      });

      return `
        <button class="booking-quick-date" type="button" data-date="${isoDate}">
          <span>${AppUtils.escapeHtml(weekday.replace(".", ""))}</span>
          <strong>${AppUtils.escapeHtml(dayMonth)}</strong>
          <small>Disponivel</small>
        </button>
      `;
    }).join("");

    quickDateList.querySelectorAll("[data-date]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (button.disabled) {
          return;
        }

        state.userPickedDate = true;
        await handleDateSelection(button.dataset.date);
      });
    });

    updateQuickDateSelectionUI();
  }

  async function handleDateSelection(dateValue) {
    bookingDate.value = dateValue;
    state.selectedSlot = "";
    bookingForm.elements.selectedSlot.value = "";
    updateQuickDateSelectionUI();
    updateSummary();
    updateSelectionHint();

    if (bookingDate.value) {
      state.currentStep = 4;
    }

    await refreshAvailability();
    updateFlowUI();
  }

  function updateQuickDateAvailability() {
    const professional = getSelectedProfessional();

    quickDateList.querySelectorAll("[data-date]").forEach((button) => {
      const hasAvailability =
        !professional || getIntervalsForDate(professional.availability, button.dataset.date).length > 0;

      button.disabled = !hasAvailability;
      button.classList.toggle("is-available", hasAvailability);
      button.classList.toggle("is-unavailable", !hasAvailability);

      const caption = button.querySelector("small");

      if (caption) {
        caption.textContent = hasAvailability ? "Disponivel" : "Indisponivel";
      }
    });

    updateQuickDateSelectionUI();
  }

  function ensureDateMatchesAvailability() {
    const professional = getSelectedProfessional();

    if (!professional || state.userPickedDate) {
      return;
    }

    if (getIntervalsForDate(professional.availability, bookingDate.value).length > 0) {
      return;
    }

    const nextDate = getNextAvailableDate(professional.availability, bookingDate.value);

    if (nextDate) {
      bookingDate.value = nextDate;
    }
  }

  function updateQuickDateSelectionUI() {
    const selectedDate = bookingDate.value;

    quickDateList.querySelectorAll("[data-date]").forEach((button) => {
      button.classList.toggle("active", button.dataset.date === selectedDate);
    });
  }

  async function refreshAvailability() {
    AppUtils.showMessage(bookingMessage, "");
    state.selectedSlot = "";
    state.lastAvailabilityContext = null;
    bookingForm.elements.selectedSlot.value = "";
    updateSelectionHint();
    updateSummary();

    if (!bookingService.value || !bookingProfessional.value || !bookingDate.value) {
      renderSlots([]);
      return;
    }

    const selectedProfessional = getSelectedProfessional();
    const selectedService = getSelectedService();
    const context = {
      professional: selectedProfessional,
      service: selectedService,
      date: bookingDate.value,
    };

    if (!selectedProfessional) {
      renderSlots([]);
      return;
    }

    state.lastAvailabilityContext = context;

    if (!hasAnyAvailability(selectedProfessional.availability)) {
      renderSlots([], context);
      updateSelectionHint();
      return;
    }

    try {
      const params = new URLSearchParams({
        serviceId: bookingService.value,
        professionalId: bookingProfessional.value,
        date: bookingDate.value,
      });

      const data = await Api.request(
        `/public/companies/${slug}/availability?${params.toString()}`
      );

      renderSlots(data.slots, context);
    } catch (error) {
      slotList.innerHTML = '<p class="empty-state">Nao foi possivel carregar os horarios.</p>';
      AppUtils.showMessage(bookingMessage, error.message, "error");
    }
  }

  function renderSlots(slots, context = state.lastAvailabilityContext || {}) {
    if (!slots || slots.length === 0) {
      slotList.innerHTML = `
        <div class="booking-empty-state">
          <strong>Nenhum horario liberado para esta etapa.</strong>
          <p>${AppUtils.escapeHtml(buildNoSlotsMessage(context))}</p>
        </div>
      `;
      updateSelectionHint();
      return;
    }

    slotList.innerHTML = slots
      .map(
        (slot) => `
          <button class="slot-button slot-button--premium" type="button" data-slot="${slot.startTime}">
            <span class="slot-button__time">${slot.startTime}</span>
            <span class="slot-button__meta">ate ${slot.endTime}</span>
          </button>
        `
      )
      .join("");

    slotList.querySelectorAll("[data-slot]").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedSlot = button.dataset.slot;
        bookingForm.elements.selectedSlot.value = button.dataset.slot;
        state.currentStep = 5;
        updateSummary();
        updateSelectionHint();

        slotList.querySelectorAll("[data-slot]").forEach((item) => {
          item.classList.toggle("active", item === button);
        });

        updateFlowUI();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });
  }

  function updateSelectionHint() {
    if (state.selectedSlot) {
      selectedSlotText.textContent = `Horario selecionado: ${state.selectedSlot}`;
      return;
    }

    if (bookingDate.value && bookingProfessional.value && bookingService.value) {
      selectedSlotText.textContent = `Data escolhida: ${formatHumanDate(bookingDate.value)}. Agora escolha um horario.`;
      return;
    }

    selectedSlotText.textContent = "Selecione o dia para liberar os horarios disponiveis.";
  }

  function updateFlowUI() {
    const maxUnlockedStep = getMaxUnlockedStep();

    stepScreens.forEach((screen) => {
      const step = Number(screen.dataset.stepScreen);
      screen.classList.toggle("is-active", step === state.currentStep);
    });

    stepIndicators.forEach((button) => {
      const step = Number(button.dataset.stepIndicator);
      button.classList.toggle("is-current", step === state.currentStep);
      button.classList.toggle("is-complete", step < state.currentStep && step <= maxUnlockedStep);
      button.classList.toggle("is-available", step <= maxUnlockedStep);
      button.disabled = !canOpenStep(step);
      button.setAttribute("aria-current", step === state.currentStep ? "step" : "false");
    });

    progressFill.style.width = `${Math.max(((state.currentStep - 1) / 4) * 100, 6)}%`;
    mobileStepLabel.textContent = `Etapa ${state.currentStep} de 5`;
    mobileStepStatus.textContent = stepMeta[state.currentStep].title;
    bookingStepHint.textContent = buildStepHint();
    bookingMobileBar.hidden = state.currentStep === 5;

    stepBackButton.hidden = state.currentStep === 1;
    stepNextButton.textContent = stepMeta[state.currentStep].cta;
    stepNextButton.disabled = !canAdvanceFromCurrentStep();
    stepNextButton.classList.toggle("is-loading", state.submitting);
  }

  function handleNextAction() {
    if (state.currentStep === 5) {
      bookingForm.requestSubmit();
      return;
    }

    if (!canAdvanceFromCurrentStep()) {
      return;
    }

    state.currentStep += 1;
    updateFlowUI();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToPreviousStep() {
    if (state.currentStep === 1) {
      return;
    }

    state.currentStep -= 1;
    updateFlowUI();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function canOpenStep(step) {
    return step >= 1 && step <= getMaxUnlockedStep();
  }

  function getMaxUnlockedStep() {
    if (!bookingService.value) {
      return 1;
    }

    if (!bookingProfessional.value) {
      return 2;
    }

    if (!bookingDate.value) {
      return 3;
    }

    if (!state.selectedSlot) {
      return 4;
    }

    return 5;
  }

  function canAdvanceFromCurrentStep() {
    if (state.submitting) {
      return false;
    }

    switch (state.currentStep) {
      case 1:
        return Boolean(bookingService.value);
      case 2:
        return Boolean(bookingProfessional.value);
      case 3:
        return Boolean(bookingDate.value);
      case 4:
        return Boolean(state.selectedSlot);
      case 5:
        return Boolean(state.selectedSlot) && bookingForm.checkValidity();
      default:
        return false;
    }
  }

  function buildStepHint() {
    if (state.currentStep === 4 && !state.selectedSlot && state.lastAvailabilityContext) {
      return buildNoSlotsMessage(state.lastAvailabilityContext);
    }

    return stepMeta[state.currentStep].hint;
  }

  function getSelectedService() {
    return state.catalog?.services?.find(
      (service) => String(service.id) === String(bookingService.value)
    );
  }

  function getSelectedProfessional() {
    return state.catalog?.professionals?.find(
      (professional) => String(professional.id) === String(bookingProfessional.value)
    );
  }

  function hasAnyAvailability(availability) {
    return Object.values(availability || {}).some((ranges) => Array.isArray(ranges) && ranges.length > 0);
  }

  function buildAvailabilityPreview(availability) {
    const activeDays = AppUtils.weekDays
      .filter((day) => Array.isArray(availability?.[day.key]) && availability[day.key].length > 0)
      .map((day) => day.label);

    if (activeDays.length === 0) {
      return "Sem horarios definidos";
    }

    if (activeDays.length <= 3) {
      return `Atende em ${activeDays.join(", ")}`;
    }

    return `Atende em ${activeDays.slice(0, 3).join(", ")} e mais ${activeDays.length - 3} dia(s)`;
  }

  function buildNoSlotsMessage({ professional, service, date }) {
    if (!bookingService.value || !bookingProfessional.value || !bookingDate.value) {
      return "Escolha servico, profissional e data para ver os horarios.";
    }

    if (!professional || !date) {
      return "Nao encontramos horarios para essa combinacao.";
    }

    const intervals = getIntervalsForDate(professional.availability, date);
    const nextDates = getNextAvailableDates(professional.availability, date);
    const nextDatesText = nextDates.length > 0 ? ` Tente ${nextDates.join(", ")}.` : "";

    if (!hasAnyAvailability(professional.availability)) {
      return "Este profissional ainda nao possui horarios configurados.";
    }

    if (intervals.length === 0) {
      return `Esse profissional nao atende em ${formatWeekDayLabel(date)}.${nextDatesText}`;
    }

    const serviceDuration = Number(service?.durationMinutes || 0);
    const largestInterval = Math.max(
      ...intervals.map((interval) => timeRangeInMinutes(interval.start, interval.end)),
      0
    );

    if (serviceDuration > 0 && largestInterval < serviceDuration) {
      return `Esse servico dura ${serviceDuration} min e nao cabe nas faixas de ${formatWeekDayLabel(date)}.${nextDatesText}`;
    }

    return `Nao ha horarios livres em ${formatHumanDate(date)}.${nextDatesText}`;
  }

  function getIntervalsForDate(availability, date) {
    const weekDay = String(createLocalDate(date).getDay());
    return Array.isArray(availability?.[weekDay]) ? availability[weekDay] : [];
  }

  function getNextAvailableDate(availability, startDate) {
    for (let offset = 0; offset <= 14; offset += 1) {
      const candidateDate = addDaysToIsoDate(startDate, offset);

      if (getIntervalsForDate(availability, candidateDate).length > 0) {
        return candidateDate;
      }
    }

    return "";
  }

  function getNextAvailableDates(availability, startDate, limit = 3) {
    const suggestions = [];

    for (let offset = 1; offset <= 14 && suggestions.length < limit; offset += 1) {
      const candidateDate = addDaysToIsoDate(startDate, offset);

      if (getIntervalsForDate(availability, candidateDate).length > 0) {
        suggestions.push(formatCompactDate(candidateDate));
      }
    }

    return suggestions;
  }

  function formatWeekDayLabel(date) {
    return weekdayFormatter.format(createLocalDate(date));
  }

  function formatCompactDate(date) {
    const localDate = createLocalDate(date);
    return `${weekdayFormatter.format(localDate).replace("-feira", "")} ${shortDateFormatter.format(localDate)}`;
  }

  function formatHumanDate(date) {
    return fullDateFormatter.format(createLocalDate(date));
  }

  function addDaysToIsoDate(date, daysToAdd) {
    const value = createLocalDate(date);
    value.setDate(value.getDate() + daysToAdd);

    return formatIsoDate(value);
  }

  function createLocalDate(date) {
    const [year, month, day] = String(date).split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function timeRangeInMinutes(start, end) {
    return parseTime(start) >= 0 && parseTime(end) >= 0 ? parseTime(end) - parseTime(start) : 0;
  }

  function parseTime(value) {
    const [hours, minutes] = String(value || "00:00").split(":").map(Number);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return -1;
    }

    return hours * 60 + minutes;
  }

  function formatIsoDate(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  }

  function setText(elements, value) {
    elements.filter(Boolean).forEach((element) => {
      element.textContent = value;
    });
  }

  async function handleAppointmentSubmit(event) {
    event.preventDefault();
    AppUtils.showMessage(bookingMessage, "");

    if (!state.selectedSlot) {
      AppUtils.showMessage(
        bookingMessage,
        "Escolha um horario disponivel antes de confirmar.",
        "error"
      );
      state.currentStep = 4;
      updateFlowUI();
      return;
    }

    if (!bookingForm.reportValidity()) {
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
      state.submitting = true;
      updateFlowUI();

      const data = await Api.request(`/public/companies/${slug}/appointments`, {
        method: "POST",
        body: payload,
      });

      state.lastAppointment = data.appointment;
      AppUtils.showMessage(
        bookingMessage,
        `Agendamento confirmado para ${formatHumanDate(data.appointment.appointmentDate)} as ${data.appointment.startTime}.`,
        "success"
      );

      renderSuccessState(data.appointment);
      bookingExperience.hidden = true;
      bookingMobileBar.hidden = true;
      bookingSuccess.hidden = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      AppUtils.showMessage(bookingMessage, error.message, "error");
    } finally {
      state.submitting = false;
      updateFlowUI();
    }
  }

  function renderSuccessState(appointment) {
    const selectedService = getSelectedService();
    const selectedProfessional = getSelectedProfessional();

    bookingSuccessSummary.innerHTML = `
      <div class="booking-success-summary__item">
        <span>Empresa</span>
        <strong>${AppUtils.escapeHtml(state.catalog?.company?.name || "Sua empresa")}</strong>
      </div>
      <div class="booking-success-summary__item">
        <span>Servico</span>
        <strong>${AppUtils.escapeHtml(selectedService?.name || "--")}</strong>
      </div>
      <div class="booking-success-summary__item">
        <span>Profissional</span>
        <strong>${AppUtils.escapeHtml(selectedProfessional?.name || "--")}</strong>
      </div>
      <div class="booking-success-summary__item">
        <span>Quando</span>
        <strong>${AppUtils.escapeHtml(formatHumanDate(appointment.appointmentDate))} as ${AppUtils.escapeHtml(appointment.startTime)}</strong>
      </div>
      <div class="booking-success-summary__item">
        <span>Cliente</span>
        <strong>${AppUtils.escapeHtml(appointment.clientName)}</strong>
      </div>
      <div class="booking-success-summary__item">
        <span>Valor</span>
        <strong>${AppUtils.escapeHtml(AppUtils.formatCurrency(appointment.price))}</strong>
      </div>
    `;
  }

  function resetFlow() {
    AppUtils.showMessage(bookingMessage, "");
    bookingForm.reset();
    bookingService.value = "";
    bookingProfessional.value = "";
    bookingForm.elements.selectedSlot.value = "";
    bookingDate.value = AppUtils.todayString();
    state.selectedSlot = "";
    state.currentStep = 1;
    state.userPickedDate = false;
    state.lastAvailabilityContext = null;
    state.lastAppointment = null;
    updateServiceSelectionUI();
    updateProfessionalSelectionUI();
    updateQuickDateAvailability();
    updateQuickDateSelectionUI();
    renderSlots([]);
    updateSelectionHint();
    updateSummary();
    updateFlowUI();
  }
});
