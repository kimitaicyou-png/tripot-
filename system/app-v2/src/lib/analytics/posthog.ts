import { PostHog } from 'posthog-node';

let serverClient: PostHog | null = null;

export function getServerPostHog(): PostHog | null {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return null;

  if (!serverClient) {
    serverClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return serverClient;
}

export async function captureServerEvent(params: {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
}): Promise<void> {
  const client = getServerPostHog();
  if (!client) return;

  client.capture({
    distinctId: params.distinctId,
    event: params.event,
    properties: params.properties,
  });
  await client.flush();
}
