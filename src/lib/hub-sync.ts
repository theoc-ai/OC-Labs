// Fire-and-forget: tell the Omnia Hub to re-pull all OC Labs projects.
// Called after any project mutation (create / update / delete / status change).
// Never throws — a sync failure must never block the originating request.

const HUB_URL = process.env.OMNIA_HUB_URL
const HUB_CRON_SECRET = process.env.OMNIA_HUB_CRON_SECRET

export function notifyHubSync(): void {
  if (!HUB_URL || !HUB_CRON_SECRET) return

  fetch(`${HUB_URL}/api/sync/oc-labs`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${HUB_CRON_SECRET}` },
  }).catch((err) => console.warn('Hub sync notify failed:', err))
}
