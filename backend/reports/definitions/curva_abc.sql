-- Curva ABC (Product Revenue Analysis)
-- Parameters: date_from, date_to
SELECT
    p.name AS product_name,
    p.sku,
    p.price,
    COUNT(sp.sale_id) AS total_sales,
    SUM(s.total_value) AS total_revenue,
    CASE
        WHEN SUM(s.total_value) > 10000 THEN 'A'
        WHEN SUM(s.total_value) > 5000 THEN 'B'
        ELSE 'C'
    END AS classification
FROM salescube_product p
LEFT JOIN salescube_sale_products sp ON sp.product_id = p.id
LEFT JOIN salescube_sale s ON s.id = sp.sale_id
WHERE s.created_at >= %(date_from)s
  AND s.created_at <= %(date_to)s
GROUP BY p.id, p.name, p.sku, p.price
ORDER BY total_revenue DESC NULLS LAST;
