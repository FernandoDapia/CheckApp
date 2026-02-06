// Módulo de almacenamiento con Supabase
import { supabase } from './supabase.js';

// Obtener semana ISO actual (ej: "2026-W06")
export function getCurrentWeek() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
}

// Obtener semana anterior/siguiente
export function getAdjacentWeek(weekStr, direction) {
  const [year, week] = weekStr.split('-W').map(Number);
  let newWeek = week + direction;
  let newYear = year;

  if (newWeek < 1) {
    newYear--;
    newWeek = 52;
  } else if (newWeek > 52) {
    newYear++;
    newWeek = 1;
  }

  return `${newYear}-W${newWeek.toString().padStart(2, '0')}`;
}

// ===== HÁBITOS =====

export async function getHabits() {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching habits:', error);
    return [];
  }
  return data || [];
}

export async function addHabit(name) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('habits')
    .insert({ name, user_id: user.id })
    .select()
    .single();

  if (error) {
    console.error('Error adding habit:', error);
    return null;
  }
  return data;
}

export async function deleteHabit(id) {
  const { error } = await supabase
    .from('habits')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting habit:', error);
  }
}

// ===== LOGS DE HÁBITOS =====

export async function getWeekLog(week, habitId) {
  const { data, error } = await supabase
    .from('habit_logs')
    .select('days')
    .eq('week', week)
    .eq('habit_id', habitId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching week log:', error);
  }

  return data?.days || [false, false, false, false, false, false, false];
}

export async function getAllWeekLogs(week) {
  const { data, error } = await supabase
    .from('habit_logs')
    .select('habit_id, days')
    .eq('week', week);

  if (error) {
    console.error('Error fetching week logs:', error);
    return {};
  }

  const logs = {};
  (data || []).forEach(log => {
    logs[log.habit_id] = log.days;
  });
  return logs;
}

export async function setDayLog(week, habitId, dayIndex, value) {
  const { data: { user } } = await supabase.auth.getUser();

  // Check if log exists
  const { data: existing } = await supabase
    .from('habit_logs')
    .select('id, days')
    .eq('week', week)
    .eq('habit_id', habitId)
    .single();

  if (existing) {
    const newDays = [...existing.days];
    newDays[dayIndex] = value;
    await supabase
      .from('habit_logs')
      .update({ days: newDays })
      .eq('id', existing.id);
  } else {
    const days = [false, false, false, false, false, false, false];
    days[dayIndex] = value;
    await supabase
      .from('habit_logs')
      .insert({ week, habit_id: habitId, days, user_id: user.id });
  }
}

// ===== PROYECTOS =====

export async function getProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('position', { ascending: true });

  if (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
  return data || [];
}

export async function addProject(name) {
  const { data: { user } } = await supabase.auth.getUser();

  // Get max position
  const { data: projects } = await supabase
    .from('projects')
    .select('position')
    .order('position', { ascending: false })
    .limit(1);

  const position = projects && projects.length > 0 ? projects[0].position + 1 : 0;

  const { data, error } = await supabase
    .from('projects')
    .insert({ name, user_id: user.id, tasks: [], position })
    .select()
    .single();

  if (error) {
    console.error('Error adding project:', error);
    return null;
  }
  return data;
}

export async function deleteProject(id) {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting project:', error);
  }
}

export async function addTask(projectId, text) {
  const { data: project } = await supabase
    .from('projects')
    .select('tasks')
    .eq('id', projectId)
    .single();

  if (!project) return null;

  const newTask = {
    id: crypto.randomUUID(),
    text,
    done: false,
    createdAt: Date.now()
  };

  const tasks = [...(project.tasks || []), newTask];

  await supabase
    .from('projects')
    .update({ tasks })
    .eq('id', projectId);

  return newTask;
}

export async function toggleTask(projectId, taskId) {
  const { data: project } = await supabase
    .from('projects')
    .select('tasks')
    .eq('id', projectId)
    .single();

  if (!project) return;

  const tasks = project.tasks.map(t =>
    t.id === taskId ? { ...t, done: !t.done } : t
  );

  await supabase
    .from('projects')
    .update({ tasks })
    .eq('id', projectId);
}

export async function deleteTask(projectId, taskId) {
  const { data: project } = await supabase
    .from('projects')
    .select('tasks')
    .eq('id', projectId)
    .single();

  if (!project) return;

  const tasks = project.tasks.filter(t => t.id !== taskId);

  await supabase
    .from('projects')
    .update({ tasks })
    .eq('id', projectId);
}

export async function reorderProjects(fromIndex, toIndex) {
  const projects = await getProjects();
  const [moved] = projects.splice(fromIndex, 1);
  projects.splice(toIndex, 0, moved);

  // Update positions
  const updates = projects.map((p, i) =>
    supabase.from('projects').update({ position: i }).eq('id', p.id)
  );

  await Promise.all(updates);
}

// ===== TAB ACTIVO (localStorage - no necesita sync) =====

export function getActiveTab() {
  return localStorage.getItem('checkapp_activeTab') || 'habits';
}

export function setActiveTab(tab) {
  localStorage.setItem('checkapp_activeTab', tab);
}
