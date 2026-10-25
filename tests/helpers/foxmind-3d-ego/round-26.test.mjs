if (typeof taskSpace === 'function') {
  const task = await taskSpace(9), page = task.page('p1'), origin = 'http://127.0.0.1:51264';
  await page.goto(`${origin}/settings`); await page.waitForSelector('input[name="currentPassword"]');
  await page.focus('loc=role:button[name="Cerrar sesión"]'); await page.keyboard.press('Enter'); await page.waitForURL(`${origin}/sign-in`);
  await page.goto(`${origin}/register`);
  await page.fill('input[name="firstName"]', 'Cuenta'); await page.fill('input[name="lastName"]', 'Verificada');
  await page.fill('input[name="email"]', 'qa-registration-3d@example.test');
  await page.fill('input[name="password"]', 'Integration private files password 😀');
  await page.focus('loc=role:button[name="Crear cuenta"]'); await page.keyboard.press('Enter');
  await page.waitForFunction(() => [...document.querySelectorAll('[role="status"]')].some(e => e.textContent.includes('recibirás un correo')));
  await page.goto(`${origin}/sign-in`);
  await page.fill('input[name="email"]', 'qa-registration-3d@example.test');
  await page.fill('input[name="password"]', 'Integration private files password 😀');
  await page.focus('input[name="password"]'); await page.keyboard.press('Enter'); await page.waitForURL(`${origin}/verify-email`);
  let link;
  for (let i = 0; i < 30 && !link; i++) {
    const messages = await (await fetch('http://127.0.0.1:51254/api/v1/messages')).json();
    for (const item of messages.messages.filter(x => x.To.some(to => to.Address === 'qa-registration-3d@example.test'))) {
      const detail = await (await fetch(`http://127.0.0.1:51254/api/v1/message/${item.ID}`)).json();
      link = /http:\/\/127\.0\.0\.1:\d+\/verify-email#token=[A-Za-z0-9_-]{43}/.exec(detail.Text)?.[0]; if (link) break;
    }
    if (!link) await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!link) throw new Error('Owned registration verification email unavailable');
  await page.goto(link);
  await page.waitForFunction(() => location.hash === '');
  await page.focus('loc=role:button[name="Confirmar verificación"]'); await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.body.innerText.includes('Tu correo está verificado'));
  console.log('REAL_REGISTRATION_VERIFICATION_PASS', await page.evaluate(() => ({ path: location.pathname, fragmentCleared: location.hash === '' })));
  console.log(await page.snapshot({ scope: 'full_page' }));
}
