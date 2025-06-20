import { NextRequest, NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY!;

const model = new ChatGoogleGenerativeAI({
    model: "gemini-1.5-flash", // Gemini small/fast model
    apiKey: GOOGLE_API_KEY,
    temperature: 0,
    maxOutputTokens: 10,
});

export async function POST(req: NextRequest) {
    try {
        const { template } = await req.json();

        if (!template) {
            return NextResponse.json({ error: "Template is required" }, { status: 400 });
        }

        const systemPrompt = `
You are a web development expert. Your task is to determine whether the user wants to build a web app that can be built using Next.js. You can only respond with one of two outputs: **"next js"** or **"error"**.

Rules:
- If the user mentions building a web app with React, Next.js, Angular, Vue, or Svelte — respond with "next js".
- If the user talks about mobile apps, Flutter, or anything unrelated to web development — respond with "error".
- Only reply with "next js" or "error". No other words or explanation.

Examples:
User: I want to build a web app with next js  
You: next js  
User: I want to build a web app with flutter  
You: error  
User: Build a to-do app  
You: next js  

Input:
${template}
    `.trim();

        const result = await model.invoke(systemPrompt);        
        const data = result.content.toString().toLowerCase().trim();

        return NextResponse.json(
            { result: data }
        );
    } catch (error: unknown) {
        console.error("LLM Error:", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
