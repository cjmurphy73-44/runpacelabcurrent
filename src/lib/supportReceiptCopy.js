/**
 * A successful feedback API invocation confirms submission, not delivery,
 * assignment, a response deadline, or a guaranteed reply.
 * Never echo the supplied address into a public confirmation.
 */
export function supportReceiptCopy(contactEmail) {
  const replyPossible = typeof contactEmail === 'string' && contactEmail.trim().length > 0;
  return {
    toast: replyPossible
      ? 'Your request was submitted. A reply is possible using the email provided, but is not guaranteed.'
      : 'Your request was submitted without a reply address.',
    confirmation: replyPossible
      ? 'Your request was submitted. We may contact you using the email provided if a reply is needed. For billing changes, use the billing portal.'
      : 'Your request was submitted without a contact email, so we cannot reply by email. For billing changes, use the billing portal.',
  };
}
