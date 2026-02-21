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

// ─── GET /api/charts/:id — Get a single chart ───────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Valid authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const supabase = await createSupabaseServer();
    const { data, error } = await supabase
      .from("charts")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Not found", message: "Chart not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "Internal error", message: String(err) },
      { status: 500 }
    );
  }
}

// ─── PUT /api/charts/:id — Update a chart ───────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Valid authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Map incoming fields to database columns
    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.measure !== undefined) updateData.measure = body.measure;
    if (body.splitIndices !== undefined) updateData.split_indices = body.splitIndices;
    if (body.annotations !== undefined) updateData.annotations = body.annotations;
    if (body.targetLines !== undefined) updateData.target_lines = body.targetLines;
    if (body.method !== undefined) updateData.method = body.method;
    if (body.splitModes !== undefined) updateData.split_modes = body.splitModes;
    if (body.frozenLimits !== undefined) updateData.frozen_limits = body.frozenLimits;
    if (body.omittedIndices !== undefined) updateData.omitted_indices = body.omittedIndices;
    if (body.showTrendLine !== undefined) updateData.show_trend_line = body.showTrendLine;
    if (body.chartType !== undefined) updateData.chart_type = body.chartType;
    if (body.xAxisLabel !== undefined) updateData.x_axis_label = body.xAxisLabel;
    if (body.yAxisLabel !== undefined) updateData.y_axis_label = body.yAxisLabel;
    if (body.customColors !== undefined) updateData.custom_colors = body.customColors;
    if (body.lsl !== undefined) updateData.lsl = body.lsl;
    if (body.usl !== undefined) updateData.usl = body.usl;
    updateData.updated_at = new Date().toISOString();

    if (Object.keys(updateData).length <= 1) {
      return NextResponse.json(
        { error: "Bad request", message: "No fields to update" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServer();
    const { data, error } = await supabase
      .from("charts")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Not found", message: "Chart not found or update failed" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "Internal error", message: String(err) },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/charts/:id — Delete a chart ─────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Valid authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const supabase = await createSupabaseServer();
    const { error } = await supabase
      .from("charts")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        { error: "Database error", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal error", message: String(err) },
      { status: 500 }
    );
  }
}
