import { useSupabaseQuery, useSupabaseMutation } from './useSupabaseQuery';
import { jobStaffCommentService } from '../services/jobStaffCommentService';

/**
 * P18 — hooks for a staff member's comment on their own completed job.
 */

/**
 * Get the staff member's comment for a job (null if none yet).
 */
export function useJobStaffComment(
  jobId: string | undefined,
  staffId: string | undefined
) {
  return useSupabaseQuery({
    queryKey: ['jobStaffComments', jobId, staffId],
    queryFn: (client) =>
      jobStaffCommentService.getJobStaffComment(client, jobId!, staffId!),
    enabled: !!jobId && !!staffId,
  });
}

/**
 * Create or overwrite (edit) the staff member's comment for a job.
 */
export function useUpsertJobStaffComment() {
  return useSupabaseMutation({
    mutationFn: (
      client,
      input: { jobId: string; staffId: string; comment: string }
    ) => jobStaffCommentService.upsertJobStaffComment(client, input),
    invalidateKeys: (result) => [
      ['jobStaffComments', result?.job_id, result?.staff_id],
    ],
  });
}

/**
 * Delete the staff member's own comment for a job.
 */
export function useDeleteJobStaffComment() {
  return useSupabaseMutation({
    mutationFn: (client, input: { jobId: string; staffId: string }) =>
      jobStaffCommentService.deleteJobStaffComment(
        client,
        input.jobId,
        input.staffId
      ),
    invalidateKeys: [['jobStaffComments']],
  });
}
