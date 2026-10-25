import { isAdmin, adminConfigured } from '../_lib/auth.js';

const shell = (body) => new Response(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>Admin | DOJ Panache</title><link rel="stylesheet" href="/css/style.css">
<style>.adm{background:var(--bg);color:var(--ink)}.aw{max-width:900px;margin:0 auto;padding:24px 16px 80px}.adm h1{font-size:1.3rem;letter-spacing:.1em;text-transform:uppercase;font-weight:400}
.adm button,.adm select,.adm input{font:inherit;padding:8px 12px;border:1px solid var(--line);background:var(--bg);color:var(--ink);border-radius:0;cursor:pointer}
.adm button.p,.adm .tabs button.on{background:var(--ink);color:var(--ivory)}.tabs button{margin:0 6px 6px 0}
.o{border:1px solid var(--line);padding:14px;margin:12px 0}.o.warn{border-color:var(--tan)}.o h3{margin:0 0 6px;font-size:1rem}.o p{margin:4px 0}.tag{display:inline-block;border:1px solid var(--ink);padding:1px 8px;font-size:.75rem;text-transform:uppercase;letter-spacing:.1em}
.adm table{width:100%;border-collapse:collapse;margin:8px 0 20px}.adm td,.adm th{padding:6px;border-bottom:1px solid var(--line);text-align:left}.adm input[type=number]{width:70px}</style></head>
<body class="adm"><main class="aw"><h1>DOJ Panache admin</h1>${body}</main></body></html>`,
  { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });

export async function onRequestGet({ request, env }) {
  if (!adminConfigured(env)) return shell('<p>Admin is switched off. Set the ADMIN_PASSWORD secret in Cloudflare (12+ characters) to turn it on.</p>');
  if (!(await isAdmin(request, env))) return shell(`<form id="lf"><p><input type="password" id="pw" placeholder="Password" autocomplete="current-password"> <button class="p">Sign in</button></p><p id="le" role="alert"></p></form>
<script>document.getElementById('lf').onsubmit=function(e){e.preventDefault();fetch('/api/admin/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:document.getElementById('pw').value})}).then(function(r){if(r.ok)location.reload();else document.getElementById('le').textContent='Wrong password.'})}</script>`);
  return shell('<div id="app">Loading...</div><script src="/admin/admin.js"></script>');
}
