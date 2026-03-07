export function createAuthModule({
  apiClient,
  authStorage,
  setStatus,
  setTab,
  onSessionChange,
}) {
  const openAuthBtn = document.getElementById("open-auth");
  const openProfileBtn = document.getElementById("open-profile");
  const tabPerfilBtn = document.getElementById("tab-perfil");

  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const verifyForm = document.getElementById("verify-form");
  const forgotForm = document.getElementById("forgot-form");
  const resetForm = document.getElementById("reset-form");

  const showLoginFormBtn = document.getElementById("show-login-form");
  const showRegisterFormBtn = document.getElementById("show-register-form");
  const switchToRegisterBtn = document.getElementById("switch-to-register");
  const switchToForgotBtn = document.getElementById("switch-to-forgot");
  const switchToVerifyBtn = document.getElementById("switch-to-verify");
  const switchToResetBtn = document.getElementById("switch-to-reset");
  const switchToLoginBtn = document.getElementById("switch-to-login");
  const switchToForgotFromResetBtn = document.getElementById("switch-to-forgot-from-reset");
  const switchToLoginFromForgotBtn = document.getElementById("switch-to-login-from-forgot");
  const switchToLoginFromResetBtn = document.getElementById("switch-to-login-from-reset");
  const switchToLoginFromVerifyBtn = document.getElementById("switch-to-login-from-verify");

  const registerPassword = document.getElementById("register-password");
  const registerPasswordConfirm = document.getElementById("register-password-confirm");
  const passwordMatchIcon = document.getElementById("password-match-icon");
  const passwordMatchText = document.getElementById("password-match-text");

  const loginEmailInput = document.getElementById("login-email");
  const loginPasswordInput = document.getElementById("login-password");
  const registerNameInput = document.getElementById("register-name");
  const registerEmailInput = document.getElementById("register-email");
  const verifyEmailInput = document.getElementById("verify-email");
  const verifyCodeInput = document.getElementById("verify-code");
  const forgotEmailInput = document.getElementById("forgot-email");
  const resetTokenInput = document.getElementById("reset-token");
  const resetPasswordInput = document.getElementById("reset-password");
  const resetPasswordConfirmInput = document.getElementById("reset-password-confirm");
  const authMessageEl = document.getElementById("auth-message");

  let authSession = null;
  let authBusy = false;

  function notifySessionChange() {
    onSessionChange?.(authSession, isAuthenticated());
  }

  function setAuthView(view) {
    const showLogin = view === "login";
    const showRegister = view === "register";
    const showVerify = view === "verify";
    const showForgot = view === "forgot";
    const showReset = view === "reset";

    loginForm?.classList.toggle("hidden", !showLogin);
    registerForm?.classList.toggle("hidden", !showRegister);
    verifyForm?.classList.toggle("hidden", !showVerify);
    forgotForm?.classList.toggle("hidden", !showForgot);
    resetForm?.classList.toggle("hidden", !showReset);
    showLoginFormBtn?.classList.toggle("active", showLogin);
    showRegisterFormBtn?.classList.toggle("active", showRegister);
  }

  function isAuthenticated() {
    return Boolean(authSession?.accessToken);
  }

  function getErrorMessage(error, fallbackMessage) {
    if (error instanceof Error && error.message) return error.message;
    return fallbackMessage;
  }

  function setAuthMessage(message = "", tone = "info") {
    if (!authMessageEl) return;

    authMessageEl.textContent = message;
    authMessageEl.classList.remove("ok", "error");

    if (!message) return;
    if (tone === "ok") authMessageEl.classList.add("ok");
    if (tone === "error") authMessageEl.classList.add("error");
  }

  function syncAuthUi() {
    if (openAuthBtn) {
      openAuthBtn.textContent = isAuthenticated() ? "Cerrar sesion" : "Iniciar sesion";
      openAuthBtn.disabled = authBusy;
    }

    if (openProfileBtn) openProfileBtn.disabled = authBusy;
    if (tabPerfilBtn) tabPerfilBtn.disabled = authBusy;
    if (showLoginFormBtn) showLoginFormBtn.disabled = authBusy;
    if (showRegisterFormBtn) showRegisterFormBtn.disabled = authBusy;
    if (switchToForgotBtn) switchToForgotBtn.disabled = authBusy;
    if (switchToVerifyBtn) switchToVerifyBtn.disabled = authBusy;
    if (switchToResetBtn) switchToResetBtn.disabled = authBusy;
    if (switchToForgotFromResetBtn) switchToForgotFromResetBtn.disabled = authBusy;
    if (switchToLoginFromForgotBtn) switchToLoginFromForgotBtn.disabled = authBusy;
    if (switchToLoginFromResetBtn) switchToLoginFromResetBtn.disabled = authBusy;
    if (switchToLoginFromVerifyBtn) switchToLoginFromVerifyBtn.disabled = authBusy;
  }

  function setAuthBusyState(isBusy) {
    authBusy = isBusy;
    syncAuthUi();
  }

  function saveAuthSession(session) {
    authSession = session || null;

    if (authSession) authStorage.setSession(authSession);
    else authStorage.clearSession();

    syncAuthUi();
    notifySessionChange();
  }

  async function hydrateSession(session) {
    if (!session?.accessToken) {
      throw new Error("Session without access token");
    }

    const verification = await apiClient.verifyToken(session.accessToken);
    const verifiedUser = verification?.user || {};
    const sessionUser = session.user || {};

    const user = {
      ...sessionUser,
      id: sessionUser.id || verifiedUser.sub,
      sub: verifiedUser.sub || sessionUser.sub || sessionUser.id,
      email: verifiedUser.email || sessionUser.email || "",
      name:
        sessionUser.name ||
        (verifiedUser.email ? String(verifiedUser.email).split("@")[0] : ""),
    };

    const hydrated = {
      ...session,
      user,
    };

    try {
      const perfil = await apiClient.getMyProfile(hydrated.accessToken);

      if (perfil) {
        hydrated.user = {
          ...(hydrated.user || {}),
          ...perfil,
        };
        hydrated.profile = perfil;
      }
    } catch (error) {
      console.warn("No se pudo cargar el perfil del usuario.", error);
    }

    return hydrated;
  }

  async function tryRefreshSession(session) {
    if (!session?.refreshToken) {
      throw new Error("Missing refresh token");
    }

    const refreshed = await apiClient.refresh(session.refreshToken);

    if (!refreshed?.accessToken) {
      throw new Error("Refresh response without access token");
    }

    return hydrateSession({
      ...session,
      accessToken: refreshed.accessToken,
    });
  }

  async function restoreAuthSession() {
    const stored = authStorage.getSession();
    if (!stored?.accessToken) {
      saveAuthSession(null);
      return;
    }

    setAuthBusyState(true);
    saveAuthSession(stored);

    try {
      const hydrated = await hydrateSession(stored);
      saveAuthSession(hydrated);
    } catch {
      try {
        const refreshed = await tryRefreshSession(stored);
        saveAuthSession(refreshed);
      } catch {
        saveAuthSession(null);
        setStatus("Tu sesion expiro. Inicia sesion nuevamente.");
        setAuthMessage("Tu sesion expiro. Inicia sesion nuevamente.", "error");
      }
    } finally {
      setAuthBusyState(false);
    }
  }

  async function logoutCurrentSession() {
    if (!isAuthenticated()) {
      saveAuthSession(null);
      return;
    }

    setAuthBusyState(true);

    try {
      await apiClient.logout(authSession.accessToken);
    } catch (error) {
      console.warn("No se pudo notificar el logout al backend.", error);
    } finally {
      saveAuthSession(null);
      setAuthView("login");
      setAuthMessage("Sesion cerrada.", "ok");
      setStatus("Sesion cerrada.");
      setTab("inicio");
      setAuthBusyState(false);
    }
  }

  function openLoginTab(message = "", tone = "info") {
    setAuthView("login");
    setAuthMessage(message, tone);
    setTab("login");
  }

  function openVerifyTab(email = "", message = "", tone = "info") {
    setAuthView("verify");
    if (verifyEmailInput && email) verifyEmailInput.value = email;
    if (verifyCodeInput) verifyCodeInput.value = "";
    setAuthMessage(message, tone);
    setTab("login");
  }

  function openForgotTab(email = "", message = "", tone = "info") {
    setAuthView("forgot");
    if (forgotEmailInput && email) forgotEmailInput.value = email;
    setAuthMessage(message, tone);
    setTab("login");
  }

  function openResetTab(token = "", message = "", tone = "info") {
    setAuthView("reset");
    if (resetTokenInput && token) resetTokenInput.value = token;
    if (resetPasswordInput) resetPasswordInput.value = "";
    if (resetPasswordConfirmInput) resetPasswordConfirmInput.value = "";
    setAuthMessage(message, tone);
    setTab("login");
  }

  function requireAuthForProfile() {
    if (isAuthenticated()) return true;

    openLoginTab("Inicia sesion para acceder a tu perfil.", "error");
    return false;
  }

  function bindAuthEvents() {
    showLoginFormBtn?.addEventListener("click", () => {
      setAuthView("login");
      setAuthMessage("");
    });
    showRegisterFormBtn?.addEventListener("click", () => {
      setAuthView("register");
      setAuthMessage("");
    });
    switchToRegisterBtn?.addEventListener("click", () => {
      setAuthView("register");
      setAuthMessage("");
    });
    switchToForgotBtn?.addEventListener("click", () => {
      openForgotTab(
        loginEmailInput?.value?.trim() || "",
        "Ingresa tu correo para enviarte el token de recuperacion.",
      );
    });
    switchToVerifyBtn?.addEventListener("click", () => {
      openVerifyTab(
        loginEmailInput?.value?.trim() || "",
        "Ingresa el correo y el codigo que recibiste por email.",
      );
    });
    switchToResetBtn?.addEventListener("click", () => {
      openResetTab(
        "",
        "Ingresa el token que te llego al correo y define tu nueva contrasena.",
      );
    });
    switchToLoginBtn?.addEventListener("click", () => {
      setAuthView("login");
      setAuthMessage("");
    });
    switchToLoginFromVerifyBtn?.addEventListener("click", () => {
      setAuthView("login");
      setAuthMessage("");
    });
    switchToForgotFromResetBtn?.addEventListener("click", () => {
      openForgotTab("", "Solicita un nuevo token de recuperacion.");
    });
    switchToLoginFromForgotBtn?.addEventListener("click", () => {
      setAuthView("login");
      setAuthMessage("");
    });
    switchToLoginFromResetBtn?.addEventListener("click", () => {
      setAuthView("login");
      setAuthMessage("");
    });

    loginForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (authBusy) return;

      const email = loginEmailInput?.value?.trim() || "";
      const password = loginPasswordInput?.value || "";

      if (!email || !password) {
        setAuthMessage("Completa correo y contrasena.", "error");
        return;
      }

      const submitButton = loginForm.querySelector('button[type="submit"]');
      const originalLabel = submitButton?.textContent || "Entrar";

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Entrando...";
      }

      setAuthBusyState(true);
      setAuthMessage("Iniciando sesion...");

      try {
        const response = await apiClient.login({ email, password });

        if (!response?.accessToken) {
          throw new Error("Respuesta de login sin accessToken.");
        }

        const session = {
          accessToken: response.accessToken,
          refreshToken: response.refreshToken || "",
          user: response.user || { email },
        };

        const hydrated = await hydrateSession(session);
        saveAuthSession(hydrated);

        loginForm.reset();
        setAuthMessage("Sesion iniciada correctamente.", "ok");
        setStatus("Sesion iniciada correctamente.", true);
        setTab("inicio");
      } catch (error) {
        setAuthMessage(
          getErrorMessage(error, "No fue posible iniciar sesion."),
          "error",
        );
      } finally {
        setAuthBusyState(false);
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = originalLabel;
        }
      }
    });

    registerForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (authBusy) return;

      const name = registerNameInput?.value?.trim() || "";
      const email = registerEmailInput?.value?.trim() || "";
      const password = registerPassword?.value || "";
      const confirmPassword = registerPasswordConfirm?.value || "";

      if (!name || !email || !password || !confirmPassword) {
        setAuthMessage("Completa todos los campos del registro.", "error");
        return;
      }

      if (password.length < 8) {
        setAuthMessage("La contrasena debe tener al menos 8 caracteres.", "error");
        return;
      }

      if (password !== confirmPassword) {
        setAuthMessage("Las contrasenas no coinciden.", "error");
        return;
      }

      const submitButton = registerForm.querySelector('button[type="submit"]');
      const originalLabel = submitButton?.textContent || "Crear cuenta";

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Creando...";
      }

      setAuthBusyState(true);
      setAuthMessage("Creando cuenta...");

      try {
        const response = await apiClient.signup({
          name,
          email,
          password,
        });

        registerForm.reset();

        if (response?.accessToken) {
          const session = {
            accessToken: response.accessToken,
            refreshToken: response.refreshToken || "",
            user: response.user || { name, email },
          };

          const hydrated = await hydrateSession(session);
          saveAuthSession(hydrated);
          setAuthMessage("Cuenta creada e inicio de sesion exitoso.", "ok");
          setStatus("Cuenta creada e inicio de sesion exitoso.", true);
          setTab("inicio");
        } else {
          openVerifyTab(
            email,
            "Cuenta creada. Revisa tu correo e ingresa el codigo para verificarla.",
            "ok",
          );
          setStatus("Cuenta creada. Verifica tu correo para activar la cuenta.", true);
        }
      } catch (error) {
        setAuthMessage(
          getErrorMessage(error, "No fue posible crear la cuenta."),
          "error",
        );
      } finally {
        setAuthBusyState(false);
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = originalLabel;
        }
      }
    });

    verifyForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (authBusy) return;

      const email = verifyEmailInput?.value?.trim() || "";
      const code = verifyCodeInput?.value?.trim() || "";

      if (!email || !code) {
        setAuthMessage("Completa correo y codigo de verificacion.", "error");
        return;
      }

      const submitButton = verifyForm.querySelector('button[type="submit"]');
      const originalLabel = submitButton?.textContent || "Verificar cuenta";

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Verificando...";
      }

      setAuthBusyState(true);
      setAuthMessage("Verificando codigo...");

      try {
        await apiClient.verifyEmail({ email, code });
        setAuthView("login");
        if (loginEmailInput) loginEmailInput.value = email;
        if (verifyCodeInput) verifyCodeInput.value = "";
        setAuthMessage("Correo verificado. Ahora inicia sesion.", "ok");
        setStatus("Correo verificado. Ya puedes iniciar sesion.", true);
      } catch (error) {
        setAuthMessage(
          getErrorMessage(error, "No fue posible verificar el correo."),
          "error",
        );
      } finally {
        setAuthBusyState(false);
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = originalLabel;
        }
      }
    });

    forgotForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (authBusy) return;

      const email = forgotEmailInput?.value?.trim() || "";

      if (!email) {
        setAuthMessage("Completa el correo para recuperar la contrasena.", "error");
        return;
      }

      const submitButton = forgotForm.querySelector('button[type="submit"]');
      const originalLabel = submitButton?.textContent || "Enviar correo de recuperacion";

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Enviando...";
      }

      setAuthBusyState(true);
      setAuthMessage("Solicitando correo de recuperacion...");

      try {
        await apiClient.forgotPassword({ email });
        openResetTab(
          "",
          "Correo enviado. Revisa tu bandeja y pega el token para restablecer tu contrasena.",
          "ok",
        );
        setStatus("Correo de recuperacion enviado.", true);
      } catch (error) {
        setAuthMessage(
          getErrorMessage(error, "No fue posible iniciar la recuperacion de contrasena."),
          "error",
        );
      } finally {
        setAuthBusyState(false);
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = originalLabel;
        }
      }
    });

    resetForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (authBusy) return;

      const token = resetTokenInput?.value?.trim() || "";
      const newPassword = resetPasswordInput?.value || "";
      const confirmPassword = resetPasswordConfirmInput?.value || "";
      const passwordPolicy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$_-])[A-Za-z\d!@#$_-]{8,}$/;

      if (!token || !newPassword || !confirmPassword) {
        setAuthMessage("Completa token y ambos campos de contrasena.", "error");
        return;
      }

      if (newPassword !== confirmPassword) {
        setAuthMessage("Las contrasenas no coinciden.", "error");
        return;
      }

      if (!passwordPolicy.test(newPassword)) {
        setAuthMessage(
          "La nueva contrasena debe tener minimo 8 caracteres, mayuscula, minuscula, numero y simbolo (!, @, #, $, _, -).",
          "error",
        );
        return;
      }

      const submitButton = resetForm.querySelector('button[type="submit"]');
      const originalLabel = submitButton?.textContent || "Restablecer contrasena";

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Restableciendo...";
      }

      setAuthBusyState(true);
      setAuthMessage("Restableciendo contrasena...");

      try {
        await apiClient.resetPassword({ token, newPassword });
        resetForm.reset();
        setAuthView("login");
        setAuthMessage("Contrasena actualizada. Inicia sesion con tu nueva clave.", "ok");
        setStatus("Contrasena restablecida correctamente.", true);
      } catch (error) {
        setAuthMessage(
          getErrorMessage(error, "No fue posible restablecer la contrasena."),
          "error",
        );
      } finally {
        setAuthBusyState(false);
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = originalLabel;
        }
      }
    });

    const syncPasswordValidation = () => {
      const pass = registerPassword?.value || "";
      const confirm = registerPasswordConfirm?.value || "";

      if (!pass && !confirm) {
        if (passwordMatchIcon) passwordMatchIcon.textContent = "•";
        if (passwordMatchText) passwordMatchText.textContent = "Escribe y confirma tu contrasena.";
        return;
      }

      if (pass.length < 8) {
        if (passwordMatchIcon) passwordMatchIcon.textContent = "⚠";
        if (passwordMatchText) {
          passwordMatchText.textContent = "La contrasena debe tener al menos 8 caracteres.";
        }
        return;
      }

      if (pass !== confirm) {
        if (passwordMatchIcon) passwordMatchIcon.textContent = "✕";
        if (passwordMatchText) passwordMatchText.textContent = "Las contrasenas no coinciden.";
        return;
      }

      if (passwordMatchIcon) passwordMatchIcon.textContent = "✓";
      if (passwordMatchText) passwordMatchText.textContent = "Contrasenas validas y coincidentes.";
    };

    registerPassword?.addEventListener("input", syncPasswordValidation);
    registerPasswordConfirm?.addEventListener("input", syncPasswordValidation);
  }

  function init() {
    bindAuthEvents();
    setAuthView("login");
    setAuthMessage("");
    syncAuthUi();
    notifySessionChange();
  }

  return {
    init,
    restoreAuthSession,
    logoutCurrentSession,
    openLoginTab,
    requireAuthForProfile,
    isAuthenticated,
    getSession: () => authSession,
    getAccessToken: () => authSession?.accessToken || null,
    isBusy: () => authBusy,
  };
}
