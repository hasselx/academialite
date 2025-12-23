-- Create a table for individual courses within semesters
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  credits INTEGER NOT NULL,
  grade TEXT NOT NULL,
  grade_point NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own courses" 
ON public.courses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own courses" 
ON public.courses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own courses" 
ON public.courses 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own courses" 
ON public.courses 
FOR DELETE 
USING (auth.uid() = user_id);