-- Proofline Phase 1 foundation schema.
--
-- This migration is a foundation/stub for the planned Supabase persistence layer.
-- It is intentionally tenant-aware and evidence-first, but no live Supabase project
-- is claimed by this repository. The API/authentication layer remains planned.

create extension if not exists pgcrypto;

create type public.membership_role as enum (
  'creator',
  'manager',
  'legal_reviewer',
  'brand_owner',
  'agency'
);

create type public.membership_status as enum (
  'invited',
  'active',
  'suspended',
  'removed'
);

create type public.registry_status as enum (
  'draft',
  'approved',
  'superseded',
  'expired',
  'retired'
);

create type public.term_kind as enum ('banned', 'preferred_alt');

create type public.content_type as enum ('text', 'pdf', 'docx', 'image', 'other');

create type public.content_workflow_status as enum (
  'draft',
  'in_review',
  'approved',
  'changes_requested',
  'archived'
);

create type public.extraction_status as enum (
  'not_applicable',
  'pending',
  'complete',
  'partial',
  'failed'
);

create type public.audit_status as enum (
  'pending',
  'running',
  'completed',
  'failed',
  'review_required'
);

create type public.claim_status as enum (
  'supported',
  'contradicted',
  'outdated',
  'unsupported_unverified',
  'ambiguous',
  'review_required'
);

create type public.finding_category as enum (
  'fact_mismatch',
  'outdated_fact_or_offer',
  'unsupported_claim',
  'terminology_violation',
  'tone_messaging_mismatch',
  'visual_mismatch',
  'accessibility_issue',
  'configured_policy_disclaimer',
  'source_conflict',
  'guideline_ambiguity'
);

create type public.finding_severity as enum ('high', 'medium', 'low', 'review_required');

create type public.evidence_status as enum (
  'supported_mismatch',
  'unsupported_unverified',
  'source_conflict',
  'style_suggestion',
  'review_required'
);

create type public.creator_action as enum (
  'pending',
  'accepted',
  'edited',
  'rejected',
  'not_applicable'
);

create type public.reviewer_outcome as enum (
  'pending',
  'confirmed',
  'overridden',
  'resolved',
  'needs_review'
);

create type public.approval_decision as enum (
  'approved',
  'changes_requested',
  'rejected',
  'withdrawn'
);

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
  name text not null check (length(trim(name)) > 0),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.membership_role not null,
  status public.membership_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, id),
  unique (organisation_id, user_id)
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  source_type text not null check (source_type in ('document', 'url', 'manual', 'system')),
  uri text,
  storage_path text,
  version_label text not null default '1',
  content_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_by_membership_id uuid,
  created_at timestamptz not null default now(),
  unique (organisation_id, id),
  foreign key (organisation_id, created_by_membership_id)
    references public.memberships (organisation_id, id)
);

create table public.facts (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  fact_key text not null check (length(trim(fact_key)) > 0),
  product_scope text,
  market_scope text,
  channel_scope text,
  language_scope text,
  created_by_membership_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, id),
  unique (
    organisation_id,
    fact_key,
    product_scope,
    market_scope,
    channel_scope,
    language_scope
  ),
  foreign key (organisation_id, created_by_membership_id)
    references public.memberships (organisation_id, id)
);

create table public.fact_versions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  fact_id uuid not null,
  version_number integer not null check (version_number > 0),
  value_text text not null check (length(trim(value_text)) > 0),
  numeric_value numeric,
  unit text,
  effective_from timestamptz,
  effective_to timestamptz,
  status public.registry_status not null default 'draft',
  source_id uuid,
  source_note text,
  created_by_membership_id uuid,
  approved_by_membership_id uuid,
  created_at timestamptz not null default now(),
  unique (organisation_id, id),
  unique (organisation_id, fact_id, version_number),
  unique (organisation_id, fact_id, id),
  check (effective_to is null or effective_from is null or effective_to >= effective_from),
  check (source_id is not null or length(trim(coalesce(source_note, ''))) > 0),
  foreign key (organisation_id, fact_id)
    references public.facts (organisation_id, id) on delete cascade,
  foreign key (organisation_id, source_id)
    references public.sources (organisation_id, id),
  foreign key (organisation_id, created_by_membership_id)
    references public.memberships (organisation_id, id),
  foreign key (organisation_id, approved_by_membership_id)
    references public.memberships (organisation_id, id)
);

