require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

const app = express();
app.use(cors());
app.use(express.json());

// Load environment variables
const {
  SEPOLIA_RPC_URL,
  OWNER_PRIVATE_KEY,
  MODERATOR_REGISTRY_ADDRESS,
  CONTENT_BOUNTY_ADDRESS,
  VERDICT_STORAGE_ADDRESS,
  CONTENT_SUBMISSION_ADDRESS,
  MODERATION_TASK_ADDRESS
} = process.env;

// Helper to load ABI
function getAbi(contract) {
  const abiPath = path.join(__dirname, 'abi', `${contract}.json`);
  return JSON.parse(fs.readFileSync(abiPath, 'utf8'));
}

// Serve ABI
app.get('/api/abi/:contract', (req, res) => {
  try {
    const abi = getAbi(req.params.contract);
    res.json(abi);
  } catch (e) {
    res.status(404).json({ error: 'ABI not found' });
  }
});

// Serve address
const addressMap = {
  ModeratorRegistry: MODERATOR_REGISTRY_ADDRESS,
  ContentBounty: CONTENT_BOUNTY_ADDRESS,
  VerdictStorage: VERDICT_STORAGE_ADDRESS,
  ContentSubmission: CONTENT_SUBMISSION_ADDRESS,
  ModerationTask: MODERATION_TASK_ADDRESS
};
app.get('/api/address/:contract', (req, res) => {
  const addr = addressMap[req.params.contract];
  if (addr) res.json({ address: addr });
  else res.status(404).json({ error: 'Address not found' });
});

// Ethers provider and signer
const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
const signer = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);

// Load ABIs
const ModeratorRegistryABI = getAbi('ModeratorRegistry');
const ContentBountyABI = getAbi('ContentBounty');
const VerdictStorageABI = getAbi('VerdictStorage');
const ContentSubmissionABI = getAbi('ContentSubmission');
const ModerationTaskABI = getAbi('ModerationTask');

// Contract instances
const ModeratorRegistry = new ethers.Contract(MODERATOR_REGISTRY_ADDRESS, ModeratorRegistryABI, signer);
const ContentBounty = new ethers.Contract(CONTENT_BOUNTY_ADDRESS, ContentBountyABI, signer);
const VerdictStorage = new ethers.Contract(VERDICT_STORAGE_ADDRESS, VerdictStorageABI, signer);
const ContentSubmission = new ethers.Contract(CONTENT_SUBMISSION_ADDRESS, ContentSubmissionABI, signer);
const ModerationTask = new ethers.Contract(MODERATION_TASK_ADDRESS, ModerationTaskABI, signer);

// Example: Admin dispute endpoint (stub)
app.post('/api/admin/dispute', async (req, res) => {
  // TODO: Implement on-chain dispute logic
  res.json({ status: 'Dispute flagged (stub)' });
});

// Register moderator
app.post('/api/moderator/register', async (req, res) => {
  try {
    const { expertiseTags, passedQuiz } = req.body;
    // Convert tags to bytes32
    const hashes = expertiseTags.map(tag => ethers.id(tag));
    const tx = await ModeratorRegistry.register(hashes, passedQuiz);
    await tx.wait();
    res.json({ status: 'Moderator registered', txHash: tx.hash });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Submit content
app.post('/api/content/submit', async (req, res) => {
  try {
    const { contentHash, taskDescription, requiredExpertiseTags, deadlineTimestamp, bountyAmount } = req.body;
    const hashes = requiredExpertiseTags.map(tag => ethers.id(tag));
    const tx = await ContentSubmission.submitContent(contentHash, taskDescription, hashes, deadlineTimestamp, { value: bountyAmount });
    await tx.wait();
    res.json({ status: 'Content submitted', txHash: tx.hash });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Claim moderation task
app.post('/api/moderation/claim', async (req, res) => {
  try {
    const { contentHash, claimant } = req.body;
    const tx = await ModerationTask.claimBounty(contentHash, claimant);
    await tx.wait();
    res.json({ status: 'Task claimed', txHash: tx.hash });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Submit verdict
app.post('/api/moderation/verdict', async (req, res) => {
  try {
    const { contentHash, isAccurate, justification } = req.body;
    const tx = await VerdictStorage.recordVerdict(contentHash, isAccurate, justification);
    await tx.wait();
    res.json({ status: 'Verdict submitted', txHash: tx.hash });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update reputation
app.post('/api/reputation/update', async (req, res) => {
  try {
    const { user, newScore } = req.body;
    const tx = await ModeratorRegistry.updateReputation(user, newScore);
    await tx.wait();
    res.json({ status: 'Reputation updated', txHash: tx.hash });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// List all content submissions for moderation
app.get('/api/content/list', async (req, res) => {
  try {
    // 1 = Pending status (adjust if needed)
    const statusPending = 1;
    const hashes = await ContentSubmission.getSubmissionsByStatus(statusPending);
    const results = await Promise.all(hashes.map(async (hash) => {
      const sub = await ContentSubmission.submissions(hash);
      return {
        contentHash: hash,
        submitter: sub.submitter,
        taskDescription: sub.taskDescription,
        submissionTimestamp: sub.submissionTimestamp,
        deadline: sub.deadline,
        bountyAmount: sub.bountyAmount,
        status: sub.status
      };
    }));
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get details for a single content submission
app.get('/api/content/:hash', async (req, res) => {
  try {
    const hash = req.params.hash;
    const sub = await ContentSubmission.submissions(hash);
    res.json({
      contentHash: hash,
      submitter: sub.submitter,
      taskDescription: sub.taskDescription,
      submissionTimestamp: sub.submissionTimestamp,
      deadline: sub.deadline,
      bountyAmount: sub.bountyAmount,
      status: sub.status
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Save onboarding data (for demo, store in local file)
app.post('/api/onboarding', async (req, res) => {
  try {
    const { email, profession, quizDone } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const file = path.join(__dirname, 'onboarding.json');
    let data = {};
    if (fs.existsSync(file)) {
      data = JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    data[email] = { ...(data[email] || {}), profession, quizDone };
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    res.json({ status: 'saved' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// TODO: Add endpoints for moderator registration, content submission, moderation, verdict, reputation, etc.

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
}); 