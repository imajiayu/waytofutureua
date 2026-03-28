-- Migration: Remove unused progress_percentage from project_stats view
-- The field is never read by application code — progress is calculated
-- in the frontend by lib/project-utils.ts using total_raised and current_units.
-- CREATE OR REPLACE cannot drop columns, so we DROP + CREATE.

DROP VIEW IF EXISTS "public"."project_stats";

CREATE VIEW "public"."project_stats" AS
SELECT
    p.id,
    p.project_name,
    p.project_name_i18n,
    p.location,
    p.location_i18n,
    p.status,
    p.target_units,
    p.current_units,
    p.unit_name,
    p.unit_name_i18n,
    p.unit_price,
    p.start_date,
    p.end_date,
    p.is_long_term,
    p.aggregate_donations,
    COALESCE(SUM(
        CASE
            WHEN d.donation_status IN ('paid', 'confirmed', 'delivering', 'completed')
            THEN d.amount
            ELSE 0
        END
    ), 0) AS total_raised,
    COUNT(DISTINCT
        CASE
            WHEN d.donation_status IN ('paid', 'confirmed', 'delivering', 'completed')
            THEN d.order_reference
            ELSE NULL
        END
    ) AS donation_count
FROM public.projects p
LEFT JOIN public.donations d ON p.id = d.project_id
GROUP BY p.id;

COMMENT ON VIEW "public"."project_stats" IS 'Project statistics view.
- donation_count: actual payment transactions (unique order_reference)
- total_raised: sum of amounts for successful donations
- Progress is calculated in the frontend (lib/project-utils.ts), not in this view.';
