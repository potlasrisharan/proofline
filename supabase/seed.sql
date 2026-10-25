-- Fictional VoltEdge seed for local/demo foundation work.
--
-- This seed contains no credentials and does not create an auth.users row. A local
-- Supabase operator can add a test user through Supabase Auth and then create a
-- membership using the protected membership workflow. Registry records are seeded
-- without an owner membership so the data remains safe to load before authentication
-- is configured. The runnable application does not currently claim live Supabase
-- persistence; this is foundation/stub data only.

insert into public.organisations (id, slug, name, settings, created_at, updated_at)
values (
  '10000000-0000-4000-8000-000000000001',
  'voltedge',
  'VoltEdge',
  '{"seed":true,"fictional":true,"default_market":"US","default_language":"en-US"}'::jsonb,
  '2026-10-25T09:00:00Z',
  '2026-10-25T09:00:00Z'
)
on conflict (id) do nothing;

insert into public.sources (
  id,
  organisation_id,
  title,
  source_type,
  version_label,
  content_hash,
  metadata,
  created_at
)
values
(
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'VoltEdge NovaBook S1 approved product specification',
  'manual',
  '2026.10',
  'fictional-voltedge-novabook-s1-spec-v2026-10',
  '{"fictional":true,"document_status":"approved","market":"US"}'::jsonb,
  '2026-10-25T09:01:00Z'
),
(
  '20000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000001',
  'VoltEdge October launch promotion brief',
  'manual',
  '2026.10',
  'fictional-voltedge-october-promotion-v2026-10',
  '{"fictional":true,"document_status":"approved","market":"US"}'::jsonb,
  '2026-10-25T09:02:00Z'
),
(
  '20000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000001',
  'VoltEdge brand language guide',
  'manual',
  '2026.10',
  'fictional-voltedge-language-guide-v2026-10',
  '{"fictional":true,"document_status":"approved","market":"US"}'::jsonb,
  '2026-10-25T09:03:00Z'
),
(
  '20000000-0000-4000-8000-000000000004',
  '10000000-0000-4000-8000-000000000001',
  'VoltEdge legal qualifier brief',
  'manual',
  '2026.10',
  'fictional-voltedge-qualifier-brief-v2026-10',
  '{"fictional":true,"document_status":"approved","market":"US"}'::jsonb,
  '2026-10-25T09:04:00Z'
)
on conflict (id) do nothing;

insert into public.facts (
  id,
  organisation_id,
  fact_key,
  product_scope,
  market_scope,
  channel_scope,
  language_scope,
  created_at,
  updated_at
)
values
(
  '30000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'novabook_s1_battery_life',
  'VoltEdge NovaBook S1',
  'US',
  null,
  'en-US',
  '2026-10-25T09:05:00Z',
  '2026-10-25T09:05:00Z'
),
(
  '30000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000001',
  'novabook_s1_price',
  'VoltEdge NovaBook S1',
  'US',
  null,
  'en-US',
  '2026-10-25T09:06:00Z',
  '2026-10-25T09:06:00Z'
),
(
  '30000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000001',
  'october_launch_offer',
  'VoltEdge NovaBook S1',
  'US',
  'paid_social,email',
  'en-US',
  '2026-10-25T09:07:00Z',
  '2026-10-25T09:07:00Z'
)
on conflict (id) do nothing;

insert into public.fact_versions (
  id,
  organisation_id,
  fact_id,
  version_number,
  value_text,
  numeric_value,
  unit,
  effective_from,
  effective_to,
  status,
  source_id,
  source_note,
  created_at
)
values
(
  '40000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  1,
  'Battery life: up to 10 hours of video playback.',
  10,
  'hours',
  '2026-10-01T00:00:00Z',
  null,
  'approved',
  '20000000-0000-4000-8000-000000000001',
  null,
  '2026-10-25T09:08:00Z'
),
(
  '40000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000002',
  1,
  'US list price: $1,299.',
  1299,
  'USD',
  '2026-10-01T00:00:00Z',
  null,
  'approved',
  '20000000-0000-4000-8000-000000000001',
  null,
  '2026-10-25T09:09:00Z'
),
(
  '40000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000003',
  1,
  '20% off NovaBook S1 from October 1 through October 15, 2026.',
  20,
  'percent',
  '2026-10-01T00:00:00Z',
  '2026-10-15T23:59:59Z',
  'expired',
  '20000000-0000-4000-8000-000000000002',
  null,
  '2026-10-25T09:10:00Z'
)
on conflict (id) do nothing;

