const task=await taskSpace(35);
const page=await task.newPage();
await page.cdp('Emulation.setDeviceMetricsOverride',{width:1784,height:882,deviceScaleFactor:1,mobile:false});
await page.goto('http://127.0.0.1:53191/inicio?mode=mixed&fixture=true');
await page.waitForSelector('.fm-home--reference');
console.log({spaceId:task.spaceId,page:page.label});
console.log(await page.snapshot());
