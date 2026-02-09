import './auth.css';
import { supabase } from './supabase.js';

let onAuthSuccess = null;

export function init(container, onSuccess) {
  onAuthSuccess = onSuccess;
  render(container);
}

function render(container) {
  container.innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <h2>CheckApp</h2>
        <p class="auth-subtitle">Gestiona tus hábitos y proyectos</p>

        <div class="auth-tabs">
          <button class="auth-tab active" data-tab="login">Iniciar Sesión</button>
          <button class="auth-tab" data-tab="register">Registrarse</button>
        </div>

        <form id="auth-form" class="auth-form">
          <div class="form-group">
            <input type="email" id="email" placeholder="Email" required />
          </div>
          <div class="form-group">
            <input type="password" id="password" placeholder="Contraseña" required minlength="6" />
          </div>
          <div id="error-message" class="error-message"></div>
          <button type="submit" id="submit-btn" class="btn-primary btn-full">
            Iniciar Sesión
          </button>
        </form>
      </div>
    </div>
  `;

  attachEvents(container);
}

function attachEvents(container) {
  const tabs = container.querySelectorAll('.auth-tab');
  const form = container.querySelector('#auth-form');
  const submitBtn = container.querySelector('#submit-btn');
  const errorMessage = container.querySelector('#error-message');

  let isLogin = true;

  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      isLogin = tab.dataset.tab === 'login';
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      submitBtn.textContent = isLogin ? 'Iniciar Sesión' : 'Registrarse';
      errorMessage.textContent = '';
    });
  });

  // Form submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = container.querySelector('#email').value;
    const password = container.querySelector('#password').value;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Cargando...';
    errorMessage.textContent = '';

    try {
      let result;
      if (isLogin) {
        result = await supabase.auth.signInWithPassword({ email, password });
      } else {
        result = await supabase.auth.signUp({ email, password });
      }

      if (result.error) {
        throw result.error;
      }

      if (!isLogin && result.data.user && !result.data.session) {
        errorMessage.style.color = 'var(--success)';
        errorMessage.textContent = 'Revisa tu email para confirmar tu cuenta';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Registrarse';
        return;
      }

      if (onAuthSuccess) {
        onAuthSuccess(result.data.user);
      }
    } catch (error) {
      errorMessage.textContent = translateError(error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = isLogin ? 'Iniciar Sesión' : 'Registrarse';
    }
  });
}

function translateError(message) {
  const translations = {
    'Invalid login credentials': 'Email o contraseña incorrectos',
    'Email not confirmed': 'Debes confirmar tu email primero',
    'User already registered': 'Este email ya está registrado',
    'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres',
  };
  return translations[message] || message;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
