const fs = require('fs');
async function loadToken(){
  const t = JSON.parse(fs.readFileSync('/home/node/.openclaw/secrets/ticktick_tokens.json','utf8'));
  return t.access_token;
}

async function apiRaw(path, opts={}){
  const token = await loadToken();
  const res = await fetch('https://api.ticktick.com'+path, Object.assign({headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'}}, opts));
  const txt = await res.text();
  return {status: res.status, text: txt};
}

async function apiJson(path, opts={}){
  const r = await apiRaw(path, opts);
  if(!r.text || r.text.length===0) return null;
  try{ return JSON.parse(r.text);}catch(e){ throw new Error('API error '+r.status+' '+r.text);} 
}

module.exports = {
  listProjects: async ()=> apiJson('/open/v1/project'),
  createTask: async (title, projectId)=> apiJson('/open/v1/task', {method:'POST', body: JSON.stringify({title, projectId})}),
  // prefer project data endpoint for tasks
  listTasksInProject: async (projectId)=>{
    const r = await apiRaw(`/open/v1/project/${encodeURIComponent(projectId)}/data`);
    if(r.status===200){
      if(!r.text || r.text.length===0) return [];
      try{ const j = JSON.parse(r.text); return j.tasks || []; }catch(e){return [];}    }
    throw new Error('API error '+r.status+' '+r.text);
  },
  // documented completion endpoint
  completeTask: async (taskId, projectId)=>{
    const url = `/open/v1/project/${encodeURIComponent(projectId)}/task/${encodeURIComponent(taskId)}/complete`;
    const r = await apiRaw(url, {method:'POST', body: JSON.stringify({id:taskId})});
    if(r.status>=200 && r.status<300){
      if(r.text && r.text.length) try{return JSON.parse(r.text);}catch(e){}
      return {ok:true,status:r.status};
    }
    throw new Error('complete failed '+r.status+' '+r.text);
  },
  // completedInAll: call v2 endpoint
  completedInAll: async (fromIso, toIso, limit=50)=>{
    const token = await loadToken();
    const url = `https://api.ticktick.com/api/v2/project/all/completedInAll/?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}&limit=${encodeURIComponent(limit)}`;
    const res = await fetch(url, {headers:{Authorization:'Bearer '+token}});
    const txt = await res.text();
    if(res.status>=200 && res.status<300){
      if(!txt || txt.length===0) return [];
      try{return JSON.parse(txt);}catch(e){throw new Error('parse failed '+e.message);}    }
    throw new Error('completedInAll failed '+res.status+' '+txt);
  },
  // today helper: poll all projects and filter tasks due today or overdue
  todayTasks: async (tz='America/New_York')=>{
    const projects = await (module.exports.listProjects)();
    const now = new Date();
    // compute local day window in account timezone by using UTC day for simplicity here
    const start = new Date(now); start.setHours(0,0,0,0);
    const end = new Date(now); end.setHours(23,59,59,999);
    const startIso = start.toISOString().replace('Z','+0000');
    const endIso = end.toISOString().replace('Z','+0000');
    const tasks = [];
    await Promise.all(projects.map(async p=>{
      try{
        const tlist = await module.exports.listTasksInProject(p.id);
        for(const t of tlist){
          // consider tasks with dueDate in today or overdue (dueDate < now and status != 2)
          if(t.dueDate){
            const due = new Date(t.dueDate.replace('+0000','Z'));
            if((due>=start && due<=end) || (due<now && t.status!==2)) tasks.push(Object.assign({project:p.name}, t));
          } else if(t.startDate){
            const sd=new Date(t.startDate.replace('+0000','Z'));
            if((sd>=start && sd<=end) || (sd<now && t.status!==2)) tasks.push(Object.assign({project:p.name}, t));
          }
        }
      }catch(e){/* ignore project errors */}
    }));
    return tasks;
  }
};
