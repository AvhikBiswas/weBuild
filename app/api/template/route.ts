import { NextRequest, NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { formatLLMJsonResponse } from "@/lib/formatLLMJsonResponse";

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY!;

const model = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-flash",
  apiKey: GOOGLE_API_KEY,
  temperature: 0,
  maxOutputTokens: 100,
});

export async function POST(req: NextRequest) {
  try {
    const { template } = await req.json();

    if (!template) {
      return NextResponse.json({ error: "Template is required" }, { status: 400 });
    }

    const systemPrompt = `You are a web development expert. Your task is to determine whether the user wants to build a web app that can be built using Next.js. You must output a JSON object with two keys: appType and title.

Rules:
- If the user mentions building a web app with React, Next.js, Angular, Vue, or Svelte — appType should be "next js".
- If the user talks about mobile apps, Flutter, or anything unrelated to web development — respond with appType as "error".
- Try to extract a concise title from the user's message. For example, "Build a to-do app" becomes "To-Do App".
- Respond strictly in this JSON format: { "appType": "next js" | "error", "title": "Extracted Title Here" }

Input: ${template}`;

    const result = await model.invoke(systemPrompt);
    const data = formatLLMJsonResponse(result.content);
    return NextResponse.json({ result: data }, { status: 200 });
  } catch (error: unknown) {
    console.error("LLM Error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
