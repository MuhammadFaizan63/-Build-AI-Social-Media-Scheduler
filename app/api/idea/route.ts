import { getInsforgeServerClient } from "@/lib/insforge-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const { insforge, userId } = await getInsforgeServerClient();
        if (!insforge || !userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const [ideasRes, groupsRes] = await Promise.all([
            insforge.database
                .from("ideas")
                .select("*")
                .eq("user_id", userId)
                .order("sort_order", { ascending: true })
                .order("created_at", { ascending: false }),
            insforge.database
                .from("idea_groups")
                .select("*")
                .order("created_at", { ascending: false })
        ]);

        if (ideasRes.error || groupsRes.error) {
            console.error("Database error in GET /api/idea:", ideasRes.error, groupsRes.error);
            return NextResponse.json({ error: "Failed to fetch ideas or groups" }, { status: 500 });
        }

        const ideas = ideasRes.data ?? [];
        const groupsRaw = groupsRes.data ?? [];

        const groups = groupsRaw.map((group) => ({
            id: group.id,
            title: group.name,
            ideas: ideas
                .filter((idea) => idea.group_id === group.id)
                .map((idea) => ({
                    id: idea.id,
                    title: idea.title,
                    description: idea.description,
                    images: idea.images ?? [],
                    columnId: idea.group_id,
                    sortOrder: idea.sort_order,
                })),
        }));

        return NextResponse.json({ groups });

    } catch (error) {
        console.error("Fatal exception caught on GET /api/idea pipeline:", error);
        return NextResponse.json({ error: "Failed to fetch ideas or groups" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        let insforgeInstance = null;
        let authUser = null;
        
        try {
            const clientData = await getInsforgeServerClient();
            insforgeInstance = clientData.insforge;
            authUser = clientData.userId;
        } catch (e) {
            console.warn("⚠️ Failed to initialize InsForge client for POST /api/idea", e);
            authUser = null;
        }

        if (!authUser) {
            return NextResponse.json({ error: "User not found" }, { status: 401 });
        }

        const {
            id,
            title,
            groupId,
            description,
            images,
            sortOrder
        } = await request.json();

        if (!title || !groupId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const payload = {
            user_id: authUser,
            group_id: groupId,
            title: title,
            description,
            images: images,
            sort_order: typeof sortOrder === 'number' ? sortOrder : 0
        };

        if (!insforgeInstance || !authUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let data, error;

        if (id) {
            const result = await insforgeInstance.database
                .from("ideas")
                .update(payload)
                .eq("id", id)
                .eq("user_id", authUser)
                .select()
                .single();

            data = result.data;
            error = result.error;
        } else {
            const result = await insforgeInstance.database
                .from("ideas")
                .insert(payload)
                .select()
                .single();
            data = result.data;
            error = result.error;
        }

        if (error) {
            console.error("Error upserting idea:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data });

    } catch (error) {
        console.error("Error upserting idea:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}