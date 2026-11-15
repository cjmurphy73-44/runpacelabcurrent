/** Run every entity cleanup and retain only entity labels for safe diagnostics. */
export async function runAccountEntityCleanup(cleanup) {
  const failedEntities = [];
  for (const [entityName, remove] of cleanup) {
    try {
      await remove();
    } catch {
      failedEntities.push(entityName);
    }
  }
  return failedEntities;
}
