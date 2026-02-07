// Módulo de gestión de hábitos
import * as storage from './storage.js';

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
let currentWeek = storage.getCurrentWeek();

export async function init(container) {
  await render(container);
}

async function render(container) {
  container.innerHTML = '<div class="loading">Cargando...</div>';

  const habits = await storage.getHabits();
  const weekLogs = await storage.getAllWeekLogs(currentWeek);

  container.innerHTML = `
    <div class="habits-section">
      <div class="section-header">
        <h2>Hábitos Semanales</h2>
      </div>

      <div class="week-nav">
        <button id="prev-week" class="btn-icon">&larr;</button>
        <span id="current-week">${formatWeek(currentWeek)}</span>
        <button id="next-week" class="btn-icon">&rarr;</button>
      </div>

      <div class="add-habit">
        <input type="text" id="new-habit" placeholder="Nuevo hábito..." autocomplete="off" />
        <button id="add-habit-btn" class="btn-primary">Agregar</button>
      </div>

      ${habits.length === 0 ? `
        <p class="empty-state">No tienes hábitos. Agrega uno para empezar.</p>
      ` : `
        <div class="habits-table-container">
          <table class="habits-table">
            <thead>
              <tr>
                <th>Hábito</th>
                ${DAYS.map(d => `<th>${d}</th>`).join('')}
                <th>%</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${habits.map(habit => renderHabitRow(habit, weekLogs[habit.id])).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;

  attachEvents(container);
}

function renderHabitRow(habit, weekLog) {
  const log = weekLog || [false, false, false, false, false, false, false];
  const completed = log.filter(Boolean).length;
  const percentage = Math.round((completed / 7) * 100);

  return `
    <tr data-habit-id="${habit.id}">
      <td class="habit-name">${habit.name}</td>
      ${log.map((checked, i) => `
        <td>
          <input type="checkbox"
            class="day-check"
            data-day="${i}"
            ${checked ? 'checked' : ''}
          />
        </td>
      `).join('')}
      <td class="percentage ${percentage >= 80 ? 'high' : percentage >= 50 ? 'medium' : 'low'}">
        ${percentage}%
      </td>
      <td>
        <button class="btn-delete delete-habit" title="Eliminar">&times;</button>
      </td>
    </tr>
  `;
}

function formatWeek(weekStr) {
  const [year, week] = weekStr.split('-W');
  return `Semana ${week}, ${year}`;
}

function attachEvents(container) {
  // Agregar hábito
  const addBtn = container.querySelector('#add-habit-btn');
  const input = container.querySelector('#new-habit');

  addBtn.addEventListener('click', async () => {
    const name = input.value.trim();
    if (name) {
      addBtn.disabled = true;
      await storage.addHabit(name);
      input.value = '';
      await render(container);
    }
  });

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addBtn.click();
  });

  // Navegación de semanas
  container.querySelector('#prev-week')?.addEventListener('click', async () => {
    currentWeek = storage.getAdjacentWeek(currentWeek, -1);
    await render(container);
  });

  container.querySelector('#next-week')?.addEventListener('click', async () => {
    currentWeek = storage.getAdjacentWeek(currentWeek, 1);
    await render(container);
  });

  // Checkboxes de días
  container.querySelectorAll('.day-check').forEach(checkbox => {
    checkbox.addEventListener('change', async (e) => {
      const row = e.target.closest('tr');
      const habitId = row.dataset.habitId;
      const dayIndex = parseInt(e.target.dataset.day);
      await storage.setDayLog(currentWeek, habitId, dayIndex, e.target.checked);
      await render(container);
    });
  });

  // Eliminar hábito
  container.querySelectorAll('.delete-habit').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const row = e.target.closest('tr');
      const habitId = row.dataset.habitId;
      if (confirm('¿Eliminar este hábito?')) {
        await storage.deleteHabit(habitId);
        await render(container);
      }
    });
  });
}
