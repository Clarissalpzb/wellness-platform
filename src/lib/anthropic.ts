import Anthropic from "@anthropic-ai/sdk";

let _anthropic: Anthropic | null = null;

function getAnthropic(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return _anthropic;
}

export async function generateInsightSummary(context: string, query: string): Promise<string> {
  const client = getAnthropic();
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are an AI assistant for a wellness center management platform.
You have access to the following business data context:

${context}

User query: ${query}

Provide a helpful, concise response with actionable insights.
Use specific numbers and percentages when available.
Respond in Spanish.`,
      },
    ],
  });

  const block = message.content[0];
  return block.type === "text" ? block.text : "";
}
