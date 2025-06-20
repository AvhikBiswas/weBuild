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

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY!;

// Factory function
function createLLMModel({ provider, temperature = 0, stream = false }: LLMOptions) {
  switch (provider) {
    case LLMProvider.MISTRAL:
      return new ChatMistralAI({
        model: "mistral-large-latest",
        temperature,
        streaming: stream,
        apiKey: MISTRAL_API_KEY,
      });

    case LLMProvider.GOOGLE:
      return new ChatGoogleGenerativeAI({
        model: "gemini-2.0-flash",
        temperature,
        streaming: stream,
        apiKey: GOOGLE_API_KEY,
      });

    case LLMProvider.ANTHROPIC:
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

// Reusable invocation function
export async function invokeLLM({
  provider,
  prompt,
  temperature,
  stream,
}: {
  provider: LLMProvider;
  prompt: string;
  temperature?: number;
  stream?: boolean;
}) {
  const llm = createLLMModel({ provider, temperature, stream });
  const response = await llm.invoke(prompt);
  return response;
}
