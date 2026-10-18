export async function cleanupProbe(operations) {
  const results = await Promise.allSettled(operations.map(operation => Promise.resolve().then(() => operation.run())));
  const failures = results.flatMap((result, index) => result.status === 'rejected'
    ? [new Error(`P4 ${operations[index].name} probe cleanup failed`)] : []);
  if (failures.length) throw new AggregateError(failures, 'P4 probe cleanup unavailable');
}
