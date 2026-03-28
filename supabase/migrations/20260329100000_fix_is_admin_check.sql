-- Fix critical security issue: is_admin() was checking only auth.uid() IS NOT NULL
-- which means any authenticated user (including market buyers via Email OTP)
-- would be treated as an admin.
-- Now checks against a hardcoded admin email list.

CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = ''
    AS $$
BEGIN
  RETURN coalesce(
    auth.jwt() ->> 'email' IN (
      'majiayu110@gmail.com'
    ),
    false
  );
END;
$$;

COMMENT ON FUNCTION "public"."is_admin"() IS 'Check if the current user is an admin by email whitelist';
