// A transport-level resolution is not a persisted support receipt.
// Keep this aligned with logBetaFeedback's { success: true, id } contract.
export function isConfirmedFeedbackReceipt(response) {
  const result = response?.data;
  return result?.success === true &&
    typeof result.id === "string" &&
    result.id.trim().length > 0 &&
    !result.error;
}
