-- Lead Vitta (Lifetime Value) Report
-- Parameters: date_from, date_to
SELECT
    l.name,
    l.email,
    l.phone,
    l.source,
    COUNT(s.id) AS total_sales,
    COALESCE(SUM(s.total_value), 0) AS lifetime_value,
    MIN(s.created_at) AS first_sale,
    MAX(s.created_at) AS last_sale
FROM salescube_lead l
LEFT JOIN salescube_sale s ON s.lead_id = l.id
WHERE l.created_at >= %(date_from)s
  AND l.created_at <= %(date_to)s
GROUP BY l.id, l.name, l.email, l.phone, l.source
ORDER BY lifetime_value DESC;
