const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export async function registerModerator(expertiseTags: string[], passedQuiz: boolean) {
  const res = await fetch(`${BACKEND_URL}/api/moderator/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expertiseTags, passedQuiz }),
  });
  return res.json();
}

export async function submitContent(data: { contentHash: string; taskDescription: string; requiredExpertiseTags: string[]; deadlineTimestamp: number; bountyAmount: string; }) {
  const res = await fetch(`${BACKEND_URL}/api/content/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function claimModerationTask(contentHash: string, claimant: string) {
  const res = await fetch(`${BACKEND_URL}/api/moderation/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentHash, claimant }),
  });
  return res.json();
}

export async function submitVerdict(contentHash: string, isAccurate: boolean, justification: string) {
  const res = await fetch(`${BACKEND_URL}/api/moderation/verdict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentHash, isAccurate, justification }),
  });
  return res.json();
}

export async function updateReputation(user: string, newScore: number) {
  const res = await fetch(`${BACKEND_URL}/api/reputation/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user, newScore }),
  });
  return res.json();
}

export async function flagDispute(data: { contentHash: string; }) {
  const res = await fetch(`${BACKEND_URL}/api/admin/dispute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getContentList() {
  const res = await fetch(`${BACKEND_URL}/api/content/list`);
  return res.json();
}

export async function getContentDetails(hash: string) {
  const res = await fetch(`${BACKEND_URL}/api/content/${hash}`);
  return res.json();
}

export async function saveOnboarding(data: { email: string; profession?: string; quizDone?: boolean }) {
  const res = await fetch(`${BACKEND_URL}/api/onboarding`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
} 