insert into public.terms (
  id,
  organisation_id,
  term_text,
  term_kind,
  version_number,
  preferred_replacement,
  scope,
  status,
  source_id,
  effective_from,
  created_at
)
values
(
  '50000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'cheap',
  'banned',
  1,
  'accessible',
  '{"market":"US","content_types":["text","email","paid_social"]}'::jsonb,
  'approved',
  '20000000-0000-4000-8000-000000000003',
  '2026-10-01T00:00:00Z',
  '2026-10-25T09:11:00Z'
),
(
  '50000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000001',
  'affordable',
  'preferred_alt',
  1,
  null,
  '{"market":"US","content_types":["text","email","paid_social"]}'::jsonb,
  'approved',
  '20000000-0000-4000-8000-000000000003',
  '2026-10-01T00:00:00Z',
  '2026-10-25T09:12:00Z'
)
on conflict (id) do nothing;

insert into public.guidelines (
  id,
  organisation_id,
  name,
  category,
  body,
  version_number,
  scope,
  status,
  source_id,
  effective_from,
  created_at
)
values (
  '60000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'Clear and confident product voice',
  'tone_messaging',
  'Use clear, confident language grounded in approved product details. Avoid hype, slang, insults, and absolute promises. Prefer short sentences that explain customer value.',
  1,
  '{"market":"US","language":"en-US"}'::jsonb,
  'approved',
  '20000000-0000-4000-8000-000000000003',
  '2026-10-01T00:00:00Z',
  '2026-10-25T09:13:00Z'
)
on conflict (id) do nothing;

insert into public.disclaimers (
  id,
  organisation_id,
  name,
  disclaimer_text,
  trigger_description,
  required,
  version_number,
  scope,
  status,
  source_id,
  effective_from,
  created_at
)
values (
  '70000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'Promotion terms qualifier',
  'Terms apply.',
  'Add when content includes an offer, discount, promotion, or limited-time price.',
  true,
  1,
  '{"market":"US","channels":["email","paid_social","web"]}'::jsonb,
  'approved',
  '20000000-0000-4000-8000-000000000004',
  '2026-10-01T00:00:00Z',
  '2026-10-25T09:14:00Z'
)
on conflict (id) do nothing;

insert into public.assets (
  id,
  organisation_id,
  asset_name,
  asset_type,
  version_number,
  mime_type,
  metadata,
  guidance,
  status,
  source_id,
  created_at
)
values
(
  '80000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'VoltEdge wordmark',
  'logo',
  1,
  'image/svg+xml',
  '{"fictional":true,"format":"svg","wordmark":"VoltEdge","background":"light","approved_dimensions":{"width":240,"height":48}}'::jsonb,
  'Use the approved VoltEdge wordmark without stretching, recolouring, or adding effects.',
  'approved',
  '20000000-0000-4000-8000-000000000003',
  '2026-10-25T09:15:00Z'
),
(
  '80000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000001',
  'VoltEdge primary palette',
  'palette',
  1,
  'application/json',
  '{"fictional":true,"colors":{"deep_navy":"#10243E","electric_teal":"#18B7A0","warm_white":"#F7FAFC","signal_orange":"#F28C28"},"contrast_note":"Check contrast for each content context; palette alone is not an accessibility pass."}'::jsonb,
  'Use deep navy for primary text and electric teal as an accent. Confirm contrast for every layout.',
  'approved',
  '20000000-0000-4000-8000-000000000003',
  '2026-10-25T09:16:00Z'
)
on conflict (id) do nothing;
