import { getInsforgeServerClient } from "@/lib/insforge-server";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { has, userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role/Plan verification via Clerk helper safely
    const canUseAI = has({ plan: "pro" }) || has({ plan: "premium" });
    if (!canUseAI) {
      return NextResponse.json({ error: "AI Idea generation requires Pro or Premium plan" }, { status: 403 });
    }

    const { businessType, targetAudience } = await request.json();
    if (!businessType || !targetAudience) {
      return NextResponse.json({ error: "Missing businessType or targetAudience" }, { status: 400 });
    }

    const { insforge } = await getInsforgeServerClient();
    
    const result = await insforge.ai.chat.completions.create({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        {
          role: "system",
          content: `You are a social media content ideation assistant. 
Return only valid JSON.
The response must be a single root object with an "ideas" array.
Each item in the array must be an object with exactly two keys: "title" and "description".
Generate exactly 3 ideas.
Keep titles catchy.
Keep descriptions practical and specific.
Do not use markdown formatting like **, *, #, or backticks inside text fields.
Return raw plain text inside the JSON strings.`,
        },
        {
          role: "user",
          content: `Business type: ${businessType}. Target audience: ${targetAudience}.`
        }
      ]
    });

    let text = result.choices[0]?.message?.content ?? "";

    // CRITICAL: Robust cleaning to strip any unwanted AI markdown backticks (```json ... ```)
    if (text.includes("```")) {
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    }

    // Safe parsing to prevent application layout crash on dynamic text node fields
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (parseError) {
      console.error("AI returned malformed JSON text snippet:", text);
      return NextResponse.json({ error: "AI response parsing failed. Please try again." }, { status: 502 });
    }

    const ideas = Array.isArray(parsed?.ideas) ? parsed.ideas.slice(0, 3) : [];

    return NextResponse.json({ ideas });

  } catch (error) {
    console.error("Error generating ideas runtime validation:", error);
    return NextResponse.json({ error: "Failed to generate ideas" }, { status: 500 });
  }
}