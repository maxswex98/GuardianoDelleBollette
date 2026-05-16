import { sql } from "@/lib/db/client";

export async function ensureSchema() {
  await sql.begin(async (transaction) => {
    await transaction`select pg_advisory_lock(48291017)`;

    try {
      await transaction`
        create extension if not exists "pgcrypto";
      `;

      await transaction`
        create table if not exists invoices (
          id uuid primary key default gen_random_uuid(),
          utility_type text not null check (utility_type in ('electricity', 'gas')),
          provider text,
          invoice_number text,
          issue_date date,
          due_date date,
          billing_period_start date,
          billing_period_end date,
          total_amount numeric(12, 2),
          consumption_value numeric(12, 3),
          consumption_unit text,
          unit_cost numeric(12, 5),
          fixed_cost numeric(12, 2),
          taxes numeric(12, 2),
          previous_reading numeric(12, 3),
          current_reading numeric(12, 3),
          source_filename text not null,
          source_path text not null unique,
          archived_path text,
          raw_extracted_text text not null,
          parse_confidence numeric(5, 2) not null default 0,
          notes text,
          created_at timestamptz not null default now()
        );
      `;

      await transaction`
        create index if not exists invoices_utility_created_idx
        on invoices (utility_type, coalesce(billing_period_end, issue_date), created_at desc);
      `;

      await transaction`
        create table if not exists invoice_comparisons (
          invoice_id uuid primary key references invoices(id) on delete cascade,
          previous_invoice_id uuid references invoices(id) on delete set null,
          total_delta numeric(12, 2),
          total_delta_percent numeric(8, 2),
          consumption_delta numeric(12, 3),
          consumption_delta_percent numeric(8, 2),
          unit_cost_delta numeric(12, 5),
          unit_cost_delta_percent numeric(8, 2),
          fixed_cost_delta numeric(12, 2),
          fixed_cost_delta_percent numeric(8, 2),
          taxes_delta numeric(12, 2),
          taxes_delta_percent numeric(8, 2),
          created_at timestamptz not null default now()
        );
      `;

      await transaction`
        alter table invoice_comparisons add column if not exists fixed_cost_delta numeric(12, 2);
      `;

      await transaction`
        alter table invoice_comparisons add column if not exists fixed_cost_delta_percent numeric(8, 2);
      `;

      await transaction`
        alter table invoice_comparisons add column if not exists taxes_delta numeric(12, 2);
      `;

      await transaction`
        alter table invoice_comparisons add column if not exists taxes_delta_percent numeric(8, 2);
      `;
    } finally {
      await transaction`select pg_advisory_unlock(48291017)`;
    }
  });
}
