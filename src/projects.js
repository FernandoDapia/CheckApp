// Módulo de gestión de proyectos
import './projects.css';
import * as storage from './storage.js';

export async function init(container) {
  await render(container);
}

async function render(container) {
  const projects = await storage.getProjects();

  container.innerHTML = `
    <div class="projects-section">
      <div class="section-header">
        <h2>Lista de Tareas</h2>
      </div>

      <div class="add-project">
        <input type="text" id="new-project" placeholder="Nueva lista de tareas..." autocomplete="off" />
        <button id="add-project-btn" class="btn-primary">Crear</button>
      </div>

      ${projects.length === 0 ? `
        <p class="empty-state">No tienes lista de tareas. Crea una para empezar.</p>
      ` : `
        <div class="projects-list">
          ${projects.map(project => renderProject(project)).join('')}
        </div>
      `}
    </div>
  `;

  attachEvents(container);
}

function renderProject(project) {
  const totalTasks = project.tasks?.length || 0;
  const completedTasks = project.tasks?.filter(t => t.done).length || 0;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return `
    <div class="project-card" data-project-id="${project.id}" draggable="true">
      <div class="project-header">
        <span class="drag-handle" title="Arrastrar para reordenar">⠿</span>
        <h3>${project.name}</h3>
        <div class="project-actions">
          <span class="project-progress ${progress === 100 ? 'complete' : ''}">${completedTasks}/${totalTasks} (${progress}%)</span>
          <button class="btn-delete delete-project" title="Eliminar proyecto">&times;</button>
        </div>
      </div>

      ${totalTasks > 0 ? `
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
      ` : ''}

      <div class="tasks-list">
        ${(project.tasks || []).map(task => renderTask(task)).join('')}
      </div>

      <div class="add-task">
        <input type="text" class="new-task-input" placeholder="Nueva tarea..." autocomplete="off" />
        <button class="add-task-btn btn-secondary">+</button>
      </div>
    </div>
  `;
}

function renderTask(task) {
  return `
    <div class="task-swipe-container" data-task-id="${task.id}">
      <div class="task-item ${task.done ? 'done' : ''}">
        <input type="checkbox" class="task-check" ${task.done ? 'checked' : ''} />
        <span class="task-text">${task.text}</span>
      </div>
      <div class="task-actions">
        <button class="task-action-btn edit-task" title="Editar">Editar</button>
        <button class="task-action-btn delete-task" title="Eliminar">Eliminar</button>
      </div>
    </div>
  `;
}

