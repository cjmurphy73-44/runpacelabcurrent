import { verifiedStripePortalUrl } from "./verifiedStripePortalUrl.js";

/**
 * Run a billing portal redirect with injected browser and API boundaries.
 * Must be called directly from the click handler so a framed popup is opened
 * before the first await. No API call occurs when the popup is blocked.
 */
export async function launchBillingPortal({ framed, openTab, invoke, navigate, notify }) {
  const tab = framed ? openTab("", "_blank") : null;
  if (framed && !tab) {
    notify("Allow popups to open billing.");
    return false;
  }
  if (tab) tab.opener = null;
  try {
    const response = await invoke("stripeBillingPortal", {});
    const url = verifiedStripePortalUrl(response?.data?.url);
    if (!url) throw new Error("Billing portal returned an invalid destination");
    if (tab) tab.location.replace(url);
    else navigate(url);
    return true;
  } catch (error) {
    tab?.close();
    notify("Could not open billing portal", error?.message);
    return false;
  }
}
