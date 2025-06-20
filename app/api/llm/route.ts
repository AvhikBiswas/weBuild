import { NextRequest, NextResponse } from "next/server";
import { invokeLLM } from "@/lib/llm"; 

// POST API Handler
export async function POST(req: NextRequest) {
  try {
    const { provider, prompt, temperature, stream } = await req.json();

    const result = await invokeLLM({
      provider,
      prompt,
      temperature,
      stream,
    });

    return NextResponse.json({ result });
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
