/** Exercise whichever real responsive navigation is currently visible. */
export async function visibleNavigation(page) {
  const desktop = page.getByRole('navigation', { name: 'Navegación principal', exact: true });
  if (await desktop.isVisible()) return desktop;
  const mobile = page.getByRole('navigation', { name: 'Navegación móvil', exact: true });
  if (!await mobile.isVisible()) await page.getByRole('button', { name: /^Abrir menú de (cuenta|navegación)/ }).press('Enter');
  await mobile.waitFor();
  return mobile;
}
export async function navigationLink(page, label) {
  return (await visibleNavigation(page)).getByRole('link', { name: label, exact: true });
}
export async function profileAction(page) {
  const trigger = page.getByRole('button', { name: /^Abrir menú de cuenta/ });
  if (await trigger.getAttribute('aria-expanded') !== 'true') await trigger.click();
  return page.locator('#fm-account-menu').getByRole('link', { name: 'Mi perfil', exact: true });
}
