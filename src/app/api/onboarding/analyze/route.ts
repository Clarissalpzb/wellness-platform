import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EXTRACTION_PROMPT = `You are a friendly business consultant AND data analyst specializing in wellness studios (gyms, yoga, pilates, etc). Most studio owners are passionate about fitness but are NOT business experts — so your job is to translate numbers into clear, specific actions they can take TODAY.

Analyze the provided document thoroughly and extract ALL data available.

━━━ PART 1: EXTRACT DATA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Extract every piece of information present:
1. Studio info (name, description, address, phone)
2. Classes offered (name, description, duration, capacity, category, level)
3. Instructors/Staff (name, role, email, bio)
4. Packages/Memberships (name, price, sessions, validity days)
5. Class schedule (class, instructor, day, start time, end time, room)
6. ALL booking & performance data:
   - Per-class: sessions count, total bookings, capacity, occupancy %, cancellations, check-ins, no-shows
   - Overall studio totals
   - Best/worst performing time slots if dates/times are available
   - Day-of-week patterns, time-of-day patterns

━━━ PART 2: DIAGNOSE + PRESCRIBE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
For EACH problem you find, provide a diagnosis AND at least 3 concrete solutions ranked by ease of implementation. Be like a doctor: don't just say "you have a problem", say "here's exactly what to do about it".

RULES FOR RECOMMENDATIONS:
- Use REAL numbers from the data (never say "many" when you can say "37%")
- Be SPECIFIC: name the exact class, time slot, or metric
- Give at least 3 solutions per problem, ranked from easiest to hardest
- Write for someone who is NOT a businessperson — avoid jargon
- Each solution must include a concrete FIRST STEP the owner can take today
- If the document has specific session data (times, dates), name the exact slots to keep/cut/move

PROBLEM TYPES TO DIAGNOSE (check all that apply):
- High cancellation rate (above 30%): explain revenue lost in $, give 3 ways to fix it
- Low occupancy classes: name which ones, give 3 options (cut/move/remarket/combine)
- Underused time slots: identify specific days/times with <40% occupancy
- Classes at max demand: identify which need MORE sessions added
- No-show problem: calculate how many spots wasted, give solutions
- Schedule gaps: times with no classes that could generate revenue
- Pricing/package issues if visible in data

━━━ PART 3: SUGGEST PLATFORM FEATURES ━━━━━━━━━━━━━━━━━━━━━━━━━
Based on the problems found in the data, suggest 4-6 specific features this studio management platform should build to solve these problems. For each, explain the specific problem it solves (with numbers from the data) and what benefit it delivers.

━━━ OUTPUT FORMAT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Return ONLY valid JSON. Use null for missing values, [] for missing arrays:

{
  "studio": { "name": null, "description": null, "address": null, "phone": null },
  "classes": [{ "name": "", "description": null, "duration": null, "capacity": null, "category": null, "level": null }],
  "staff": [{ "name": "", "role": "", "email": null, "bio": null }],
  "packages": [{ "name": "", "price": null, "sessions": null, "validityDays": null, "description": null }],
  "schedule": [{ "className": "", "instructorName": null, "dayOfWeek": "lunes|martes|miércoles|jueves|viernes|sábado|domingo", "startTime": "HH:MM", "endTime": null, "room": null }],
  "bookingStats": [
    {
      "className": "exact class name",
      "sessions": 0,
      "totalBookings": 0,
      "totalCapacity": 0,
      "avgOccupancyPct": 0,
      "totalCancellations": 0,
      "cancellationRatePct": 0,
      "totalCheckIns": 0,
      "showRatePct": 0,
      "fullSessionsPct": 0,
      "lowSessionsPct": 0,
      "spotsPerSession": 0
    }
  ],
  "overallStats": {
    "totalSessions": 0,
    "totalSpots": 0,
    "totalBookings": 0,
    "totalCancellations": 0,
    "totalCheckIns": 0,
    "totalNoShows": 0,
    "overallOccupancyPct": 0,
    "overallCancellationRatePct": 0,
    "overallShowRatePct": 0,
    "unfilledSpots": 0,
    "spotsLostToCancellations": 0
  },
  "insights": {
    "topClasses": ["ranked by demand, best first"],
    "underperformingClasses": ["worst first"],
    "highCancellationClasses": ["classes above 35% cancel rate"],
    "revenueOpportunityNote": "Plain Spanish sentence about total revenue being left on the table with a rough estimate",
    "recommendations": [
      {
        "priority": "alta|media|baja",
        "title": "Short title in Spanish — name the specific class or problem",
        "problem": "1-2 sentences diagnosing the specific problem with REAL numbers from the data",
        "solutions": [
          {
            "option": 1,
            "difficulty": "fácil|moderado|avanzado",
            "action": "Name of this solution in Spanish (short)",
            "description": "2-3 sentences. Specific. Use the actual class names, percentages, numbers from the data. Include an exact first step.",
            "expectedImpact": "What will improve and roughly by how much"
          },
          {
            "option": 2,
            "difficulty": "fácil|moderado|avanzado",
            "action": "Name of this solution",
            "description": "...",
            "expectedImpact": "..."
          },
          {
            "option": 3,
            "difficulty": "fácil|moderado|avanzado",
            "action": "Name of this solution",
            "description": "...",
            "expectedImpact": "..."
          }
        ],
        "impact": "revenue|bookings|retention|operations"
      }
    ],
    "slotsToConsiderCutting": [
      {
        "className": "exact name",
        "reason": "specific reason with numbers",
        "suggestion": "what to do instead"
      }
    ],
    "slotsToConsiderAdding": [
      {
        "className": "exact name",
        "reason": "specific reason with numbers",
        "suggestion": "when/how to add it"
      }
    ],
    "dayPatterns": "null or specific insight about which days perform best/worst with numbers",
    "timePatterns": "null or specific insight about which time slots perform best/worst with numbers"
  },
  "featureSuggestions": [
    {
      "feature": "Feature name in Spanish",
      "problemItSolves": "The specific problem in this studio's data (use their actual numbers)",
      "benefit": "What the studio owner gains — be concrete about impact",
      "priority": "alta|media|baja"
    }
  ],
  "confidence": "high|medium|low",
  "notes": "Key observations about data quality, what was and wasn't available"
}`;

