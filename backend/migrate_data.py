#!/usr/bin/env python3
"""
Migrate data from SalesCube original (lead_ai DB) to FlowCube (flowcube DB).
Runs inside flowcube-backend container which has Django ORM access.
Uses raw psycopg2 to read from source DB via network.

Strategy:
1. Read source data via psycopg2 (direct TCP to salescube-postgres)
2. Write to FlowCube DB via Django ORM
3. Maintain ID mapping (old bigint -> new UUID)
"""

import os
import sys
import uuid
import json
from datetime import datetime, timezone
from decimal import Decimal

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from django.contrib.auth.models import User
from salescube.models import (
    Pipeline, PipelineStage, Lead, Product, Category,
    Sale, SaleLineItem, Task, LeadNote, LeadActivity
)

import psycopg2
import psycopg2.extras

# Disconnect signals to prevent auto-creation of default stages
from django.db.models.signals import post_save
from django.db.models.signals import pre_save
from salescube.signals import create_default_stages, track_lead_changes, log_lead_activity
post_save.disconnect(create_default_stages, sender=Pipeline)
post_save.disconnect(log_lead_activity, sender=Lead)
pre_save.disconnect(track_lead_changes, sender=Lead)
print("Signals disconnected (create_default_stages + track_lead_changes + log_lead_activity).")

# ===========================================================================
# Source DB connection
# ===========================================================================

SRC_HOST = os.environ.get('SRC_DB_HOST', 'salescube-postgres')
SRC_PORT = int(os.environ.get('SRC_DB_PORT', '5432'))
SRC_DB = os.environ.get('SRC_DB_NAME', 'lead_ai')
SRC_USER = os.environ.get('SRC_DB_USER', 'app_lead_ai')
SRC_PASS = os.environ.get('SRC_DB_PASS', 'DevAppLeadAi2026')

def get_src_conn():
    return psycopg2.connect(
        host=SRC_HOST, port=SRC_PORT, dbname=SRC_DB,
        user=SRC_USER, password=SRC_PASS,
        cursor_factory=psycopg2.extras.DictCursor
    )

# ===========================================================================
# ID Mappings
# ===========================================================================

board_map = {}      # old board_id -> new Pipeline UUID
column_map = {}     # old column_id -> new PipelineStage UUID
lead_map = {}       # old lead_id -> new Lead UUID
product_map = {}    # old product_id -> new Product UUID
sale_map = {}       # old sale_id -> new Sale UUID
origin_map = {}     # old origin_id -> source string

# ===========================================================================
# Get default user
# ===========================================================================

admin_user = User.objects.first()
print(f"Using admin user: {admin_user.username} (id={admin_user.id})")

# ===========================================================================
# Step 0: Clear existing test data
# ===========================================================================

print("\n=== Step 0: Clearing existing FlowCube salescube data ===")
LeadActivity.objects.all().delete()
LeadNote.objects.all().delete()
SaleLineItem.objects.all().delete()
Sale.objects.all().delete()
Task.objects.all().delete()
Lead.objects.all().delete()
Product.objects.all().delete()
Category.objects.all().delete()
PipelineStage.objects.all().delete()
Pipeline.objects.all().delete()
print("All salescube tables cleared.")

# ===========================================================================
# Step 1: Migrate Origins -> source mapping
# ===========================================================================

print("\n=== Step 1: Mapping origins ===")
conn = get_src_conn()
cur = conn.cursor()

cur.execute("SELECT id, name FROM leads_origin ORDER BY id")
for row in cur.fetchall():
    name = row['name'].lower().strip()
    # Map to FlowCube source choices
    if 'whatsapp' in name:
        origin_map[row['id']] = 'whatsapp'
    elif 'facebook' in name or 'fb' in name:
        origin_map[row['id']] = 'facebook'
    elif 'instagram' in name or 'ig' in name:
        origin_map[row['id']] = 'instagram'
    elif 'indicação' in name or 'indicacao' in name or 'referral' in name:
        origin_map[row['id']] = 'referral'
    elif 'evento' in name or 'event' in name or 'tour' in name:
        origin_map[row['id']] = 'event'
    elif 'tráfego' in name or 'trafego' in name or 'tráf' in name:
        origin_map[row['id']] = 'website'
    elif 'site' in name or 'website' in name or 'greatpages' in name:
        origin_map[row['id']] = 'website'
    elif 'bot' in name or 'vibe' in name or 'ia' in name or 'ai' in name:
        origin_map[row['id']] = 'other'
    else:
        origin_map[row['id']] = 'other'

print(f"  Mapped {len(origin_map)} origins")
for oid, src in origin_map.items():
    cur.execute("SELECT name FROM leads_origin WHERE id=%s", (oid,))
    print(f"    {cur.fetchone()['name']} -> {src}")

# ===========================================================================
# Step 2: Migrate Boards -> Pipelines
# ===========================================================================

print("\n=== Step 2: Migrating Pipelines (Boards) ===")
cur.execute("SELECT id, name, description, created_at, is_deleted FROM pipelines_board WHERE is_deleted=false ORDER BY id")
boards = cur.fetchall()

