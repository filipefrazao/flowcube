-- Lead FIT Analysis Report
-- Parameters: min_score
SELECT
    l.name,
    l.email,
    l.phone,
    l.score,
    l.source,
    ps.name AS stage,
    l.value,
    l.created_at
FROM salescube_lead l
LEFT JOIN salescube_pipelinestage ps ON l.stage_id = ps.id
WHERE l.score >= %(min_score)s
ORDER BY l.score DESC;
