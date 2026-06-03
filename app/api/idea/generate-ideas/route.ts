import { getInsforgeServerClient } from "@/lib/insforge-server";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
// 1. OpenAI ka package import kiya
import OpenAI from 'openai';

// 2. OpenRouter client ko initialize kiya (Yahan aapka OPENROUTER_API_KEY env se load hoga)
const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(request: NextRequest) {
    try {
        const { has, userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const canUseAI = has({ plan: "pro" }) || has({ plan: "premium" })
        if (!canUseAI) {
            return NextResponse.json({ error: "AI Idea generation requires Pro or Premium plan" }, { status: 403 });
        }

        const { businessType, targetAudience } = await request.json()
        if (!businessType || !targetAudience) {
            return NextResponse.json({ error: "Missing businessType or targetAudience" }, { status: 400 });
        }

        // 3. Purane Gemini block ko OpenRouter OpenAI syntax se replace kar diya
        const completion = await openrouter.chat.completions.create({
            // OpenRouter par standard fast models (jaise gpt-4o-mini ya jo aap chala rahe hon)
            model: 'openai/gpt-4o-mini', 
            response_format: { type: "json_object" }, // Strict JSON mode toggle handles parsing crashes
            messages: [
                {
                    role: "system",
                    content: `You are a social media content ideation assistant. 
Return only valid JSON.
The response must be an object with an "ideas" array.
Each item must have: "title" and "description".
Generate 3 ideas.
Keep titles catchy.
Keep descriptions practical and specific.
Do not use markdown formatting like **, *, #, or backticks.
Return plain text only inside the JSON strings.`,
                },
                {
                    role: "user",
                    content: `Business type: ${businessType}. Target audience: ${targetAudience}.`
                }
            ]
        });

        // 4. Content extracted successfully
        const text = completion.choices[0]?.message?.content ?? "";

        const parsed = JSON.parse(text) as { ideas?: { title: string, description: string }[] }
        const ideas = Array.isArray(parsed.ideas) ? parsed.ideas.slice(0, 3) : []

        return NextResponse.json({ ideas })

    } catch (error) {
        console.error("Error generating ideas via OpenRouter:", error)
        return NextResponse.json({ error: "Failed to generate ideas" }, { status: 500 })
    }
}