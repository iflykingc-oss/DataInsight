import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyAuth } from '@/lib/auth-middleware';

// Default pricing plans when database is unavailable
const DEFAULT_PRICING_PLANS = [
  {
    id: 1,
    plan_key: 'free',
    name: '免费版',
    name_en: 'Free',
    description: '适合个人体验',
    description_en: 'For personal exploration',
    price_monthly: 0,
    price_yearly: 0,
    currency: 'USD',
    features: ['ai_call:20', 'export:10', 'dashboard:1', 'table:3'],
    highlight_features: ['basic_analysis', 'basic_export'],
    is_popular: false,
    sort_order: 1,
    status: 'active',
  },
  {
    id: 2,
    plan_key: 'pro',
    name: '专业版',
    name_en: 'Pro',
    description: '适合数据分析师',
    description_en: 'For data analysts',
    price_monthly: 990,
    price_yearly: 9490,
    currency: 'USD',
    features: [
      'ai_call:500', 'export:100', 'dashboard:10', 'table:50',
      'ai_field:200', 'ai_formula:100', 'data_story:10',
      'nl2dashboard:10', 'custom_metric:20', 'data_cleaning:50', 'sql_lab:1',
    ],
    highlight_features: [
      'unlimited_tables', 'sql_lab', 'ai_field', 'ai_formula',
      'echarts_10', 'ai_formula', 'nl2dashboard',
    ],
    is_popular: true,
    sort_order: 2,
    status: 'active',
  },
  {
    id: 3,
    plan_key: 'business',
    name: '商业版',
    name_en: 'Business',
    description: '适合企业团队',
    description_en: 'For enterprise teams',
    price_monthly: 2990,
    price_yearly: 29900,
    currency: 'USD',
    features: [
      'ai_call:-1', 'export:-1', 'dashboard:-1', 'table:-1',
      'ai_field:-1', 'ai_formula:-1', 'data_story:-1',
      'nl2dashboard:-1', 'custom_metric:-1', 'data_cleaning:-1', 'sql_lab:-1',
    ],
    highlight_features: [
      'unlimited_ai', 'deep_analysis', 'priority_support',
      'metric_semantic', 'data_story', 'industry_all',
    ],
    is_popular: false,
    sort_order: 3,
    status: 'active',
  },
];

// GET /api/pricing - Get all pricing plans (public)
export async function GET() {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      // Fallback: return default pricing plans when database is not configured
      return NextResponse.json({ success: true, plans: DEFAULT_PRICING_PLANS });
    }
    const { data: plans, error } = await supabase
      .from('pricing_plans')
      .select('*')
      .eq('status', 'active')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Pricing plans query error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // If database returns empty (table not seeded), fallback to defaults
    if (!plans || plans.length === 0) {
      return NextResponse.json({ success: true, plans: DEFAULT_PRICING_PLANS });
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
    if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

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
    if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
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
    if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
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