const DAY_MAP: Record<string, string> = {
  lunes: "lunes", martes: "martes", "miércoles": "miércoles", miercoles: "miércoles",
  jueves: "jueves", viernes: "viernes", "sábado": "sábado", sabado: "sábado", domingo: "domingo",
  monday: "lunes", tuesday: "martes", wednesday: "miércoles", thursday: "jueves",
  friday: "viernes", saturday: "sábado", sunday: "domingo",
  mon: "lunes", tue: "martes", wed: "miércoles", thu: "jueves",
  fri: "viernes", sat: "sábado", sun: "domingo",
};

function normalizeDay(day: string): string {
  return DAY_MAP[day?.toLowerCase().trim()] ?? day;
}

function extractJson(text: string): string | null {
  const codeBlock = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (codeBlock) return codeBlock[1];
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd !== -1) return text.slice(jsonStart, jsonEnd + 1);
  return null;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Maximum size is 10 MB." }, { status: 400 });
    }

    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    type MessageContent = Anthropic.Messages.MessageParam["content"];
    let messageContent: MessageContent;

    // PDF — Claude native document support
    if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");
      messageContent = [
        {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: base64 },
        } as unknown as Anthropic.Messages.DocumentBlockParam,
        { type: "text", text: EXTRACTION_PROMPT },
      ];
    }
    // Images — Claude vision
    else if (fileType.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/.test(fileName)) {
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");
      const mediaType = (fileType.startsWith("image/") ? fileType : "image/jpeg") as
        "image/png" | "image/jpeg" | "image/gif" | "image/webp";
      messageContent = [
        { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
        { type: "text", text: EXTRACTION_PROMPT },
      ];
    }
    // Excel — convert all sheets to CSV text
    else if (
      /\.(xlsx|xls)$/.test(fileName) ||
      fileType.includes("spreadsheet") ||
      fileType.includes("excel")
    ) {
      const bytes = await file.arrayBuffer();
      const XLSX = (await import("xlsx")).default;
      const workbook = XLSX.read(bytes, { type: "array" });
      let csvContent = "";
      for (const sheetName of workbook.SheetNames) {
        const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
        csvContent += `\n\n=== Hoja: ${sheetName} ===\n${csv}`;
      }
      messageContent = `${EXTRACTION_PROMPT}\n\nDocument content (Excel → CSV):\n${csvContent}`;
    }
    // Word DOCX — extract raw text
    else if (
      /\.(docx|doc)$/.test(fileName) ||
      fileType.includes("wordprocessingml") ||
      fileType.includes("msword")
    ) {
      const bytes = await file.arrayBuffer();
      const mammoth = await import("mammoth");
      const { value } = await mammoth.extractRawText({ arrayBuffer: bytes });
      messageContent = `${EXTRACTION_PROMPT}\n\nDocument content:\n${value}`;
    }
    // CSV / TXT and any other text file
    else {
      const text = await file.text();
      messageContent = `${EXTRACTION_PROMPT}\n\nDocument content:\n${text}`;
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [{ role: "user", content: messageContent }],
    });

    const responseText =
      response.content[0]?.type === "text" ? response.content[0].text : "";

    const jsonStr = extractJson(responseText);
    if (!jsonStr) {
      return NextResponse.json(
        { error: "Could not parse AI response. Try a different file format." },
        { status: 500 }
      );
    }

    const extracted = JSON.parse(jsonStr);

    // Normalize day names in schedule entries
    if (Array.isArray(extracted.schedule)) {
      extracted.schedule = extracted.schedule.map((s: { dayOfWeek?: string }) => ({
        ...s,
        dayOfWeek: normalizeDay(s.dayOfWeek ?? ""),
      }));
    }

    return NextResponse.json({ data: extracted });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Document analysis error:", msg);

    if (msg.includes("credit balance is too low")) {
      return NextResponse.json(
        { error: "Sin créditos en la cuenta de IA. Agrega créditos en console.anthropic.com → Billing." },
        { status: 402 }
      );
    }
    return NextResponse.json(
      { error: "Error al analizar el documento. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
