const task = await taskSpace(5), page = task.page('p1');
await page.goto('http://127.0.0.1:3000/sign-in');
console.log(await page.snapshot());
const fs = await import('node:fs/promises');
const accounts = JSON.parse(await fs.readFile('C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/.test-artifacts/local-app/accounts.json','utf8'));
console.log({ accountSchema: Object.fromEntries(Object.entries(accounts).map(([k,v])=>[k,typeof v==='object'&&v!==null ? Object.keys(v) : typeof v])) });
