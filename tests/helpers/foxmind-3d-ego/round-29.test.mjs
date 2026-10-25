if (typeof taskSpace === 'function') {
  const task = await taskSpace(9), page = task.page('p1');
  const origin = new URL(import.meta.url).searchParams.get('origin');
  if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) throw new Error('Owned origin required');
  await page.goto(`${origin}/sign-in`); await page.keyboard.press('Control+0');
  await page.cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await page.fill('input[name="email"]', 'mixed-3d@example.test');
  await page.fill('input[name="password"]', 'Integration private files password 😀');
  await page.focus('input[name="password"]'); await page.keyboard.press('Enter'); await page.waitForURL(`${origin}/inicio`);
  await page.waitForSelector('.fm-home-columns');
  const navigate = async (selector, path, pointer = false) => {
    if (pointer) {
      console.log('ACCOUNT_POINTER_HIT_TEST', await page.evaluate(selector => {
        const link = document.querySelector(selector), r = link.getBoundingClientRect();
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return { href: link.getAttribute('href'), hit: hit?.tagName, same: hit === link || link.contains(hit), box: { x: r.x, y: r.y, width: r.width, height: r.height } };
      }, selector));
      try { await page.click(selector); }
      catch (error) { console.log('ACCOUNT_POINTER_UNAVAILABLE', error.message); await page.focus(selector); await page.keyboard.press('Enter'); }
    } else { await page.focus(selector); await page.keyboard.press('Enter'); }
    await page.waitForURL(`${origin}${path}`);
    console.log('REAL_NAVIGATION_PASS', await page.evaluate(() => location.pathname));
  };
  await navigate('.fm3d-shell-account a[href="/settings"]', '/settings', true);
  await page.waitForSelector('input[name="currentPassword"]');
  await navigate('.fm3d-shell-nav a[href="/inicio"]', '/inicio');
  await navigate('.fm3d-shell-account a[href="/profile"]', '/profile');
  await page.waitForSelector('input[name="firstName"]');
  await navigate('.fm3d-shell-nav a[href="/mis-aulas"]', '/mis-aulas');
  await navigate('.fm3d-shell-account a[href="/settings"]', '/settings');
  await navigate('.fm3d-shell-nav a[href="/mis-aulas"]', '/mis-aulas');
  await navigate('a.fm3d-shell-avatar', '/profile');
  await navigate('.fm3d-shell-nav a[href="/inicio"]', '/inicio');
  await navigate('a.fm3d-shell-avatar', '/profile');
  console.log(await page.snapshot({ scope: 'full_page' }));
}
