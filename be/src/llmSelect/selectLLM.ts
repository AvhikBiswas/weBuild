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

export function createLLMModel({
    provider,
    temperature = 0,
    stream = false,
}: LLMOptions) {
    switch (provider) {
        case LLMProvider.MISTRAL:
            return new ChatMistralAI({
                model: "mistral-large-latest",
                temperature,
                streaming: stream,
            });

        case LLMProvider.GOOGLE:
            return new ChatGoogleGenerativeAI({
                model: "gemini-2.0-flash",
                temperature,
                streaming: stream,
            });

        case LLMProvider.ANTHROPIC:
            return new ChatAnthropic({
                model: "claude-3-5-sonnet-20240620",
                temperature,
                streaming: stream,
            });

        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }
}


// Example how to use this 
/* const model = createLLMModel({
  provider: LLMProvider.ANTHROPIC,
  temperature: 0.2,
  stream: true,
});

 const res = await model.invoke("Explain generative AI in simple terms");
 console.log(res.content);
 */
