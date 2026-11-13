import React, { useState } from "react";
import { appParams } from "@/lib/app-params";
import { probeStagingApi } from "@/lib/stagingProbe";

/**
 * Preview-only, manual, unauthenticated check. No AuthProvider or other
 * application data providers are mounted while this screen is shown.
 */
export default function PreviewStagingCheck() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  async function runCheck() {
    setRunning(true);
    setResult(null);
    try {
      setResult(await probeStagingApi({
        appId: appParams.appId,
        appBaseUrl: appParams.apiServerUrl,
      }));
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-5 px-5 py-12 text-foreground">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">TrainPaceLab / Preview acceptance</p>
      <h1 className="text-3xl font-bold">Staging connectivity check</h1>
      <p className="text-sm text-muted-foreground">
        Run a read-only request from this browser to the configured Base44 staging API.
        No login, access token, cookies, athlete data or writes are used.
      </p>
      <section className="rounded-lg border p-4 text-sm space-y-2">
        <p><strong>Environment:</strong> Vercel Preview</p>
        <p><strong>Backend:</strong> {appParams.apiServerUrl}</p>
        <p><strong>App ID:</strong> <code className="break-all">{appParams.appId}</code></p>
        <p><strong>Expected result:</strong> HTTP 401 or 403 (authentication required)</p>
      </section>
      <button
        type="button"
        onClick={runCheck}
        disabled={running}
        className="self-start rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-50"
      >
        {running ? "Checking…" : "Check staging API and CORS"}
      </button>
      {result && (
        <section role="status" aria-live="polite" className="rounded-lg border p-4 space-y-2">
          <p className="font-semibold">
            {result.status === "pass" ? "Reachable — authentication required" :
              result.status === "warning" ? "Review required" : "Blocked — investigate"}
          </p>
          {result.httpStatus && <p className="text-sm">HTTP {result.httpStatus}</p>}
          <p className="text-sm">{result.message}</p>
          <p className="text-xs text-muted-foreground">
            This check does not verify OAuth callbacks, authenticated sessions, backend functions,
            integrations or data isolation. Do not use real athlete credentials until those checks pass.
          </p>
        </section>
      )}
      <a className="text-sm underline" href="/">Return to Preview home</a>
    </main>
  );
}
