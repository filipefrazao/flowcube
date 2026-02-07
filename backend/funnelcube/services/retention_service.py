from django.db import connection


class RetentionService:
    """Cohort retention analysis using PostgreSQL CTEs."""

    def calculate_retention(
        self, project_id, event_name="screen_view", retention_event=None,
        cohort_interval="day", lookback_days=30
    ):
        retention_event = retention_event or event_name

        interval_trunc = {
            "day": "day",
            "week": "week",
            "month": "month",
        }.get(cohort_interval, "day")

        sql = """
        WITH cohorts AS (
            SELECT
                device_id,
                DATE_TRUNC(%s, MIN(created_at))::date AS cohort_date
            FROM funnelcube_analyticsevent
            WHERE project_id = %s
              AND name = %s
              AND created_at >= NOW() - INTERVAL '%s days'
            GROUP BY device_id
        ),
        cohort_sizes AS (
            SELECT cohort_date, COUNT(*) AS cohort_size
            FROM cohorts
            GROUP BY cohort_date
        ),
        activity AS (
            SELECT
                c.cohort_date,
                (DATE_TRUNC(%s, e.created_at)::date - c.cohort_date) AS period_offset,
                COUNT(DISTINCT e.device_id) AS active_users
            FROM cohorts c
            INNER JOIN funnelcube_analyticsevent e
                ON c.device_id = e.device_id
            WHERE e.project_id = %s
              AND e.name = %s
              AND e.created_at >= c.cohort_date
            GROUP BY c.cohort_date, period_offset
        )
        SELECT
            a.cohort_date,
            a.period_offset,
            a.active_users,
            cs.cohort_size,
            ROUND(100.0 * a.active_users / cs.cohort_size, 1) AS retention_pct
        FROM activity a
        INNER JOIN cohort_sizes cs ON a.cohort_date = cs.cohort_date
        ORDER BY a.cohort_date, a.period_offset
        """

        params = [
            interval_trunc,
            str(project_id),
            event_name,
            lookback_days,
            interval_trunc,
            str(project_id),
            retention_event,
        ]

        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            rows = cursor.fetchall()

        if not rows:
            return {"cohorts": [], "data": [], "sizes": [], "total_cohorts": 0}

        # Build matrix
        cohort_map = {}
        sizes_map = {}
        for cohort_date, offset, active, size, pct in rows:
            key = str(cohort_date)
            if key not in cohort_map:
                cohort_map[key] = {}
                sizes_map[key] = size
            # offset is a timedelta, convert to days int
            days = offset.days if hasattr(offset, "days") else int(offset)
            cohort_map[key][days] = float(pct)

        cohort_list = sorted(cohort_map.keys())
        max_periods = max(
            (max(periods.keys()) if periods else 0)
            for periods in cohort_map.values()
        )

        data = []
        for cohort in cohort_list:
            row = [
                cohort_map[cohort].get(d) for d in range(max_periods + 1)
            ]
            data.append(row)

        return {
            "cohorts": cohort_list,
            "sizes": [sizes_map[c] for c in cohort_list],
            "data": data,
            "total_cohorts": len(cohort_list),
        }