create table public.terms (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  term_text text not null check (length(trim(term_text)) > 0),
  term_kind public.term_kind not null,
  version_number integer not null default 1 check (version_number > 0),
  preferred_replacement text,
  scope jsonb not null default '{}'::jsonb,
  status public.registry_status not null default 'draft',
  source_id uuid,
  created_by_membership_id uuid,
  approved_by_membership_id uuid,
  effective_from timestamptz,
  effective_to timestamptz,
  created_at timestamptz not null default now(),
  unique (organisation_id, id),
  unique (organisation_id, term_text, version_number),
  check (effective_to is null or effective_from is null or effective_to >= effective_from),
  foreign key (organisation_id, source_id)
    references public.sources (organisation_id, id),
  foreign key (organisation_id, created_by_membership_id)
    references public.memberships (organisation_id, id),
  foreign key (organisation_id, approved_by_membership_id)
    references public.memberships (organisation_id, id)
);

create table public.guidelines (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  category text not null check (length(trim(category)) > 0),
  body text not null check (length(trim(body)) > 0),
  version_number integer not null default 1 check (version_number > 0),
  scope jsonb not null default '{}'::jsonb,
  status public.registry_status not null default 'draft',
  source_id uuid,
  created_by_membership_id uuid,
  approved_by_membership_id uuid,
  effective_from timestamptz,
  effective_to timestamptz,
  created_at timestamptz not null default now(),
  unique (organisation_id, id),
  unique (organisation_id, name, version_number),
  check (effective_to is null or effective_from is null or effective_to >= effective_from),
  foreign key (organisation_id, source_id)
    references public.sources (organisation_id, id),
  foreign key (organisation_id, created_by_membership_id)
    references public.memberships (organisation_id, id),
  foreign key (organisation_id, approved_by_membership_id)
    references public.memberships (organisation_id, id)
);

create table public.disclaimers (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  disclaimer_text text not null check (length(trim(disclaimer_text)) > 0),
  trigger_description text not null check (length(trim(trigger_description)) > 0),
  required boolean not null default true,
  version_number integer not null default 1 check (version_number > 0),
  scope jsonb not null default '{}'::jsonb,
  status public.registry_status not null default 'draft',
  source_id uuid,
  created_by_membership_id uuid,
  approved_by_membership_id uuid,
  effective_from timestamptz,
  effective_to timestamptz,
  created_at timestamptz not null default now(),
  unique (organisation_id, id),
  unique (organisation_id, name, version_number),
  check (effective_to is null or effective_from is null or effective_to >= effective_from),
  foreign key (organisation_id, source_id)
    references public.sources (organisation_id, id),
  foreign key (organisation_id, created_by_membership_id)
    references public.memberships (organisation_id, id),
  foreign key (organisation_id, approved_by_membership_id)
    references public.memberships (organisation_id, id)
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  asset_name text not null check (length(trim(asset_name)) > 0),
  asset_type text not null check (asset_type in ('logo', 'palette', 'image', 'font', 'other')),
  version_number integer not null default 1 check (version_number > 0),
  storage_path text,
  mime_type text,
  metadata jsonb not null default '{}'::jsonb,
  guidance text,
  status public.registry_status not null default 'draft',
  source_id uuid,
  created_by_membership_id uuid,
  approved_by_membership_id uuid,
  created_at timestamptz not null default now(),
  unique (organisation_id, id),
  unique (organisation_id, asset_name, version_number),
  foreign key (organisation_id, source_id)
    references public.sources (organisation_id, id),
  foreign key (organisation_id, created_by_membership_id)
    references public.memberships (organisation_id, id),
  foreign key (organisation_id, approved_by_membership_id)
    references public.memberships (organisation_id, id)
);

create table public.contents (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  owner_membership_id uuid not null,
  created_by_membership_id uuid not null,
  title text not null check (length(trim(title)) > 0),
  content_type public.content_type not null,
  workflow_status public.content_workflow_status not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, id),
  foreign key (organisation_id, owner_membership_id)
    references public.memberships (organisation_id, id),
  foreign key (organisation_id, created_by_membership_id)
    references public.memberships (organisation_id, id)
);

