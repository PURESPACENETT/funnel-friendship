alter table public.prospects
  add column if not exists outreach_send_lock_at timestamptz;

create unique index if not exists prospect_tasks_open_followup_uidx
  on public.prospect_tasks (prospect_id, title, task_type)
  where completed_at is null
    and title = 'Relancer après premier email'
    and task_type = 'relance';

create unique index if not exists prospect_activities_dedupe_key_uidx
  on public.prospect_activities (dedupe_key)
  where dedupe_key is not null;
