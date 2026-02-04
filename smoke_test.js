// Local smoke test (runs only when tokens present)
const se = require('./skill-entry');
const fs = require('fs');
(async()=>{
  try{
    const secretPath = '/home/node/.openclaw/secrets/ticktick_tokens.json';
    if(!fs.existsSync(secretPath)){ console.log('No tokens found at',secretPath); process.exit(0); }
    const projects = await se.listProjects(); console.log('Projects:\n',projects.substring(0,800));
    // pick first project id
    const firstLine = projects.split('\n')[0]; const projectId = firstLine.split(' — ')[0];
    console.log('Using project',projectId);
    const created = await se.createTask('smoke-dummy', projectId); console.log(created);
    // extract id from created message
    const id = created.split(':')[1].trim().split(' ')[0];
    const before = await fetch(`https://api.ticktick.com/open/v1/project/${projectId}/task/${id}`,{headers:{Authorization:'Bearer '+JSON.parse(fs.readFileSync(secretPath,'utf8')).access_token}}).then(r=>r.text());
    console.log('Before fetch len', before.length);
    console.log(await se.completeTask(id, projectId));
    const after = await fetch(`https://api.ticktick.com/open/v1/project/${projectId}/task/${id}`,{headers:{Authorization:'Bearer '+JSON.parse(fs.readFileSync(secretPath,'utf8')).access_token}}).then(r=>r.text());
    console.log('After fetch len', after.length);
    const del = await se.deleteTask(id, projectId); console.log(del);
  }catch(e){ console.error('smoke error',e); process.exit(1); }
})();