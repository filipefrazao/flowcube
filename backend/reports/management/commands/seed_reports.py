import os

from django.core.management.base import BaseCommand

from reports.models import ReportDefinition


DEFINITIONS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "definitions")


REPORTS = [
    {
        "name": "Lead Febracis",
        "slug": "lead-febracis",
        "description": "Leads captured within a date range with stage information",
        "sql_file": "lead_febracis.sql",
        "chart_type": "table",
        "parameters": [
            {"name": "date_from", "type": "date", "label": "Start Date"},
            {"name": "date_to", "type": "date", "label": "End Date"},
        ],
    },
    {
        "name": "Lead FIT",
        "slug": "lead-fit",
        "description": "Lead quality analysis based on FIT score",
        "sql_file": "lead_fit.sql",
        "chart_type": "bar",
        "parameters": [
            {"name": "min_score", "type": "number", "label": "Minimum Score", "default": "50"},
        ],
    },
    {
        "name": "Curva ABC",
        "slug": "curva-abc",
        "description": "Product revenue classification (A/B/C curve)",
        "sql_file": "curva_abc.sql",
        "chart_type": "pie",
        "parameters": [
            {"name": "date_from", "type": "date", "label": "Start Date"},
            {"name": "date_to", "type": "date", "label": "End Date"},
        ],
    },
    {
        "name": "Lead Vitta",
        "slug": "lead-vitta",
        "description": "Lifetime value analysis per lead",
        "sql_file": "lead_vitta.sql",
        "chart_type": "table",
        "parameters": [
            {"name": "date_from", "type": "date", "label": "Start Date"},
            {"name": "date_to", "type": "date", "label": "End Date"},
        ],
    },
]


class Command(BaseCommand):
    help = "Seed default report definitions"

    def handle(self, *args, **options):
        for report_data in REPORTS:
            sql_path = os.path.join(DEFINITIONS_DIR, report_data["sql_file"])
            with open(sql_path, "r") as f:
                query_template = f.read()

            obj, created = ReportDefinition.objects.update_or_create(
                slug=report_data["slug"],
                defaults={
                    "name": report_data["name"],
                    "description": report_data["description"],
                    "query_template": query_template,
                    "parameters": report_data["parameters"],
                    "chart_type": report_data["chart_type"],
                },
            )
            action = "Created" if created else "Updated"
            self.stdout.write(f"  {action}: {obj.name}")

        self.stdout.write(self.style.SUCCESS(f"Done. {len(REPORTS)} reports seeded."))
