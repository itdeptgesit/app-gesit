-- SQL Migration for Nucleus Wipe Functions
-- These functions run with SECURITY DEFINER to bypass RLS policies

-- Function to wipe a single table
CREATE OR REPLACE FUNCTION wipe_table(table_name TEXT)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
  sql_query TEXT;
BEGIN
  -- Construct dynamic SQL
  -- Construct dynamic SQL using TRUNCATE CASCADE for cleaner wipe
  sql_query := format('TRUNCATE TABLE %I CASCADE', table_name);
  
  -- Execute and get count
  EXECUTE sql_query;
  -- Execute
  EXECUTE sql_query;
  -- TRUNCATE doesn't return row count in the same way, so we assume success if no error
  deleted_count := 0; -- Placeholder as TRUNCATE doesn't return count
  
  -- Return result as JSON
  RETURN json_build_object(
    'success', true,
    'table', table_name,
    'deleted_count', deleted_count
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'table', table_name,
      'error', SQLERRM
    );
END;
$$;

-- Function to wipe multiple tables
CREATE OR REPLACE FUNCTION wipe_tables(table_names TEXT[])
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  table_name TEXT;
  total_deleted INTEGER := 0;
  results JSON[] := '{}';
  result JSON;
BEGIN
  FOREACH table_name IN ARRAY table_names
  LOOP
    result := wipe_table(table_name);
    results := array_append(results, result);
    total_deleted := total_deleted + COALESCE((result->>'deleted_count')::INTEGER, 0);
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'total_deleted', total_deleted,
    'results', results
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION wipe_table(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION wipe_tables(TEXT[]) TO authenticated;

-- Comment for documentation
COMMENT ON FUNCTION wipe_table IS 'Wipes all data from a single table, bypassing RLS policies. Used for maintenance operations.';
COMMENT ON FUNCTION wipe_tables IS 'Wipes all data from multiple tables, bypassing RLS policies. Used for maintenance operations.';
