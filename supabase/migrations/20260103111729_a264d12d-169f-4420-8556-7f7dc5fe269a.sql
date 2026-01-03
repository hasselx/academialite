-- Group each calculation as its own saved record
CREATE TABLE IF NOT EXISTS public.cgpa_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cgpa_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cgpa records"
ON public.cgpa_records
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cgpa records"
ON public.cgpa_records
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cgpa records"
ON public.cgpa_records
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cgpa records"
ON public.cgpa_records
FOR DELETE
USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_cgpa_records_updated_at ON public.cgpa_records;
CREATE TRIGGER update_cgpa_records_updated_at
BEFORE UPDATE ON public.cgpa_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Link semesters to a specific saved record (so new calculations don't append to old history)
ALTER TABLE public.semesters
ADD COLUMN IF NOT EXISTS record_id uuid;

CREATE INDEX IF NOT EXISTS idx_semesters_record_id
ON public.semesters (record_id);

CREATE INDEX IF NOT EXISTS idx_cgpa_records_user_created_at
ON public.cgpa_records (user_id, created_at DESC);
