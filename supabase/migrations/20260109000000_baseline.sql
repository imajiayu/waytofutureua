


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."generate_donation_public_id"("project_id_input" bigint) RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    new_id TEXT;
    done BOOLEAN := FALSE;
    random_suffix TEXT;
BEGIN
    WHILE NOT done LOOP
        -- Generate 6-character random suffix (alphanumeric uppercase)
        random_suffix := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));

        -- Format: {project_id}-{random_suffix}
        new_id := project_id_input::TEXT || '-' || random_suffix;

        -- Check if ID already exists for this project
        IF NOT EXISTS (
            SELECT 1 FROM public.donations
            WHERE donation_public_id = new_id
            AND project_id = project_id_input
        ) THEN
            done := TRUE;
        END IF;
    END LOOP;

    RETURN new_id;
END;
$$;


ALTER FUNCTION "public"."generate_donation_public_id"("project_id_input" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_donation_public_id"("project_id_input" bigint) IS 'Generates a unique public-facing donation ID in format: {project_id}-{XXXXXX} (e.g., 1-A1B2C3)';



CREATE OR REPLACE FUNCTION "public"."get_donations_by_email_verified"("p_email" "text", "p_donation_id" "text") RETURNS TABLE("id" bigint, "donation_public_id" character varying, "order_reference" character varying, "project_id" bigint, "donor_email" character varying, "amount" numeric, "currency" character varying, "donation_status" character varying, "donated_at" timestamp with time zone, "updated_at" timestamp with time zone, "project_name" character varying, "project_name_i18n" "jsonb", "location" character varying, "location_i18n" "jsonb", "unit_name" character varying, "unit_name_i18n" "jsonb", "aggregate_donations" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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

  -- Step 2: Return all donations for this email with aggregate_donations
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
    p.project_name,
    p.project_name_i18n,
    p.location,
    p.location_i18n,
    p.unit_name,
    p.unit_name_i18n,
    p.aggregate_donations  -- NEW: Include aggregate_donations
  FROM donations d
  INNER JOIN projects p ON d.project_id = p.id
  WHERE LOWER(d.donor_email) = LOWER(p_email)
  ORDER BY d.donated_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_donations_by_email_verified"("p_email" "text", "p_donation_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_donations_by_email_verified"("p_email" "text", "p_donation_id" "text") IS 'Securely retrieves all donations for an email address after verifying ownership.
Includes order_reference for grouping and aggregate_donations for conditional display.
Used by track donation feature.';



CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_admin"() IS 'Check if user is logged in (admin-only system)';



CREATE OR REPLACE FUNCTION "public"."log_donation_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- INSERT: 记录初始状态
  IF TG_OP = 'INSERT' THEN
    INSERT INTO donation_status_history (
      donation_id,
      from_status,
      to_status
    ) VALUES (
      NEW.id,
      NULL,
      NEW.donation_status
    );
    RETURN NEW;
  END IF;

  -- UPDATE: 只在状态变化时记录
  IF TG_OP = 'UPDATE' AND OLD.donation_status IS DISTINCT FROM NEW.donation_status THEN
    INSERT INTO donation_status_history (
      donation_id,
      from_status,
      to_status
    ) VALUES (
      NEW.id,
      OLD.donation_status,
      NEW.donation_status
    );
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_donation_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_donation_immutable_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- 不允许修改这些关键字段（保持原有逻辑）
  IF OLD.id != NEW.id THEN
    RAISE EXCEPTION 'Cannot modify donation id';
  END IF;

  IF OLD.donation_public_id != NEW.donation_public_id THEN
    RAISE EXCEPTION 'Cannot modify donation_public_id';
  END IF;

  IF OLD.project_id != NEW.project_id THEN
    RAISE EXCEPTION 'Cannot modify project_id';
  END IF;

  IF OLD.donor_name != NEW.donor_name THEN
    RAISE EXCEPTION 'Cannot modify donor_name';
  END IF;

  IF OLD.donor_email != NEW.donor_email THEN
    RAISE EXCEPTION 'Cannot modify donor_email';
  END IF;

  IF OLD.amount != NEW.amount THEN
    RAISE EXCEPTION 'Cannot modify amount';
  END IF;

  IF OLD.order_reference != NEW.order_reference THEN
    RAISE EXCEPTION 'Cannot modify order_reference';
  END IF;

  IF OLD.created_at != NEW.created_at THEN
    RAISE EXCEPTION 'Cannot modify created_at';
  END IF;

  -- 新增：验证状态转换（仅当状态被修改时）
  IF OLD.donation_status != NEW.donation_status THEN
    -- 检查是否由管理员发起（authenticated 用户）
    -- 如果是服务角色（绕过 RLS），允许任意状态转换（用于 Webhook 等）
    IF auth.uid() IS NOT NULL THEN
      -- 管理员只能执行以下状态转换
      IF NOT (
        (OLD.donation_status = 'paid' AND NEW.donation_status = 'confirmed') OR
        (OLD.donation_status = 'confirmed' AND NEW.donation_status = 'delivering') OR
        (OLD.donation_status = 'delivering' AND NEW.donation_status = 'completed')
      ) THEN
        RAISE EXCEPTION 'Invalid status transition: % → %. Admins can only update: paid→confirmed, confirmed→delivering, delivering→completed. Refund statuses are handled automatically by WayForPay.',
          OLD.donation_status, NEW.donation_status;
      END IF;
    END IF;
    -- 如果是服务角色（auth.uid() IS NULL），允许任意状态转换
    -- 这确保 Webhook 和退款逻辑可以正常工作
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_donation_immutable_fields"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."prevent_donation_immutable_fields"() IS 'Prevents modification of immutable donation fields and enforces status transition rules.
- Admins can only perform: paid→confirmed, confirmed→delivering, delivering→completed
- Service role (webhooks) can perform any status transition
- Refund statuses are managed by WayForPay API only';



CREATE OR REPLACE FUNCTION "public"."prevent_project_immutable_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- 不允许修改 id
  IF OLD.id != NEW.id THEN
    RAISE EXCEPTION 'Cannot modify project id';
  END IF;

  -- 不允许修改 created_at
  IF OLD.created_at != NEW.created_at THEN
    RAISE EXCEPTION 'Cannot modify project created_at';
  END IF;

  -- 不允许修改 aggregate_donations（只能在创建时设置）
  IF OLD.aggregate_donations != NEW.aggregate_donations THEN
    RAISE EXCEPTION 'Cannot modify aggregate_donations after project creation';
  END IF;

  -- 不允许修改 is_long_term（只能在创建时设置）✨ NEW
  IF OLD.is_long_term != NEW.is_long_term THEN
    RAISE EXCEPTION 'Cannot modify is_long_term after project creation';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_project_immutable_fields"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."prevent_project_immutable_fields"() IS 'Prevents modification of immutable project fields (id, created_at, aggregate_donations, is_long_term)';



CREATE OR REPLACE FUNCTION "public"."prevent_subscription_immutable_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Protect field: id
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Cannot modify immutable field: id';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_subscription_immutable_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unsubscribe_email"("p_email" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE email_subscriptions
  SET is_subscribed = false
  WHERE email = p_email AND is_subscribed = true;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN v_updated > 0;
END;
$$;


ALTER FUNCTION "public"."unsubscribe_email"("p_email" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."unsubscribe_email"("p_email" "text") IS 'Unsubscribe email from newsletter';



CREATE OR REPLACE FUNCTION "public"."update_email_subscription_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_email_subscription_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_project_units"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    -- Define status categories for clarity
    -- Counted statuses: donations that contribute to current_units
    counted_statuses TEXT[] := ARRAY['paid', 'confirmed', 'delivering', 'completed'];

    -- Non-counted statuses: donations that do NOT contribute to current_units
    non_counted_statuses TEXT[] := ARRAY[
        'pending', 'processing', 'fraud_check', 'widget_load_failed',  -- pre-payment/processing
        'expired', 'declined', 'failed',                                -- payment failed
        'refunding', 'refund_processing', 'refunded'                    -- refund states
    ];
BEGIN
    -- INSERT: Only count donations with counted status
    IF (TG_OP = 'INSERT') THEN
        IF NEW.donation_status = ANY(counted_statuses) THEN
            UPDATE public.projects
            SET current_units = current_units + 1
            WHERE id = NEW.project_id;
        END IF;
        RETURN NEW;

    -- UPDATE: Handle status transitions
    ELSIF (TG_OP = 'UPDATE') THEN
        -- FROM non-counted TO counted -> increment
        IF OLD.donation_status = ANY(non_counted_statuses)
           AND NEW.donation_status = ANY(counted_statuses) THEN
            UPDATE public.projects
            SET current_units = current_units + 1
            WHERE id = NEW.project_id;

        -- FROM counted TO non-counted -> decrement
        ELSIF OLD.donation_status = ANY(counted_statuses)
              AND NEW.donation_status = ANY(non_counted_statuses) THEN
            UPDATE public.projects
            SET current_units = current_units - 1
            WHERE id = NEW.project_id;
        END IF;
        RETURN NEW;

    -- DELETE: Decrement if deleting a counted donation
    ELSIF (TG_OP = 'DELETE') THEN
        IF OLD.donation_status = ANY(counted_statuses) THEN
            UPDATE public.projects
            SET current_units = current_units - 1
            WHERE id = OLD.project_id;
        END IF;
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_project_units"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_project_units"() IS 'Automatically updates project current_units when donation status changes.
Counted statuses (increment): paid, confirmed, delivering, completed.
Non-counted statuses: pending, processing, fraud_check, widget_load_failed, expired, declined, failed, refunding, refund_processing, refunded.';



CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_email_subscription"("p_email" "text", "p_locale" "text") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  v_subscription_id BIGINT;
BEGIN
  -- Validate input
  IF p_email IS NULL OR p_email !~ '^[^@]+@[^@]+\.[^@]+$' THEN
    RAISE EXCEPTION 'Invalid email address';
  END IF;

  IF p_locale NOT IN ('en', 'zh', 'ua') THEN
    RAISE EXCEPTION 'Invalid locale. Must be en, zh, or ua';
  END IF;

  -- Upsert operation
  INSERT INTO email_subscriptions (email, locale, is_subscribed)
  VALUES (p_email, p_locale, true)
  ON CONFLICT (email) DO UPDATE SET
    locale = EXCLUDED.locale,
    is_subscribed = true,
    updated_at = NOW()
  RETURNING id INTO v_subscription_id;

  RETURN v_subscription_id;
END;
$_$;


ALTER FUNCTION "public"."upsert_email_subscription"("p_email" "text", "p_locale" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."upsert_email_subscription"("p_email" "text", "p_locale" "text") IS 'Subscribe or update subscription information (idempotent operation)';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."donation_status_history" (
    "id" bigint NOT NULL,
    "donation_id" bigint NOT NULL,
    "from_status" "text",
    "to_status" "text" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."donation_status_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."donation_status_history" IS '捐赠状态转换历史记录，用于审计追踪';



COMMENT ON COLUMN "public"."donation_status_history"."from_status" IS '旧状态（首次创建时为 NULL）';



COMMENT ON COLUMN "public"."donation_status_history"."to_status" IS '新状态';



COMMENT ON COLUMN "public"."donation_status_history"."changed_at" IS '状态变更时间';



CREATE SEQUENCE IF NOT EXISTS "public"."donation_status_history_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."donation_status_history_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."donation_status_history_id_seq" OWNED BY "public"."donation_status_history"."id";



CREATE TABLE IF NOT EXISTS "public"."donations" (
    "id" bigint NOT NULL,
    "donation_public_id" character varying(50) NOT NULL,
    "project_id" bigint NOT NULL,
    "donor_name" character varying(255) NOT NULL,
    "donor_email" character varying(255) NOT NULL,
    "donor_message" "text",
    "contact_telegram" character varying(255),
    "contact_whatsapp" character varying(255),
    "amount" numeric(10,2) NOT NULL,
    "currency" character varying(10) DEFAULT 'USD'::character varying,
    "payment_method" character varying(50),
    "order_reference" character varying(255),
    "donation_status" character varying(20) DEFAULT 'paid'::character varying,
    "locale" character varying(5) DEFAULT 'en'::character varying,
    "donated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "donations_status_check" CHECK ((("donation_status")::"text" = ANY ((ARRAY['pending'::character varying, 'widget_load_failed'::character varying, 'processing'::character varying, 'fraud_check'::character varying, 'paid'::character varying, 'confirmed'::character varying, 'delivering'::character varying, 'completed'::character varying, 'expired'::character varying, 'declined'::character varying, 'failed'::character varying, 'refunding'::character varying, 'refund_processing'::character varying, 'refunded'::character varying])::"text"[]))),
    CONSTRAINT "valid_amount" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "valid_locale" CHECK ((("locale")::"text" = ANY ((ARRAY['en'::character varying, 'zh'::character varying, 'ua'::character varying])::"text"[])))
);


ALTER TABLE "public"."donations" OWNER TO "postgres";


COMMENT ON TABLE "public"."donations" IS 'Stores donation records linked to projects with payment details';



COMMENT ON COLUMN "public"."donations"."donation_public_id" IS 'Public-facing donation ID in format: {project_id}-{XXXXXX}';



COMMENT ON COLUMN "public"."donations"."amount" IS 'Donation amount per unit in the specified currency';



COMMENT ON COLUMN "public"."donations"."order_reference" IS 'WayForPay order reference (format: DONATE-{project_id}-{timestamp})';



COMMENT ON COLUMN "public"."donations"."donation_status" IS 'Donation status: pending (awaiting payment), paid (payment successful), confirmed (NGO confirmed), delivering (items being delivered), completed (delivery completed), refunding (refund in progress), refunded (payment refunded)';



COMMENT ON COLUMN "public"."donations"."locale" IS 'User language preference at time of donation: en (English), zh (Chinese), ua (Ukrainian)';



COMMENT ON COLUMN "public"."donations"."updated_at" IS 'Record last update timestamp (auto-updated by trigger)';



COMMENT ON CONSTRAINT "donations_status_check" ON "public"."donations" IS 'Enforces valid donation status values (15 total, removed user_cancelled due to unreliable detection).
WayForPay Expired webhook is the authoritative signal for payment timeout.
See docs/PAYMENT_WORKFLOW.md for status definitions and transitions.';



CREATE SEQUENCE IF NOT EXISTS "public"."donations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."donations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."donations_id_seq" OWNED BY "public"."donations"."id";



CREATE TABLE IF NOT EXISTS "public"."email_subscriptions" (
    "id" bigint NOT NULL,
    "email" "text" NOT NULL,
    "locale" "text" NOT NULL,
    "is_subscribed" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "email_subscriptions_locale_check" CHECK (("locale" = ANY (ARRAY['en'::"text", 'zh'::"text", 'ua'::"text"])))
);


ALTER TABLE "public"."email_subscriptions" OWNER TO "postgres";


COMMENT ON TABLE "public"."email_subscriptions" IS 'Email subscription management table for newsletter broadcasts';



COMMENT ON COLUMN "public"."email_subscriptions"."id" IS 'Primary key';



COMMENT ON COLUMN "public"."email_subscriptions"."email" IS 'Subscriber email address';



COMMENT ON COLUMN "public"."email_subscriptions"."locale" IS 'User language preference (en/zh/ua)';



COMMENT ON COLUMN "public"."email_subscriptions"."is_subscribed" IS 'Subscription status (true=subscribed, false=unsubscribed)';



COMMENT ON COLUMN "public"."email_subscriptions"."updated_at" IS 'Last update timestamp';



CREATE SEQUENCE IF NOT EXISTS "public"."email_subscriptions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."email_subscriptions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."email_subscriptions_id_seq" OWNED BY "public"."email_subscriptions"."id";



CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" bigint NOT NULL,
    "project_name" character varying(255) NOT NULL,
    "location" character varying(255) NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "is_long_term" boolean DEFAULT false,
    "target_units" integer,
    "current_units" integer DEFAULT 0 NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "unit_name" character varying(50) DEFAULT 'kit'::character varying,
    "status" character varying(20) DEFAULT 'planned'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "project_name_i18n" "jsonb" DEFAULT '{}'::"jsonb",
    "location_i18n" "jsonb" DEFAULT '{}'::"jsonb",
    "unit_name_i18n" "jsonb" DEFAULT '{}'::"jsonb",
    "description_i18n" "jsonb" DEFAULT '{}'::"jsonb",
    "aggregate_donations" boolean DEFAULT false NOT NULL,
    CONSTRAINT "valid_dates" CHECK ((("end_date" IS NULL) OR ("end_date" >= "start_date"))),
    CONSTRAINT "valid_status" CHECK ((("status")::"text" = ANY ((ARRAY['planned'::character varying, 'active'::character varying, 'completed'::character varying, 'paused'::character varying])::"text"[]))),
    CONSTRAINT "valid_unit_price" CHECK (("unit_price" > (0)::numeric)),
    CONSTRAINT "valid_units" CHECK ((("current_units" >= 0) AND (("target_units" IS NULL) OR ("target_units" >= 0))))
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


COMMENT ON TABLE "public"."projects" IS 'Stores NGO project information with funding goals and progress';



COMMENT ON COLUMN "public"."projects"."is_long_term" IS 'Indicates if the project has no fixed end date';



COMMENT ON COLUMN "public"."projects"."target_units" IS 'Target number of units to fund (NULL for projects without specific targets)';



COMMENT ON COLUMN "public"."projects"."project_name_i18n" IS 'Translated project names: {"en": "...", "zh": "...", "ua": "..."}';



COMMENT ON COLUMN "public"."projects"."location_i18n" IS 'Translated locations: {"en": "...", "zh": "...", "ua": "..."}';



COMMENT ON COLUMN "public"."projects"."unit_name_i18n" IS 'Translated unit names: {"en": "kit", "zh": "套件", "ua": "комплект"}';



COMMENT ON COLUMN "public"."projects"."description_i18n" IS 'Translated descriptions: {"en": "...", "zh": "...", "ua": "..."}';



COMMENT ON COLUMN "public"."projects"."aggregate_donations" IS 'Controls donation record creation behavior:
- true: Create single aggregated donation record regardless of quantity (e.g., tip/support projects)
- false: Create one donation record per unit (e.g., supply projects like sleeping bags)';



CREATE OR REPLACE VIEW "public"."order_donations_secure" AS
 SELECT "d"."id",
    "d"."donation_public_id",
    "d"."amount",
    "d"."donation_status",
    "d"."order_reference",
        CASE
            WHEN (POSITION(('@'::"text") IN ("d"."donor_email")) > 0) THEN
            CASE
                WHEN ("length"("split_part"(("d"."donor_email")::"text", '@'::"text", 1)) <= 2) THEN (("substring"("split_part"(("d"."donor_email")::"text", '@'::"text", 1), 1, 1) || '***@'::"text") ||
                CASE
                    WHEN ("length"("split_part"(("d"."donor_email")::"text", '@'::"text", 2)) <= 3) THEN ("substring"("split_part"(("d"."donor_email")::"text", '@'::"text", 2), 1, 1) || '***'::"text")
                    ELSE (("substring"("split_part"(("d"."donor_email")::"text", '@'::"text", 2), 1, 1) || '***'::"text") || "substring"("split_part"(("d"."donor_email")::"text", '@'::"text", 2), ("length"("split_part"(("d"."donor_email")::"text", '@'::"text", 2)) - 1), 2))
                END)
                ELSE (((("substring"("split_part"(("d"."donor_email")::"text", '@'::"text", 1), 1, 1) || '***'::"text") || "substring"("split_part"(("d"."donor_email")::"text", '@'::"text", 1), "length"("split_part"(("d"."donor_email")::"text", '@'::"text", 1)), 1)) || '@'::"text") ||
                CASE
                    WHEN ("length"("split_part"(("d"."donor_email")::"text", '@'::"text", 2)) <= 3) THEN ("substring"("split_part"(("d"."donor_email")::"text", '@'::"text", 2), 1, 1) || '***'::"text")
                    ELSE (("substring"("split_part"(("d"."donor_email")::"text", '@'::"text", 2), 1, 1) || '***'::"text") || "substring"("split_part"(("d"."donor_email")::"text", '@'::"text", 2), ("length"("split_part"(("d"."donor_email")::"text", '@'::"text", 2)) - 1), 2))
                END)
            END
            ELSE '***'::"text"
        END AS "donor_email_obfuscated",
    "p"."id" AS "project_id",
    "p"."project_name",
    "p"."project_name_i18n",
    "p"."location",
    "p"."location_i18n",
    "p"."unit_name",
    "p"."unit_name_i18n",
    "p"."aggregate_donations"
   FROM ("public"."donations" "d"
     JOIN "public"."projects" "p" ON (("d"."project_id" = "p"."id")))
  WHERE (("d"."order_reference" IS NOT NULL) AND (("d"."order_reference")::"text" <> ''::"text"));


ALTER VIEW "public"."order_donations_secure" OWNER TO "postgres";


COMMENT ON VIEW "public"."order_donations_secure" IS 'Secure view for querying donations by order_reference.
Returns obfuscated email addresses and excludes donor names for privacy.
Used by public API endpoint /api/donations/order/[orderReference].
NOW INCLUDES ALL DONATION STATUSES - no status filter applied.
All 15 possible statuses are visible: pending, widget_load_failed, processing,
fraud_check, paid, confirmed, delivering, completed, expired, declined, failed,
refunding, refund_processing, refunded.
Includes aggregate_donations flag for proper UI display.';



CREATE OR REPLACE VIEW "public"."project_stats" AS
SELECT
    NULL::bigint AS "id",
    NULL::character varying(255) AS "project_name",
    NULL::"jsonb" AS "project_name_i18n",
    NULL::character varying(255) AS "location",
    NULL::"jsonb" AS "location_i18n",
    NULL::character varying(20) AS "status",
    NULL::integer AS "target_units",
    NULL::integer AS "current_units",
    NULL::character varying(50) AS "unit_name",
    NULL::"jsonb" AS "unit_name_i18n",
    NULL::numeric(10,2) AS "unit_price",
    NULL::"date" AS "start_date",
    NULL::"date" AS "end_date",
    NULL::boolean AS "is_long_term",
    NULL::boolean AS "aggregate_donations",
    NULL::"jsonb" AS "description_i18n",
    NULL::numeric AS "total_raised",
    NULL::bigint AS "donation_count",
    NULL::numeric AS "progress_percentage";


ALTER VIEW "public"."project_stats" OWNER TO "postgres";


COMMENT ON VIEW "public"."project_stats" IS 'Project statistics view. donation_count represents actual payment transactions (unique order_reference), not individual donation records. For example, if a user buys 10 blankets in one transaction, it counts as 1 donation.';



CREATE SEQUENCE IF NOT EXISTS "public"."projects_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."projects_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."projects_id_seq" OWNED BY "public"."projects"."id";



CREATE OR REPLACE VIEW "public"."public_project_donations" AS
 SELECT "id",
    "donation_public_id",
    "project_id",
        CASE
            WHEN (("donor_email" IS NOT NULL) AND (POSITION(('@'::"text") IN ("donor_email")) > 0)) THEN ((((((SUBSTRING("donor_email" FROM 1 FOR 1) || '***'::"text") || SUBSTRING("donor_email" FROM (POSITION(('@'::"text") IN ("donor_email")) - 1) FOR 1)) || '@'::"text") || SUBSTRING(SUBSTRING("donor_email" FROM (POSITION(('@'::"text") IN ("donor_email")) + 1)) FROM 1 FOR 1)) || '***'::"text") ||
            CASE
                WHEN (POSITION(('.'::"text") IN (SUBSTRING("donor_email" FROM (POSITION(('@'::"text") IN ("donor_email")) + 1)))) > 0) THEN ('.'::"text" || "split_part"(SUBSTRING("donor_email" FROM (POSITION(('@'::"text") IN ("donor_email")) + 1)), '.'::"text", 2))
                ELSE ''::"text"
            END)
            ELSE NULL::"text"
        END AS "donor_email_obfuscated",
    "md5"((COALESCE("order_reference", ''::character varying))::"text") AS "order_id",
    "amount",
    "currency",
    "donation_status",
    "donated_at",
    "updated_at"
   FROM "public"."donations" "d"
  WHERE (("donation_status")::"text" = ANY ((ARRAY['paid'::character varying, 'confirmed'::character varying, 'delivering'::character varying, 'completed'::character varying])::"text"[]))
  ORDER BY "donated_at" DESC;


ALTER VIEW "public"."public_project_donations" OWNER TO "postgres";


COMMENT ON VIEW "public"."public_project_donations" IS 'Public view of project donations with obfuscated email addresses for privacy protection. Only shows successful donations. Includes order_id (MD5 hash) to group donations from same payment without exposing order_reference.';



ALTER TABLE ONLY "public"."donation_status_history" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."donation_status_history_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."donations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."donations_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."email_subscriptions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."email_subscriptions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."projects" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."projects_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."donation_status_history"
    ADD CONSTRAINT "donation_status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."donations"
    ADD CONSTRAINT "donations_donation_public_id_key" UNIQUE ("donation_public_id");



ALTER TABLE ONLY "public"."donations"
    ADD CONSTRAINT "donations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_subscriptions"
    ADD CONSTRAINT "email_subscriptions_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."email_subscriptions"
    ADD CONSTRAINT "email_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_donation_status_history_changed_at" ON "public"."donation_status_history" USING "btree" ("changed_at" DESC);



CREATE INDEX "idx_donation_status_history_donation_id" ON "public"."donation_status_history" USING "btree" ("donation_id");



CREATE INDEX "idx_donation_status_history_to_status" ON "public"."donation_status_history" USING "btree" ("to_status");



CREATE INDEX "idx_donations_email" ON "public"."donations" USING "btree" ("donor_email");



CREATE INDEX "idx_donations_locale" ON "public"."donations" USING "btree" ("locale");



CREATE INDEX "idx_donations_order_ref_status" ON "public"."donations" USING "btree" ("order_reference", "donation_status") WHERE ("order_reference" IS NOT NULL);



CREATE INDEX "idx_donations_order_reference" ON "public"."donations" USING "btree" ("order_reference") WHERE ("order_reference" IS NOT NULL);



CREATE INDEX "idx_donations_project_id" ON "public"."donations" USING "btree" ("project_id");



CREATE INDEX "idx_donations_public_id" ON "public"."donations" USING "btree" ("donation_public_id");



CREATE INDEX "idx_donations_refund_status" ON "public"."donations" USING "btree" ("donation_status") WHERE (("donation_status")::"text" = ANY ((ARRAY['refunding'::character varying, 'refunded'::character varying])::"text"[]));



CREATE INDEX "idx_donations_status" ON "public"."donations" USING "btree" ("donation_status");



CREATE INDEX "idx_email_subscriptions_email" ON "public"."email_subscriptions" USING "btree" ("email");



CREATE INDEX "idx_email_subscriptions_is_subscribed" ON "public"."email_subscriptions" USING "btree" ("is_subscribed") WHERE ("is_subscribed" = true);



CREATE INDEX "idx_email_subscriptions_locale" ON "public"."email_subscriptions" USING "btree" ("locale");



CREATE INDEX "idx_projects_aggregate_donations" ON "public"."projects" USING "btree" ("aggregate_donations");



CREATE INDEX "idx_projects_name_i18n_en" ON "public"."projects" USING "btree" ((("project_name_i18n" ->> 'en'::"text")));



CREATE INDEX "idx_projects_name_i18n_ua" ON "public"."projects" USING "btree" ((("project_name_i18n" ->> 'ua'::"text")));



CREATE INDEX "idx_projects_name_i18n_zh" ON "public"."projects" USING "btree" ((("project_name_i18n" ->> 'zh'::"text")));



CREATE INDEX "idx_projects_start_date" ON "public"."projects" USING "btree" ("start_date");



CREATE INDEX "idx_projects_status" ON "public"."projects" USING "btree" ("status");



CREATE OR REPLACE VIEW "public"."project_stats" AS
 SELECT "p"."id",
    "p"."project_name",
    "p"."project_name_i18n",
    "p"."location",
    "p"."location_i18n",
    "p"."status",
    "p"."target_units",
    "p"."current_units",
    "p"."unit_name",
    "p"."unit_name_i18n",
    "p"."unit_price",
    "p"."start_date",
    "p"."end_date",
    "p"."is_long_term",
    "p"."aggregate_donations",
    "p"."description_i18n",
    COALESCE("sum"(
        CASE
            WHEN (("d"."donation_status")::"text" = ANY ((ARRAY['paid'::character varying, 'confirmed'::character varying, 'delivering'::character varying, 'completed'::character varying])::"text"[])) THEN "d"."amount"
            ELSE (0)::numeric
        END), (0)::numeric) AS "total_raised",
    "count"(DISTINCT
        CASE
            WHEN (("d"."donation_status")::"text" = ANY ((ARRAY['paid'::character varying, 'confirmed'::character varying, 'delivering'::character varying, 'completed'::character varying])::"text"[])) THEN "d"."order_reference"
            ELSE NULL::character varying
        END) AS "donation_count",
        CASE
            WHEN ("p"."target_units" > 0) THEN "round"(((("p"."current_units")::numeric / ("p"."target_units")::numeric) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS "progress_percentage"
   FROM ("public"."projects" "p"
     LEFT JOIN "public"."donations" "d" ON (("p"."id" = "d"."project_id")))
  GROUP BY "p"."id";



CREATE OR REPLACE TRIGGER "donation_status_change_trigger" AFTER INSERT OR UPDATE ON "public"."donations" FOR EACH ROW EXECUTE FUNCTION "public"."log_donation_status_change"();



CREATE OR REPLACE TRIGGER "prevent_donation_immutable_fields_trigger" BEFORE UPDATE ON "public"."donations" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_donation_immutable_fields"();



CREATE OR REPLACE TRIGGER "prevent_project_immutable_fields_trigger" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_project_immutable_fields"();



CREATE OR REPLACE TRIGGER "prevent_subscription_immutable_fields_trigger" BEFORE UPDATE ON "public"."email_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_subscription_immutable_fields"();



CREATE OR REPLACE TRIGGER "update_donations_updated_at" BEFORE UPDATE ON "public"."donations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



COMMENT ON TRIGGER "update_donations_updated_at" ON "public"."donations" IS 'Automatically updates updated_at timestamp when donation record is modified';



CREATE OR REPLACE TRIGGER "update_email_subscriptions_updated_at" BEFORE UPDATE ON "public"."email_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_email_subscription_updated_at"();



CREATE OR REPLACE TRIGGER "update_project_units_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."donations" FOR EACH ROW EXECUTE FUNCTION "public"."update_project_units"();



CREATE OR REPLACE TRIGGER "update_projects_updated_at" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."donation_status_history"
    ADD CONSTRAINT "donation_status_history_donation_id_fkey" FOREIGN KEY ("donation_id") REFERENCES "public"."donations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."donations"
    ADD CONSTRAINT "fk_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can insert projects" ON "public"."projects" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update donation status" ON "public"."donations" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



COMMENT ON POLICY "Admins can update donation status" ON "public"."donations" IS 'Admins can update donation status and result URL. Immutable fields are protected by trigger. Status transition validation is handled in application layer.';



CREATE POLICY "Admins can update projects" ON "public"."projects" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



COMMENT ON POLICY "Admins can update projects" ON "public"."projects" IS 'Admins can update projects. Immutable fields (id, created_at) are protected by trigger.';



CREATE POLICY "Admins can view all donations" ON "public"."donations" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can view all status history" ON "public"."donation_status_history" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can view all subscriptions" ON "public"."email_subscriptions" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Allow anonymous insert pending donations" ON "public"."donations" FOR INSERT TO "authenticated", "anon" WITH CHECK (((("donation_status")::"text" = 'pending'::"text") AND ("amount" > (0)::numeric) AND ("amount" <= (10000)::numeric) AND (("currency")::"text" = ANY ((ARRAY['USD'::character varying, 'UAH'::character varying, 'EUR'::character varying])::"text"[])) AND ("order_reference" IS NOT NULL) AND (("order_reference")::"text" <> ''::"text") AND ("donation_public_id" IS NOT NULL) AND (("donation_public_id")::"text" <> ''::"text") AND ("donor_name" IS NOT NULL) AND (("donor_name")::"text" <> ''::"text") AND ("donor_email" IS NOT NULL) AND (("donor_email")::"text" <> ''::"text") AND (("donor_email")::"text" ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::"text") AND (("locale")::"text" = ANY ((ARRAY['en'::character varying, 'zh'::character varying, 'ua'::character varying])::"text"[])) AND ("project_id" IS NOT NULL)));



COMMENT ON POLICY "Allow anonymous insert pending donations" ON "public"."donations" IS 'Complete policy with all safe validations.
Foreign key constraint ensures project exists.
Application layer validates project status.';



CREATE POLICY "Allow anonymous read donations" ON "public"."donations" FOR SELECT TO "authenticated", "anon" USING (true);



COMMENT ON POLICY "Allow anonymous read donations" ON "public"."donations" IS 'Allows anonymous and authenticated users to read all donations.
This is needed for .insert().select() to work.
Public APIs use views with obfuscated data for privacy.';



CREATE POLICY "Allow anonymous read projects" ON "public"."projects" FOR SELECT TO "authenticated", "anon" USING (true);



COMMENT ON POLICY "Allow anonymous read projects" ON "public"."projects" IS 'Allows anonymous and authenticated users to read all projects.
This is needed for donation RLS policy to check project existence.
Projects are public information, so this is safe.';



CREATE POLICY "Allow anonymous update pending to widget_load_failed" ON "public"."donations" FOR UPDATE TO "authenticated", "anon" USING ((("donation_status")::"text" = 'pending'::"text")) WITH CHECK ((("donation_status")::"text" = 'widget_load_failed'::"text"));



ALTER TABLE "public"."donation_status_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."donations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";














































































































































































GRANT ALL ON FUNCTION "public"."generate_donation_public_id"("project_id_input" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_donation_public_id"("project_id_input" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_donation_public_id"("project_id_input" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_donations_by_email_verified"("p_email" "text", "p_donation_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_donations_by_email_verified"("p_email" "text", "p_donation_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_donations_by_email_verified"("p_email" "text", "p_donation_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_donation_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_donation_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_donation_status_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_donation_immutable_fields"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_donation_immutable_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_donation_immutable_fields"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_project_immutable_fields"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_project_immutable_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_project_immutable_fields"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_subscription_immutable_fields"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_subscription_immutable_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_subscription_immutable_fields"() TO "service_role";



GRANT ALL ON FUNCTION "public"."unsubscribe_email"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."unsubscribe_email"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unsubscribe_email"("p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_email_subscription_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_email_subscription_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_email_subscription_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_project_units"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_project_units"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_project_units"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_email_subscription"("p_email" "text", "p_locale" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_email_subscription"("p_email" "text", "p_locale" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_email_subscription"("p_email" "text", "p_locale" "text") TO "service_role";
























GRANT ALL ON TABLE "public"."donation_status_history" TO "anon";
GRANT ALL ON TABLE "public"."donation_status_history" TO "authenticated";
GRANT ALL ON TABLE "public"."donation_status_history" TO "service_role";



GRANT ALL ON SEQUENCE "public"."donation_status_history_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."donation_status_history_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."donation_status_history_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."donations" TO "anon";
GRANT ALL ON TABLE "public"."donations" TO "authenticated";
GRANT ALL ON TABLE "public"."donations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."donations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."donations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."donations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."email_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."email_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."email_subscriptions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."email_subscriptions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."email_subscriptions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."email_subscriptions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."order_donations_secure" TO "anon";
GRANT ALL ON TABLE "public"."order_donations_secure" TO "authenticated";
GRANT ALL ON TABLE "public"."order_donations_secure" TO "service_role";



GRANT ALL ON TABLE "public"."project_stats" TO "anon";
GRANT ALL ON TABLE "public"."project_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."project_stats" TO "service_role";



GRANT ALL ON SEQUENCE "public"."projects_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."projects_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."projects_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."public_project_donations" TO "anon";
GRANT ALL ON TABLE "public"."public_project_donations" TO "authenticated";
GRANT ALL ON TABLE "public"."public_project_donations" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";


-- =============================================
-- STORAGE BUCKETS
-- =============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'donation-results',
    'donation-results',
    true,
    52428800, -- 50MB limit
    ARRAY['image/*', 'video/*']
)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- STORAGE POLICIES (donation-results)
-- =============================================

-- 管理员上传文件
CREATE POLICY "Admins can upload to donation-results"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'donation-results'
    AND is_admin()
);

-- 管理员删除文件
CREATE POLICY "Admins can delete from donation-results"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'donation-results'
    AND is_admin()
);

-- 管理员查看文件列表
CREATE POLICY "Admins can view donation-results"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'donation-results'
    AND is_admin()
);

-- 管理员更新文件元数据
CREATE POLICY "Admins can update donation-results metadata"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'donation-results'
    AND is_admin()
);

-- 公开访问捐赠结果图片
CREATE POLICY "Public Access - View result images"
ON storage.objects FOR SELECT TO public
USING (
    bucket_id = 'donation-results'
);

-- =============================================
-- CRON JOBS (捐赠过期清理)
-- =============================================

-- 每天午夜清理超过 12 小时仍为 pending 的捐赠，标记为 failed
SELECT cron.schedule(
  'expire-pending-donations',
  '0 0 * * *',
  $$
    UPDATE donations
    SET donation_status = 'failed'
    WHERE donation_status = 'pending'
      AND donated_at < NOW() - INTERVAL '12 hours';
  $$
);