create table public.content_versions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  content_id uuid not null,
  version_number integer not null check (version_number > 0),
  source_text text,
  extracted_text text,
  file_path text,
  mime_type text,
  extraction_status public.extraction_status not null default 'not_applicable',
  workflow_status public.content_workflow_status not null default 'draft',
  created_by_membership_id uuid not null,
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  unique (organisation_id, id),
  unique (organisation_id, content_id, version_number),
  foreign key (organisation_id, content_id)
    references public.contents (organisation_id, id) on delete cascade,
  foreign key (organisation_id, created_by_membership_id)
    references public.memberships (organisation_id, id)
);

create table public.audit_runs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  content_version_id uuid not null,
  requested_by_membership_id uuid,
  status public.audit_status not null default 'pending',
  ruleset_version text not null,
  model_provider text,
  model_name text,
  model_version text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organisation_id, id),
  unique (organisation_id, id, content_version_id),
  foreign key (organisation_id, content_version_id)
    references public.content_versions (organisation_id, id) on delete cascade,
  foreign key (organisation_id, requested_by_membership_id)
    references public.memberships (organisation_id, id),
  check (completed_at is null or started_at is null or completed_at >= started_at)
);

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  content_version_id uuid not null,
  claim_text text not null check (length(trim(claim_text)) > 0),
  start_char integer check (start_char is null or start_char >= 0),
  end_char integer check (end_char is null or end_char >= 0),
  claim_type text not null check (length(trim(claim_type)) > 0),
  status public.claim_status not null default 'review_required',
  evidence_excerpt text,
  fact_id uuid,
  fact_version_id uuid,
  term_id uuid,
  guideline_id uuid,
  disclaimer_id uuid,
  created_by_membership_id uuid,
  created_at timestamptz not null default now(),
  unique (organisation_id, id),
  foreign key (organisation_id, content_version_id)
    references public.content_versions (organisation_id, id) on delete cascade,
  foreign key (organisation_id, fact_id)
    references public.facts (organisation_id, id),
  foreign key (organisation_id, fact_id, fact_version_id)
    references public.fact_versions (organisation_id, fact_id, id),
  foreign key (organisation_id, term_id)
    references public.terms (organisation_id, id),
  foreign key (organisation_id, guideline_id)
    references public.guidelines (organisation_id, id),
  foreign key (organisation_id, disclaimer_id)
    references public.disclaimers (organisation_id, id),
  foreign key (organisation_id, created_by_membership_id)
    references public.memberships (organisation_id, id),
  check (end_char is null or start_char is null or end_char >= start_char),
  check (fact_version_id is null or fact_id is not null)
);

create table public.findings (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  audit_run_id uuid not null,
  content_version_id uuid not null,
  claim_id uuid,
  excerpt text not null check (length(trim(excerpt)) > 0),
  location jsonb not null default '{}'::jsonb,
  category public.finding_category not null,
  severity public.finding_severity not null,
  explanation text not null check (length(trim(explanation)) > 0),
  evidence_status public.evidence_status not null,
  evidence_refs jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence_refs) = 'array'),
  suggested_correction jsonb,
  creator_action public.creator_action not null default 'pending',
  reviewer_outcome public.reviewer_outcome not null default 'pending',
  verification jsonb not null default '{}'::jsonb,
  risk_score integer check (risk_score is null or risk_score between 0 and 100),
  risk_basis text,
  created_at timestamptz not null default now(),
  unique (organisation_id, id),
  foreign key (organisation_id, audit_run_id, content_version_id)
    references public.audit_runs (organisation_id, id, content_version_id) on delete cascade,
  foreign key (organisation_id, content_version_id)
    references public.content_versions (organisation_id, id) on delete cascade,
  foreign key (organisation_id, claim_id)
    references public.claims (organisation_id, id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  content_version_id uuid not null,
  author_membership_id uuid not null,
  anchor jsonb not null default '{}'::jsonb,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, id),
  foreign key (organisation_id, content_version_id)
    references public.content_versions (organisation_id, id) on delete cascade,
  foreign key (organisation_id, author_membership_id)
    references public.memberships (organisation_id, id)
);

create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  content_version_id uuid not null,
  reviewer_membership_id uuid not null,
  decision public.approval_decision not null,
  comment text,
  created_at timestamptz not null default now(),
  unique (organisation_id, id),
  foreign key (organisation_id, content_version_id)
    references public.content_versions (organisation_id, id) on delete cascade,
  foreign key (organisation_id, reviewer_membership_id)
    references public.memberships (organisation_id, id)
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  actor_membership_id uuid,
  event_type text not null check (length(trim(event_type)) > 0),
  object_type text not null check (length(trim(object_type)) > 0),
  object_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  prev_hash text,
  hash text not null check (length(trim(hash)) > 0),
  occurred_at timestamptz not null default now(),
  unique (organisation_id, id),
  unique (organisation_id, hash),
  foreign key (organisation_id, actor_membership_id)
    references public.memberships (organisation_id, id)
);

