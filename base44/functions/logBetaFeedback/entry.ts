// Public support and beta feedback entry point. Anonymous submissions are allowed,
// but untrusted fields are validated before service-role writes.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { validateFeedbackPayload } from '../../shared/feedbackValidation.js';

export default async function (req: Request): Promise<Response> {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  if (!(req.headers.get('content-type') || '').toLowerCase().includes('application/json')) {
    return Response.json({ error: 'JSON required' }, { status: 415 });
  }
  // Limit before JSON parse; Content-Length alone cannot be trusted.
  let raw: string;
  try {
    const reader = req.body?.getReader();
    if (!reader) return Response.json({ error: 'Body required' }, { status: 400 });
    const decoder = new TextDecoder();
    let bytes = 0;
    raw = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 8192) {
        await reader.cancel().catch(() => {});
        return Response.json({ error: 'Submission too large' }, { status: 413 });
      }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  let body: unknown;
  try { body = JSON.parse(raw); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const validated = validateFeedbackPayload(body);
  if (!validated.ok) return Response.json({ error: validated.error }, { status: 400 });

  try {
    const base44 = createClientFromRequest(req);
    const record = await base44.asServiceRole.entities.BetaFeedback.create(validated.value);
    if (!record?.id) return Response.json({ error: 'Could not confirm submission' }, { status: 503 });
    return Response.json({ success: true, id: record.id });
  } catch {
    // Never return SDK errors, query details or submitted content to anonymous callers.
    return Response.json({ error: 'Could not submit feedback. Please retry.' }, { status: 503 });
  }
}
