export type UserRole = 'President' | 'Regional Head' | 'University President' | 'Volunteer';

export type SubmissionType = 'victim_report' | 'volunteer_application';

export type SubmissionStatus = 'New' | 'In-Progress' | 'Resolved';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  region: string | null;
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: string;
  type: SubmissionType;
  status: SubmissionStatus;
  full_name: string;
  email: string;
  phone: string | null;
  region: string | null;
  // Location
  pincode: string | null;
  state: string | null;
  district: string | null;
  // Volunteer fields
  serve_role: string | null;
  volunteer_scope: string | null;
  serve_area_state: string | null;
  serve_area_district: string | null;
  serve_area_pincode: string | null;
  college: string | null;
  skills: string | null;
  about_self: string | null;
  // Victim fields
  incident_date: string | null;
  incident_description: string | null;
  perpetrator_info: string | null;
  urgency_level: 'low' | 'medium' | 'high' | 'critical' | null;
  // Legacy volunteer fields
  university: string | null;
  motivation: string | null;
  availability: string | null;
  // Meta
  recommended_by: string | null;
  dob: string | null;
  consent: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}
