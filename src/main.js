import './style.css';
import { supabase } from './supabase.js';
import * as auth from './auth.js';
import * as storage from './storage.js';
import * as habits from './habits.js';
import * as projects from './projects.js';

// Inicializar aplicación
document.addEventListener('DOMContentLoaded', async () => {
  const app = document.getElementById('app');

  // Verificar sesión
  const session = await auth.getSession();

  if (session) {
    showApp(app);
  } else {
    showAuth(app);
  }

  // Escuchar cambios de autenticación
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      showApp(app);
    } else if (event === 'SIGNED_OUT') {
      showAuth(app);
    }
  });
});

function showAuth(app) {
  app.innerHTML = '<div id="auth-container"></div>';
  const container = document.getElementById('auth-container');
  auth.init(container, () => {
    showApp(app);
  });
}

function showApp(app) {
  app.innerHTML = `
    <header>
      <div class="header-top">
        <h1>CheckApp</h1>
        <button id="logout-btn" class="btn-logout">Cerrar Sesión</button>
      </div>
      <nav class="tabs">
        <button id="tab-habits" class="tab active">Hábitos</button>
        <button id="tab-projects" class="tab">Proyectos</button>
      </nav>
    </header>
    <main id="content"></main>
  `;

  const tabHabits = document.getElementById('tab-habits');
  const tabProjects = document.getElementById('tab-projects');
  const content = document.getElementById('content');
  const logoutBtn = document.getElementById('logout-btn');

  // Logout
  logoutBtn.addEventListener('click', async () => {
    await auth.signOut();
  });

  // Cargar tab activo guardado
  const activeTab = storage.getActiveTab();
  switchTab(activeTab);

  // Event listeners para tabs
  tabHabits.addEventListener('click', () => switchTab('habits'));
  tabProjects.addEventListener('click', () => switchTab('projects'));

  async function switchTab(tab) {
    tabHabits.classList.toggle('active', tab === 'habits');
    tabProjects.classList.toggle('active', tab === 'projects');
    storage.setActiveTab(tab);

    if (tab === 'habits') {
      await habits.init(content);
    } else {
      await projects.init(content);
    }
  }
}
