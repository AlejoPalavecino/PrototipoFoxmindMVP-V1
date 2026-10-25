if (typeof taskSpace === 'function') {
  const task = await taskSpace(9), page = task.page('p1');
  await page.focus('@626'); await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.body.innerText.includes('Datos generales'));
  console.log(await page.snapshot({ scope: 'full_page' }));
  console.log('WIZARD_COVER_CONTROL_NAMES', await page.evaluate(() => [...document.querySelectorAll('[role="radio"],input[type="radio"],button[aria-pressed]')]
    .map(x => ({ name: x.getAttribute('aria-label') || x.textContent, value: x.value, pressed: x.getAttribute('aria-pressed') }))));
}
