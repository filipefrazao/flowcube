"""
ETL: Import SalesCube PROD data into FRZ Platform.

PROD API: https://api.frzglobal.com.br/api/
FRZ Platform: Django ORM (runs inside container)

Maps:
  PROD Board → FRZ Pipeline
  PROD Column → FRZ PipelineStage
  PROD Lead → FRZ Lead
  PROD Product → FRZ Product
  PROD Sale → FRZ Sale
  PROD SaleProduct → FRZ SaleLineItem
  PROD Payment → FRZ Payment
  PROD Comment → FRZ LeadComment
  PROD Tag → FRZ LeadTag
  PROD TaggedItem → FRZ LeadTagAssignment
  PROD Task → FRZ Task
  PROD Origin → FRZ Lead.source mapping
  PROD User → Django auth.User
"""

import json
import logging
import time
from decimal import Decimal

import requests
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.dateparse import parse_datetime
from django.utils.text import slugify

from salescube.models import (
    FinancialRecord,
    Lead,
    LeadComment,
    LeadTag,
    LeadTagAssignment,
    Payment,
    Pipeline,
    PipelineStage,
    Product,
    Sale,
    SaleLineItem,
    Task,
)

User = get_user_model()
logger = logging.getLogger(__name__)

PROD_BASE = "https://api.frzglobal.com.br/api"
PROD_TOKEN = "Token c3e1d02d51b6acb16488a16c6b0d0938b470e71d"
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
        self.origin_map = {}     # prod_origin_id → source string
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
            help="Import only specific entity: users,boards,products,leads,sales,payments,comments,tags,tasks",
        )

    def handle(self, *args, **options):
        self.dry_run = options["dry_run"]
        self.skip_users = options["skip_users"]
        only = options.get("only")

        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(self.style.SUCCESS("SalesCube PROD → FRZ Platform ETL"))
        self.stdout.write(self.style.SUCCESS("=" * 60))

        if self.dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN MODE - no data will be written"))

        steps = [
            ("origins", self.import_origins),
            ("users", self.import_users),
            ("boards", self.import_boards),
            ("products", self.import_products),
            ("tags", self.import_tags),
            ("leads", self.import_leads),
            ("comments", self.import_comments),
            ("tag_assignments", self.import_tag_assignments),
            ("sales", self.import_sales),
            ("sale_products", self.import_sale_products),
            ("payments", self.import_payments),
            ("tasks", self.import_tasks),
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

    def fetch_all(self, endpoint, params=None):
        """Paginate through all results from a PROD API endpoint."""
        url = f"{PROD_BASE}/{endpoint}/"
        all_results = []
        page = 1
        base_params = {"format": "json", "page_size": PAGE_SIZE}
        if params:
            base_params.update(params)

        while url:
            base_params["page"] = page
            try:
                resp = self.session.get(url, params=base_params, timeout=30)
                resp.raise_for_status()
                data = resp.json()
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"  Fetch error page {page}: {e}"))
                break

            results = data.get("results", [])
            all_results.extend(results)

            if data.get("next"):
                page += 1
                # Reset URL to base - use page param
                base_params["page"] = page
            else:
                break

            if page % 10 == 0:
                self.stdout.write(f"  ... fetched {len(all_results)} records (page {page})")

        return all_results

    def import_origins(self):
        """Map PROD origins to FRZ source choices."""
        origins = self.fetch_all("origins")
        # PROD origins are just names, map them to FRZ SOURCE_CHOICES
        source_mapping = {
            "tráfego pago": "facebook",
            "whatsapp": "whatsapp",
            "instagram": "instagram",
            "facebook": "facebook",
            "referral": "referral",
            "indicação": "referral",
            "website": "website",
            "manual": "manual",
            "event": "event",
            "evento": "event",
        }
        for origin in origins:
            name_lower = origin["name"].lower()
            matched = "other"
            for key, val in source_mapping.items():
                if key in name_lower:
                    matched = val
                    break
            self.origin_map[origin["id"]] = matched
            self.stdout.write(f"  Origin {origin['id']}: '{origin['name']}' → '{matched}'")

        self.stats["origins_mapped"] = len(self.origin_map)

    def import_users(self):
        """Import PROD users into Django auth.User."""
        if self.skip_users:
            # Map all PROD users to existing admin
            admin = User.objects.filter(is_superuser=True).first()
            if not admin:
                admin = User.objects.first()
            self.stdout.write(f"  Skipping user import, using '{admin.username}' for all FKs")
            # Still need to build user_map - fetch PROD users for mapping
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

            # Try to find existing user by email or username
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

            # Parse full_name into first/last
            parts = full_name.strip().split() if full_name else []
            first_name = parts[0] if parts else username
            last_name = " ".join(parts[1:]) if len(parts) > 1 else ""

            # Generate unique username
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
                    "is_default": board["id"] == 1,  # FEBRACIS PA as default
                },
            )
            self.pipeline_map[board["id"]] = pipeline.id
            if created:
                pipelines_created += 1
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

            # Sort by position
            cols.sort(key=lambda c: c.get("position", 0))

            # Color mapping based on column_type
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

                # Probability based on position (rough estimate)
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
                except Exception as e:
                    # Duplicate order - try with different order
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

        for lead_data in prod_leads:
            prod_id = lead_data["id"]
            name = lead_data.get("name", "").strip() or f"Lead #{prod_id}"

            # Map column → stage
            stage_id = self.stage_map.get(lead_data.get("column"))

            # Map origin → source
            origin_id = lead_data.get("origin")
            source = self.origin_map.get(origin_id, "other") if origin_id else "manual"

            # Map responsible → assigned_to
            responsibles = lead_data.get("responsibles", [])
            assigned_to = None
            if responsibles and not self.dry_run:
                assigned_to = self.user_map.get(responsibles[0])

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
                    source=source,
                    score=0,
                    value=Decimal("0"),
                )
                batch.append((prod_id, lead))

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
        leads = [lead for _, lead in batch]
        with transaction.atomic():
            Lead.objects.bulk_create(leads, ignore_conflicts=False)
        for prod_id, lead in batch:
            self.lead_map[prod_id] = lead.id

    def import_comments(self):
        """Import PROD comments as LeadComments."""
        prod_comments = self.fetch_all("comments")
        self.stdout.write(f"  Fetched {len(prod_comments)} comments")

        created = 0
        skipped = 0
        batch = []

        for c in prod_comments:
            # Comments are linked to leads via content_type=8 (Lead)
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

        # Map PROD status → FRZ stage
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

            # Map customer (PROD user) to lead
            # In PROD, sale.customer is a User ID (not a Lead), find lead by responsible
            lead_uuid = None
            # Try to find lead via seller or customer
            customer_id = s.get("customer")
            seller_id = s.get("seller")

            if self.dry_run:
                self.sale_map[prod_id] = None
                created += 1
                continue

            stage = status_map.get(s.get("status", ""), "negotiation")
            total = Decimal(str(s.get("total_amount", 0)))

            # Map seller to created_by
            created_by = self.user_map.get(seller_id) or admin_user

            try:
                sale = Sale.objects.create(
                    total_value=total,
                    stage=stage,
                    notes=s.get("short_description") or "",
                    closed_at=parse_datetime(s["close_date"] + "T00:00:00-03:00") if s.get("close_date") else None,
                    created_by=created_by,
                )
                # Add products M2M
                for prod_product_id in s.get("products", []):
                    product_uuid = self.product_map.get(prod_product_id)
                    if product_uuid:
                        sale.products.add(product_uuid)

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
        """Import PROD tasks."""
        prod_tasks = self.fetch_all("tasks")
        self.stdout.write(f"  Fetched {len(prod_tasks)} tasks")

        # Map PROD status → FRZ status
        status_map = {
            "todo": "pending",
            "in_progress": "in_progress",
            "done": "completed",
            "cancelled": "cancelled",
        }

        created = 0
        skipped = 0

        for t in prod_tasks:
            # Task.content_type=8 means it's linked to a Lead
            lead_uuid = self.lead_map.get(t.get("object_id"))

            if self.dry_run:
                created += 1
                continue

            # Map responsibles
            assigned_to = None
            responsibles = t.get("responsibles", [])
            if responsibles:
                assigned_to = self.user_map.get(responsibles[0])

            created_by = self.user_map.get(t.get("created_by"))

            status = status_map.get(t.get("status", "todo"), "pending")

            try:
                Task.objects.create(
                    title=t.get("description", "")[:200] or f"Task #{t['id']}",
                    description=t.get("description", ""),
                    due_date=parse_datetime(t["deadline"]) if t.get("deadline") else None,
                    lead_id=lead_uuid,
                    assigned_to=assigned_to,
                    status=status,
                    priority=t.get("priority", "medium"),
                    completed_at=parse_datetime(t["conclusion_date"]) if t.get("conclusion_date") else None,
                )
                created += 1
            except Exception as e:
                logger.warning(f"Task {t['id']} error: {e}")
                skipped += 1

        self.stats["tasks_created"] = created
        self.stats["tasks_skipped"] = skipped

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
