import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyAuth } from '@/lib/auth-middleware';

// GET /api/pricing - Get all pricing plans (public)
export async function GET() {
  try {
    const supabase = getSupabaseClient();
    const { data: plans, error } = await supabase
      .from('pricing_plans')
      .select('*')
      .eq('status', 'active')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Pricing plans query error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ success: true, plans: plans || [] });
  } catch (error) {
    console.error('Pricing get error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/pricing - Admin update pricing plans
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error || authResult.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { planKey, updates } = body;

    if (!planKey || !updates) {
      return NextResponse.json({ error: 'planKey and updates are required' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Build update object
    const updateFields: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const allowedFields = ['name', 'name_en', 'description', 'description_en', 'price_monthly', 'price_yearly', 'currency', 'features', 'is_popular', 'sort_order', 'status'];
    for (const field of allowedFields) {
      if (updates[field] !== undefined) updateFields[field] = updates[field];
    }

    const { error } = await supabase
      .from('pricing_plans')
      .update(updateFields)
      .eq('plan_key', planKey);

    if (error) {
      console.error('Pricing update error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Log admin action
    await supabase.from('audit_logs').insert({
      user_id: authResult.user!.id,
      action: 'admin.pricing_update',
      resource_type: 'pricing',
      resource_id: planKey,
      details: { updates: updateFields },
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Pricing update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/pricing - Create new pricing plan (admin only)
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error || authResult.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { planKey, name, nameEn, description, descriptionEn, priceMonthly, priceYearly, currency, features, isPopular, sortOrder } = body;

    if (!planKey || !name) {
      return NextResponse.json({ error: 'planKey and name are required' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase.from('pricing_plans').insert({
      plan_key: planKey,
      name,
      name_en: nameEn,
      description,
      description_en: descriptionEn,
      price_monthly: priceMonthly || 0,
      price_yearly: priceYearly || 0,
      currency: currency || 'CNY',
      features: features || {},
      is_popular: isPopular || false,
      sort_order: sortOrder || 0,
    });

    if (error) {
      console.error('Pricing create error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Pricing create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
