const task=await taskSpace(7);
const p=task.page('p1');
const w=await p.cdp('Browser.getWindowForTarget');
console.log(w);
console.log(await p.cdp('Browser.setWindowBounds',{windowId:w.windowId,bounds:{windowState:'normal'}}));
