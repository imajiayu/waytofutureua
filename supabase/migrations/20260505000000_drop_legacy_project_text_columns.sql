-- Drop legacy non-i18n project text columns (project_name, location, unit_name).
-- All readers have migrated to project_name_i18n / location_i18n / unit_name_i18n.
-- Aggregate projects no longer read unit_name (frontend uses 'USD' literal).

BEGIN;

-- 1. Drop dependent views (must drop before ALTER TABLE)
DROP VIEW IF EXISTS public.order_donations_secure;
DROP VIEW IF EXISTS public.project_stats;

-- 2. Drop the RPC (RETURNS TABLE signature changes; CREATE OR REPLACE cannot shrink it)
DROP FUNCTION IF EXISTS public.get_donations_by_email_verified(text, text);

-- 3. Drop the columns from projects
ALTER TABLE public.projects
  DROP COLUMN project_name,
  DROP COLUMN location,
  DROP COLUMN unit_name;

-- 4. Recreate project_stats (matches current remote shape minus the dropped columns)
CREATE VIEW public.project_stats AS
SELECT p.id,
    p.project_name_i18n,
    p.location_i18n,
    p.status,
    p.target_units,
    p.current_units,
    p.unit_name_i18n,
    p.unit_price,
    p.start_date,
    p.end_date,
    p.is_long_term,
    p.aggregate_donations,
    COALESCE(sum(
        CASE
            WHEN d.donation_status::text = ANY (ARRAY['paid'::character varying, 'confirmed'::character varying, 'delivering'::character varying, 'completed'::character varying]::text[])
            THEN d.amount
            ELSE 0::numeric
        END), 0::numeric) AS total_raised,
    count(DISTINCT
        CASE
            WHEN d.donation_status::text = ANY (ARRAY['paid'::character varying, 'confirmed'::character varying, 'delivering'::character varying, 'completed'::character varying]::text[])
            THEN d.order_reference
            ELSE NULL::character varying
        END) AS donation_count
FROM public.projects p
LEFT JOIN public.donations d ON p.id = d.project_id
GROUP BY p.id;

ALTER VIEW public.project_stats OWNER TO postgres;
GRANT ALL ON TABLE public.project_stats TO anon, authenticated, service_role;

COMMENT ON VIEW public.project_stats IS 'Project statistics view. donation_count represents actual payment transactions (unique order_reference), not individual donation records.';

-- 5. Recreate order_donations_secure (minus the dropped columns, otherwise verbatim)
CREATE VIEW public.order_donations_secure AS
SELECT d.id,
    d.donation_public_id,
    d.amount,
    d.donation_status,
    d.order_reference,
    CASE
        WHEN POSITION(('@'::text) IN (d.donor_email)) > 0 THEN
        CASE
            WHEN length(split_part(d.donor_email::text, '@'::text, 1)) <= 2
            THEN (substring(split_part(d.donor_email::text, '@'::text, 1), 1, 1) || '***@'::text) ||
                CASE
                    WHEN length(split_part(d.donor_email::text, '@'::text, 2)) <= 3
                    THEN substring(split_part(d.donor_email::text, '@'::text, 2), 1, 1) || '***'::text
                    ELSE (substring(split_part(d.donor_email::text, '@'::text, 2), 1, 1) || '***'::text) || substring(split_part(d.donor_email::text, '@'::text, 2), length(split_part(d.donor_email::text, '@'::text, 2)) - 1, 2)
                END
            ELSE (((substring(split_part(d.donor_email::text, '@'::text, 1), 1, 1) || '***'::text) || substring(split_part(d.donor_email::text, '@'::text, 1), length(split_part(d.donor_email::text, '@'::text, 1)), 1)) || '@'::text) ||
                CASE
                    WHEN length(split_part(d.donor_email::text, '@'::text, 2)) <= 3
                    THEN substring(split_part(d.donor_email::text, '@'::text, 2), 1, 1) || '***'::text
                    ELSE (substring(split_part(d.donor_email::text, '@'::text, 2), 1, 1) || '***'::text) || substring(split_part(d.donor_email::text, '@'::text, 2), length(split_part(d.donor_email::text, '@'::text, 2)) - 1, 2)
                END
        END
        ELSE '***'::text
    END AS donor_email_obfuscated,
    p.id AS project_id,
    p.project_name_i18n,
    p.location_i18n,
    p.unit_name_i18n,
    p.aggregate_donations
FROM public.donations d
JOIN public.projects p ON d.project_id = p.id
WHERE d.order_reference IS NOT NULL AND d.order_reference::text <> ''::text;

ALTER VIEW public.order_donations_secure OWNER TO postgres;
GRANT ALL ON TABLE public.order_donations_secure TO anon, authenticated, service_role;

COMMENT ON VIEW public.order_donations_secure IS 'Secure view for querying donations by order_reference.
Returns obfuscated email addresses and excludes donor names for privacy.
Used by public API endpoint /api/donations/order/[orderReference].
Includes all donation statuses and aggregate_donations flag for proper UI display.';

-- 6. Recreate the RPC with the new RETURNS TABLE signature
CREATE OR REPLACE FUNCTION public.get_donations_by_email_verified(p_email text, p_donation_id text)
RETURNS TABLE(
  id bigint,
  donation_public_id character varying,
  order_reference character varying,
  project_id bigint,
  donor_email character varying,
  amount numeric,
  currency character varying,
  donation_status character varying,
  donated_at timestamp with time zone,
  updated_at timestamp with time zone,
  project_name_i18n jsonb,
  location_i18n jsonb,
  unit_name_i18n jsonb,
  aggregate_donations boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Step 1: Verify that the donation ID belongs to the provided email
  IF NOT EXISTS (
    SELECT 1
    FROM donations verify
    WHERE verify.donation_public_id = p_donation_id
      AND LOWER(verify.donor_email) = LOWER(p_email)
  ) THEN
    RETURN;
  END IF;

  -- Step 2: Return all donations for this email
  RETURN QUERY
  SELECT
    d.id,
    d.donation_public_id,
    d.order_reference,
    d.project_id,
    d.donor_email,
    d.amount,
    d.currency,
    d.donation_status,
    d.donated_at,
    d.updated_at,
    p.project_name_i18n,
    p.location_i18n,
    p.unit_name_i18n,
    p.aggregate_donations
  FROM donations d
  INNER JOIN projects p ON d.project_id = p.id
  WHERE LOWER(d.donor_email) = LOWER(p_email)
  ORDER BY d.donated_at DESC;
END;
$function$;

ALTER FUNCTION public.get_donations_by_email_verified(text, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.get_donations_by_email_verified(text, text) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.get_donations_by_email_verified(text, text) IS 'Securely retrieves all donations for an email address after verifying ownership.
Includes order_reference for grouping and aggregate_donations for conditional display.
Used by track donation feature.';

COMMIT;
