-- Create a public function to check if username exists (accessible without authentication)
CREATE OR REPLACE FUNCTION public.check_username_available(lookup_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE LOWER(username) = LOWER(lookup_username)
  );
END;
$$;

-- Create a public function to check if email exists (accessible without authentication)
CREATE OR REPLACE FUNCTION public.check_email_available(lookup_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count integer;
BEGIN
  SELECT COUNT(*) INTO user_count 
  FROM auth.users 
  WHERE LOWER(email) = LOWER(lookup_email);
  
  RETURN user_count = 0;
END;
$$;