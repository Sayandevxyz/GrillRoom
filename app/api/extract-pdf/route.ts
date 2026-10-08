import { NextRequest, NextResponse } from "next/server";
import { extractText } from "unpdf";
import { checkRateLimit, logServerError } from "@/lib/security";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const rateCheck = await checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Check MIME type if present
    if (file.type && file.type !== "application/pdf") {
      return NextResponse.json({ error: "Invalid file type. Only PDF files are supported." }, { status: 400 });
    }

    // Check extension
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Invalid file type. Only .pdf files are supported." }, { status: 400 });
    }

    // Max 10 MB (10 * 1024 * 1024 bytes)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File exceeds maximum size of 10 MB." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const { text, totalPages } = await extractText(new Uint8Array(arrayBuffer));

    const cleanText = Array.isArray(text) ? text.join("\n") : String(text || "");

    return NextResponse.json({
      text: cleanText.slice(0, 15000), // Cap extraction text
      page_count: totalPages || 1,
      char_count: cleanText.length,
      filename: file.name,
    });
  } catch (err: unknown) {
    const errorId = logServerError(err, "PDF Extraction Error");
    return NextResponse.json({ error: "Failed to extract text from PDF document.", errorId }, { status: 500 });
  }
}
