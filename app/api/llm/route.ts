import { NextRequest, NextResponse } from "next/server";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatMistralAI } from "@langchain/mistralai";

export enum LLMProvider {
  MISTRAL = "mistral",
  GOOGLE = "google",
  ANTHROPIC = "anthropic",
}

interface LLMOptions {
  provider: LLMProvider;
  temperature?: number;
  stream?: boolean;
}

// Load API keys from environment
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

function createLLMModel({ provider, temperature = 0, stream = false }: LLMOptions) {
  switch (provider) {
    case LLMProvider.MISTRAL:
      if (!MISTRAL_API_KEY) throw new Error("Missing MISTRAL_API_KEY");
      return new ChatMistralAI({
        model: "mistral-large-latest",
        temperature,
        streaming: stream,
        apiKey: MISTRAL_API_KEY,
      });

    case LLMProvider.GOOGLE:
      if (!GOOGLE_API_KEY) throw new Error("Missing GOOGLE_API_KEY");
      return new ChatGoogleGenerativeAI({
        model: "gemini-2.0-flash",
        temperature,
        streaming: stream,
        apiKey: GOOGLE_API_KEY,
      });

    case LLMProvider.ANTHROPIC:
      if (!ANTHROPIC_API_KEY) throw new Error("Missing ANTHROPIC_API_KEY");
      return new ChatAnthropic({
        model: "claude-3-5-sonnet-20240620",
        temperature,
        streaming: stream,
        apiKey: ANTHROPIC_API_KEY,
      });

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

// POST endpoint for generating response
export async function POST(req: NextRequest) {
  try {
    const { provider, prompt, temperature, stream } = await req.json();

    const llm = createLLMModel({
      provider,
      temperature,
      stream,
    });

    const res = await llm.invoke(prompt);

    return NextResponse.json({ result: res });
  } catch (error: unknown) {
    console.error(error);
    let errorMessage = "Something went wrong";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/*
 Example usage of the LLM API
*
 const response = await fetch("/api/llm", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    provider: "google", // "mistral" | "anthropic"
    prompt: "What is the capital of France?",
    temperature: 0.7,
    stream: false,
  }),
});

const data = await response.json();
console.log(data.result);
 
*/


