"""
ETL: Import SalesCube PROD data into FRZ Platform.

PROD API: https://api.frzglobal.com.br/api/
FRZ Platform: Django ORM (runs inside container)

Maps:
  PROD Board → FRZ Pipeline
  PROD Column → FRZ PipelineStage
  PROD Lead → FRZ Lead (with M2M responsibles, squads, franchises)
  PROD Product → FRZ Product
  PROD Sale → FRZ Sale (with M2M squads)
  PROD SaleProduct → FRZ SaleLineItem
  PROD Payment → FRZ Payment
  PROD Comment → FRZ LeadComment
  PROD Tag → FRZ LeadTag
  PROD TaggedItem → FRZ LeadTagAssignment
  PROD Task → FRZ Task (with M2M responsibles, task_type)
  PROD Origin → FRZ Origin (as table, not CharField)
  PROD User → Django auth.User
  PROD Franchise → FRZ Franchise
  PROD Squad → FRZ Squad (with owners, members M2M)
  PROD Pole → FRZ Pole
  PROD Reminder → FRZ Reminder
  PROD Pitch → FRZ Pitch
  PROD TaskType → FRZ TaskType
"""

import json
import logging
import os
import time
from decimal import Decimal

import requests
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.dateparse import parse_datetime
from django.utils.text import slugify

from salescube.models import (
    Attachment,
    Campaign,
    Category,
    Contact,
    EmailTemplate,
    FinancialRecord,
    Franchise,
    Invoice,
    InvoiceItem,
    Lead,
    LeadActivity,
    LeadComment,
    LeadNote,
    LeadTag,
    LeadTagAssignment,
    Origin,
    Payment,
    Pipeline,
    PipelineStage,
    Pitch,
    Pole,
    Product,
    Reminder,
    ReportLog,
    ReportTemplate,
    Sale,
    SaleAttachment,
    SaleLineItem,
    Squad,
    Task,
    TaskType,
    Ticket,
    TicketMessage,
)

User = get_user_model()
logger = logging.getLogger(__name__)

PROD_BASE = "https://api.frzglobal.com.br/api"
PROD_TOKEN = f"Token {os.environ.get('SALESCUBE_PROD_TOKEN', '')}"
PAGE_SIZE = 100


