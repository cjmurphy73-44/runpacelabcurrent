/**
 * External integrations are opt-in for production only. Staging, local and
 * unknown environments fail closed so scheduled workflows and public webhook
 * endpoints cannot contact providers or ingest provider data by default.
 */
export function isExternalSyncEnabled(
  environment: string | undefined,
  enabledFlag: string | undefined,
): boolean {
  return environment === 'production' && enabledFlag === 'true';
}

export function externalSyncBlockedResponse(): Response | null {
  let environment: string | undefined;
  let enabledFlag: string | undefined;

  try {
    environment = Deno.env.get('TPL_ENVIRONMENT');
    enabledFlag = Deno.env.get('TPL_EXTERNAL_SYNC_ENABLED');
  } catch {
    // Missing runtime permissions/configuration must never turn integrations on.
  }

  if (isExternalSyncEnabled(environment, enabledFlag)) return null;

  return Response.json(
    { error: 'External sync is disabled for this environment.' },
    { status: 503 },
  );
}
