const $=s=>document.querySelector(s), API='/api/v1';
let token=localStorage.getItem('atlas_token')||'', wsId=localStorage.getItem('atlas_ws')||'', view='mission', curTask=null, es=null;
function toast(m){const t=$('#toast');t.textContent=m;t.style.display='block';setTimeout(()=>t.style.display='none',4200)}
async function api(p,opts={}){const r=await fetch(API+p,{...opts,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,...(opts.headers||{})}});
  if(!r.ok){const t=await r.text();throw new Error(t.slice(0,300))}return r.status===204?{}:r.json()}
function esc(s){return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function showAuth(){$('#authCard').classList.remove('hidden');$('#authCard').scrollIntoView()}
async function doAuth(kind){try{const d=await api('/auth/'+kind,{method:'POST',body:JSON.stringify({email:$('#email').value,password:$('#password').value})});
  token=d.token;wsId=d.workspace_id||wsId;localStorage.setItem('atlas_token',token);if(wsId)localStorage.setItem('atlas_ws',wsId);enter()}catch(e){toast('Auth failed: '+e.message)}}
async function enter(){$('#landing').classList.add('hidden');$('#app').classList.remove('hidden');$('#logoutBtn').classList.remove('hidden');
  try{const me=await api('/auth/me');$('#who').textContent=me.email}catch(e){logout();return}
  const ws=await api('/workspaces');if(!wsId&&ws[0])wsId=ws[0].id;
  $('#wsSelect').innerHTML=ws.map(w=>`<option value="${w.id}" ${w.id===wsId?'selected':''}>${esc(w.name)}</option>`).join('');
  localStorage.setItem('atlas_ws',wsId);render()}
function logout(){token='';localStorage.removeItem('atlas_token');location.reload()}
$('#logoutBtn').onclick=()=>{api('/auth/logout',{method:'POST'}).finally(logout)};
$('#wsSelect')?.addEventListener?.('change',()=>{});
document.addEventListener('change',e=>{if(e.target.id==='wsSelect'){wsId=e.target.value;localStorage.setItem('atlas_ws',wsId);render()}});
document.addEventListener('click',e=>{const b=e.target.closest('#sideNav button[data-view]');if(b){view=b.dataset.view;document.querySelectorAll('#sideNav button').forEach(x=>x.classList.toggle('active',x===b));render()}});
async function newWorkspace(){const n=prompt('Workspace name');if(!n)return;const w=await api('/workspaces',{method:'POST',body:JSON.stringify({name:n})});wsId=w.id;enter()}
async function counts(){const t=await api('/agent/tasks?workspace_id='+wsId);const a=await api('/approvals?status=pending').catch(()=>[]);
  $('#apprCount').textContent=a.length;return{tasks:t,approvals:a}}
async function render(){const m=$('#main');if(!wsId){m.innerHTML='<div class="card">Create a workspace to begin.</div>';return}
  if(view==='mission'){const{tasks}=await counts();const by={};tasks.forEach(t=>by[t.status]=(by[t.status]||0)+1);
    const arts=await api('/artifacts?workspace_id='+wsId);
    m.innerHTML=`<h2>⌖ Mission Control</h2><div class="grid">
    ${[['Tasks total',tasks.length],['Running',by.running||0],['Awaiting approval',by.awaiting_approval||0],['Completed',by.completed||0],['Failed',by.failed||0],['Artifacts',arts.length]].map(([k,v])=>`<div class="card stat"><div class="muted small">${k}</div><b>${v}</b></div>`).join('')}</div>
    <div class="card"><h3>Recent tasks</h3>${tasks.slice(0,8).map(t=>`<div class="event"><span class="st-${t.status}">● ${t.status}</span> ${esc(t.objective.slice(0,90))} <button class="btn ghost" onclick="openTask('${t.id}')">Inspect</button></div>`).join('')||'<p class="muted">No tasks yet.</p>'}</div>
    <div class="card"><h3>Latest artifacts</h3>${arts.slice(0,5).map(a=>`<div class="event">📦 ${esc(a.title)} <span class="mono muted">${a.hash.slice(0,12)}…</span></div>`).join('')||'<p class="muted">None yet.</p>'}</div>`}
  if(view==='workspace'){const docs=await api(`/workspaces/${wsId}/documents`);
    m.innerHTML=`<h2>▶ Agent Workspace</h2>
    <div class="card"><h3>Natural-language task</h3>
    <textarea id="objective" rows="3" placeholder="Analyze the research documents in my workspace and create a structured research report"></textarea>
    <label>Autonomy policy (server-enforced ceiling)</label><select id="autonomy"><option value="read_only">Read-only (writes need approval)</option><option value="supervised" selected>Supervised (internal writes auto, Risk-2 approval)</option><option value="autonomous_internal">Autonomous internal (Risk-2 still approval)</option></select>
    <div style="margin-top:12px;display:flex;gap:8px"><button class="btn" onclick="submitTask()">Plan & Execute</button><button class="btn ghost" onclick="seedDemo()">Seed demo documents</button></div>
    <p class="muted small">Try: “Send an email to bob@example.com confirming the update” to see the Approval Center pause execution.</p></div>
    <div class="card"><h3>Workspace documents (${docs.length})</h3>${docs.map(d=>`<div class="event"><b>${esc(d.title)}</b> <span class="muted">v${d.version} · ${esc(d.preview.slice(0,80))}…</span></div>`).join('')||'<p class="muted">No documents — seed demo documents or add one below.</p>'}
    <label>Title</label><input id="docTitle"><label>Content</label><textarea id="docBody" rows="3"></textarea><button class="btn ghost" style="margin-top:8px" onclick="addDoc()">Add document</button></div>
    <div id="taskDetail"></div>`}
  if(view==='approvals'){const a=await api('/approvals?status=all');$('#apprCount').textContent=a.filter(x=>x.status==='pending').length;
    m.innerHTML=`<h2>⚠ Approval Center</h2>`+(a.map(x=>`<div class="card"><div class="pill st-${x.status}">${x.status}</div> <b>${esc(x.tool)}</b> <span class="pill">RISK ${x.risk_level}</span>
    <p><b>WHAT WILL HAPPEN?</b> ${esc(x.proposed_action.description)}</p>
    <p class="mono small">ARGUMENTS: ${esc(JSON.stringify(x.proposed_action.arguments))}<br>ARG HASH: ${x.argument_hash}<br>SIDE EFFECT: ${x.proposed_action.side_effect} · REVERSIBLE: ${x.proposed_action.reversible} · WHY: ${x.proposed_action.why_approval}<br>EXPIRES: ${x.expires_at}</p>
    ${x.status==='pending'?`<button class="btn amber" onclick="decide('${x.id}',true)">Approve exact action</button> <button class="btn danger" onclick="decide('${x.id}',false)">Reject</button>`:''}</div>`).join('')||'<div class="card">No approval requests.</div>')}
  if(view==='tools'){const ts=await api('/tools');
    m.innerHTML=`<h2>🧰 Tool Registry</h2><div class="card"><table><tr><th>Tool</th><th>Risk</th><th>Side effect</th><th>Scopes</th><th>Verification</th></tr>
    ${ts.map(t=>`<tr><td><b class="mono">${t.name}</b> v${t.version}<br><span class="muted small">${esc(t.description)}</span><details><summary class="small">input schema</summary><pre>${esc(JSON.stringify(t.input_schema,null,1))}</pre></details></td><td><span class="pill">L${t.risk_level}</span></td><td>${t.side_effect}</td><td class="mono small">${t.required_scopes.join(', ')}</td><td>${t.verification}</td></tr>`).join('')}</table></div>`}
  if(view==='memory'){const mem=await api('/memory?workspace_id='+wsId);
    m.innerHTML=`<h2>🧠 Memory Vault</h2><div class="card"><label>Approved memory (credentials are rejected server-side)</label><input id="memText" placeholder="Prefers concise weekly reports"><button class="btn" style="margin-top:8px" onclick="addMem()">Save memory</button>
    ${mem.map(x=>`<div class="event"><b>${x.memory_type}</b> ${esc(x.content)} <span class="muted small">${x.created_at}</span> <button class="btn danger" onclick="delMem('${x.id}')">Delete</button></div>`).join('')}</div>`}
  if(view==='artifacts'){const arts=await api('/artifacts?workspace_id='+wsId);
    m.innerHTML=`<h2>📦 Artifacts</h2>`+(arts.map(a=>`<div class="card"><b>${esc(a.title)}</b> <span class="pill">${a.type}</span> <span class="mono muted small">sha256 ${a.hash.slice(0,16)}…</span><pre>${esc((a.content||'').slice(0,1500))}</pre><button class="btn ghost" onclick="exportArt('${a.id}')">Export (hash-verified)</button></div>`).join('')||'<div class="card">No artifacts yet.</div>')}
  if(view==='logs'){const{tasks}=await counts();let evs=[];
    for(const t of tasks.slice(0,5)){evs.push(...await api(`/agent/tasks/${t.id}/events`).then(es=>es.map(e=>({...e,task:t.objective.slice(0,40)}))))}
    m.innerHTML=`<h2>📜 Activity Logs</h2><div class="card">${evs.slice(-60).reverse().map(e=>`<div class="event"><span class="muted">#${e.sequence}</span> <b>${e.type}</b> <span class="muted">${esc(e.task)}</span> ${esc(JSON.stringify(e.payload))}</div>`).join('')||'No events.'}</div>`}
  if(view==='settings'){const u=await api('/usage/overview');
    m.innerHTML=`<h2>⚙ Settings</h2><div class="card"><h3>Usage (actual records)</h3><pre>${esc(JSON.stringify(u,null,1))}</pre>
    <p class="muted small">LLM provider: deterministic mock (labelled, offline). Set ATLAS_EMAIL_PROVIDER=mock to expose the Risk-2 send_email tool with a mock outbox. DATABASE_URL accepts PostgreSQL in production.</p>
    <button class="btn danger" onclick="logout()">Logout</button></div>`}
}
async function seedDemo(){for(const [t,c] of [['Solar Study','Solar panels convert sunlight into electricity. Efficiency reached 23 percent in 2024-01-15 tests. Costs fell steadily as manufacturing scaled.'],['Wind Study','Wind turbines convert kinetic energy into electricity. Capacity grew in 2024-02-20 reports. Costs fell as turbines scaled and maintenance improved.']])
  await api(`/workspaces/${wsId}/documents`,{method:'POST',body:JSON.stringify({title:t,content:c})});toast('Demo documents seeded');render()}
async function addDoc(){await api(`/workspaces/${wsId}/documents`,{method:'POST',body:JSON.stringify({title:$('#docTitle').value,content:$('#docBody').value})});render()}
async function submitTask(){try{const t=await api('/agent/tasks',{method:'POST',body:JSON.stringify({workspace_id:wsId,objective:$('#objective').value,autonomy_policy:$('#autonomy').value})});
  toast('Plan created: '+t.status);const r=await api(`/agent/tasks/${t.id}/start`,{method:'POST'});toast('Task '+r.status);openTask(t.id)}catch(e){toast(e.message)}}
async function openTask(id){view='workspace';await render();curTask=id;const d=await api('/agent/tasks/'+id);
  if(es)es.close();es=new EventSource(`${API}/agent/tasks/${id}/events/stream?token=${encodeURIComponent(token)}`);
  const paint=()=>api('/agent/tasks/'+id).then(d=>{$('#taskDetail').innerHTML=taskHtml(d)});
  es.onmessage=paint;setTimeout(paint,300)}
function taskHtml(d){return `<div class="card"><h3>Task <span class="st-${d.status}">${d.status}</span></h3><p>${esc(d.objective)}</p><p class="muted small">${esc(d.summary||'')}</p>
  <h4>Plan steps</h4>${d.steps.map(s=>`<div class="event"><span class="st-${s.status}">● ${s.status}</span> <b>${s.step_key}</b> <span class="mono">${s.tool}</span> — ${esc(s.purpose)}<br><span class="muted">${esc(s.result||'')}</span></div>`).join('')}
  <h4>Tool executions</h4>${d.executions.map(e=>`<div class="event"><span class="st-${e.status}">●</span> <b class="mono">${e.tool}</b> ${e.duration_ms??''}ms verification=${e.verification||'n/a'}<br><span class="muted">${esc(JSON.stringify(e.output))}</span></div>`).join('')}
  <div style="display:flex;gap:8px;margin-top:10px"><button class="btn ghost" onclick="taskCtl('${d.id}','resume')">Resume</button><button class="btn ghost" onclick="taskCtl('${d.id}','pause')">Pause</button><button class="btn danger" onclick="taskCtl('${d.id}','cancel')">Cancel</button><button class="btn ghost" onclick="openTask('${d.id}')">↻ Refresh events</button></div></div>`}
async function taskCtl(id,a){await api(`/agent/tasks/${id}/${a}`,{method:'POST'});openTask(id)}
async function decide(id,ok){try{const r=await api(`/approvals/${id}/${ok?'approve':'reject'}`,{method:'POST'});toast('Task: '+r.task.status)}catch(e){toast(e.message)}render()}
async function addMem(){try{await api('/memory',{method:'POST',body:JSON.stringify({workspace_id:wsId,content:$('#memText').value})});render()}catch(e){toast(e.message)}}
async function delMem(id){await api('/memory/'+id,{method:'DELETE'});render()}
async function exportArt(id){const d=await api(`/artifacts/${id}/export`,{method:'POST'});toast('Hash verified: '+d.hash_verified);
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([d.content],{type:'text/markdown'}));a.download=d.filename;a.click()}
fetch(API+'/health').then(r=>r.json()).then(h=>{$('#conn').textContent='● API '+h.email_provider}).catch(()=>{$('#conn').textContent='● API offline'});
if(token)enter();
