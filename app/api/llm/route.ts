import { NextRequest, NextResponse } from "next/server";
import { invokeLLM, LLMProvider } from "@/lib/llm";
import { weBuildDefaultPrompt } from "@/prompts";

// POST API Handler
export async function POST(req: NextRequest) {
    try {
        const { message, provider = LLMProvider.GOOGLE } = await req.json();

        const systemPrompt = {
            role: "system",
            content: weBuildDefaultPrompt,
        };

        const userPrompt = {
            role: "user",
            content: message,
        };

        // We describe the expected JSON format manually as a plain string for LLM understanding
        const expectedFormat = {
            role: "system",
            content: `Please respond strictly in the following JSON format Example:
            {
  {
  "artifacts": {
    "app/components/Header.tsx": "<weBuild action=\"create\" fileName=\"app/components/Header.tsx\">\nimport React from 'react';\nexport default function Header() {\n  return <header>My App</header>;\n}\n</weBuild>",
    "app/layout.tsx": "<weBuild action=\"create\" fileName=\"app/layout.tsx\">\nimport React from 'react';\nexport default function Layout() {\n  return (\n    <html>\n      <head>\n        <title>My App</title>\n      </head>\n      <body>\n        <Header />\n      </body>\n    </html>\n  );\n}\n</weBuild>"
  },
  "headingMessage": "Todo application created",
  "description": "Created basic todo application with header and layout",
  "error": null
}`}

        const finalPrompt = `
${systemPrompt.role}: ${systemPrompt.content}
${userPrompt.role}: ${userPrompt.content}
${expectedFormat.role}: ${expectedFormat.content}
    `;

        const result = await invokeLLM({
            provider,
            prompt: finalPrompt.trim(),
            temperature: 0.2,
            stream: false,
        });

        const resultContent = result.content;
        console.log("result.content", result.content);

        if (typeof resultContent === "string") {
            const cleanedJson = resultContent
                .trim()
                .replace(/^```json\s*/, "") 
                .replace(/```$/, "");       

            const parsed = JSON.parse(cleanedJson);

            return NextResponse.json(parsed);
        }

        return NextResponse.json({ error: "Unexpected LLM response format" }, { status: 500 });
    } catch (error: unknown) {
        console.error(error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
