const task = await taskSpace(6);
await task.finish({ keep: [] });
console.log('qa-agenda-polish Space 6 finished once; no managed pages retained.');
