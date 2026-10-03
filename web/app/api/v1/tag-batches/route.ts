import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { batchQuantity, wasteCategoryCode, issuingOrgId } = body;

    if (!batchQuantity || batchQuantity <= 0) {
      return NextResponse.json({ error: "Invalid batch quantity" }, { status: 400 });
    }

    const batchNumber = `BATCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const { data: categoryData, error: catError } = await supabase
      .from("waste_categories")
      .select("id")
      .eq("code", wasteCategoryCode || "SANITARY")
      .single();

    if (catError || !categoryData) {
      return NextResponse.json({ error: "Invalid waste category" }, { status: 400 });
    }

    // 1. Create tag batch row
    const { data: batchData, error: batchError } = await supabase
      .from("tag_batches")
      .insert({
        batch_number: batchNumber,
        waste_category_id: categoryData.id,
        total_quantity: batchQuantity,
        received_quantity: batchQuantity,
      })
      .select()
      .single();

    if (batchError || !batchData) {
      return NextResponse.json({ error: batchError?.message || "Failed to create batch" }, { status: 500 });
    }

    // 2. Generate canonical tag codes and insert tags
    const tagsToInsert = Array.from({ length: Math.min(batchQuantity, 500) }, (_, i) => {
      const canonicalCode = `NMT-2026-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${(i + 1).toString().padStart(6, "0")}`;
      const qrToken = `TOK_${Math.random().toString(36).substring(2, 15).toUpperCase()}_${Date.now()}`;
      return {
        canonical_code: canonicalCode,
        qr_token: qrToken,
        batch_id: batchData.id,
        waste_category_id: categoryData.id,
        status: "IN_INVENTORY",
      };
    });

    const { error: tagInsertError } = await supabase.from("tags").insert(tagsToInsert);

    if (tagInsertError) {
      return NextResponse.json({ error: tagInsertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      batch: batchData,
      sampleTagsGeneratedCount: tagsToInsert.length
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
