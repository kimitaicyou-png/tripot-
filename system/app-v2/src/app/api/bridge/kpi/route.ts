import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TRIPOT_CONFIG } from '../../../../../coaris.config';
import { buildKpiForCompany } from '@/lib/bridge/translator';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${process.env.BRIDGE_SERVICE_TOKEN}`;
  if (!process.env.BRIDGE_SERVICE_TOKEN || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const period = url.searchParams.get('period') ?? new Date().toISOString().slice(0, 7);

  const company = await db.query.companies.findFirst({
    where: (c, { eq }) => eq(c.id_slug, TRIPOT_CONFIG.id),
  });

  if (!company) {
    return NextResponse.json({ error: 'Company not registered in DB' }, { status: 500 });
  }

  const kpi = await buildKpiForCompany({
    companySlug: TRIPOT_CONFIG.id,
    companyId: company.id,
    period,
  });

  if (!kpi) {
    return NextResponse.json(
      { error: 'Invalid period (expected YYYY-MM)' },
      { status: 400 }
    );
  }

  return NextResponse.json(kpi);
}
