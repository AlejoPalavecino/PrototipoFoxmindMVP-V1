if (typeof taskSpace === 'function') {
  const task = await taskSpace(9), page = task.page('p1');
  await page.fill('@633', 'Matemática escolar sintética'); await page.fill('@634', 'Matemática');
  await page.fill('@635', 'B'); await page.fill('@636', '2026'); await page.fill('@637', 'UTC');
  await page.focus('@639'); await page.keyboard.press('Space');
  await page.focus('@646'); await page.keyboard.press('Enter');
  await page.waitForFunction(() => Boolean(document.querySelector('input[type="file"]')));
  const result = await page.fetch('/api/v1/classrooms/drafts');
  console.log('COVER_MATH_PERSISTED', { status: result.status, matching: JSON.parse(result.body).filter(x => x.payload?.name === 'Matemática escolar sintética')
    .map(x => ({ coverKey: x.payload.coverKey, name: x.payload.name })) });
  console.log(await page.snapshot({ scope: 'full_page' }));
}
