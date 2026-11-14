// The previous implementation was non-executable Python inside a Deno .ts file
// and returned fabricated invite/assignment success without persistence.
// Preserve the endpoint name, but fail closed until the authenticated,
// transactional coach-invite lifecycle is implemented and reviewed.
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  return Response.json({
    success: false,
    code: 'COACH_INVITE_NOT_IMPLEMENTED',
    error: 'Coach invitations are temporarily unavailable. No invitation or assignment was created.',
  }, { status: 503 });
});
