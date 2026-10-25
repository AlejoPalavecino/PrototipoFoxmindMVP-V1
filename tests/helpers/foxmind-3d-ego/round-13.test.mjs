if (typeof taskSpace === 'function') {
  const task = await taskSpace(9), page = task.page('p1');
  await page.fill('textarea[aria-label="Devolución general opcional"]', 'Devolución sintética revisada por docente.');
  await page.focus('loc=role:button[name="Guardar corrección privada"]'); await page.keyboard.press('Enter');
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent === 'Publicar calificación' && !b.disabled));
  const check = await page.fetch('/api/v1/classrooms/99a28785-900b-4ade-b168-4f7b0cf06406/attempts/0bb59b6a-2dca-400c-bfd4-e96017a90378/grading');
  const grading = JSON.parse(check.body);
  console.log('PRIVATE_SAVE_API_PROOF', { status: check.status, finalGrade: grading.grade?.finalGrade, published: grading.grade?.isPublished,
    feedbackConfirmed: grading.grade?.overallFeedback === 'Devolución sintética revisada por docente.' });
  await page.focus('loc=role:button[name="Publicar calificación"]'); await page.keyboard.press('Enter');
  console.log(await page.snapshot({ scope: 'full_page' }));
}
