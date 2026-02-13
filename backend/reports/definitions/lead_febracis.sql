-- Lead Febracis Report
-- Parameters: date_from, date_to
SELECT
    l.name,
    l.email,
    l.phone,
    l.company,
    l.source,
    l.score,
    l.value,
    ps.name AS stage,
    l.created_at
FROM salescube_lead l
LEFT JOIN salescube_pipelinestage ps ON l.stage_id = ps.id
WHERE l.created_at >= %(date_from)s
  AND l.created_at <= %(date_to)s
ORDER BY l.created_at DESC;
