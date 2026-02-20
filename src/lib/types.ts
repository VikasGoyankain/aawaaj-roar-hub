// ── Role names that match the DB roles.name column ──
export type RoleName =
  | 'President'
  | 'Technical Head'
  | 'Content Head'
  | 'Regional Head'
  | 'University President'
  | 'Volunteer';

export type SubmissionType = 'victim_report' | 'volunteer_application';
export type SubmissionStatus = 'New' | 'In-Progress' | 'Resolved' | 'Accepted';

// ── DB row interfaces ──

export interface Role {
  id: number;
  name: RoleName;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  mobile_no: string | null;
  gender: string | null;
  dob: string | null;
  residence_district: string | null;
  current_region_or_college: string | null;
  profile_photo_url: string | null;
  referred_by: string | null;
  skills: string | null;
  about_self: string | null;
  recommended_by_name: string | null;
  state: string | null;
  pincode: string | null;
  joined_on: string;
  created_at: string;
  updated_at: string;
  // Convenience fields sometimes returned by joins / legacy queries
  role?: RoleName;
  region?: string | null;
}

export interface UserRole {
  id: number;
  user_id: string;
  role_id: number;
  granted_at: string;
  granted_by: string | null;
}

export interface CareerHistory {
  id: number;
  user_id: string;
  role_name: string;
  start_date: string;
  end_date: string | null;
  key_achievements: string | null;
  summary_of_work: string | null;
}

export interface Blog {
  id: string;
  author_id: string;
  title: string;
  slug: string;
  content: string;
  cover_image: string | null;
  published: boolean;
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
  pincode: string | null;
  state: string | null;
  district: string | null;
  region: string | null;
  serve_role: string | null;
  volunteer_scope: string | null;
  serve_area_state: string | null;
  serve_area_district: string | null;
  serve_area_pincode: string | null;
  college: string | null;
  university: string | null;
  skills: string | null;
  about_self: string | null;
  motivation: string | null;
  incident_date: string | null;
  incident_description: string | null;
  perpetrator_info: string | null;
  urgency_level: 'low' | 'medium' | 'high' | 'critical' | null;
  availability: string | null;
  recommended_by: string | null;
  dob: string | null;
  consent: boolean;
  converted_to_member: boolean | null;
  created_at: string;
  updated_at: string;
  // Extended fields from the new registration form
  dob?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;
  recommended_by?: string | null;
  serve_role?: string | null;
  volunteer_scope?: string | null;
  serve_area_district?: string | null;
  serve_area_state?: string | null;
  serve_area_pincode?: string | null;
  college?: string | null;
  about_self?: string | null;
  consent?: boolean | null;
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

// ── Composite helpers used in the UI ──

export interface ProfileWithRoles extends Profile {
  roles: RoleName[];
}

