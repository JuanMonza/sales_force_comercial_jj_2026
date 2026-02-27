CREATE OR REPLACE FUNCTION ensure_sales_partition(target_month DATE)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  month_start DATE := date_trunc('month', target_month)::date;
  month_end DATE := (date_trunc('month', target_month) + interval '1 month')::date;
  partition_name TEXT := 'sales_' || to_char(month_start, 'YYYY_MM');
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF sales FOR VALUES FROM (%L) TO (%L);',
    partition_name,
    month_start,
    month_end
  );
END;
$$;

CREATE OR REPLACE FUNCTION create_sales_partitions(months_back INTEGER, months_forward INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  i INTEGER;
BEGIN
  FOR i IN -months_back..months_forward LOOP
    PERFORM ensure_sales_partition((date_trunc('month', CURRENT_DATE) + (i || ' month')::interval)::date);
  END LOOP;
END;
$$;

SELECT create_sales_partitions(2, 12);

