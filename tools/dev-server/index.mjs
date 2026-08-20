import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const port = Number(process.env.PORT ?? 4173);
const types = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.csv':'text/csv; charset=utf-8' };
http.createServer(async (req,res)=>{try{const path=decodeURIComponent((req.url??'/').split('?')[0]);const rel=path==='/'?'apps/web/index.html':path.replace(/^\/+/, '');const target=normalize(join(root,rel));if(!target.startsWith(root)){res.writeHead(403);return res.end('Forbidden');}let file=target;const info=await stat(file);if(info.isDirectory())file=join(file,'index.html');const data=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]??'application/octet-stream','Cache-Control':'no-cache'});res.end(data);}catch(error){res.writeHead(error.code==='ENOENT'?404:500,{'Content-Type':'text/plain; charset=utf-8'});res.end(error.code==='ENOENT'?'Not found':error.stack);}}).listen(port,'127.0.0.1',()=>console.log(`Aria Lab Physics: http://127.0.0.1:${port}/`));
