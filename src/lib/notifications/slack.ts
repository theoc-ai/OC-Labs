// src/lib/notifications/slack.ts

async function postToWebhook(webhookUrl: string, payload: object): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(`Slack webhook failed: ${res.status} ${res.statusText}`)
  }
}

export async function notifyProjectUpdate(projectTitle: string, message: string): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_PROJECTS
  if (!webhookUrl) return

  await postToWebhook(webhookUrl, {
    text: `*${projectTitle}*: ${message}`,
  })
}

export async function notifyRecruiting(projectTitle: string, ownerName: string, skills: string[]): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_PROJECTS
  if (!webhookUrl) return

  await postToWebhook(webhookUrl, {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `📣 *${projectTitle}* is recruiting!\n*Owner:* ${ownerName}\n*Skills needed:* ${skills.join(', ')}`,
        },
      },
    ],
  })
}

export async function notifyMilestone(projectTitle: string, updateBody: string): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_WINS
  if (!webhookUrl) return

  await postToWebhook(webhookUrl, {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🏆 *${projectTitle}* hit a milestone!\n${updateBody}`,
        },
      },
    ],
  })
}

export async function dmOwnerRaisedHand(
  ownerName: string,
  raisedByName: string,
  projectTitle: string
): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_HAND_RAISES
  if (!webhookUrl) return

  await postToWebhook(webhookUrl, {
    text: `👋 ${raisedByName} raised their hand to join *${projectTitle}* (owner: ${ownerName})`,
  })
}