create index memberships_user_idx on public.memberships (user_id, status);
create index sources_organisation_idx on public.sources (organisation_id, created_at desc);
create index facts_organisation_key_idx on public.facts (organisation_id, fact_key);
create index fact_versions_current_idx on public.fact_versions (organisation_id, fact_id, status, effective_to);
create index terms_organisation_term_idx on public.terms (organisation_id, term_text, term_kind, status);
create index guidelines_organisation_idx on public.guidelines (organisation_id, category, status);
create index disclaimers_organisation_idx on public.disclaimers (organisation_id, required, status);
create index assets_organisation_idx on public.assets (organisation_id, asset_type, status);
create index contents_organisation_status_idx on public.contents (organisation_id, workflow_status, updated_at desc);
create index content_versions_content_idx on public.content_versions (organisation_id, content_id, version_number desc);
create index audit_runs_content_version_idx on public.audit_runs (organisation_id, content_version_id, created_at desc);
create index claims_content_version_idx on public.claims (organisation_id, content_version_id, created_at);
create index findings_audit_run_idx on public.findings (organisation_id, audit_run_id, severity, category);
create index comments_content_version_idx on public.comments (organisation_id, content_version_id, created_at);
create index approvals_content_version_idx on public.approvals (organisation_id, content_version_id, created_at desc);
create index audit_events_object_idx on public.audit_events (organisation_id, object_type, object_id, occurred_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organisations_set_updated_at
before update on public.organisations
for each row execute function public.set_updated_at();

create trigger memberships_set_updated_at
before update on public.memberships
for each row execute function public.set_updated_at();

create trigger facts_set_updated_at
before update on public.facts
for each row execute function public.set_updated_at();

create trigger contents_set_updated_at
before update on public.contents
for each row execute function public.set_updated_at();

create trigger comments_set_updated_at
before update on public.comments
for each row execute function public.set_updated_at();

create or replace function public.is_org_member(p_organisation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.organisation_id = p_organisation_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

create or replace function public.has_any_org_role(
  p_organisation_id uuid,
  p_roles public.membership_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.organisation_id = p_organisation_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = any (p_roles)
  );
$$;

create or replace function public.current_membership_id(p_organisation_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.id
  from public.memberships m
  where m.organisation_id = p_organisation_id
    and m.user_id = auth.uid()
    and m.status = 'active'
  order by m.created_at
  limit 1;
$$;

-- Direct organisation inserts are intentionally not exposed through a table policy.
-- This RPC creates the tenant and its first brand-owner membership atomically.
create or replace function public.create_organisation(p_name text, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organisation_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  insert into public.organisations (name, slug)
  values (p_name, p_slug)
  returning id into v_organisation_id;

  insert into public.memberships (organisation_id, user_id, role, status)
  values (v_organisation_id, v_user_id, 'brand_owner', 'active');

  return v_organisation_id;
end;
$$;

revoke all on function public.create_organisation(text, text) from public;
grant execute on function public.create_organisation(text, text) to authenticated;

alter table public.organisations enable row level security;
alter table public.memberships enable row level security;
alter table public.sources enable row level security;
alter table public.facts enable row level security;
alter table public.fact_versions enable row level security;
alter table public.terms enable row level security;
alter table public.guidelines enable row level security;
alter table public.disclaimers enable row level security;
alter table public.assets enable row level security;
alter table public.contents enable row level security;
alter table public.content_versions enable row level security;
alter table public.audit_runs enable row level security;
alter table public.claims enable row level security;
alter table public.findings enable row level security;
alter table public.comments enable row level security;
alter table public.approvals enable row level security;
alter table public.audit_events enable row level security;

create policy organisations_member_select on public.organisations
for select using (public.is_org_member(id));

create policy organisations_owner_update on public.organisations
for update
using (public.has_any_org_role(id, array['brand_owner']::public.membership_role[]))
with check (public.has_any_org_role(id, array['brand_owner']::public.membership_role[]));

create policy memberships_member_select on public.memberships
for select using (public.is_org_member(organisation_id));

create policy memberships_owner_insert on public.memberships
for insert
with check (public.has_any_org_role(organisation_id, array['brand_owner']::public.membership_role[]));

create policy memberships_owner_update on public.memberships
for update
using (public.has_any_org_role(organisation_id, array['brand_owner']::public.membership_role[]))
with check (public.has_any_org_role(organisation_id, array['brand_owner']::public.membership_role[]));

create policy memberships_owner_delete on public.memberships
for delete
using (public.has_any_org_role(organisation_id, array['brand_owner']::public.membership_role[]));

create policy sources_member_select on public.sources
for select using (public.is_org_member(organisation_id));

create policy sources_registry_write on public.sources
for all
using (public.has_any_org_role(organisation_id, array['brand_owner', 'manager']::public.membership_role[]))
with check (public.has_any_org_role(organisation_id, array['brand_owner', 'manager']::public.membership_role[]));

create policy facts_member_select on public.facts
for select using (public.is_org_member(organisation_id));

create policy facts_registry_write on public.facts
for all
using (public.has_any_org_role(organisation_id, array['brand_owner', 'manager']::public.membership_role[]))
with check (public.has_any_org_role(organisation_id, array['brand_owner', 'manager']::public.membership_role[]));

create policy fact_versions_member_select on public.fact_versions
for select using (public.is_org_member(organisation_id));

create policy fact_versions_registry_insert on public.fact_versions
for insert
with check (
  public.has_any_org_role(organisation_id, array['brand_owner', 'manager']::public.membership_role[])
  and status <> 'approved'
  and approved_by_membership_id is null
);

create policy fact_versions_owner_update on public.fact_versions
for update
using (public.has_any_org_role(organisation_id, array['brand_owner']::public.membership_role[]))
with check (public.has_any_org_role(organisation_id, array['brand_owner']::public.membership_role[]));

create policy fact_versions_owner_delete on public.fact_versions
for delete
using (public.has_any_org_role(organisation_id, array['brand_owner']::public.membership_role[]));

create policy terms_member_select on public.terms
for select using (public.is_org_member(organisation_id));

create policy terms_registry_insert on public.terms
for insert
with check (
  public.has_any_org_role(organisation_id, array['brand_owner', 'manager']::public.membership_role[])
  and status <> 'approved'
  and approved_by_membership_id is null
);

create policy terms_owner_update on public.terms
for update
using (public.has_any_org_role(organisation_id, array['brand_owner']::public.membership_role[]))
with check (public.has_any_org_role(organisation_id, array['brand_owner']::public.membership_role[]));

create policy terms_owner_delete on public.terms
for delete
using (public.has_any_org_role(organisation_id, array['brand_owner']::public.membership_role[]));

create policy guidelines_member_select on public.guidelines
for select using (public.is_org_member(organisation_id));

create policy guidelines_registry_insert on public.guidelines
for insert
with check (
  public.has_any_org_role(organisation_id, array['brand_owner', 'manager']::public.membership_role[])
  and status <> 'approved'
  and approved_by_membership_id is null
);

create policy guidelines_owner_update on public.guidelines
for update
using (public.has_any_org_role(organisation_id, array['brand_owner']::public.membership_role[]))
with check (public.has_any_org_role(organisation_id, array['brand_owner']::public.membership_role[]));

create policy guidelines_owner_delete on public.guidelines
for delete
using (public.has_any_org_role(organisation_id, array['brand_owner']::public.membership_role[]));

create policy disclaimers_member_select on public.disclaimers
for select using (public.is_org_member(organisation_id));

create policy disclaimers_registry_insert on public.disclaimers
for insert
with check (
  public.has_any_org_role(
    organisation_id,
    array['brand_owner', 'manager', 'legal_reviewer']::public.membership_role[]
  )
  and status <> 'approved'
  and approved_by_membership_id is null
);

create policy disclaimers_owner_update on public.disclaimers
for update
using (public.has_any_org_role(organisation_id, array['brand_owner']::public.membership_role[]))
with check (public.has_any_org_role(organisation_id, array['brand_owner']::public.membership_role[]));

create policy disclaimers_owner_delete on public.disclaimers
for delete
using (public.has_any_org_role(organisation_id, array['brand_owner']::public.membership_role[]));

create policy assets_member_select on public.assets
for select using (public.is_org_member(organisation_id));

create policy assets_registry_insert on public.assets
for insert
with check (
  public.has_any_org_role(organisation_id, array['brand_owner', 'manager']::public.membership_role[])
  and status <> 'approved'
  and approved_by_membership_id is null
);

create policy assets_owner_update on public.assets
for update
using (public.has_any_org_role(organisation_id, array['brand_owner']::public.membership_role[]))
with check (public.has_any_org_role(organisation_id, array['brand_owner']::public.membership_role[]));

create policy assets_owner_delete on public.assets
for delete
using (public.has_any_org_role(organisation_id, array['brand_owner']::public.membership_role[]));

create policy contents_member_select on public.contents
for select using (public.is_org_member(organisation_id));

create policy contents_member_insert on public.contents
for insert
with check (
  public.is_org_member(organisation_id)
  and created_by_membership_id = public.current_membership_id(organisation_id)
);

create policy contents_owner_update on public.contents
for update
using (
  owner_membership_id = public.current_membership_id(organisation_id)
  or public.has_any_org_role(organisation_id, array['brand_owner', 'manager']::public.membership_role[])
)
with check (
  public.is_org_member(organisation_id)
  and (
    owner_membership_id = public.current_membership_id(organisation_id)
    or public.has_any_org_role(organisation_id, array['brand_owner', 'manager']::public.membership_role[])
  )
);

create policy contents_manager_delete on public.contents
for delete
using (public.has_any_org_role(organisation_id, array['brand_owner', 'manager']::public.membership_role[]));

create policy content_versions_member_select on public.content_versions
for select using (public.is_org_member(organisation_id));

create policy content_versions_member_insert on public.content_versions
for insert
with check (
  public.is_org_member(organisation_id)
  and created_by_membership_id = public.current_membership_id(organisation_id)
);

create policy content_versions_creator_update on public.content_versions
for update
using (
  created_by_membership_id = public.current_membership_id(organisation_id)
  or public.has_any_org_role(organisation_id, array['brand_owner', 'manager']::public.membership_role[])
)
with check (public.is_org_member(organisation_id));

create policy audit_runs_member_select on public.audit_runs
for select using (public.is_org_member(organisation_id));

create policy audit_runs_member_insert on public.audit_runs
for insert
with check (
  public.is_org_member(organisation_id)
  and (
    requested_by_membership_id is null
    or requested_by_membership_id = public.current_membership_id(organisation_id)
  )
);

create policy audit_runs_reviewer_update on public.audit_runs
for update
using (public.is_org_member(organisation_id))
with check (public.is_org_member(organisation_id));

create policy claims_member_select on public.claims
for select using (public.is_org_member(organisation_id));

create policy claims_member_insert on public.claims
for insert
with check (
  public.is_org_member(organisation_id)
  and (
    created_by_membership_id is null
    or created_by_membership_id = public.current_membership_id(organisation_id)
  )
);

create policy findings_member_select on public.findings
for select using (public.is_org_member(organisation_id));

create policy findings_reviewer_insert on public.findings
for insert
with check (
  public.has_any_org_role(
    organisation_id,
    array['brand_owner', 'manager', 'legal_reviewer']::public.membership_role[]
  )
);

create policy comments_member_select on public.comments
for select using (public.is_org_member(organisation_id));

create policy comments_member_insert on public.comments
for insert
with check (
  public.is_org_member(organisation_id)
  and author_membership_id = public.current_membership_id(organisation_id)
);

create policy comments_author_update on public.comments
for update
using (author_membership_id = public.current_membership_id(organisation_id))
with check (author_membership_id = public.current_membership_id(organisation_id));

create policy approvals_member_select on public.approvals
for select using (public.is_org_member(organisation_id));

create policy approvals_reviewer_insert on public.approvals
for insert
with check (
  public.has_any_org_role(
    organisation_id,
    array['brand_owner', 'manager', 'legal_reviewer']::public.membership_role[]
  )
  and reviewer_membership_id = public.current_membership_id(organisation_id)
);

create policy audit_events_member_select on public.audit_events
for select using (public.is_org_member(organisation_id));

create policy audit_events_actor_insert on public.audit_events
for insert
with check (
  public.is_org_member(organisation_id)
  and (
    actor_membership_id is null
    or actor_membership_id = public.current_membership_id(organisation_id)
  )
);
