-- Helper functions for the /admin/data-browser page.
-- Read-only introspection of public schema; no data tables modified.

-- Returns the list of all base tables in the public schema.
CREATE OR REPLACE FUNCTION admin_list_tables()
RETURNS TABLE(table_name text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT t.table_name::text
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
  ORDER BY t.table_name;
$$;

-- Returns column metadata for a given table, including FK references.
CREATE OR REPLACE FUNCTION admin_table_schema(p_table text)
RETURNS TABLE(
  column_name  text,
  data_type    text,
  is_nullable  boolean,
  is_pk        boolean,
  fk_table     text,
  fk_column    text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    c.column_name::text,
    c.data_type::text,
    (c.is_nullable = 'YES'),
    EXISTS(
      SELECT 1
      FROM information_schema.key_column_usage kcu
      JOIN information_schema.table_constraints tc
        ON  tc.constraint_name  = kcu.constraint_name
        AND tc.table_schema     = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND kcu.table_schema   = 'public'
        AND kcu.table_name     = p_table
        AND kcu.column_name    = c.column_name
    ) AS is_pk,
    fk.fk_table,
    fk.fk_column
  FROM information_schema.columns c
  LEFT JOIN (
    SELECT
      kcu.column_name,
      ccu.table_name::text  AS fk_table,
      ccu.column_name::text AS fk_column
    FROM information_schema.key_column_usage kcu
    JOIN information_schema.referential_constraints rc
      ON  rc.constraint_name   = kcu.constraint_name
      AND rc.constraint_schema = kcu.constraint_schema
    JOIN information_schema.constraint_column_usage ccu
      ON  ccu.constraint_name = rc.unique_constraint_name
    WHERE kcu.table_schema = 'public'
      AND kcu.table_name   = p_table
  ) fk ON fk.column_name = c.column_name
  WHERE c.table_schema = 'public'
    AND c.table_name   = p_table
  ORDER BY c.ordinal_position;
$$;
