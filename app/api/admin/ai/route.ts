import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/admin";
import { dashboardAnalytics } from "@/lib/dashboard/analytics";

export async function POST(request: Request) {
  await requireSuperAdmin();
  const { question } = await request.json().catch(() => ({ question: "" }));
  if (typeof question !== "string" || !question.trim()) return NextResponse.json({ error: "Please enter a question." }, { status: 400 });
  if (question.length > 800) return NextResponse.json({ error: "Please keep questions under 800 characters." }, { status: 400 });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI is not configured yet. Add OPENAI_API_KEY to the server environment, then redeploy." }, { status: 503 });

  const analytics = await dashboardAnalytics();
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-5-mini", input: [
      { role: "system", content: "You are Body & Soul Fitness Center's operations assistant. Answer only from the supplied aggregate dashboard data. Do not invent facts, names, or member-level details. Be concise, practical, and mention when the data cannot answer a question." },
      { role: "user", content: `Dashboard data: ${JSON.stringify(analytics)}\n\nQuestion: ${question.trim()}` },
    ] }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) return NextResponse.json({ error: "The AI provider could not complete that request. Check the server key, model name, and provider billing." }, { status: 502 });
  const payload = await response.json() as { output_text?: string };
  return NextResponse.json({ answer: payload.output_text?.trim() || "I could not generate an answer from the current dashboard data." });
}
