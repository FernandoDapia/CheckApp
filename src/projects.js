// Módulo de gestión de proyectos
import * as storage from './storage.js';

export async function init(container) {
  await render(container);
}

async function render(container) {
  const projects = await storage.getProjects();

  container.innerHTML = `
    <div class="projects-section">
      <div class="section-header">
        <h2>Proyectos</h2>
      </div>

      <div class="add-project">
        <input type="text" id="new-project" placeholder="Nuevo proyecto..." autocomplete="off" />
        <button id="add-project-btn" class="btn-primary">Crear</button>
      </div>

      ${projects.length === 0 ? `
        <p class="empty-state">No tienes proyectos. Crea uno para empezar.</p>
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
    <div class="task-item ${task.done ? 'done' : ''}" data-task-id="${task.id}">
      <input type="checkbox" class="task-check" ${task.done ? 'checked' : ''} />
      <span class="task-text">${task.text}</span>
      <button class="btn-delete delete-task" title="Eliminar">&times;</button>
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
        e.target.parentElement.querySelector('.add-task-btn').click();
      }
    });
  });

  // Toggle tarea
  container.querySelectorAll('.task-check').forEach(checkbox => {
    checkbox.addEventListener('change', async (e) => {
      const card = e.target.closest('.project-card');
      const projectId = card.dataset.projectId;
      const taskItem = e.target.closest('.task-item');
      const taskId = taskItem.dataset.taskId;
      await storage.toggleTask(projectId, taskId);
      await render(container);
    });
  });

  // Eliminar tarea
  container.querySelectorAll('.delete-task').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const card = e.target.closest('.project-card');
      const projectId = card.dataset.projectId;
      const taskItem = e.target.closest('.task-item');
      const taskId = taskItem.dataset.taskId;
      await storage.deleteTask(projectId, taskId);
      await render(container);
    });
  });

  // Drag and drop para reordenar proyectos
  const projectCards = container.querySelectorAll('.project-card');
  let draggedCard = null;

  projectCards.forEach((card, index) => {
    card.dataset.index = index;

    card.addEventListener('dragstart', (e) => {
      draggedCard = card;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      draggedCard = null;
      container.querySelectorAll('.project-card').forEach(c => {
        c.classList.remove('drag-over');
      });
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (draggedCard && draggedCard !== card) {
        card.classList.add('drag-over');
      }
    });

    card.addEventListener('dragleave', () => {
      card.classList.remove('drag-over');
    });

    card.addEventListener('drop', async (e) => {
      e.preventDefault();
      if (draggedCard && draggedCard !== card) {
        const fromIndex = parseInt(draggedCard.dataset.index);
        const toIndex = parseInt(card.dataset.index);
        await storage.reorderProjects(fromIndex, toIndex);
        await render(container);
      }
    });
  });
}