class Command(BaseCommand):
    help = "Import all SalesCube PROD data into FRZ Platform"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # ID mapping: PROD int → FRZ UUID
        self.user_map = {}       # prod_user_id → django User
        self.pipeline_map = {}   # prod_board_id → Pipeline UUID
        self.stage_map = {}      # prod_column_id → PipelineStage UUID
        self.product_map = {}    # prod_product_id → Product UUID
        self.lead_map = {}       # prod_lead_id → Lead UUID
        self.sale_map = {}       # prod_sale_id → Sale UUID
        self.tag_map = {}        # prod_tag_id → LeadTag UUID
        self.origin_map = {}     # prod_origin_id → Origin UUID
        self.franchise_map = {}  # prod_franchise_id → Franchise UUID
        self.squad_map = {}      # prod_squad_id → Squad UUID
        self.pole_map = {}       # prod_pole_id → Pole UUID
        self.task_type_map = {}  # prod_tasktype_id → TaskType UUID
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": PROD_TOKEN,
            "Accept": "application/json",
        })
        self.stats = {}

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run", action="store_true",
            help="Print what would be imported without writing to DB",
        )
        parser.add_argument(
            "--skip-users", action="store_true",
            help="Skip user import (use existing admin user for all FKs)",
        )
        parser.add_argument(
            "--only",
            help="Import only specific entity: users,franchises,squads,boards,products,leads,sales,payments,comments,tags,tasks,reminders,pitches,task_types",
        )
        parser.add_argument(
            "--flush", action="store_true",
            help="Flush ALL SalesCube data before importing (clean slate)",
        )

    def handle(self, *args, **options):
        self.dry_run = options["dry_run"]
        self.skip_users = options["skip_users"]
        only = options.get("only")

        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(self.style.SUCCESS("SalesCube PROD → FRZ Platform ETL v2.1"))
        self.stdout.write(self.style.SUCCESS("=" * 60))

        if self.dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN MODE - no data will be written"))

        if options.get("flush"):
            self._flush_all_data()

        steps = [
            ("franchises", self.import_franchises),
            ("poles", self.import_poles),
            ("origins", self.import_origins),
            ("task_types", self.import_task_types),
            ("users", self.import_users),
            ("squads", self.import_squads),
            ("boards", self.import_boards),
            ("products", self.import_products),
            ("tags", self.import_tags),
            ("leads", self.import_leads),
            ("lead_m2m", self.import_lead_m2m),
            ("comments", self.import_comments),
            ("tag_assignments", self.import_tag_assignments),
            ("sales", self.import_sales),
            ("sale_products", self.import_sale_products),
            ("payments", self.import_payments),
            ("tasks", self.import_tasks),
            ("reminders", self.import_reminders),
            ("pitches", self.import_pitches),
            ("financial", self.generate_financial_records),
        ]

        for name, func in steps:
            if only and name != only:
                continue
            self.stdout.write(f"\n{'─' * 40}")
            self.stdout.write(self.style.HTTP_INFO(f"Step: {name}"))
            start = time.time()
            try:
                func()
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  ERROR in {name}: {e}"))
                logger.exception(f"ETL error in {name}")
            elapsed = time.time() - start
            self.stdout.write(f"  Completed in {elapsed:.1f}s")

        self.stdout.write(f"\n{'=' * 60}")
        self.stdout.write(self.style.SUCCESS("ETL COMPLETE"))
        for k, v in self.stats.items():
            self.stdout.write(f"  {k}: {v}")

    def _flush_all_data(self):
        """Delete ALL SalesCube data for a clean re-import."""
        from django.db import connection

        self.stdout.write(self.style.WARNING("\n" + "!" * 60))
        self.stdout.write(self.style.WARNING("FLUSHING ALL SALESCUBE DATA"))
        self.stdout.write(self.style.WARNING("!" * 60))

        # Order matters: delete children first, then parents
        flush_models = [
            # Sprint 3
            Attachment, ReportLog, ReportTemplate,
            Pitch, Reminder,
            # Sprint 1 - children first
            Payment, SaleLineItem, FinancialRecord,
            LeadTagAssignment, LeadComment,
            # Sprint 2
            InvoiceItem, Invoice,
            TicketMessage, Ticket,
            SaleAttachment,
            LeadActivity, LeadNote,
            EmailTemplate,
            Campaign,
        ]

        # Delete simple models first
        for model in flush_models:
            count = model.objects.count()
            if count > 0:
                model.objects.all().delete()
                self.stdout.write(f"  Deleted {count} {model.__name__} records")

        # Clear M2M then delete Task
        tasks = Task.objects.all()
        task_count = tasks.count()
        if task_count > 0:
            for t in tasks:
                t.responsibles.clear()
            tasks.delete()
            self.stdout.write(f"  Deleted {task_count} Task records")

        # Clear M2M then delete Sale
        sales = Sale.objects.all()
        sale_count = sales.count()
        if sale_count > 0:
            for s in sales:
                s.products.clear()
                s.squads.clear()
            sales.delete()
            self.stdout.write(f"  Deleted {sale_count} Sale records")

        # Clear M2M then delete Lead
        leads = Lead.objects.all()
        lead_count = leads.count()
        if lead_count > 0:
            # Use raw SQL for speed on large datasets
            with connection.cursor() as cursor:
                cursor.execute("DELETE FROM salescube_lead_responsibles")
                cursor.execute("DELETE FROM salescube_lead_squads")
                cursor.execute("DELETE FROM salescube_lead_franchises")
            leads.delete()
            self.stdout.write(f"  Deleted {lead_count} Lead records")

        # Delete Contact (has M2M tags)
        contacts = Contact.objects.all()
        contact_count = contacts.count()
        if contact_count > 0:
            for c in contacts:
                c.tags.clear()
            contacts.delete()
            self.stdout.write(f"  Deleted {contact_count} Contact records")

        # Delete remaining entity models
        for model in [LeadTag, Product, PipelineStage, TaskType]:
            count = model.objects.count()
            if count > 0:
                model.objects.all().delete()
                self.stdout.write(f"  Deleted {count} {model.__name__} records")

        # Delete Pipeline (has M2M squads, franchises)
        pipelines = Pipeline.objects.all()
        pipeline_count = pipelines.count()
        if pipeline_count > 0:
            for p in pipelines:
                p.squads.clear()
                p.franchises.clear()
            pipelines.delete()
            self.stdout.write(f"  Deleted {pipeline_count} Pipeline records")

        # Delete organizational models
        for model in [Origin, Pole]:
            count = model.objects.count()
            if count > 0:
                model.objects.all().delete()
                self.stdout.write(f"  Deleted {count} {model.__name__} records")

        # Delete Squad (has M2M owners, members)
        squads = Squad.objects.all()
        squad_count = squads.count()
        if squad_count > 0:
            for sq in squads:
                sq.owners.clear()
                sq.members.clear()
            squads.delete()
            self.stdout.write(f"  Deleted {squad_count} Squad records")

        # Delete Franchise
        franchise_count = Franchise.objects.count()
        if franchise_count > 0:
            Franchise.objects.all().delete()
            self.stdout.write(f"  Deleted {franchise_count} Franchise records")

        # Delete imported users (keep superusers and staff)
        imported_users = User.objects.filter(
            email__endswith="@imported.local"
        ).exclude(is_superuser=True)
        imported_count = imported_users.count()
        if imported_count > 0:
            imported_users.delete()
            self.stdout.write(f"  Deleted {imported_count} imported users")

        # Also delete users that were imported from PROD (non-staff, non-superuser)
        prod_users = User.objects.filter(
            is_superuser=False, is_staff=False
        ).exclude(email__endswith="@imported.local")
        prod_count = prod_users.count()
        if prod_count > 0:
            prod_users.delete()
            self.stdout.write(f"  Deleted {prod_count} PROD-imported users")

        # Reset Category
        cat_count = Category.objects.count()
        if cat_count > 0:
            Category.objects.all().delete()
            self.stdout.write(f"  Deleted {cat_count} Category records")

        self.stdout.write(self.style.SUCCESS("  FLUSH COMPLETE - Clean slate ready"))

    def fetch_all(self, endpoint, params=None):
        """Paginate through all results from a PROD API endpoint."""
        url = f"{PROD_BASE}/{endpoint}/"
        all_results = []
        page = 1
        base_params = {"format": "json", "limit": PAGE_SIZE}
        if params:
            base_params.update(params)

        while True:
            base_params["page"] = page
            try:
                resp = self.session.get(url, params=base_params, timeout=60)
                resp.raise_for_status()
                data = resp.json()
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"  Fetch error page {page}: {e}"))
                break

            results = data.get("results", [])
            all_results.extend(results)

            if not data.get("next"):
                break
            page += 1

            if len(all_results) % 1000 == 0:
                self.stdout.write(f"  ... fetched {len(all_results)} records")

        return all_results

    def import_franchises(self):
        """Import PROD franchises."""
        prod_franchises = self.fetch_all("franchises")
        self.stdout.write(f"  Fetched {len(prod_franchises)} franchises")

        created = 0
        for f in prod_franchises:
            if self.dry_run:
                self.franchise_map[f["id"]] = None
                created += 1
                continue

            franchise, was_created = Franchise.objects.get_or_create(
                name=f["name"],
                defaults={
                    "code": f.get("code", ""),
                    "is_active": f.get("is_active", True),
                    "legacy_id": f["id"],
                },
            )
            self.franchise_map[f["id"]] = franchise.id
            if was_created:
                created += 1

        self.stats["franchises_created"] = created

    def import_poles(self):
        """Import PROD poles."""
        prod_poles = self.fetch_all("poles")
        self.stdout.write(f"  Fetched {len(prod_poles)} poles")

        created = 0
        for p in prod_poles:
            if self.dry_run:
                self.pole_map[p["id"]] = None
                created += 1
                continue

            pole_name = p.get("name") or p.get("title") or p.get("nome") or f"Pole {p['id']}"
            franchise_id = self.franchise_map.get(p.get("franchise"))
            pole, was_created = Pole.objects.get_or_create(
                name=pole_name,
                defaults={
                    "franchise_id": franchise_id,
                    "is_active": p.get("is_active", True),
                    "legacy_id": p["id"],
                },
            )
            self.pole_map[p["id"]] = pole.id
            if was_created:
                created += 1

        self.stats["poles_created"] = created

    def import_origins(self):
        """Import PROD origins as Origin model records."""
        origins = self.fetch_all("origins")
        self.stdout.write(f"  Fetched {len(origins)} origins")

        created = 0
        for origin_data in origins:
            if self.dry_run:
                self.origin_map[origin_data["id"]] = None
                created += 1
                continue

            origin, was_created = Origin.objects.get_or_create(
                name=origin_data["name"],
                defaults={
                    "is_active": True,
                    "legacy_id": origin_data["id"],
                },
            )
            self.origin_map[origin_data["id"]] = origin.id
            if was_created:
                created += 1
            self.stdout.write(f"  Origin {origin_data['id']}: '{origin_data['name']}' → {origin.id}")

        self.stats["origins_created"] = created

    def import_task_types(self):
        """Import PROD task types."""
        prod_types = self.fetch_all("task-types")
        self.stdout.write(f"  Fetched {len(prod_types)} task types")

        created = 0
        for tt in prod_types:
            if self.dry_run:
                self.task_type_map[tt["id"]] = None
                created += 1
                continue

            task_type, was_created = TaskType.objects.get_or_create(
                name=tt["name"],
                defaults={
                    "color": tt.get("color", "#6366f1"),
                    "is_active": True,
                    "legacy_id": tt["id"],
                },
            )
            self.task_type_map[tt["id"]] = task_type.id
            if was_created:
                created += 1

        self.stats["task_types_created"] = created

    def import_users(self):
        """Import PROD users into Django auth.User."""
        if self.skip_users:
            admin = User.objects.filter(is_superuser=True).first()
            if not admin:
                admin = User.objects.first()
            self.stdout.write(f"  Skipping user import, using '{admin.username}' for all FKs")
            prod_users = self.fetch_all("users")
            for u in prod_users:
                self.user_map[u["id"]] = admin
            self.stats["users_mapped"] = len(self.user_map)
            return

        prod_users = self.fetch_all("users")
        self.stdout.write(f"  Fetched {len(prod_users)} users from PROD")

        created = 0
        existing = 0
        for u in prod_users:
            prod_id = u["id"]
            email = (u.get("email") or "").strip().lower()
            username = u.get("username", "")
            full_name = u.get("full_name", "")

            existing_user = None
            if email:
                existing_user = User.objects.filter(email__iexact=email).first()
            if not existing_user and username:
                existing_user = User.objects.filter(username=username).first()

            if existing_user:
                self.user_map[prod_id] = existing_user
                existing += 1
                continue

            if self.dry_run:
                self.user_map[prod_id] = None
                created += 1
                continue

            parts = full_name.strip().split() if full_name else []
            first_name = parts[0] if parts else username
            last_name = " ".join(parts[1:]) if len(parts) > 1 else ""

            base_username = username or slugify(full_name or f"user_{prod_id}")[:30]
            final_username = base_username
            counter = 1
            while User.objects.filter(username=final_username).exists():
                final_username = f"{base_username[:27]}_{counter}"
                counter += 1

            try:
                new_user = User.objects.create(
                    username=final_username,
                    email=email or f"user_{prod_id}@imported.local",
                    first_name=first_name[:30],
                    last_name=last_name[:150],
                    is_active=u.get("is_active", True),
                    is_staff=u.get("is_staff", False),
                )
                new_user.set_unusable_password()
                new_user.save()
                self.user_map[prod_id] = new_user
                created += 1
            except Exception as e:
                logger.warning(f"Failed to create user {prod_id}: {e}")
                self.user_map[prod_id] = None

        self.stats["users_created"] = created
        self.stats["users_existing"] = existing
        self.stdout.write(f"  Created: {created}, Existing: {existing}")

    def import_squads(self):
        """Import PROD squads with owners and members M2M."""
        prod_squads = self.fetch_all("squads")
        self.stdout.write(f"  Fetched {len(prod_squads)} squads")

        created = 0
        for s in prod_squads:
            if self.dry_run:
                self.squad_map[s["id"]] = None
                created += 1
                continue

            franchise_id = self.franchise_map.get(s.get("franchise"))
            squad, was_created = Squad.objects.get_or_create(
                name=s["name"],
                defaults={
                    "franchise_id": franchise_id,
                    "is_active": s.get("is_active", True),
                    "legacy_id": s["id"],
                },
            )
            self.squad_map[s["id"]] = squad.id

            # Add owners and members M2M
            for owner_id in s.get("owners", []):
                user = self.user_map.get(owner_id)
                if user:
                    squad.owners.add(user)
            for member_id in s.get("members", []):
                user = self.user_map.get(member_id)
                if user:
                    squad.members.add(user)

            if was_created:
                created += 1

        self.stats["squads_created"] = created

    def import_boards(self):
        """Import PROD boards as Pipelines and columns as PipelineStages."""
        boards = self.fetch_all("boards")
        columns = self.fetch_all("columns")

        self.stdout.write(f"  Fetched {len(boards)} boards, {len(columns)} columns")

        admin_user = User.objects.filter(is_superuser=True).first()
        pipelines_created = 0
        stages_created = 0

        for board in boards:
            if board.get("is_deleted"):
                continue

            if self.dry_run:
                self.pipeline_map[board["id"]] = None
                pipelines_created += 1
                continue

            pipeline, created = Pipeline.objects.get_or_create(
                name=board["name"],
                defaults={
                    "description": board.get("description", ""),
                    "created_by": admin_user,
                    "is_default": board["id"] == 1,
                },
            )
            self.pipeline_map[board["id"]] = pipeline.id
            if created:
                pipelines_created += 1

            # Add squads and franchises M2M if available
            for sq_id in board.get("squads", []):
                sq_uuid = self.squad_map.get(sq_id)
                if sq_uuid:
                    pipeline.squads.add(sq_uuid)
            for fr_id in board.get("franchises", []):
                fr_uuid = self.franchise_map.get(fr_id)
                if fr_uuid:
                    pipeline.franchises.add(fr_uuid)

            self.stdout.write(f"  Pipeline: '{board['name']}' → {pipeline.id}")

        # Group columns by board and sort by position
        board_columns = {}
        for col in columns:
            bid = col["board"]
            if bid not in board_columns:
                board_columns[bid] = []
            board_columns[bid].append(col)

        for bid, cols in board_columns.items():
            if bid not in self.pipeline_map:
                continue
            pipeline_id = self.pipeline_map[bid]
            if self.dry_run:
                for col in cols:
                    self.stage_map[col["id"]] = None
                    stages_created += 1
                continue

            cols.sort(key=lambda c: c.get("position", 0))

            color_map = {
                "backlog": "#6366f1",
                "to_do": "#f59e0b",
                "doing": "#3b82f6",
                "done": "#10b981",
                "cancelled": "#ef4444",
            }

            for idx, col in enumerate(cols):
                if col.get("is_deleted"):
                    continue
                color = col.get("color", "#ccc")
                if color == "#ccc":
                    color = color_map.get(col.get("column_type", "backlog"), "#6366f1")

                prob = min(idx * 15, 100)

                try:
                    stage, created = PipelineStage.objects.get_or_create(
                        pipeline_id=pipeline_id,
                        order=idx,
                        defaults={
                            "name": col["name"],
                            "color": color,
                            "probability": prob,
                        },
                    )
                    self.stage_map[col["id"]] = stage.id
                    if created:
                        stages_created += 1
                except Exception:
                    try:
                        max_order = PipelineStage.objects.filter(
                            pipeline_id=pipeline_id
                        ).count()
                        stage = PipelineStage.objects.create(
                            pipeline_id=pipeline_id,
                            name=col["name"],
                            order=max_order,
                            color=color,
                            probability=prob,
                        )
                        self.stage_map[col["id"]] = stage.id
                        stages_created += 1
                    except Exception as e2:
                        logger.warning(f"Failed stage {col['id']}: {e2}")

        self.stats["pipelines_created"] = pipelines_created
        self.stats["stages_created"] = stages_created

    def import_products(self):
        """Import PROD products."""
        prod_products = self.fetch_all("products")
        self.stdout.write(f"  Fetched {len(prod_products)} products")

        created = 0
        for p in prod_products:
            if self.dry_run:
                self.product_map[p["id"]] = None
                created += 1
                continue

            product, was_created = Product.objects.get_or_create(
                name=p["name"],
                defaults={
                    "description": p.get("description", ""),
                    "price": Decimal(str(p.get("price", 0))),
                    "cost": Decimal("0"),
                    "active": p.get("is_active", True),
                },
            )
            self.product_map[p["id"]] = product.id
            if was_created:
                created += 1

        self.stats["products_created"] = created

    def import_tags(self):
        """Import PROD tags as LeadTags."""
        prod_tags = self.fetch_all("tags")
        self.stdout.write(f"  Fetched {len(prod_tags)} tags")

        created = 0
        for t in prod_tags:
            if self.dry_run:
                self.tag_map[t["id"]] = None
                created += 1
                continue

            tag, was_created = LeadTag.objects.get_or_create(
                name=t["name"],
                defaults={
                    "color": t.get("color") or "#6366f1",
                    "legacy_id": t["id"],
                },
            )
            self.tag_map[t["id"]] = tag.id
            if was_created:
                created += 1

        self.stats["tags_created"] = created

    def import_leads(self):
        """Import all PROD leads."""
        prod_leads = self.fetch_all("leads")
        self.stdout.write(f"  Fetched {len(prod_leads)} leads")

        created = 0
        skipped = 0
        batch = []

        # Build a temporary map for M2M assignment later
        self._lead_responsibles = {}  # lead_uuid → [user_ids]
        self._lead_squads = {}        # lead_uuid → [squad_ids]
        self._lead_franchises = {}    # lead_uuid → [franchise_ids]

        for lead_data in prod_leads:
            prod_id = lead_data["id"]
            name = lead_data.get("name", "").strip() or f"Lead #{prod_id}"

            stage_id = self.stage_map.get(lead_data.get("column"))

            # Map origin → Origin FK
            origin_prod_id = lead_data.get("origin")
            origin_uuid = self.origin_map.get(origin_prod_id) if origin_prod_id else None

            # Map first responsible → assigned_to (backwards compat)
            responsibles = lead_data.get("responsibles", [])
            assigned_to = None
            if responsibles and not self.dry_run:
                assigned_to = self.user_map.get(responsibles[0])

            # Also map source from origin name for backwards compat
            source = "other"
            if origin_prod_id and origin_prod_id in self.origin_map:
                # Try to match origin name to source choice
                try:
                    origin_obj = Origin.objects.get(pk=origin_uuid)
                    name_lower = origin_obj.name.lower()
                    source_mapping = {
                        "tráfego pago": "facebook", "whatsapp": "whatsapp",
                        "instagram": "instagram", "facebook": "facebook",
                        "referral": "referral", "indicação": "referral",
                        "website": "website", "manual": "manual",
                        "event": "event", "evento": "event",
                    }
                    for key, val in source_mapping.items():
                        if key in name_lower:
                            source = val
                            break
                except Exception:
                    pass

            if self.dry_run:
                self.lead_map[prod_id] = None
                created += 1
                continue

            try:
                lead = Lead(
                    name=name[:200],
                    email=lead_data.get("email") or "",
                    phone=lead_data.get("main_phone") or "",
                    stage_id=stage_id,
                    assigned_to=assigned_to,
                    origin_id=origin_uuid,
                    source=source,
                    score=0,
                    value=Decimal("0"),
                )
                batch.append((prod_id, lead, lead_data))

                if len(batch) >= 500:
                    self._flush_leads(batch)
                    created += len(batch)
                    batch = []
                    self.stdout.write(f"  ... imported {created} leads")

            except Exception as e:
                logger.warning(f"Lead {prod_id} error: {e}")
                skipped += 1

        if batch:
            self._flush_leads(batch)
            created += len(batch)

        self.stats["leads_created"] = created
        self.stats["leads_skipped"] = skipped

    def _flush_leads(self, batch):
        """Bulk create leads and update map."""
        leads = [lead for _, lead, _ in batch]
        with transaction.atomic():
            Lead.objects.bulk_create(leads, ignore_conflicts=False)
        for prod_id, lead, lead_data in batch:
            self.lead_map[prod_id] = lead.id
            # Store M2M data for later
            responsibles = lead_data.get("responsibles", [])
            if responsibles:
                self._lead_responsibles[lead.id] = responsibles
            squads = lead_data.get("squads", [])
            if squads:
                self._lead_squads[lead.id] = squads
            franchises = lead_data.get("franchises", [])
            if franchises:
                self._lead_franchises[lead.id] = franchises

    def import_lead_m2m(self):
        """Set M2M relationships for leads (responsibles, squads, franchises)."""
        if self.dry_run:
            self.stdout.write("  Dry run - skipping M2M")
            return

        resp_count = 0
        squad_count = 0
        franchise_count = 0

        # Responsibles M2M
        for lead_uuid, user_ids in getattr(self, '_lead_responsibles', {}).items():
            try:
                lead = Lead.objects.get(pk=lead_uuid)
                for uid in user_ids:
                    user = self.user_map.get(uid)
                    if user:
                        lead.responsibles.add(user)
                        resp_count += 1
            except Lead.DoesNotExist:
                pass

        # Squads M2M
        for lead_uuid, squad_ids in getattr(self, '_lead_squads', {}).items():
            try:
                lead = Lead.objects.get(pk=lead_uuid)
                for sid in squad_ids:
                    sq_uuid = self.squad_map.get(sid)
                    if sq_uuid:
                        lead.squads.add(sq_uuid)
                        squad_count += 1
            except Lead.DoesNotExist:
                pass

        # Franchises M2M
        for lead_uuid, franchise_ids in getattr(self, '_lead_franchises', {}).items():
            try:
                lead = Lead.objects.get(pk=lead_uuid)
                for fid in franchise_ids:
                    fr_uuid = self.franchise_map.get(fid)
                    if fr_uuid:
                        lead.franchises.add(fr_uuid)
                        franchise_count += 1
            except Lead.DoesNotExist:
                pass

        self.stats["lead_responsibles_set"] = resp_count
        self.stats["lead_squads_set"] = squad_count
        self.stats["lead_franchises_set"] = franchise_count
        self.stdout.write(f"  Responsibles: {resp_count}, Squads: {squad_count}, Franchises: {franchise_count}")

    def import_comments(self):
        """Import PROD comments as LeadComments."""
        prod_comments = self.fetch_all("comments")
        self.stdout.write(f"  Fetched {len(prod_comments)} comments")

        created = 0
        skipped = 0
        batch = []

        for c in prod_comments:
            lead_uuid = self.lead_map.get(c.get("object_id"))
            if not lead_uuid:
                skipped += 1
                continue

            author = self.user_map.get(c.get("author")) if not self.dry_run else None

            if self.dry_run:
                created += 1
                continue

            comment = LeadComment(
                lead_id=lead_uuid,
                author=author,
                text=c.get("text", ""),
                legacy_id=c["id"],
            )
            batch.append(comment)

            if len(batch) >= 1000:
                with transaction.atomic():
                    LeadComment.objects.bulk_create(batch, ignore_conflicts=False)
                created += len(batch)
                batch = []
                self.stdout.write(f"  ... imported {created} comments")

        if batch and not self.dry_run:
            with transaction.atomic():
                LeadComment.objects.bulk_create(batch, ignore_conflicts=False)
            created += len(batch)

        self.stats["comments_created"] = created
        self.stats["comments_skipped"] = skipped

    def import_tag_assignments(self):
        """Import PROD tagged-items as LeadTagAssignments."""
        prod_items = self.fetch_all("tagged-items")
        self.stdout.write(f"  Fetched {len(prod_items)} tagged items")

        created = 0
        skipped = 0
        batch = []

        for item in prod_items:
            lead_uuid = self.lead_map.get(item.get("object_id"))
            tag_uuid = self.tag_map.get(item.get("tag"))

            if not lead_uuid or not tag_uuid:
                skipped += 1
                continue

            if self.dry_run:
                created += 1
                continue

            assignment = LeadTagAssignment(
                lead_id=lead_uuid,
                tag_id=tag_uuid,
            )
            batch.append(assignment)

            if len(batch) >= 500:
                with transaction.atomic():
                    LeadTagAssignment.objects.bulk_create(batch, ignore_conflicts=True)
                created += len(batch)
                batch = []

        if batch and not self.dry_run:
            with transaction.atomic():
                LeadTagAssignment.objects.bulk_create(batch, ignore_conflicts=True)
            created += len(batch)

        self.stats["tag_assignments_created"] = created
        self.stats["tag_assignments_skipped"] = skipped

    def import_sales(self):
        """Import PROD sales."""
        prod_sales = self.fetch_all("sales")
        self.stdout.write(f"  Fetched {len(prod_sales)} sales")

        status_map = {
            "negotiating": "negotiation",
            "closed": "won",
            "cancelled": "lost",
            "rejected": "lost",
        }

        admin_user = User.objects.filter(is_superuser=True).first()
        created = 0
        skipped = 0

        for s in prod_sales:
            prod_id = s["id"]

            if self.dry_run:
                self.sale_map[prod_id] = None
                created += 1
                continue

            stage = status_map.get(s.get("status", ""), "negotiation")
            total = Decimal(str(s.get("total_amount", 0)))
            seller_id = s.get("seller")
            created_by = self.user_map.get(seller_id) or admin_user

            try:
                sale = Sale.objects.create(
                    total_value=total,
                    stage=stage,
                    notes=s.get("short_description") or "",
                    closed_at=parse_datetime(s["close_date"] + "T00:00:00-03:00") if s.get("close_date") else None,
                    created_by=created_by,
                )
                for prod_product_id in s.get("products", []):
                    product_uuid = self.product_map.get(prod_product_id)
                    if product_uuid:
                        sale.products.add(product_uuid)

                # Add squads M2M
                for sq_id in s.get("squads", []):
                    sq_uuid = self.squad_map.get(sq_id)
                    if sq_uuid:
                        sale.squads.add(sq_uuid)

                self.sale_map[prod_id] = sale.id
                created += 1
            except Exception as e:
                logger.warning(f"Sale {prod_id} error: {e}")
                skipped += 1

            if created % 200 == 0 and created > 0:
                self.stdout.write(f"  ... imported {created} sales")

        self.stats["sales_created"] = created
        self.stats["sales_skipped"] = skipped

    def import_sale_products(self):
        """Import PROD sale-products as SaleLineItems."""
        prod_sp = self.fetch_all("sale-products")
        self.stdout.write(f"  Fetched {len(prod_sp)} sale-products")

        created = 0
        skipped = 0
        batch = []

        for sp in prod_sp:
            sale_uuid = self.sale_map.get(sp.get("sale"))
            product_uuid = self.product_map.get(sp.get("product"))

            if not sale_uuid:
                skipped += 1
                continue

            if self.dry_run:
                created += 1
                continue

            quantity = sp.get("quantity", 1) or 1
            unit_price = Decimal(str(sp.get("amount", sp.get("unit_price", 0))))

            line_item = SaleLineItem(
                sale_id=sale_uuid,
                product_id=product_uuid,
                quantity=quantity,
                unit_price=unit_price,
                subtotal=unit_price * quantity,
            )
            batch.append(line_item)

            if len(batch) >= 500:
                with transaction.atomic():
                    SaleLineItem.objects.bulk_create(batch)
                created += len(batch)
                batch = []

        if batch and not self.dry_run:
            with transaction.atomic():
                SaleLineItem.objects.bulk_create(batch)
            created += len(batch)

        self.stats["line_items_created"] = created
        self.stats["line_items_skipped"] = skipped

    def import_payments(self):
        """Import PROD payments."""
        prod_payments = self.fetch_all("payments")
        self.stdout.write(f"  Fetched {len(prod_payments)} payments")

        created = 0
        skipped = 0
        batch = []

        for p in prod_payments:
            sale_uuid = self.sale_map.get(p.get("sale"))
            if not sale_uuid:
                skipped += 1
                continue

            if self.dry_run:
                created += 1
                continue

            taker = self.user_map.get(p.get("taker"))

            payment = Payment(
                sale_id=sale_uuid,
                taker=taker,
                method=p.get("method", "other"),
                amount=Decimal(str(p.get("amount", 0))),
                status=p.get("status", "pending"),
                protocol=p.get("protocol") or "",
                due_date=p.get("due_date"),
                paid_at=parse_datetime(p["paid_at"]) if p.get("paid_at") else None,
                legacy_id=p["id"],
            )
            batch.append(payment)

            if len(batch) >= 500:
                with transaction.atomic():
                    Payment.objects.bulk_create(batch)
                created += len(batch)
                batch = []

        if batch and not self.dry_run:
            with transaction.atomic():
                Payment.objects.bulk_create(batch)
            created += len(batch)

        self.stats["payments_created"] = created
        self.stats["payments_skipped"] = skipped

    def import_tasks(self):
        """Import PROD tasks with task_type and M2M responsibles."""
        prod_tasks = self.fetch_all("tasks")
        self.stdout.write(f"  Fetched {len(prod_tasks)} tasks")

        status_map = {
            "todo": "pending",
            "in_progress": "in_progress",
            "done": "completed",
            "cancelled": "cancelled",
        }

        created = 0
        skipped = 0

        for t in prod_tasks:
            lead_uuid = self.lead_map.get(t.get("object_id"))

            if self.dry_run:
                created += 1
                continue

            responsibles = t.get("responsibles", [])
            assigned_to = None
            if responsibles:
                assigned_to = self.user_map.get(responsibles[0])

            task_type_id = self.task_type_map.get(t.get("task_type"))
            status_val = status_map.get(t.get("status", "todo"), "pending")

            try:
                task = Task.objects.create(
                    title=t.get("description", "")[:200] or f"Task #{t['id']}",
                    description=t.get("description", ""),
                    due_date=parse_datetime(t["deadline"]) if t.get("deadline") else None,
                    lead_id=lead_uuid,
                    assigned_to=assigned_to,
                    task_type_id=task_type_id,
                    status=status_val,
                    priority=t.get("priority", "medium"),
                    completed_at=parse_datetime(t["conclusion_date"]) if t.get("conclusion_date") else None,
                )
                # Add all responsibles as M2M
                for uid in responsibles:
                    user = self.user_map.get(uid)
                    if user:
                        task.responsibles.add(user)
                created += 1
            except Exception as e:
                logger.warning(f"Task {t['id']} error: {e}")
                skipped += 1

        self.stats["tasks_created"] = created
        self.stats["tasks_skipped"] = skipped

    def import_reminders(self):
        """Import PROD reminders."""
        prod_reminders = self.fetch_all("reminders")
        self.stdout.write(f"  Fetched {len(prod_reminders)} reminders")

        admin_user = User.objects.filter(is_superuser=True).first()
        created = 0
        skipped = 0

        for r in prod_reminders:
            if self.dry_run:
                created += 1
                continue

            remind_at = parse_datetime(r.get("remind_at") or r.get("date", ""))
            if not remind_at:
                skipped += 1
                continue

            assigned_to = self.user_map.get(r.get("assigned_to")) or admin_user
            lead_uuid = self.lead_map.get(r.get("object_id"))

            try:
                Reminder.objects.create(
                    title=r.get("title", r.get("description", ""))[:200] or f"Reminder #{r['id']}",
                    description=r.get("description", ""),
                    remind_at=remind_at,
                    lead_id=lead_uuid,
                    assigned_to=assigned_to,
                    is_completed=r.get("is_completed", False),
                    created_by=admin_user,
                    legacy_id=r["id"],
                )
                created += 1
            except Exception as e:
                logger.warning(f"Reminder {r['id']} error: {e}")
                skipped += 1

        self.stats["reminders_created"] = created
        self.stats["reminders_skipped"] = skipped

    def import_pitches(self):
        """Import PROD pitches."""
        prod_pitches = self.fetch_all("pitches")
        self.stdout.write(f"  Fetched {len(prod_pitches)} pitches")

        admin_user = User.objects.filter(is_superuser=True).first()
        created = 0
        skipped = 0

        for p in prod_pitches:
            if self.dry_run:
                created += 1
                continue

            sale_uuid = self.sale_map.get(p.get("sale"))

            try:
                Pitch.objects.create(
                    title=p.get("title", p.get("name", ""))[:200] or f"Pitch #{p['id']}",
                    description=p.get("description", ""),
                    sale_id=sale_uuid,
                    status=p.get("status", "draft"),
                    value=Decimal(str(p.get("value", 0))),
                    created_by=admin_user,
                    legacy_id=p["id"],
                )
                created += 1
            except Exception as e:
                logger.warning(f"Pitch {p['id']} error: {e}")
                skipped += 1

        self.stats["pitches_created"] = created
        self.stats["pitches_skipped"] = skipped

    def generate_financial_records(self):
        """Generate financial records from imported sales."""
        if self.dry_run:
            self.stdout.write("  Dry run - skipping financial record generation")
            return

        sales = Sale.objects.all()
        created = 0

        for sale in sales:
            if sale.stage == "won" and sale.total_value > 0:
                FinancialRecord.objects.get_or_create(
                    sale=sale,
                    type="revenue",
                    defaults={
                        "value": sale.total_value,
                        "date": (sale.closed_at or sale.created_at).date(),
                        "description": f"Venda #{str(sale.id)[:8]} - {sale.notes[:100] if sale.notes else 'N/A'}",
                    },
                )
                created += 1

        self.stats["financial_records_created"] = created
        self.stdout.write(f"  Generated {created} financial records from won sales")