function attachEvents(container) {
  // Agregar proyecto
  const addProjectBtn = container.querySelector('#add-project-btn');
  const projectInput = container.querySelector('#new-project');

  addProjectBtn.addEventListener('click', async () => {
    const name = projectInput.value.trim();
    if (name) {
      addProjectBtn.disabled = true;
      await storage.addProject(name);
      projectInput.value = '';
      await render(container);
    }
  });

  projectInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addProjectBtn.click();
  });

  // Eliminar proyecto
  container.querySelectorAll('.delete-project').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const card = e.target.closest('.project-card');
      const projectId = card.dataset.projectId;
      if (confirm('¿Eliminar este proyecto y todas sus tareas?')) {
        await storage.deleteProject(projectId);
        await render(container);
      }
    });
  });

  // Agregar tarea
  container.querySelectorAll('.add-task-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const card = e.target.closest('.project-card');
      const projectId = card.dataset.projectId;
      const input = card.querySelector('.new-task-input');
      const text = input.value.trim();
      if (text) {
        btn.disabled = true;
        await storage.addTask(projectId, text);
        input.value = '';
        await render(container);
      }
    });
  });

  container.querySelectorAll('.new-task-input').forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.target.blur();
        e.target.parentElement.querySelector('.add-task-btn').click();
      }
    });
  });

  // Toggle tarea
  container.querySelectorAll('.task-check').forEach(checkbox => {
    checkbox.addEventListener('change', async (e) => {
      const card = e.target.closest('.project-card');
      const projectId = card.dataset.projectId;
      const swipeContainer = e.target.closest('.task-swipe-container');
      const taskId = swipeContainer.dataset.taskId;
      await storage.toggleTask(projectId, taskId);
      await render(container);
    });
  });

  // Eliminar tarea
  container.querySelectorAll('.delete-task').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const card = e.target.closest('.project-card');
      const projectId = card.dataset.projectId;
      const swipeContainer = e.target.closest('.task-swipe-container');
      const taskId = swipeContainer.dataset.taskId;
      await storage.deleteTask(projectId, taskId);
      await render(container);
    });
  });

  // Editar tarea
  container.querySelectorAll('.edit-task').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const card = e.target.closest('.project-card');
      const projectId = card.dataset.projectId;
      const swipeContainer = e.target.closest('.task-swipe-container');
      const taskId = swipeContainer.dataset.taskId;
      const taskItem = swipeContainer.querySelector('.task-item');
      const taskText = taskItem.querySelector('.task-text');
      const currentText = taskText.textContent;

      // Reemplazar texto con input editable
      taskText.innerHTML = `<input type="text" class="edit-task-input" value="${currentText}" autocomplete="off" />`;
      const input = taskText.querySelector('.edit-task-input');
      input.focus();
      input.select();

      // Cerrar swipe
      swipeContainer.classList.remove('swiped');

      const saveEdit = async () => {
        const newText = input.value.trim();
        if (newText && newText !== currentText) {
          await storage.editTask(projectId, taskId, newText);
        }
        await render(container);
      };

      input.addEventListener('blur', saveEdit, { once: true });
      input.addEventListener('keypress', (ev) => {
        if (ev.key === 'Enter') {
          input.blur();
        }
      });
    });
  });

  // Swipe en tareas (touch)
  container.querySelectorAll('.task-swipe-container').forEach(swipeContainer => {
    let startX = 0;
    let currentX = 0;
    const taskItem = swipeContainer.querySelector('.task-item');

    swipeContainer.addEventListener('touchstart', (e) => {
      // No interferir con checkbox
      if (e.target.classList.contains('task-check')) return;
      startX = e.touches[0].clientX;
      currentX = startX;
      taskItem.style.transition = 'none';
    }, { passive: true });

    swipeContainer.addEventListener('touchmove', (e) => {
      if (e.target.classList.contains('task-check')) return;
      currentX = e.touches[0].clientX;
      const diff = currentX - startX;

      // Solo permitir swipe hacia la izquierda
      if (diff < 0) {
        const translateX = Math.max(diff, -140);
        taskItem.style.transform = `translateX(${translateX}px)`;
      }
    }, { passive: true });

    swipeContainer.addEventListener('touchend', () => {
      taskItem.style.transition = 'transform 0.2s';
      const diff = currentX - startX;

      if (diff < -50) {
        // Abrir acciones
        taskItem.style.transform = 'translateX(-140px)';
        swipeContainer.classList.add('swiped');
        // Cerrar otros swipes abiertos
        container.querySelectorAll('.task-swipe-container.swiped').forEach(other => {
          if (other !== swipeContainer) {
            other.classList.remove('swiped');
            other.querySelector('.task-item').style.transform = '';
          }
        });
      } else {
        // Cerrar
        taskItem.style.transform = '';
        swipeContainer.classList.remove('swiped');
      }
    });
  });

  // Click fuera cierra swipes abiertos
  container.addEventListener('click', (e) => {
    if (!e.target.closest('.task-swipe-container')) {
      container.querySelectorAll('.task-swipe-container.swiped').forEach(sc => {
        sc.classList.remove('swiped');
        sc.querySelector('.task-item').style.transform = '';
      });
    }
  });

  // Reordenar proyectos: drag (desktop) + touch (móvil)
  const projectCards = container.querySelectorAll('.project-card');
  let draggedCard = null;

  projectCards.forEach((card, index) => {
    card.dataset.index = index;

    // Desktop drag events
    card.addEventListener('dragstart', (e) => {
      draggedCard = card;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      draggedCard = null;
      container.querySelectorAll('.project-card').forEach(c => c.classList.remove('drag-over'));
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (draggedCard && draggedCard !== card) card.classList.add('drag-over');
    });

    card.addEventListener('dragleave', () => card.classList.remove('drag-over'));

    card.addEventListener('drop', async (e) => {
      e.preventDefault();
      if (draggedCard && draggedCard !== card) {
        const fromIndex = parseInt(draggedCard.dataset.index);
        const toIndex = parseInt(card.dataset.index);
        await storage.reorderProjects(fromIndex, toIndex);
        await render(container);
      }
    });

    // Touch events para móvil (solo desde el drag-handle)
    const handle = card.querySelector('.drag-handle');
    if (!handle) return;

    let touchCurrentCard = null;

    handle.addEventListener('touchstart', (e) => {
      touchCurrentCard = card;
      card.classList.add('dragging');
      e.preventDefault();
    }, { passive: false });

    handle.addEventListener('touchmove', (e) => {
      if (!touchCurrentCard) return;
      e.preventDefault();

      const touchY = e.touches[0].clientY;
      const cards = container.querySelectorAll('.project-card');
      cards.forEach(c => c.classList.remove('drag-over'));

      for (const c of cards) {
        if (c === touchCurrentCard) continue;
        const rect = c.getBoundingClientRect();
        if (touchY >= rect.top && touchY <= rect.bottom) {
          c.classList.add('drag-over');
          break;
        }
      }
    }, { passive: false });

    handle.addEventListener('touchend', async (e) => {
      if (!touchCurrentCard) return;

      const touchY = e.changedTouches[0].clientY;
      const cards = container.querySelectorAll('.project-card');
      cards.forEach(c => c.classList.remove('drag-over'));
      touchCurrentCard.classList.remove('dragging');

      for (const c of cards) {
        if (c === touchCurrentCard) continue;
        const rect = c.getBoundingClientRect();
        if (touchY >= rect.top && touchY <= rect.bottom) {
          const fromIndex = parseInt(touchCurrentCard.dataset.index);
          const toIndex = parseInt(c.dataset.index);
          await storage.reorderProjects(fromIndex, toIndex);
          await render(container);
          break;
        }
      }

      touchCurrentCard = null;
    });
  });
}
