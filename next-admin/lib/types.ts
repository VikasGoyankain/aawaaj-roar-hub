export type Role = "President" | "Regional Head" | "University President" | "Volunteer";

export type SubmissionStatus = "New" | "In-Progress" | "Resolved";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  region: string;
  created_at: string;
}

export interface Submission {
  id: string;
  submission_type: "Victim Report" | "Volunteer Application";
  full_name: string;
  email: string;
  phone: string | null;
  region: string;
  details: string;
  status: SubmissionStatus;
  created_at: string;
}

export interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  metadata: Record<string, unknown> | null;
  timestamp: string;
}
