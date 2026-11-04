import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const out = 'docs/work-log/evidence/2026-11-04-mis-aulas-mascot'; mkdirSync(out,{recursive:true});
const browser = await chromium.launch({headless:true});
const page = await browser.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
const metrics=[];
for (const width of [1914,1440,1024,768,390,320]) {
 await page.setViewportSize({width,height:900}); await page.goto('http://127.0.0.1:4317/docs/work-log/evidence/2026-11-04-mis-aulas-header/preview.html'); await page.locator('h1').waitFor(); await page.locator('picture img').evaluate(img=>img.decode());
 const m = await page.evaluate(()=>{ const hero=document.querySelector('.collection-reference-hero'), h=document.querySelector('h1'), p=hero.querySelector('p'), b=hero.querySelector('button'); const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}}; return {width:innerWidth,scroll:document.documentElement.scrollWidth,hero:rect(hero),title:rect(h),copy:rect(p),button:rect(b),headingSize:getComputedStyle(h).fontSize,bodySize:getComputedStyle(p).fontSize,benefits:document.querySelectorAll('.collection-hero-benefits').length}; });
 assert.equal(m.scroll,width); assert.equal(m.benefits,0); assert.ok(m.button.bottom<=m.hero.bottom && m.button.right<=m.hero.right); assert.ok(m.copy.bottom<=m.hero.bottom); metrics.push(m);
 await page.screenshot({path:`${out}/teacher-${width}.png`,fullPage:true});
 await page.getByRole('button',{name:'Crear aula',exact:true}).click(); assert.deepEqual(await page.evaluate(()=>window.headerCalls),['create']);
}
await page.setViewportSize({width:1440,height:900}); await page.goto('http://127.0.0.1:4317/docs/work-log/evidence/2026-11-04-mis-aulas-header/preview.html'); await page.locator('.collection-reference-hero').screenshot({path:`${out}/banner-preview.png`}); const button=page.getByRole('button',{name:'Crear aula',exact:true}); await button.focus(); assert.equal(await button.evaluate(b=>b.matches(':focus-visible')),true); assert.equal(await button.evaluate(b=>getComputedStyle(b).outlineStyle),'solid'); await page.screenshot({path:`${out}/teacher-keyboard.png`});
await page.keyboard.press('Enter'); assert.deepEqual(await page.evaluate(()=>window.headerCalls),['create']); await button.hover(); await page.waitForTimeout(550); assert.notEqual(await button.evaluate(b=>getComputedStyle(b).transform),'none');
await page.emulateMedia({reducedMotion:'reduce'}); assert.equal(await button.evaluate(b=>getComputedStyle(b).transform),'none');
await page.goto('http://127.0.0.1:4317/docs/work-log/evidence/2026-11-04-mis-aulas-header/preview.html?busy'); await page.getByRole('button',{name:'Crear aula',exact:true}).waitFor(); assert.equal(await page.getByRole('button',{name:'Crear aula',exact:true}).isDisabled(),true);
await page.setViewportSize({width:390,height:844}); await page.goto('http://127.0.0.1:4317/docs/work-log/evidence/2026-11-04-mis-aulas-header/preview.html?student'); await page.getByRole('button',{name:'Unirse con código'}).click(); assert.deepEqual(await page.evaluate(()=>window.headerCalls),['join']); assert.equal(await page.getByRole('button',{name:'Crear aula'}).count(),0); await page.screenshot({path:`${out}/student-390.png`});
assert.deepEqual(errors,[]); writeFileSync(`${out}/metrics.json`,JSON.stringify({metrics,errors,checks:['6 widths: no overflow, content and CTA contained','teacher click and keyboard callbacks','visible focus','hover transform and reduced motion','busy disabled','student join callback; no create action']},null,2));
console.log('PASS: responsive 6 widths, teacher click/keyboard/focus/hover/reduced-motion/busy, student role and join; no page errors'); await browser.close();
