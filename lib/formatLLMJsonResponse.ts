export function formatLLMJsonResponse(content: unknown): unknown {
    if (typeof content !== "string") {
        throw new Error("Expected content to be a string");
    }
    // Clean the content by removing the code block markers and newlines
  const cleaned = content
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/, "")
    .replace(/\\n/g, "")
    .replace(/\n/g, "");

  return JSON.parse(cleaned);
}
