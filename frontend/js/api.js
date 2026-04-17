(function attachApi(windowObject) {
  const STORAGE_KEY = "multiTenantSession";

  function getSession() {
    try {
      return JSON.parse(windowObject.localStorage.getItem(STORAGE_KEY) || "null");
    } catch (error) {
      return null;
    }
  }

  function saveSession(session) {
    windowObject.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  function clearSession() {
    windowObject.localStorage.removeItem(STORAGE_KEY);
  }

  async function request(path, options = {}) {
    const session = getSession();
    const headers = { ...(options.headers || {}) };

    if (options.body !== undefined && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    if (session?.token) {
      headers.Authorization = `Bearer ${session.token}`;
    }

    const response = await fetch(`/api${path}`, {
      method: options.method || "GET",
      headers,
      body:
        options.body === undefined
          ? undefined
          : options.body instanceof FormData
            ? options.body
            : JSON.stringify(options.body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Falha ao processar a requisição.");
    }

    return data;
  }

  windowObject.Api = {
    request,
    getSession,
    saveSession,
    clearSession,
  };
})(window);
