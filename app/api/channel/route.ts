import { getInsforgeServerClient } from "@/lib/insforge-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        // 1. Database Connection aur Session authentication check
        const { insforge, userId } = await getInsforgeServerClient().catch(() => ({ insforge: null, userId: null }));
        
        if (!userId || !insforge) {
            return NextResponse.json({ error: "Unauthorized or Database Connection Missing" }, { status: 401 });
        }

        console.log(userId, "==> userId")
        console.log(insforge, "==> insforge")

        const filter = request.nextUrl.searchParams.get('filter');

        // 2. Direct Core Database Engine Queries (Bypassing external REST proxy links)
        // Hum pure database instance client ko direct use kar rahe hain taake actual tables fetch hon
        const [typesRes, userChannelsRes] = await Promise.all([
            insforge.database
                .from("channel_types")
                .select("*")
                .order("created_at", { ascending: true }),
            insforge.database
                .from("user_channels")
                .select("*")
                .eq("user_id", userId)
        ]);

        console.log("===>>> reachinggggggg")

        // 3. Database Layer Validation Checks
        if (typesRes.error) {
            console.error("Database structural read fail (channel_types):", typesRes.error);
            return NextResponse.json({ 
                error: `Database sync failed: ${typesRes.error.message}. Please check if the 'channel_types' table exists in your DB layout.` 
            }, { status: 500 });
        }

        if (userChannelsRes.error) {
            console.error("Database user channels mapping fail:", userChannelsRes.error);
        }

        const activeUserChannels = userChannelsRes.data || [];
        const userChannelMap = new Map(
            activeUserChannels.map(channel => [channel.channel_type_id, channel])
        );

        // 4. Dynamic Mapping Loop — Har record direct database state se link hai
        let channels = (typesRes.data || []).map(channel_type => {
            const userChannel = userChannelMap.get(channel_type.id);
            return {
                id: channel_type.id,
                type: channel_type.type,
                name: channel_type.name,
                color: channel_type.color,
                character_limit: channel_type.character_limit,
                user_channel_id: userChannel?.id ?? null,
                handle: userChannel?.handle ?? null,
                profile_image: userChannel?.profile_image ?? null,
                profile_url: userChannel?.profile_url ?? null,
                connected: userChannel?.is_connected ?? false // Jab DB mein true hoga tabhi frontend par dynamic active hoga
            };
        });

        // 5. Dynamic State Counter calculations for state tracking
        const totalChannels = typesRes.data?.length || 0;
        const connectedCount = channels.filter(channel => channel.connected).length;

        // Frontend dynamic filters connection state toggle logic
        if (filter === 'connected') {
            channels = channels.filter(channel => channel.connected);
        } else if (filter === 'unconnected') {
            channels = channels.filter(channel => !channel.connected);
        }

        // Return direct live dataset back to React state engine
        return NextResponse.json({
            channels,
            totalChannels,
            connectedCount
        });
        
    } catch (error: any) {
        console.error('Fatal crash on full-stack pipeline handler execution:', error);
        return NextResponse.json({ 
            error: "Internal server pipeline failure", 
            details: error?.message || error 
        }, { status: 500 });
    }
}