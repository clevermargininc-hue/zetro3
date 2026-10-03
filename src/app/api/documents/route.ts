import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/supabase/request-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractDocumentText, MAX_DOCUMENT_BYTES } from "@/lib/extract-document";
import {
  loadQaDocuments,
  summarizeDocuments,
} from "@/lib/qa-documents";
import { indexQaDocument } from "@/lib/qa-retrieve";
import { ALL_DOCUMENT_KINDS, QA_KINDS, type QaKind } from "@/lib/qa-kinds";

export const runtime = "nodejs";
export const maxDuration = 120;

function emptyReadiness(setupRequired: boolean) {
  return {
    ready: false,
    missing: [...QA_KINDS],
    counts: { document: 0, scorecard: 0, compliance: 0, opening: 0, closing: 0, holding: 0 },
    documents: [],
    setupRequired,
  };
}

export async function GET(request: Request) {
  const { user } = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const documents = await loadQaDocuments(user.id);
    return NextResponse.json(summarizeDocuments(documents));
  } catch (error) {
    const setupRequired = Boolean(
      error && typeof error === "object" && "setupRequired" in error,
    );
    if (setupRequired) {
      return NextResponse.json(emptyReadiness(true));
    }
    const message = error instanceof Error ? error.message : "Could not load standards";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { user } = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") || "") as QaKind;
  const title = String(form.get("title") || "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  }
  if (!(ALL_DOCUMENT_KINDS as readonly string[]).includes(kind)) {
    return NextResponse.json(
      { error: "Choose document, scorecard, compliance, opening, closing, or holding." },
      { status: 400 },
    );
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return NextResponse.json({ error: "File must be 12 MB or smaller." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  let extractedText: string;
  try {
    extractedText = await extractDocumentText(bytes, file.name, file.type);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not read this file." },
      { status: 400 },
    );
  }

  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;
  const supabase = createAdminClient();
  const { error: uploadError } = await supabase.storage
    .from("qa-documents")
    .upload(path, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    const missingBucket =
      uploadError.message.toLowerCase().includes("bucket") ||
      uploadError.message.toLowerCase().includes("not found");
    return NextResponse.json(
      {
        error: missingBucket
          ? "Run supabase/qa-standards.sql in the Supabase SQL Editor, then try again."
          : uploadError.message,
      },
      { status: 500 },
    );
  }

  const { data: row, error: insertError } = await supabase
    .from("qa_documents")
    .insert({
      user_id: user.id,
      kind,
      title: title || file.name.replace(/\.[^.]+$/, ""),
      file_name: file.name,
      file_path: path,
      mime_type: file.type || null,
      extracted_text: extractedText,
    })
    .select("*")
    .single();

  if (insertError) {
    await supabase.storage.from("qa-documents").remove([path]);
    const setup =
      insertError.message.toLowerCase().includes("qa_documents") ||
      insertError.code === "PGRST205" ||
      insertError.code === "42P01";
    const kindConstraint =
      insertError.message.toLowerCase().includes("kind") ||
      insertError.message.toLowerCase().includes("check");
    return NextResponse.json(
      {
        error: setup
          ? "Run supabase/qa-standards.sql in the Supabase SQL Editor, then try again."
          : kindConstraint && (kind === "opening" || kind === "closing" || kind === "holding")
            ? "Run supabase/holding-procedure.sql (or supabase/call-scripts.sql) in the Supabase SQL Editor, then upload again."
            : insertError.message,
      },
      { status: 500 },
    );
  }

  try {
    await indexQaDocument(row);
  } catch (error) {
    await supabase.from("qa_documents").delete().eq("id", row.id);
    await supabase.storage.from("qa-documents").remove([path]);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `File was read, but embedding failed: ${error.message}`
            : "Could not embed this file.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ document: row });
}
