if (typeof taskSpace === 'function') {
  const task = await taskSpace(9), page = task.page('p1');
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent === 'Confirmar verificación' && !b.disabled));
  await page.focus('loc=role:button[name="Confirmar verificación"]'); await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.body.innerText.includes('Tu correo está verificado'));
  console.log('REAL_REGISTRATION_VERIFICATION_PASS', await page.evaluate(() => ({ path: location.pathname, fragmentCleared: location.hash === '' })));
  console.log(await page.snapshot({ scope: 'full_page' }));
}
