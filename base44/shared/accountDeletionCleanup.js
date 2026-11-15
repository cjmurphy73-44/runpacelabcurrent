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

/**
 * The account identity must survive any incomplete cleanup so the caller can
 * authenticate and retry. Never call deleteUser when an entity step failed.
 */
export async function finalizeAccountDeletion(cleanup, deleteUser) {
  const failedEntities = await runAccountEntityCleanup(cleanup);
  if (failedEntities.length) return { success: false, failedEntities };
  await deleteUser();
  return { success: true, failedEntities: [] };
}
