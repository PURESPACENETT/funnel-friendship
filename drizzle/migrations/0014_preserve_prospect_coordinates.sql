ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS latitude numeric;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS longitude numeric;
CREATE INDEX IF NOT EXISTS prospects_coordinates_idx ON public.prospects (latitude, longitude);
