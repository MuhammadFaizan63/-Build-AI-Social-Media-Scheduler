import { auth } from '@clerk/nextjs/server';
import { createClient, type InsForgeClient } from '@insforge/sdk';

// Environment variables
const BASE_URL = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;
const PROJECT_API_KEY = process.env.INSFORGE_PROJECT_API_KEY;
const TEMPLATE = process.env.CLERK_INSFORGE_TEMPLATE;

const SERVER_TOKEN_TEMPLATE = TEMPLATE || 'insforge';

const TOKEN_REFRESH_MS = 50_000; // Clerk template tokens expire in 60s by default

let cachedClient: InsForgeClient | null = null;
let cachedUserId: string | null = null;
let refreshInterval: NodeJS.Timeout | null = null;

async function refreshAuthToken(client: InsForgeClient, retries = 3): Promise<void> {
  try {
    // Clerk server environment token fetch
    const { getToken } = await auth();

    let token = null;
    try {
      token = await getToken({ template: SERVER_TOKEN_TEMPLATE });

      console.log("Token:", token);
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString()
      );

      console.log(payload);
      console.log("🚀 [DEBUG] Clerk JWT Token Successfully Fetched:", token ? "YES (Valid String)" : "NULL/EMPTY");
    } catch (networkError: any) {
      console.warn("⚠️ Clerk Fetch Hook Warning: Network routing lookup bypassed in development mode.");
      client.getHttpClient().setAuthToken(null);
      return;
    }

    if (token) {
      client.getHttpClient().setAuthToken(token);
    } else {
      throw new Error('No token received from Clerk');
    }
  } catch (err) {
    console.error('Failed to refresh Clerk token safely for InsForge client:', err);
    client.getHttpClient().setAuthToken(null);
  }
}

export async function getInsforgeServerClient(): Promise<{ insforge: InsForgeClient; userId: string | null }> {
  if (!BASE_URL) {
    throw new Error('Missing NEXT_PUBLIC_INSFORGE_BASE_URL or INSFORGE_BASE_URL environment variable');
  }
  if (!ANON_KEY) {
    throw new Error('Missing NEXT_PUBLIC_INSFORGE_ANON_KEY or INSFORGE_ANON_KEY environment variable');
  }

  // Get current user from Clerk securely
  let userId: string | null = null;
  try {
    const { userId: clerkUserId } = await auth();
    userId = clerkUserId;
  } catch (e) {
    console.warn("⚠️ Clerk authentication context failed; creating unauthenticated InsForge client.");
    userId = null;
    if (cachedClient) {
      cachedClient.getHttpClient().setAuthToken(null);
    }
  }

  // Recreate client when auth state changes or no cached client exists
  if (userId !== cachedUserId || !cachedClient) {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }

    // Create new client
    cachedClient = createClient({
      baseUrl: BASE_URL,
      anonKey: ANON_KEY,
    });
    cachedUserId = userId;

    if (userId) {
      await refreshAuthToken(cachedClient);

      // Start refresh interval securely
      refreshInterval = setInterval(async () => {
        if (cachedClient && cachedUserId) {
          await refreshAuthToken(cachedClient);
        }
      }, TOKEN_REFRESH_MS);
    }
  } else if (userId) {
    await refreshAuthToken(cachedClient);
  }

  return { insforge: cachedClient, userId };
}

export function getInsforgeAdminClient(): InsForgeClient {
  if (!BASE_URL) {
    throw new Error('Missing NEXT_PUBLIC_INSFORGE_BASE_URL or INSFORGE_BASE_URL environment variable');
  }
  if (!ANON_KEY) {
    throw new Error('Missing NEXT_PUBLIC_INSFORGE_ANON_KEY or INSFORGE_ANON_KEY environment variable');
  }
  if (!PROJECT_API_KEY) {
    throw new Error('Missing INSFORGE_PROJECT_API_KEY or INSFORGE_API_KEY environment variable');
  }

  // ✅ FIX: InsForge ya dynamic schema router key ko as a primary validation key 'secretKey' ya 'apiKey' mein expect karta hai.
  return createClient({
    baseUrl: BASE_URL,
    anonKey: PROJECT_API_KEY, // Admin bypass key hi iska main client key banti hai server-mode mein
    isServerMode: true,
  });
}

export const getInsforgeUploadClient = getInsforgeAdminClient;