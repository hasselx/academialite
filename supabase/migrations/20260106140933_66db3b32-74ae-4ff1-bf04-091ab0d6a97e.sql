-- Add timezone and time format preferences to profiles
ALTER TABLE public.profiles 
ADD COLUMN timezone_offset NUMERIC DEFAULT 5.5,
ADD COLUMN time_format TEXT DEFAULT '12hr';

-- Add a comment explaining the columns
COMMENT ON COLUMN public.profiles.timezone_offset IS 'User timezone offset from UTC in hours (e.g., 5.5 for IST, 1 for CET)';
COMMENT ON COLUMN public.profiles.time_format IS 'User time format preference: 12hr or 24hr';