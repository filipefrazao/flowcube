from django.db import connection


class FunnelService:
    """Funnel analysis using PostgreSQL CTEs."""

    def __init__(self, project_id):
        self.project_id = project_id

    def calculate_funnel(self, steps, window_hours=24, start_date=None, end_date=None):
        if not steps or len(steps) < 2:
            return {"steps": [], "completion_rate": 0, "most_dropped_at": None}

        # Build CTE that finds, for each device, the earliest occurrence of each step
        # respecting the ordering constraint (step N must happen after step N-1)
        # within the conversion window.
        #
        # We use a recursive approach:
        # 1. Find all devices that did step 1
        # 2. For each subsequent step, find devices that also did it AFTER the previous step
        #    within window_hours

        date_filter = ""
        params = [str(self.project_id)]

        if start_date:
            date_filter += " AND created_at >= %s"
            params.append(start_date)
        if end_date:
            date_filter += " AND created_at <= %s"
            params.append(end_date)

        # Step 1 CTE: devices that performed the first step
        ctes = []
        ctes.append(f"""
        step1 AS (
            SELECT device_id, MIN(created_at) AS step_time
            FROM funnelcube_analyticsevent
            WHERE project_id = %s
              AND name = %s
              {date_filter}
            GROUP BY device_id
        )""")
        params_for_steps = [str(self.project_id), steps[0]]
        if start_date:
            params_for_steps.append(start_date)
        if end_date:
            params_for_steps.append(end_date)

        # Subsequent steps: join with previous step, check ordering + window
        for i in range(1, len(steps)):
            prev = f"step{i}"
            curr = f"step{i + 1}"
            ctes.append(f"""
        {curr} AS (
            SELECT e.device_id, MIN(e.created_at) AS step_time
            FROM funnelcube_analyticsevent e
            INNER JOIN {prev} p ON e.device_id = p.device_id
            WHERE e.project_id = %s
              AND e.name = %s
              AND e.created_at > p.step_time
              AND e.created_at <= p.step_time + INTERVAL '{window_hours} hours'
            GROUP BY e.device_id
        )""")
            params_for_steps.extend([str(self.project_id), steps[i]])

        # Final SELECT: count devices at each step
        step_counts = ", ".join(
            f"(SELECT COUNT(*) FROM step{i + 1}) AS step{i + 1}_count"
            for i in range(len(steps))
        )

        sql = f"WITH {', '.join(ctes)}\nSELECT {step_counts}"

        with connection.cursor() as cursor:
            cursor.execute(sql, params_for_steps)
            row = cursor.fetchone()

        if not row:
            return {"steps": [], "completion_rate": 0, "most_dropped_at": None}

        counts = list(row)
        first_count = counts[0] if counts[0] > 0 else 1

        funnel_steps = []
        max_drop = 0
        most_dropped = None

        for i, step_name in enumerate(steps):
            count = counts[i]
            conversion = round(count / first_count * 100, 2)

            if i > 0:
                prev_count = counts[i - 1] if counts[i - 1] > 0 else 1
                drop_off = round((1 - count / prev_count) * 100, 2)
                if drop_off > max_drop:
                    max_drop = drop_off
                    most_dropped = step_name
            else:
                drop_off = None

            funnel_steps.append({
                "name": step_name,
                "count": count,
                "conversion": conversion,
                "drop_off": drop_off,
            })

        return {
            "steps": funnel_steps,
            "completion_rate": funnel_steps[-1]["conversion"],
            "most_dropped_at": most_dropped,
        }
