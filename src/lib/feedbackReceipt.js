// A transport response is not proof of persistence. Accept only an explicit
// boolean acknowledgement; never infer success from HTTP 200 or a message.
export function feedbackWasAccepted(response) {
  if (!response || typeof response !== "object" || Array.isArray(response)) return false;
  if (response.data && typeof response.data === "object" && !Array.isArray(response.data)) {
    return response.data.success === true && response.success !== false;
  }
  return response.success === true;
}
