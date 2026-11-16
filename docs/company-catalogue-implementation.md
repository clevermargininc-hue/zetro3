# Company service and product intelligence

## What is delivered

The Products & Services settings screen is now a company-owned catalogue for service areas, products, services, and issue categories. It supports active/inactive records, hierarchy and relationship fields, editing, starter-template previews, JSON import/export, and read-only access for non-admin members.

Customer Intelligence consumes that catalogue for call classification, issue lists, Customer 360, filters, issue investigation, and company-level service-area reporting. A single issue can link to multiple services, products, and service areas. Historical labels are retained when catalogue items are later deactivated.

AI output is validated against the active catalogue in the current workspace. Explicit invalid IDs, inactive records, and unknown items are never silently converted into a template/default match; they are flagged for review. The reviewer can correct the links with a required note, and the original AI payload is retained in the classification event log.

## Database setup required

The connected Supabase project currently returns `404` for the catalogue tables, so this feature intentionally displays a setup state and does not write fake data. Apply these migrations in order using Supabase migrations or SQL Editor:

1. `supabase/migrations/20261102_company_catalogue_intelligence.sql`
2. `supabase/migrations/20261103_company_catalogue_connections.sql`
3. `supabase/migrations/20261104_customer_review_flags.sql` (repair for installations that already ran the previous connection migration).

The second migration adds tenant-scoped RLS, immutable catalogue audit entries, versioned classification events, historical relationship preservation, and the service-role transactional classification RPC. It must run after the base catalogue migration.

## Security model

- Reads are scoped to the signed-in user's workspace (or their personal catalogue).
- Catalogue edits, imports, and template application require a workspace admin.
- Classification corrections verify issue ownership and active references in the same tenant.
- RLS uses workspace membership for reads and an admin role for catalogue writes. The application performs the same scope checks before reaching Supabase.
- No hard delete is exposed for catalogue entries; deactivation preserves historical associations.

## Verification

`npm run test:catalogue` covers a multi-service organisation, cross-company/fabricated ID rejection, inactive-record rejection, and unknown-industry handling.

`npx tsc --noEmit` should be run after applying any further UI changes. End-to-end write/RLS verification is pending the database migration because the current project does not yet have the required tables.

## Deliberate limits

- Starter templates are suggestions only; none is automatically selected or seeded.
- Existing legacy issue categories remain available for historical compatibility, but new catalogue classification drives the new filters and displays.
- Existing historical calls/issues are not automatically rewritten or relabelled.
