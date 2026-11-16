import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const file=fileURLToPath(new URL('./01-foxmind.html',import.meta.url));
const port=Number(process.env.FOXMIND_UI_PORT||4173);
http.createServer(async(req,res)=>{if(!['/','/01-foxmind.html'].includes(req.url.split('?')[0])){res.writeHead(404);res.end('Not found');return;}try{const html=await readFile(file);res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'"});res.end(html);}catch{res.writeHead(500);res.end('Build the prototype first.');}}).listen(port,'127.0.0.1',()=>console.log(`FoxMind UI Lab: http://127.0.0.1:${port}`));
