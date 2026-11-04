/** Exercise whichever real responsive navigation is currently visible. */
export async function visibleNavigation(page) {
  const drawer = page.getByRole('dialog', { name: 'Menú de navegación', exact: true });
  if (await drawer.isVisible()) return drawer.getByRole('navigation', { name: 'Navegación principal', exact: true });
  const desktop = page.locator('header.fm3d-shell > nav.fm3d-shell-nav');
  if (await desktop.isVisible()) return desktop;
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
    if (!await account.evaluate(element => element.open)) await account.locator('summary').click();
    return account.getByRole('link', { name: 'Ver mi perfil', exact: true });
  }
  const drawer = page.getByRole('dialog', { name: 'Menú de navegación', exact: true });
  if (!await drawer.isVisible()) await page.getByRole('button', { name: 'Abrir menú de navegación', exact: true }).click();
  const mobileAccount = drawer.locator('.fm-home-account-menu');
  if (await mobileAccount.isVisible()) {
    if (!await mobileAccount.evaluate(element => element.open)) await mobileAccount.locator('summary').click();
    return mobileAccount.getByRole('link', { name: 'Ver mi perfil', exact: true });
  }
  return drawer.getByRole('link', { name: 'Mi perfil', exact: true });
}
