from django.db import connection
from django.utils import timezone
from datetime import timedelta


class SankeyService:
    """User flow / Sankey diagram data from event transitions."""

    def __init__(self, project_id):
        self.project_id = project_id

    def generate_flow(self, max_steps=5, min_frequency=3, days=7):
        end = timezone.now()
        start = end - timedelta(days=days)

        sql = """
        WITH ordered_events AS (
            SELECT
                session_id,
                name,
                created_at,
                LEAD(name) OVER (
                    PARTITION BY session_id ORDER BY created_at
                ) AS next_event,
                ROW_NUMBER() OVER (
                    PARTITION BY session_id ORDER BY created_at
                ) AS seq
            FROM funnelcube_analyticsevent
            WHERE project_id = %s
              AND created_at >= %s
              AND created_at <= %s
        ),
        transitions AS (
            SELECT
                name AS source,
                next_event AS target,
                COUNT(*) AS frequency
            FROM ordered_events
            WHERE next_event IS NOT NULL
              AND seq <= %s
            GROUP BY name, next_event
            HAVING COUNT(*) >= %s
        )
        SELECT source, target, frequency
        FROM transitions
        ORDER BY frequency DESC
        """

        with connection.cursor() as cursor:
            cursor.execute(sql, [
                str(self.project_id),
                start,
                end,
                max_steps,
                min_frequency,
            ])
            rows = cursor.fetchall()

        if not rows:
            return {"nodes": [], "links": [], "total_transitions": 0}

        # Build nodes and links
        node_values = {}
        links = []
        total = 0

        for source, target, freq in rows:
            links.append({
                "source": source,
                "target": target,
                "value": freq,
            })
            node_values[source] = node_values.get(source, 0) + freq
            node_values[target] = node_values.get(target, 0) + freq
            total += freq

        nodes = [
            {"id": name, "label": name.replace("_", " ").title(), "value": val}
            for name, val in sorted(node_values.items(), key=lambda x: -x[1])
        ]

        return {
            "nodes": nodes,
            "links": links,
            "total_transitions": total,
        }
