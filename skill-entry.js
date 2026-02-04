// OpenClaw skill command wrappers (minimal)
const cmds = require('./commands');

async function listProjects() {
  const ps = await cmds.listProjects();
  return ps.map(p=>`${p.id} — ${p.name}`).join('\n');
}

async function createTask(title, projectId){
  const t = await cmds.createTask(title, projectId);
  return `Created: ${t.id} — ${t.title}`;
}

async function completeTask(taskId, projectId){
  const r = await cmds.completeTask(taskId, projectId);
  return `Completed: ${taskId} -> ${r && r.ok ? 'ok' : JSON.stringify(r)}`;
}

async function deleteTask(taskId, projectId){
  const token = await cmds.loadToken ? await cmds.loadToken() : null;
  // use DELETE endpoint
  const res = await fetch(`https://api.ticktick.com/open/v1/project/${encodeURIComponent(projectId)}/task/${encodeURIComponent(taskId)}`,{method:'DELETE',headers:{Authorization:'Bearer '+token}});
  if(res.status>=200 && res.status<300) return `Deleted ${taskId}`;
  const txt = await res.text(); throw new Error('delete failed '+res.status+' '+txt);
}

async function today(){
  const arr = await cmds.todayTasks();
  if(!arr || arr.length===0) return 'No tasks due today.';
  return arr.map(t=>`${t.project} — ${t.title} (due: ${t.dueDate||t.startDate||'n/a'})`).join('\n');
}

module.exports = { listProjects, createTask, completeTask, deleteTask, today };