const $ = (id) => document.getElementById(id);
let currentRun = null, offset = 0, total = 0, busy = false;
let queueController;
const number = (n) => Number(n).toLocaleString('en-US');
const score = (n) => n === null || n === undefined ? '—' : Number(n).toFixed(4);
function status(message, error = false) { $('status').textContent = message; $('status').className = error ? 'error' : ''; }
async function api(path, body) {
  const response = await fetch(path, body === undefined ? {} : {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
  const data = await response.json();
  if (!response.ok) throw Error(data.error || `HTTP ${response.status}`);
  return data;
}
function cell(row, value) { const td = document.createElement('td'); td.textContent = value; row.append(td); return td; }
async function load() {
  const [overview, runs] = await Promise.all([api('/api/overview'), api('/api/runs')]);
  for (const key of ['total','pulsar','noise','predictions']) $(key).textContent = number(overview[key]);
  $('run-count').textContent = `${runs.items.length} saved runs`;
  $('runs-empty').hidden = runs.items.length > 0;
  const body = $('runs').querySelector('tbody'); body.replaceChildren();
  for (const run of runs.items) {
    const row = document.createElement('tr');
    const name = cell(row, run.algorithm);
    const id = document.createElement('div'); id.className = 'muted'; id.textContent = run.id.slice(0,8) + ' · ' + run.status; name.append(id);
    if (run.selected) { const chosen = document.createElement('span'); chosen.className='chosen'; chosen.textContent='CV selection'; name.append(chosen); }
    for (const key of ['cv_f1','precision_score','recall','f1','accuracy','average_precision']) cell(row, score(run[key]));
    const action = cell(row,''); const button = document.createElement('button'); button.textContent='Review'; button.disabled=run.status!=='completed';
    button.addEventListener('click', () => selectRun(run)); action.append(button); body.append(row);
  }
  if (!currentRun && runs.items.length) {
    const chosen = runs.items.find(r=>r.selected && r.status==='completed') || runs.items.find(r=>r.status==='completed');
    if (chosen) await selectRun(chosen);
  }
}
async function selectRun(run) {
  currentRun=run; offset=0;
  $('run-detail').textContent=`${run.algorithm} · ${run.id} · train ${number(run.train_count)} / holdout ${number(run.test_count)} · TN ${run.tn}, FP ${run.fp}, FN ${run.fn}, TP ${run.tp}`;
  await loadQueue();
}
async function loadQueue() {
  if (!currentRun) return;
  queueController?.abort(); queueController=new AbortController(); const own=queueController;
  const params=new URLSearchParams({outcome:$('outcome').value,min_probability:$('probability').value||'0',offset:String(offset),limit:'20'});
  try {
    const response=await fetch(`/api/runs/${currentRun.id}/predictions?${params}`, {signal:own.signal}); const data=await response.json();
    if(!response.ok) throw Error(data.error);
    if(own.signal.aborted) return;
    total=data.total; const body=$('queue').querySelector('tbody'); body.replaceChildren();
    for(const item of data.items){
      const row=document.createElement('tr'); cell(row,item.source_row);cell(row,score(item.probability));cell(row,item.true_label?'Pulsar':'Noise');cell(row,item.predicted_label?'Pulsar':'Noise');cell(row,item.outcome);
      const action=cell(row,'');const button=document.createElement('button');button.textContent='Inspect';button.className='secondary';
      button.addEventListener('click',async()=>{try{$('measurements').textContent=JSON.stringify(await api(`/api/candidates/${item.candidate_id}`),null,2);$('candidate').open=true;}catch(e){status(e.message,true);}});action.append(button);body.append(row);
    }
    $('review-count').textContent=`${number(total)} matching predictions`;
    $('page').textContent=total?`${offset+1}–${Math.min(offset+20,total)} of ${number(total)}`:'No matching records';
    $('prev').disabled=offset===0; $('next').disabled=offset+20>=total;
  }catch(e){if(e.name!=='AbortError')status(e.message,true);}
}
async function action(kind) {
  if(busy) return;busy=true;
  for(const id of ['import','train','refresh']) $(id).disabled=true;
  status(kind==='train'?'Training and validating three models. Please wait; results will be committed to PostgreSQL.':'Importing the original source records…');
  try{
    const result=await api(`/api/${kind}`,kind==='train'?{seed:42}:{});
    currentRun=null;await load();
    status(kind==='train'?`Completed. Training-only CV selected ${result.selected}; ${result.test} holdout predictions saved for each model.`:`Import complete: ${number(result.total)} source records. Existing rows were preserved.`);
  }catch(e){status(e.message,true);}finally{busy=false;for(const id of ['import','train','refresh'])$(id).disabled=false;}
}
$('import').addEventListener('click',()=>action('import'));
$('train').addEventListener('click',()=>action('train'));
$('refresh').addEventListener('click',async()=>{try{currentRun=null;await load();status('Reloaded saved data from PostgreSQL.');}catch(e){status(e.message,true);}});
$('filter').addEventListener('click',()=>{offset=0;loadQueue();});
$('prev').addEventListener('click',()=>{offset=Math.max(0,offset-20);loadQueue();});
$('next').addEventListener('click',()=>{offset+=20;loadQueue();});
load().then(()=>status('Connected. Values shown here are read from PostgreSQL.')).catch(e=>status(e.message,true));
