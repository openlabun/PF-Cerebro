function setLoginStatus(message) {
  const el = document.getElementById('loginStatus');
  if (el) {
    el.textContent = String(message || '');
  }
}

function getNextPath() {
  const params = new URLSearchParams(window.location.search);
  return window.AdminAuth.normalizeNextPath(params.get('next') || '/tabs/datos.html');
}

function syncPasswordToggle(passwordInput, passwordToggle) {
  if (!passwordInput || !passwordToggle) return;

  const isVisible = passwordInput.type === 'text';
  passwordToggle.classList.toggle('is-visible', isVisible);
  passwordToggle.setAttribute('aria-pressed', String(isVisible));
  passwordToggle.setAttribute('aria-label', isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña');
}

window.addEventListener('load', () => {
  const existingSession = window.AdminAuth.requireSession({ redirectOnFail: false });
  if (existingSession) {
    window.location.replace(getNextPath());
    return;
  }

  const flashMessage = window.AdminAuth.consumeFlashMessage();
  if (flashMessage) {
    setLoginStatus(flashMessage);
  }

  const form = document.getElementById('loginForm');
  const submitBtn = document.getElementById('loginBtn');
  const passwordInput = document.getElementById('password');
  const passwordToggle = document.getElementById('passwordToggle');

  if (!form) return;

  syncPasswordToggle(passwordInput, passwordToggle);

  if (passwordInput && passwordToggle) {
    passwordToggle.addEventListener('click', () => {
      passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
      syncPasswordToggle(passwordInput, passwordToggle);
    });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = String(document.getElementById('email')?.value || '').trim();
    const password = String(document.getElementById('password')?.value || '');

    if (!email || !password) {
      setLoginStatus('Ingresa correo y contraseña.');
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    setLoginStatus('Validando acceso...');

    try {
      await window.AdminAuth.login(email, password);
      setLoginStatus('Acceso concedido. Redirigiendo...');
      window.location.replace(getNextPath());
    } catch (error) {
      setLoginStatus(`No se pudo iniciar sesión: ${error.message}`);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
});
