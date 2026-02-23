import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// ─── Supabase server client ─────────────────────────────────────────────────

async function createSupabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Cookies can only be set in Server Actions or Route Handlers
          }
        },
      },
    }
  );
}

async function getAuthUser() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

// ─── GET /api/charts — List all charts ───────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Valid authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = request.nextUrl;
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);
    const offset = parseInt(searchParams.get("offset") ?? "0");

    const supabase = await createSupabaseServer();
    const { data, error, count } = await supabase
      .from("charts")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("saved_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json(
        { error: "Database error", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      charts: data ?? [],
      total: count ?? 0,
      limit,
      offset,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal error", message: String(err) },
      { status: 500 }
    );
  }
}

// ─── POST /api/charts — Create a chart ───────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Valid authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.title || !body.measure) {
      return NextResponse.json(
        { error: "Bad request", message: "title and measure are required" },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    const savedAt = Date.now();

    const row = {
      id,
      user_id: user.id,
      title: body.title,
      saved_at: savedAt,
      measure: body.measure,
      split_indices: body.splitIndices ?? [],
      annotations: body.annotations ?? [],
      target_lines: body.targetLines ?? [],
      method: body.method ?? "mean",
      split_modes: body.splitModes ?? {},
      frozen_limits: body.frozenLimits ?? false,
      omitted_indices: body.omittedIndices ?? [],
      show_trend_line: body.showTrendLine ?? false,
      chart_type: body.chartType ?? "xmr",
      x_axis_label: body.xAxisLabel ?? null,
      y_axis_label: body.yAxisLabel ?? null,
      // custom_colors: body.customColors ?? null, // column not yet in Supabase
      lsl: body.lsl ?? null,
      usl: body.usl ?? null,
    };

    const supabase = await createSupabaseServer();
    const { data, error } = await supabase
      .from("charts")
      .insert(row)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Database error", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal error", message: String(err) },
      { status: 500 }
    );
  }
}
