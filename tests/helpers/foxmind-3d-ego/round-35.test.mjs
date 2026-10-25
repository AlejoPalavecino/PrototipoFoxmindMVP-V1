if (typeof taskSpace === 'function') {
  const task = await taskSpace(9), page = task.page('p1');
  await page.cdp('Emulation.setEmulatedMedia', { media: '', features: [] });
  await page.cdp('Network.enable');
  await page.cdp('Network.setBlockedURLs', { urls: [] });
  await page.cdp('Network.setCacheDisabled', { cacheDisabled: false });
  await page.cdp('Emulation.clearDeviceMetricsOverride');
  await page.cdp('Emulation.setTimezoneOverride', { timezoneId: '' });
  console.log('QA_BROWSER_RESTORE_COMPLETE media-default/network-unblocked/cache-default/device-metrics-cleared/timezone-default');
  console.log('SPACE_FINISH_RESULT', await task.finish({ keep: [] }));
}
