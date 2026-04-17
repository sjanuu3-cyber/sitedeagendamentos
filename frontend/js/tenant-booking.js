document.addEventListener("DOMContentLoaded", async () => {
  const slug = AppUtils.getTenantSlugFromPath();
  const urls = AppUtils.buildTenantUrls(slug);
  const weekdayFormatter = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
  });
  const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
  const bookingTitle = document.getElementById("bookingTitle");
  const bookingSubtitle = document.getElementById("bookingSubtitle");
  const bookingCompanyCard = document.getElementById("bookingCompanyCard");
  const bookingMessage = document.getElementById("bookingMessage");
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
  const summaryCompany = document.getElementById("summaryCompany");
  const summaryService = document.getElementById("summaryService");
  const summaryProfessional = document.getElementById("summaryProfessional");
  const summaryDate = document.getElementById("summaryDate");
  const summaryTime = document.getElementById("summaryTime");
  const summaryPrice = document.getElementById("summaryPrice");

  const state = {
    catalog: null,
    selectedSlot: "",
  };

  if (!slug) {
    window.location.href = "/";
    return;
  }

  tenantAdminEntryLink.href = urls.login;
  bookingDate.min = AppUtils.todayString();
  bookingDate.value = AppUtils.todayString();
  renderQuickDates();

  bookingService.addEventListener("change", refreshAvailability);
  bookingProfessional.addEventListener("change", refreshAvailability);
  bookingDate.addEventListener("change", async () => {
    updateQuickDateSelectionUI();
    updateSummary();
    await refreshAvailability();
  });
  bookingForm.addEventListener("submit", handleAppointmentSubmit);

  try {
    const data = await Api.request(`/public/companies/${slug}/catalog`);
    state.catalog = data;

    bookingTitle.textContent = `Agenda online de ${data.company.name}`;
    bookingSubtitle.textContent = `Escolha um servico e reserve um horario com a equipe de ${data.company.name}.`;
    renderCompanyCard(data);
    summaryCompany.textContent = data.company.name;

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
    updateSummary();
  } catch (error) {
    bookingTitle.textContent = "Espaco nao encontrado";
    bookingSubtitle.textContent = "Confira a URL ou volte ao portal.";
    bookingCompanyCard.innerHTML = `
      <h2>Espaco indisponivel</h2>
      <p class="muted">${AppUtils.escapeHtml(error.message)}</p>
    `;
    AppUtils.showMessage(bookingMessage, error.message, "error");
  }

  function renderCompanyCard(data) {
    bookingCompanyCard.innerHTML = `
      <div class="booking-hero-card__header">
        <div>
          <span class="eyebrow">Espaco da empresa</span>
          <h2>${AppUtils.escapeHtml(data.company.name)}</h2>
        </div>
        <div class="booking-hero-card__badge">
          ${AppUtils.escapeHtml(data.company.segment)}
        </div>
      </div>
      <div class="booking-hero-metrics">
        <div class="booking-metric">
          <span>Agenda publica</span>
          <strong>${urls.booking}</strong>
        </div>
        <div class="booking-metric">
          <span>Login da empresa</span>
          <strong>${urls.login}</strong>
        </div>
        <div class="booking-metric">
          <span>Servicos ativos</span>
          <strong>${data.services.length}</strong>
        </div>
        <div class="booking-metric">
          <span>Profissionais ativos</span>
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
          <button
            class="option-card"
            type="button"
            data-service-id="${service.id}"
          >
            <span class="option-card__title">${AppUtils.escapeHtml(service.name)}</span>
            <span class="option-card__meta">${service.durationMinutes} min</span>
            <span class="option-card__price">${AppUtils.formatCurrency(service.price)}</span>
          </button>
        `
      )
      .join("");

    serviceCards.querySelectorAll("[data-service-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        bookingService.value = button.dataset.serviceId;
        updateServiceSelectionUI();
        updateSummary();
        await refreshAvailability();
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
          <button
            class="option-card option-card--person"
            type="button"
            data-professional-id="${professional.id}"
          >
            <span class="option-card__title">${AppUtils.escapeHtml(professional.name)}</span>
            <span class="option-card__meta">${
              professional.specialty
                ? AppUtils.escapeHtml(professional.specialty)
                : "Profissional disponivel"
            }</span>
            <span class="option-card__meta">${AppUtils.escapeHtml(
              buildAvailabilityPreview(professional.availability)
            )}</span>
          </button>
        `
      )
      .join("");

    professionalCards.querySelectorAll("[data-professional-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        bookingProfessional.value = button.dataset.professionalId;
        updateProfessionalSelectionUI();
        updateSummary();
        await refreshAvailability();
      });
    });
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
    const selectedService = state.catalog?.services?.find(
      (service) => String(service.id) === String(bookingService.value)
    );
    const selectedProfessional = state.catalog?.professionals?.find(
      (professional) => String(professional.id) === String(bookingProfessional.value)
    );

    summaryService.textContent = selectedService ? selectedService.name : "Nao selecionado";
    summaryProfessional.textContent = selectedProfessional
      ? selectedProfessional.name
      : "Nao selecionado";
    summaryDate.textContent = bookingDate.value || "Nao selecionada";
    summaryTime.textContent = state.selectedSlot || "Nao selecionado";
    summaryPrice.textContent = selectedService
      ? AppUtils.formatCurrency(selectedService.price)
      : "--";
  }

  function renderQuickDates() {
    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);

    quickDateList.innerHTML = Array.from({ length: 7 }, (_, index) => {
      const currentDate = new Date(baseDate);
      currentDate.setDate(baseDate.getDate() + index);

      const isoDate = [
        currentDate.getFullYear(),
        String(currentDate.getMonth() + 1).padStart(2, "0"),
        String(currentDate.getDate()).padStart(2, "0"),
      ].join("-");

      const weekday = currentDate.toLocaleDateString("pt-BR", {
        weekday: "short",
      });
      const dayMonth = currentDate.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      });

      return `
        <button
          class="booking-quick-date"
          type="button"
          data-date="${isoDate}"
        >
          <span>${AppUtils.escapeHtml(weekday.replace(".", ""))}</span>
          <strong>${AppUtils.escapeHtml(dayMonth)}</strong>
        </button>
      `;
    }).join("");

    quickDateList.querySelectorAll("[data-date]").forEach((button) => {
      button.addEventListener("click", async () => {
        bookingDate.value = button.dataset.date;
        updateQuickDateSelectionUI();
        updateSummary();
        await refreshAvailability();
      });
    });

    updateQuickDateSelectionUI();
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
    bookingForm.elements.selectedSlot.value = "";
    selectedSlotText.textContent = "Nenhum horario selecionado.";
    updateSummary();

    if (!bookingService.value || !bookingProfessional.value || !bookingDate.value) {
      slotList.innerHTML = '<p class="empty-state">Escolha servico, profissional e data.</p>';
      return;
    }

    const selectedProfessional = getSelectedProfessional();
    const selectedService = getSelectedService();

    if (!selectedProfessional) {
      slotList.innerHTML = '<p class="empty-state">Escolha um profissional valido para ver os horarios.</p>';
      return;
    }

    if (!hasAnyAvailability(selectedProfessional.availability)) {
      slotList.innerHTML =
        '<p class="empty-state">Este profissional ainda nao possui horarios configurados.</p>';
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

      renderSlots(data.slots, {
        professional: selectedProfessional,
        service: selectedService,
        date: bookingDate.value,
      });
    } catch (error) {
      slotList.innerHTML = '<p class="empty-state">Nao foi possivel carregar os horarios.</p>';
      AppUtils.showMessage(bookingMessage, error.message, "error");
    }
  }

  function renderSlots(slots, context = {}) {
    if (!slots || slots.length === 0) {
      slotList.innerHTML = `<p class="empty-state">${AppUtils.escapeHtml(
        buildNoSlotsMessage(context)
      )}</p>`;
      return;
    }

    slotList.innerHTML = slots
      .map(
        (slot) => `
          <button class="slot-button" type="button" data-slot="${slot.startTime}">
            ${slot.startTime} - ${slot.endTime}
          </button>
        `
      )
      .join("");

    slotList.querySelectorAll("[data-slot]").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedSlot = button.dataset.slot;
        bookingForm.elements.selectedSlot.value = button.dataset.slot;
        selectedSlotText.textContent = `Horario selecionado: ${button.dataset.slot}`;
        updateSummary();

        slotList.querySelectorAll("[data-slot]").forEach((item) => {
          item.classList.toggle("active", item === button);
        });
      });
    });
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
    if (!professional || !date) {
      return "Nenhum horario disponivel para esta combinacao.";
    }

    const intervals = getIntervalsForDate(professional.availability, date);
    const nextDates = getNextAvailableDates(professional.availability, date);
    const nextDatesText = nextDates.length > 0 ? ` Tente ${nextDates.join(", ")}.` : "";

    if (intervals.length === 0) {
      return `Esse profissional nao atende em ${formatWeekDayLabel(date)}.${nextDatesText}`;
    }

    const serviceDuration = Number(service?.durationMinutes || 0);
    const largestInterval = Math.max(
      ...intervals.map((interval) => timeRangeInMinutes(interval.start, interval.end)),
      0
    );

    if (serviceDuration > 0 && largestInterval < serviceDuration) {
      return `O servico selecionado dura ${serviceDuration} min e nao cabe nas faixas de ${formatWeekDayLabel(date)}.${nextDatesText}`;
    }

    return `Nao ha horarios livres em ${formatFullDateLabel(date)}.${nextDatesText}`;
  }

  function getIntervalsForDate(availability, date) {
    const weekDay = String(getWeekDayNumber(date));
    return Array.isArray(availability?.[weekDay]) ? availability[weekDay] : [];
  }

  function getNextAvailableDates(availability, startDate, limit = 3) {
    const suggestions = [];

    for (let offset = 1; offset <= 14 && suggestions.length < limit; offset += 1) {
      const candidateDate = addDaysToIsoDate(startDate, offset);

      if (getIntervalsForDate(availability, candidateDate).length > 0) {
        suggestions.push(formatShortDateLabel(candidateDate));
      }
    }

    return suggestions;
  }

  function formatWeekDayLabel(date) {
    return weekdayFormatter.format(createLocalDate(date));
  }

  function formatShortDateLabel(date) {
    return `${weekdayFormatter.format(createLocalDate(date)).replace("-feira", "")} ${shortDateFormatter.format(createLocalDate(date))}`;
  }

  function formatFullDateLabel(date) {
    return `${formatWeekDayLabel(date)} (${shortDateFormatter.format(createLocalDate(date))})`;
  }

  function getWeekDayNumber(date) {
    return createLocalDate(date).getDay();
  }

  function addDaysToIsoDate(date, daysToAdd) {
    const value = createLocalDate(date);
    value.setDate(value.getDate() + daysToAdd);

    return [
      value.getFullYear(),
      String(value.getMonth() + 1).padStart(2, "0"),
      String(value.getDate()).padStart(2, "0"),
    ].join("-");
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

  async function handleAppointmentSubmit(event) {
    event.preventDefault();
    AppUtils.showMessage(bookingMessage, "");

    if (!state.selectedSlot) {
      AppUtils.showMessage(bookingMessage, "Escolha um horario disponivel antes de confirmar.", "error");
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
      const data = await Api.request(`/public/companies/${slug}/appointments`, {
        method: "POST",
        body: payload,
      });

      AppUtils.showMessage(
        bookingMessage,
        `Agendamento confirmado para ${data.appointment.appointmentDate} as ${data.appointment.startTime}.`,
        "success"
      );

      bookingForm.reset();
      bookingService.value = "";
      bookingProfessional.value = "";
      bookingForm.elements.selectedSlot.value = "";
      state.selectedSlot = "";
      selectedSlotText.textContent = "Nenhum horario selecionado.";
      bookingDate.value = AppUtils.todayString();
      updateServiceSelectionUI();
      updateProfessionalSelectionUI();
      updateQuickDateSelectionUI();
      updateSummary();
      await refreshAvailability();
    } catch (error) {
      AppUtils.showMessage(bookingMessage, error.message, "error");
    }
  }

  bookingDate.addEventListener("change", updateSummary);
});
