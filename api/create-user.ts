import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * POST /api/create-user
 * Body: { email, full_name, mobile_no?, residence_district?, current_region_or_college?, gender?, dob? }
 *
 * Uses the Supabase Admin REST API (service role key) server-side — the key
 * is never exposed to the browser.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Server not configured: missing Supabase credentials' });
  }

  const { email, full_name, mobile_no, residence_district, current_region_or_college, gender, dob } = req.body ?? {};

  if (!email || !full_name) {
    return res.status(400).json({ error: 'email and full_name are required' });
  }

  // Call Supabase Admin API to create the user (auto-confirmed, no password needed —
  // user will set it via "Forgot Password" flow after first login).
  const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      email,
      email_confirm: true,           // auto-confirm so they can log in immediately
      user_metadata: {
        full_name,
        mobile_no: mobile_no || null,
        residence_district: residence_district || null,
        current_region_or_college: current_region_or_college || null,
        gender: gender || null,
        dob: dob || null,
      },
    }),
  });

  const data = await createRes.json();

  if (!createRes.ok) {
    // Supabase error message is in data.message or data.msg
    return res.status(createRes.status).json({ error: data.message || data.msg || 'Failed to create user' });
  }

  // data.id is the new user's UUID — return it so the client can assign roles
  return res.status(200).json({ id: data.id, email: data.email });
}
