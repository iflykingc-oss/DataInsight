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

    // Process promotions: check if promotion is currently active
    const now = new Date();
    const processedPlans = (plans || []).map((plan: Record<string, unknown>) => {
      const p = { ...plan };
      if (p.promotion_type && p.promotion_start_at && p.promotion_end_at) {
        const start = new Date(p.promotion_start_at as string);
        const end = new Date(p.promotion_end_at as string);
        if (now < start || now > end) {
          // Promotion expired or not started, clear it from display
          p._promotion_active = false;
        } else {
          p._promotion_active = true;
        }
      } else {
        p._promotion_active = false;
      }
      return p;
    });

    return NextResponse.json({ success: true, plans: processedPlans });
  } catch (error) {
    console.error('Pricing get error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/pricing - Admin update pricing plans (including promotion fields)
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
    const allowedFields = [
      'name', 'name_en', 'description', 'description_en',
      'price_monthly', 'price_yearly', 'currency', 'features',
      'highlight_features', 'is_popular', 'sort_order', 'status',
      'promotion_type', 'promotion_label', 'promotion_label_en',
      'promotion_price_monthly', 'promotion_price_yearly',
      'promotion_start_at', 'promotion_end_at',
    ];
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
    const {
      planKey, name, nameEn, description, descriptionEn,
      priceMonthly, priceYearly, currency, features,
      highlightFeatures, isPopular, sortOrder,
      promotionType, promotionLabel, promotionLabelEn,
      promotionPriceMonthly, promotionPriceYearly,
      promotionStartAt, promotionEndAt,
    } = body;

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
      currency: currency || 'USD',
      features: features || {},
      highlight_features: highlightFeatures || [],
      is_popular: isPopular || false,
      sort_order: sortOrder || 0,
      promotion_type: promotionType || null,
      promotion_label: promotionLabel || null,
      promotion_label_en: promotionLabelEn || null,
      promotion_price_monthly: promotionPriceMonthly || null,
      promotion_price_yearly: promotionPriceYearly || null,
      promotion_start_at: promotionStartAt || null,
      promotion_end_at: promotionEndAt || null,
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

// DELETE /api/pricing - Delete a pricing plan (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error || authResult.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const planKey = searchParams.get('planKey');

    if (!planKey) {
      return NextResponse.json({ error: 'planKey is required' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('pricing_plans')
      .delete()
      .eq('plan_key', planKey);

    if (error) {
      console.error('Pricing delete error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Pricing delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
