// Only a persisted server receipt confirms that feedback was saved.
export function feedbackReceipt(response) {
  const data = response?.data ?? response;
  return data?.success === true && typeof data?.id === 'string' && data.id.trim().length > 0;
}
