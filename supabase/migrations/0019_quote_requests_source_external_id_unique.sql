-- Ensure a quote can be imported only once from the same external source.
-- This does not modify existing rows.
create unique index if not exists quote_requests_source_external_id_uidx
  on public.quote_requests (source_external_id)
  where source_external_id is not null;
