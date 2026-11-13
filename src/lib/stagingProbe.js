/**
 * A deliberately unauthenticated, read-only staging connectivity probe.
 * This must never send cookies, access tokens or synthetic athlete data.
 */
export async function probeStagingApi({ appId, appBaseUrl, fetchImpl = fetch }) {
  if (!/^[a-f0-9]{24}$/.test(appId || "")) {
    return { status: "blocked", message: "Staging app ID is missing or invalid." };
  }

  let url;
  try {
    const origin = new URL(appBaseUrl);
    if (origin.protocol !== "https:" || origin.username || origin.password ||
        origin.search || origin.hash || origin.pathname !== "/") {
      throw new Error("invalid staging origin");
    }
    url = new URL(`/api/apps/${appId}/entities/User/me`, origin);
  } catch {
    return { status: "blocked", message: "Staging API origin is not a valid HTTPS root." };
  }

  try {
    // Custom X-App-Id intentionally exercises the browser's CORS preflight.
    // The endpoint is read-only and normally requires authentication.
    const response = await fetchImpl(url.toString(), {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
      headers: { Accept: "application/json", "X-App-Id": appId },
    });
    if (response.status === 401 || response.status === 403) {
      return { status: "pass", httpStatus: response.status,
        message: "Staging API is reachable from this browser and requires authentication." };
    }
    if (response.status === 200) {
      return { status: "warning", httpStatus: 200,
        message: "API responded without authentication. Verify endpoint access controls before continuing." };
    }
    return { status: "blocked", httpStatus: response.status,
      message: "Staging API responded, but not with the expected authentication-required status." };
  } catch {
    return { status: "blocked",
      message: "Browser could not complete the staging API request. Check CORS, network access and the browser console; no credentials were sent." };
  }
}
