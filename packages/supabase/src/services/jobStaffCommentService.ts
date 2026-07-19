import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';
import { ensureLiveSession, SessionNotLiveError } from '../auth/ensureLiveSession';

type JobStaffComment = Database['public']['Tables']['job_staff_comments']['Row'];
type JobStaffCommentInsert = Database['public']['Tables']['job_staff_comments']['Insert'];

/**
 * P18 — Staff comment on their own completed job.
 * RLS restricts every row to `staff_id = auth.uid()` for staff callers, so these
 * helpers only ever touch the caller's own comment.
 */

/**
 * Get the staff member's comment for a job (null if none yet).
 */
export async function getJobStaffComment(
  client: SupabaseClient<Database>,
  jobId: string,
  staffId: string
): Promise<JobStaffComment | null> {
  const { data, error } = await client
    .from('job_staff_comments')
    .select('*')
    .eq('job_id', jobId)
    .eq('staff_id', staffId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Create or overwrite the staff member's comment for a job.
 * One comment per (job_id, staff_id) — upsert on the unique key so editing
 * replaces the existing text. The INSERT RLS policy still enforces that the job
 * is the caller's OWN, COMPLETED job.
 */
export async function upsertJobStaffComment(
  client: SupabaseClient<Database>,
  input: { jobId: string; staffId: string; comment: string }
): Promise<JobStaffComment> {
  // Staff LINE-WebView order-guard: confirm a live session BEFORE the write, else it runs under the
  // anon key and RLS 0-rows it as a misleading failure. Mirrors jobService.acceptJob/completeJob.
  const live = await ensureLiveSession();
  if (live.status !== 'live') {
    throw new SessionNotLiveError('เซสชันหมดอายุ — กรุณาเข้าสู่ระบบใหม่แล้วบันทึกความคิดเห็นอีกครั้ง');
  }

  const row: JobStaffCommentInsert = {
    job_id: input.jobId,
    staff_id: input.staffId,
    comment: input.comment,
  };
  const { data, error } = await client
    .from('job_staff_comments')
    .upsert(row, { onConflict: 'job_id,staff_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete the staff member's own comment for a job.
 */
export async function deleteJobStaffComment(
  client: SupabaseClient<Database>,
  jobId: string,
  staffId: string
): Promise<void> {
  const live = await ensureLiveSession();
  if (live.status !== 'live') {
    throw new SessionNotLiveError('เซสชันหมดอายุ — กรุณาเข้าสู่ระบบใหม่แล้วลบความคิดเห็นอีกครั้ง');
  }

  const { error } = await client
    .from('job_staff_comments')
    .delete()
    .eq('job_id', jobId)
    .eq('staff_id', staffId);

  if (error) throw error;
}

export const jobStaffCommentService = {
  getJobStaffComment,
  upsertJobStaffComment,
  deleteJobStaffComment,
};