for i, board in enumerate(boards):
    p = Pipeline.objects.create(
        name=board['name'],
        description=board['description'] or '',
        is_default=(i == 0),
        created_by=admin_user,
    )
    # Preserve original created_at
    Pipeline.objects.filter(id=p.id).update(created_at=board['created_at'])
    board_map[board['id']] = p.id
    print(f"  Pipeline: {board['name']} (old={board['id']} -> new={p.id})")

print(f"  Total: {len(board_map)} pipelines")

# ===========================================================================
# Step 3: Migrate Columns -> PipelineStages
# ===========================================================================

print("\n=== Step 3: Migrating Stages (Columns) ===")
cur.execute("""
    SELECT id, name, position, color, board_id, is_deleted, description
    FROM pipelines_column
    WHERE is_deleted=false
    ORDER BY board_id, position
""")
columns = cur.fetchall()

for col in columns:
    pipeline_id = board_map.get(col['board_id'])
    if not pipeline_id:
        continue

    stage = PipelineStage.objects.create(
        name=col['name'],
        order=col['position'] or 0,
        color=col['color'] or '#6366f1',
        probability=0,  # Original doesn't have this
        pipeline_id=pipeline_id,
    )
    column_map[col['id']] = stage.id
    print(f"  Stage: {col['name']} (order={col['position']}, old={col['id']} -> new={stage.id})")

print(f"  Total: {len(column_map)} stages")

# ===========================================================================
# Step 4: Migrate Products
# ===========================================================================

print("\n=== Step 4: Migrating Products ===")
cur.execute("SELECT id, name, description, price, is_active, created_at, updated_at FROM sales_product ORDER BY name")
products = cur.fetchall()

for prod in products:
    p = Product.objects.create(
        name=prod['name'],
        description=prod['description'] or '',
        price=prod['price'],
        cost=Decimal('0.00'),  # Original doesn't track cost
        sku='',
        active=prod['is_active'],
        image_url='',
    )
    Product.objects.filter(id=p.id).update(
        created_at=prod['created_at'],
        updated_at=prod['updated_at']
    )
    product_map[prod['id']] = p.id

print(f"  Total: {len(product_map)} products")

# ===========================================================================
# Step 5: Migrate Leads
# ===========================================================================

print("\n=== Step 5: Migrating Leads ===")
cur.execute("""
    SELECT l.id, l.name, l.email, l.column_id, l.origin_id,
           l.metadata, l.created_at, l.updated_at, l.profession, l.message,
           l.customer_id
    FROM leads_lead l
    ORDER BY l.id
""")
leads = cur.fetchall()

batch_size = 500
batch = []
count = 0

for lead_row in leads:
    meta = lead_row['metadata'] or {}
    if isinstance(meta, str):
        try:
            meta = json.loads(meta)
        except:
            meta = {}

    stage_id = column_map.get(lead_row['column_id'])
    source = origin_map.get(lead_row['origin_id'], 'manual')

    # Extract phone from metadata or profession field
    phone = meta.get('phone', '') or meta.get('telefone', '') or ''
    company = meta.get('company', '') or meta.get('empresa', '') or ''
    score = int(meta.get('score', 0) or 0)
    value = Decimal(str(meta.get('value', 0) or 0))

    # Build notes from message + profession
    notes_parts = []
    if lead_row['profession']:
        notes_parts.append(f"Profissao: {lead_row['profession']}")
    if lead_row['message']:
        notes_parts.append(lead_row['message'])
    notes = '\n'.join(notes_parts)

    new_id = uuid.uuid4()
    lead_map[lead_row['id']] = new_id

    batch.append(Lead(
        id=new_id,
        name=lead_row['name'] or 'Sem nome',
        email=lead_row['email'] or '',
        phone=str(phone)[:30],
        company=str(company)[:200],
        score=score,
        source=source[:20],
        notes=notes,
        value=value,
        lost_reason='',
        stage_id=stage_id,
        assigned_to=None,
        created_at=lead_row['created_at'],
        updated_at=lead_row['updated_at'] or lead_row['created_at'],
    ))

    count += 1
    if len(batch) >= batch_size:
        Lead.objects.bulk_create(batch, ignore_conflicts=True)
        print(f"  Inserted {count} leads...")
        batch = []

if batch:
    Lead.objects.bulk_create(batch, ignore_conflicts=True)

print(f"  Total: {count} leads migrated")

# Fix created_at/updated_at (bulk_create doesn't respect auto_now)
print("  Fixing timestamps...")
from django.db import connection as django_conn
with django_conn.cursor() as dcur:
    dcur.execute("UPDATE salescube_lead SET updated_at = created_at WHERE updated_at > created_at + interval '1 second'")

# ===========================================================================
# Step 6: Migrate Sales
# ===========================================================================

print("\n=== Step 6: Migrating Sales ===")
cur.execute("""
    SELECT s.id, s.total_amount, s.status, s.close_date, s.created_at, s.updated_at,
           s.customer_id, s.short_description, s.protocol
    FROM sales_sale s
    ORDER BY s.id
""")
sales = cur.fetchall()

