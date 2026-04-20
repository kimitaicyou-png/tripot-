import { requireAuth, isAuthError } from '@/lib/apiAuth';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const authResult = await requireAuth(); if (isAuthError(authResult)) return authResult;
  const sql = getDb();
  const rows = await sql`SELECT * FROM customers ORDER BY created_at DESC`;
  const customers = rows.map((r) => ({
    id: r.id,
    companyName: r.company_name,
    companyAddress: r.company_address,
    companyPhone: r.company_phone,
    companyWebsite: r.company_website,
    fax: r.fax,
    contactName: r.contact_name,
    contactEmail: r.contact_email,
    contactPhone: r.contact_phone,
    department: r.department,
    position: r.position,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
  return NextResponse.json({ customers });
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(); if (isAuthError(authResult)) return authResult;
  const body = await req.json();
  const sql = getDb();
  const id = body.id || `cm_${Date.now()}`;

  const existing = await sql`SELECT id FROM customers WHERE id = ${id}`;
  if (existing.length > 0) return NextResponse.json({ id, skipped: true });

  await sql`
    INSERT INTO customers (id, company_name, company_address, company_phone, company_website, fax, contact_name, contact_email, contact_phone, department, position)
    VALUES (
      ${id},
      ${body.companyName ?? ''},
      ${body.companyAddress ?? ''},
      ${body.companyPhone ?? ''},
      ${body.companyWebsite ?? ''},
      ${body.fax ?? ''},
      ${body.contactName ?? ''},
      ${body.contactEmail ?? ''},
      ${body.contactPhone ?? ''},
      ${body.department ?? ''},
      ${body.position ?? ''}
    )
  `;
  return NextResponse.json({ id });
}
