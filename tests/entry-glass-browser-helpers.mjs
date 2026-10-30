/** Exercise whichever real responsive navigation is currently visible. */
export async function visibleNavigation(page) {
  const desktop = page.getByRole('navigation', { name: 'Navegación principal', exact: true });
  if (await desktop.isVisible()) return desktop;
  const drawer = page.getByRole('dialog', { name: 'Menú de navegación', exact: true });
  if (!await drawer.isVisible()) await page.getByRole('button', { name: 'Abrir menú de navegación', exact: true }).press('Enter');
  await drawer.waitFor();
  return drawer.getByRole('navigation', { name: 'Navegación principal', exact: true });
}
export async function navigationLink(page, label) {
  return (await visibleNavigation(page)).getByRole('link', { name: label, exact: true });
}
export async function profileAction(page) {
  return page.locator('header.fm3d-shell a.fm3d-shell-avatar');
}