status_map = {
    'pending': 'negotiation',
    'closed': 'won',
    'cancelled': 'lost',
    'active': 'negotiation',
    'finalized': 'won',
    'approved': 'won',
    'rejected': 'lost',
}

batch = []
for sale_row in sales:
    new_id = uuid.uuid4()
    sale_map[sale_row['id']] = new_id

    # Map customer to lead
    lead_id = lead_map.get(sale_row['customer_id'])

    # Map status
    orig_status = (sale_row['status'] or 'negotiation').lower().strip()
    stage = status_map.get(orig_status, 'negotiation')

    notes = sale_row['short_description'] or ''
    if sale_row['protocol']:
        notes = f"Protocolo: {sale_row['protocol']}\n{notes}".strip()

    batch.append(Sale(
        id=new_id,
        total_value=sale_row['total_amount'] or Decimal('0'),
        stage=stage,
        notes=notes,
        closed_at=sale_row['close_date'],
        lead_id=lead_id,
        created_by=admin_user,
        created_at=sale_row['created_at'],
        updated_at=sale_row['updated_at'] or sale_row['created_at'],
    ))

    if len(batch) >= batch_size:
        Sale.objects.bulk_create(batch, ignore_conflicts=True)
        print(f"  Inserted {len(sale_map)} sales...")
        batch = []

if batch:
    Sale.objects.bulk_create(batch, ignore_conflicts=True)

print(f"  Total: {len(sale_map)} sales migrated")

# ===========================================================================
# Step 7: Migrate SaleProducts -> SaleLineItems
# ===========================================================================

print("\n=== Step 7: Migrating Sale Line Items ===")
cur.execute("""
    SELECT sp.id, sp.sale_id, sp.product_id, sp.amount, sp.is_valid
    FROM sales_saleproduct sp
    WHERE sp.is_valid = true
    ORDER BY sp.id
""")
sale_products = cur.fetchall()

batch = []
li_count = 0
for sp in sale_products:
    sale_uuid = sale_map.get(sp['sale_id'])
    product_uuid = product_map.get(sp['product_id'])
    if not sale_uuid:
        continue

    batch.append(SaleLineItem(
        sale_id=sale_uuid,
        product_id=product_uuid,
        quantity=1,
        unit_price=sp['amount'] or Decimal('0'),
        subtotal=sp['amount'] or Decimal('0'),
    ))
    li_count += 1

    if len(batch) >= batch_size:
        SaleLineItem.objects.bulk_create(batch, ignore_conflicts=True)
        batch = []

if batch:
    SaleLineItem.objects.bulk_create(batch, ignore_conflicts=True)

print(f"  Total: {li_count} line items migrated")

# ===========================================================================
# Step 8: Migrate Tasks
# ===========================================================================

print("\n=== Step 8: Migrating Tasks ===")
cur.execute("""
    SELECT t.id, t.description, t.status, t.priority, t.deadline,
           t.start_date, t.conclusion_date, t.created_at, t.object_id
    FROM api_task t
    ORDER BY t.id
""")
tasks = cur.fetchall()

priority_map = {
    'low': 'low',
    'normal': 'medium',
    'medium': 'medium',
    'high': 'high',
    'urgent': 'urgent',
    'critical': 'urgent',
}

status_task_map = {
    'open': 'pending',
    'in_progress': 'in_progress',
    'done': 'completed',
    'closed': 'completed',
    'cancelled': 'cancelled',
    'pending': 'pending',
}

batch = []
task_count = 0
for task_row in tasks:
    # Try to map object_id to a lead
    lead_id = lead_map.get(task_row['object_id'])

    status = status_task_map.get((task_row['status'] or 'pending').lower().strip(), 'pending')
    priority = priority_map.get((task_row['priority'] or 'medium').lower().strip(), 'medium')

    batch.append(Task(
        title=task_row['description'][:200] if task_row['description'] else 'Tarefa importada',
        description='',
        due_date=task_row['deadline'],
        status=status,
        priority=priority,
        completed_at=task_row['conclusion_date'],
        lead_id=lead_id,
        assigned_to=None,
        created_at=task_row['created_at'],
        updated_at=task_row['created_at'],
    ))
    task_count += 1

if batch:
    Task.objects.bulk_create(batch, ignore_conflicts=True)

print(f"  Total: {task_count} tasks migrated")

# ===========================================================================
# Done
# ===========================================================================

conn.close()

print("\n" + "="*60)
print("MIGRATION COMPLETE!")
print("="*60)
print(f"  Pipelines:   {len(board_map)}")
print(f"  Stages:      {len(column_map)}")
print(f"  Products:    {len(product_map)}")
print(f"  Leads:       {len(lead_map)}")
print(f"  Sales:       {len(sale_map)}")
print(f"  Line Items:  {li_count}")
print(f"  Tasks:       {task_count}")
print(f"  Origins:     {len(origin_map)}")
print("="*60)
