-- PART47 P18 — Staff comments on their own COMPLETED jobs (visible to the commenting staff + Admin only).
-- Applied to prod (rbdvlfriqjnwpxmmgisf) 2026-07-19 via MCP apply_migration (name: p18_job_staff_comments).
-- Additive only. Rollback: DROP TABLE public.job_staff_comments;

create table public.job_staff_comments (
  id         uuid        primary key default gen_random_uuid(),
  job_id     uuid        not null references public.jobs(id)     on delete cascade,
  staff_id   uuid        not null references public.profiles(id) on delete cascade,
  comment    text        not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_staff_comments_job_staff_unique unique (job_id, staff_id)
);

create index job_staff_comments_staff_id_idx on public.job_staff_comments (staff_id);

-- reuse the shared updated_at trigger fn
create trigger set_job_staff_comments_updated_at
  before update on public.job_staff_comments
  for each row execute function public.update_updated_at_column();

-- RLS is the whole privacy wall (all 4 apps share the anon key + the `authenticated` role)
alter table public.job_staff_comments enable row level security;

revoke all on public.job_staff_comments from anon;
grant select, insert, update, delete on public.job_staff_comments to authenticated;

-- Staff: read only their own comments
create policy "Staff can view own job comments"
  on public.job_staff_comments for select to authenticated
  using (staff_id = auth.uid());

-- Staff: create a comment ONLY on their own, COMPLETED job (gate lives in the policy, not the button)
create policy "Staff can insert own job comments"
  on public.job_staff_comments for insert to authenticated
  with check (
    staff_id = auth.uid()
    and exists (
      select 1 from public.jobs j
      where j.id = job_id and j.staff_id = auth.uid() and j.status = 'completed'::job_status
    )
  );

-- Staff: edit their own comment
create policy "Staff can update own job comments"
  on public.job_staff_comments for update to authenticated
  using (staff_id = auth.uid()) with check (staff_id = auth.uid());

-- Staff: delete their own comment
create policy "Staff can delete own job comments"
  on public.job_staff_comments for delete to authenticated
  using (staff_id = auth.uid());

-- Admin: view every comment
create policy "Admins can view all job comments"
  on public.job_staff_comments for select to authenticated
  using (exists (
    select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'ADMIN'
  ));

-- Admin: delete any comment (but NOT create/edit — no forging a staff comment)
create policy "Admins can delete all job comments"
  on public.job_staff_comments for delete to authenticated
  using (exists (
    select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'ADMIN'
  ));
