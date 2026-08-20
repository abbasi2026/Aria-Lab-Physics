import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AI_SYSTEM_GUARDRAILS } from '../../packages/ai-coach/src/index.mjs';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const port = Number(process.env.PORT ?? 4173);
const types = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.csv':'text/csv; charset=utf-8' };
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? '';
const GEMINI_API_BASE = process.env.GEMINI_API_BASE ?? 'https://generativelanguage.googleapis.com/v1beta';
const maxBody = 512 * 1024;

function json(res, status, value) { res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' }); res.end(JSON.stringify(value)); }
async function readJson(req) {
  let size=0, chunks=[]; for await (const chunk of req) { size+=chunk.length; if(size>maxBody) throw Object.assign(new Error('Request body too large.'),{statusCode:413}); chunks.push(chunk); }
  const text=Buffer.concat(chunks).toString('utf8'); return text ? JSON.parse(text) : {};
}
function extractJsonText(text='') {
  const cleaned=String(text).trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  try { return JSON.parse(cleaned); } catch {}
  const start=cleaned.indexOf('{'), end=cleaned.lastIndexOf('}'); if(start>=0&&end>start) return JSON.parse(cleaned.slice(start,end+1));
  throw new Error('Gemini returned non-JSON output.');
}
async function callGemini(payload, task) {
  if(!GEMINI_API_KEY || !GEMINI_MODEL) throw Object.assign(new Error('AI is not configured. Set GEMINI_API_KEY and GEMINI_MODEL on the server.'),{statusCode:503,code:'AI_NOT_CONFIGURED'});
  const system=[
    'You are Aria Lab, a grounded physics laboratory assistant for Persian learners.',
    ...AI_SYSTEM_GUARDRAILS,
    task==='coach' ? 'Answer in Persian and return JSON with answerFa,nextActionFa,evidence,confidence.' : 'Create a safe experiment-authoring draft in Persian. Return JSON matching the responseContract exactly. Do not add parts, measurements or claims that are absent from the supplied scene.',
  ].join('\n');
  const url=`${GEMINI_API_BASE}/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`;
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':GEMINI_API_KEY},body:JSON.stringify({system_instruction:{parts:[{text:system}]},contents:[{role:'user',parts:[{text:JSON.stringify(payload)}]}],generationConfig:{temperature:task==='coach'?0.15:0.25,responseMimeType:'application/json'}})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok) { const message=data?.error?.message??`Gemini HTTP ${response.status}`; throw Object.assign(new Error(message),{statusCode:502,code:'GEMINI_UPSTREAM_ERROR'}); }
  const text=(data?.candidates?.[0]?.content?.parts??[]).map(p=>p.text??'').join('').trim();
  if(!text) throw Object.assign(new Error('Gemini returned an empty response.'),{statusCode:502,code:'GEMINI_EMPTY_RESPONSE'});
  return extractJsonText(text);
}

async function handleApi(req,res,path) {
  if(path==='/api/ai/status' && req.method==='GET') return json(res,200,{enabled:Boolean(GEMINI_API_KEY&&GEMINI_MODEL),provider:'gemini',model:GEMINI_MODEL||null});
  if(path==='/api/ai/coach' && req.method==='POST') { const body=await readJson(req); return json(res,200,await callGemini(body,'coach')); }
  if(path==='/api/ai/experiment-draft' && req.method==='POST') { const body=await readJson(req); return json(res,200,await callGemini(body,'draft')); }
  return false;
}

http.createServer(async (req,res)=>{
  try {
    const path=decodeURIComponent((req.url??'/').split('?')[0]);
    if(path.startsWith('/api/')) { const handled=await handleApi(req,res,path); if(handled!==false)return; return json(res,404,{error:'API_NOT_FOUND'}); }
    if(req.method!=='GET'&&req.method!=='HEAD') return json(res,405,{error:'METHOD_NOT_ALLOWED'});
    const rel=path==='/'?'apps/web/index.html':path.replace(/^\/+/, ''); const target=normalize(join(root,rel));
    if(!target.startsWith(root)){res.writeHead(403);return res.end('Forbidden');}
    let file=target; const info=await stat(file); if(info.isDirectory())file=join(file,'index.html'); const data=await readFile(file);
    res.writeHead(200,{'Content-Type':types[extname(file)]??'application/octet-stream','Cache-Control':'no-cache'}); if(req.method==='HEAD')res.end();else res.end(data);
  } catch(error) {
    if((req.url??'').startsWith('/api/')) return json(res,error.statusCode??500,{error:error.code??'API_ERROR',message:error.message});
    res.writeHead(error.code==='ENOENT'?404:500,{'Content-Type':'text/plain; charset=utf-8'});res.end(error.code==='ENOENT'?'Not found':error.stack);
  }
}).listen(port,'127.0.0.1',()=>console.log(`Aria Lab Physics: http://127.0.0.1:${port}/`));
