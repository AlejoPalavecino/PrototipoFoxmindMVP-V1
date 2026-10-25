if (typeof taskSpace === 'function') {
  const task = await taskSpace(9), page = task.page('p1');
  await page.focus('loc=role:button[name="Confirmar publicación"]'); await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.body.innerText.includes('Calificación publicada'));
  const proof = await page.fetch('/api/v1/classrooms/99a28785-900b-4ade-b168-4f7b0cf06406/attempts/0bb59b6a-2dca-400c-bfd4-e96017a90378/grading');
  console.log('PUBLISHED_API_PROOF', { status: proof.status, isPublished: JSON.parse(proof.body).grade?.isPublished });
  await page.goto('http://127.0.0.1:49657/sign-in'); await page.keyboard.press('Control+0');
  await page.fill('input[name="email"]', 'student-3d@example.test');
  await page.fill('input[name="password"]', 'Integration private files password 😀');
  await page.focus('input[name="password"]'); await page.keyboard.press('Enter');
  await page.waitForURL('http://127.0.0.1:49657/inicio'); await page.waitForSelector('.fm-home-columns');
  const h = await page.fetch('/api/v1/home?timeZone=UTC'), home = JSON.parse(h.body);
  console.log('STUDENT_HOME_PROOF', { status: h.status, participation: home.participation, pending: home.modules?.pending.totalItems,
    feedback: home.modules?.feedback.items.map(x => ({ grade: x.finalGrade, attempt: x.attemptNumber, title: x.title })) });
  console.log(await page.snapshot({ scope: 'full_page' }));
}
