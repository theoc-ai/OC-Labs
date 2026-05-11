// Fire-and-forget helpers that notify the Omnia Hub after project mutations.
// Never throw — a sync failure must never block the originating request.

const HUB_URL = process.env.OMNIA_HUB_URL
const HUB_CRON_SECRET = process.env.OMNIA_HUB_CRON_SECRET
const HUB_WEBHOOK_SECRET = process.env.HUB_WEBHOOK_SECRET

/** Trigger a full re-pull of all OC Labs projects on the Hub (cron path). */
export function notifyHubSync(): void {
  if (!HUB_URL || !HUB_CRON_SECRET) return

  fetch(`${HUB_URL}/api/sync/oc-labs`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${HUB_CRON_SECRET}` },
  }).catch((err) => console.warn('Hub sync notify failed:', err))
}

/** Push a single updated project payload directly to the Hub webhook. */
export function notifyHubWebhook(project: Record<string, unknown>): void {
  const webhookUrl = process.env.HUB_WEBHOOK_URL ?? (HUB_URL ? `${HUB_URL}/api/webhooks/oc-labs` : null)
  if (!webhookUrl || !HUB_WEBHOOK_SECRET) return

  fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${HUB_WEBHOOK_SECRET}`,
    },
    body: JSON.stringify(project),
  }).catch((err) => console.error('Hub webhook notify failed:', err))
}
