"use server";

import { revalidatePath } from "next/cache";
import { requireAdminProfile } from "@/lib/auth";

export async function updateSubmissionStatus(formData: FormData) {
  const submissionId = String(formData.get("submissionId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!submissionId || !status) {
    throw new Error("Submission ID and status are required");
  }

  const { supabase, profile } = await requireAdminProfile();

  const { error } = await supabase
    .from("submissions")
    .update({ status })
    .eq("id", submissionId)
    .eq("submission_type", "Victim Report");

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("audit_logs").insert({
    admin_id: profile.id,
    action: "UPDATE_SUBMISSION_STATUS",
    metadata: {
      submission_id: submissionId,
      status,
    },
  });

  revalidatePath("/admin/submissions");
}
