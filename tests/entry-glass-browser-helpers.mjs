/** Exercise whichever real responsive navigation is currently visible. */
export async function visibleNavigation(page) {
  const drawer = page.getByRole('dialog', { name: 'Menú de navegación', exact: true });
  const desktop = page.locator('header.fm3d-shell > nav.fm3d-shell-nav');
  if (await desktop.isVisible()) {
    if (await drawer.isVisible()) {
      await drawer.getByRole('button', { name: 'Cerrar menú de navegación', exact: true }).click();
      await drawer.waitFor({ state: 'hidden' });
    }
    return desktop;
  }
  if (await drawer.isVisible()) return drawer.getByRole('navigation', { name: 'Navegación principal', exact: true });
  if (!await drawer.isVisible()) await page.getByRole('button', { name: 'Abrir menú de navegación', exact: true }).press('Enter');
  await drawer.waitFor();
  return drawer.getByRole('navigation', { name: 'Navegación principal', exact: true });
}
export async function navigationLink(page, label) {
  return (await visibleNavigation(page)).getByRole('link', { name: label, exact: true });
}
export async function profileAction(page) {
  const avatar = page.locator('header.fm3d-shell a.fm3d-shell-avatar');
  if (await avatar.isVisible()) return avatar;
  const profile = page.locator('header.fm3d-shell > .fm3d-shell-account > a[href="/profile"]');
  if (await profile.isVisible()) return profile;
  const account = page.locator('header.fm3d-shell > .fm3d-shell-account > .fm-home-account-menu');
  if (await account.isVisible()) {
    await account.getByRole('button', { name: /^Mi cuenta/, exact: false }).click();
    return page.getByRole('dialog', { name: 'Mi cuenta', exact: true }).getByRole('link', { name: 'Mi perfil', exact: true });
  }
  const drawer = page.getByRole('dialog', { name: 'Menú de navegación', exact: true });
  if (!await drawer.isVisible()) await page.getByRole('button', { name: 'Abrir menú de navegación', exact: true }).click();
  const mobileAccount = drawer.locator('.fm-home-account-menu');
  if (await mobileAccount.isVisible()) {
    await mobileAccount.getByRole('button', { name: /^Mi cuenta/, exact: false }).click();
    return page.getByRole('dialog', { name: 'Mi cuenta', exact: true }).getByRole('link', { name: 'Mi perfil', exact: true });
  }
  return drawer.getByRole('link', { name: /^Mi perfil(?: de .+)?$/ });
}
