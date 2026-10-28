import assert from 'node:assert/strict';

if (!globalThis.qaFixtureUrl) {
  const { default: test } = await import('node:test');
  test('student summary visual check requires ego and a synthetic fixture', { skip: 'Run via ego-browser with qaFixtureUrl' }, () => {});
} else {
  assert.ok(globalThis.qaFixtureUrl, 'Provide a synthetic platform-polish classroom fixture URL');
  const task = await taskSpace('qa-student-summary-scroll');
  const page = task.page('p1');
  await page.cdp('Emulation.setDeviceMetricsOverride', { width: 894, height: 486, deviceScaleFactor: 1, mobile: false });
  await page.goto(globalThis.qaFixtureUrl);
  await page.waitForSelector('loc=role:button[name="Alumnos"]');
  assert.equal(await page.evaluate(() => !!document.querySelector('[data-qa-fixture="true"]')), true, 'Synthetic fixture required');
  await page.evaluate(() => window.scrollTo(0, 500));
  await page.click('loc=role:button[name="Alumnos"]');
  await page.waitForSelector('loc=css:[data-open-summary]');
  const geometry = await page.evaluate(() => {
    const button = document.querySelector('[data-open-summary]'), r = button.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { top: r.top, bottom: r.bottom, height: innerHeight, hit: hit?.tagName,
      reachable: hit === button || button.contains(hit) };
  });
  assert.ok(geometry.top >= 0 && geometry.bottom <= geometry.height && geometry.reachable,
    `Student summary covered after tab change: ${JSON.stringify(geometry)}`);
  await page.focus('loc=role:button[name="Alumnos"]');
  let focused = false;
  for (let i = 0; i < 30 && !focused; i++) {
    await page.keyboard.press('Tab');
    focused = await page.evaluate(() => document.activeElement?.matches('[data-open-summary]') ?? false);
  }
  assert.equal(focused, true, 'Keyboard navigation must reach the summary');
  assert.equal(await page.evaluate(() => {
    const b = document.activeElement, r = b.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left+r.width/2, r.top+r.height/2);
    return hit === b || b.contains(hit);
  }), true, 'Focused summary must not be obscured');
  // Wrap only the in-memory fixture client so a roster update exercises the real component.
  await page.evaluate(() => {
    const element = document.querySelector('[data-open-summary]');
    let fiber = element[Object.keys(element).find(key => key.startsWith('__reactFiber'))];
    while (fiber && fiber.type?.name !== 'ClassroomView') fiber = fiber.return;
    if (!fiber) throw new Error('Synthetic ClassroomView not found');
    const api = fiber.memoizedProps.api, original = api.call.bind(api);
    let updated = false;
    api.call = async (path, method, ...rest) => {
      if (path.endsWith('/remove') && method === 'POST') { await new Promise(resolve => { window.__finishSyntheticRemoval = resolve; }); updated = true; return {}; }
      if (updated && path.endsWith('/members')) {
        const current = await original(path, method, ...rest);
        return [...current, { ...current[0], studentId: '22222222-2222-4222-8222-222222222222', enrollmentId: 'synthetic-second' }];
      }
      return original(path, method, ...rest);
    };
    const scroll = Element.prototype.scrollIntoView;
    window.__summaryScrollCalls = 0;
    Element.prototype.scrollIntoView = function(...args) {
      if (this.matches('[data-open-summary]')) window.__summaryScrollCalls++;
      return scroll.apply(this, args);
    };
  });
  await page.click('loc=role:button[name="Remover"]');
  await page.click('loc=role:button[name="Confirmar"]');
  await page.waitForFunction(() => typeof window.__finishSyntheticRemoval === 'function');
  await page.evaluate(() => { window.scrollTo(0, 500); window.__finishSyntheticRemoval(); });
  await page.waitForFunction(() => document.querySelectorAll('[data-open-summary]').length === 2);
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'));
  assert.equal(await page.evaluate(() => window.__summaryScrollCalls), 0,
    'A roster refresh must not recenter the summary while already in Alumnos');
}
