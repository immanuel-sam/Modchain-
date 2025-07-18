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

// Validate environment variables
const requiredEnvVars = [
  'SEPOLIA_RPC_URL',
  'OWNER_PRIVATE_KEY',
  'MODERATOR_REGISTRY_ADDRESS',
  'CONTENT_BOUNTY_ADDRESS',
  'VERDICT_STORAGE_ADDRESS',
  'CONTENT_SUBMISSION_ADDRESS',
  'MODERATION_TASK_ADDRESS'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  console.error('Please check your .env file');
  process.exit(1);
}

// Helper to load ABI
function getAbi(contract) {
  const abiPath = path.join(__dirname, 'abi', `${contract}.json`);
  if (!fs.existsSync(abiPath)) {
    throw new Error(`ABI file not found: ${abiPath}`);
  }
  return JSON.parse(fs.readFileSync(abiPath, 'utf8'));
}

// Serve ABI
app.get('/api/abi/:contract', (req, res) => {
  try {
    const abi = getAbi(req.params.contract);
    res.json(abi);
  } catch (e) {
    console.error('ABI error:', e.message);
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

// Initialize blockchain connection
let provider, signer;
let ModeratorRegistry, ContentBounty, VerdictStorage, ContentSubmission, ModerationTask;

async function initializeBlockchain() {
  try {
    console.log('Initializing blockchain connection...');
    
    // Test provider connection
    provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
    await provider.getNetwork();
    console.log('✓ Provider connected successfully');
    
    // Test signer
    signer = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
    console.log('✓ Signer created successfully');
    
    // Load ABIs
    console.log('Loading ABI files...');
    const ModeratorRegistryABI = getAbi('ModeratorRegistry');
    const ContentBountyABI = getAbi('ContentBounty');
    const VerdictStorageABI = getAbi('VerdictStorage');
    const ContentSubmissionABI = getAbi('ContentSubmission');
    const ModerationTaskABI = getAbi('ModerationTask');
    console.log('✓ All ABI files loaded successfully');
    
    // Create contract instances
    console.log('Creating contract instances...');
    ModeratorRegistry = new ethers.Contract(MODERATOR_REGISTRY_ADDRESS, ModeratorRegistryABI, signer);
    ContentBounty = new ethers.Contract(CONTENT_BOUNTY_ADDRESS, ContentBountyABI, signer);
    VerdictStorage = new ethers.Contract(VERDICT_STORAGE_ADDRESS, VerdictStorageABI, signer);
    ContentSubmission = new ethers.Contract(CONTENT_SUBMISSION_ADDRESS, ContentSubmissionABI, signer);
    ModerationTask = new ethers.Contract(MODERATION_TASK_ADDRESS, ModerationTaskABI, signer);
    console.log('✓ All contract instances created successfully');
    
    return true;
  } catch (error) {
    console.error('Blockchain initialization failed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Example: Admin dispute endpoint (stub)
app.post('/api/admin/dispute', async (req, res) => {
  // TODO: Implement on-chain dispute logic
  res.json({ status: 'Dispute flagged (stub)' });
});

// Register moderator
app.post('/api/moderator/register', async (req, res) => {
  if (!ModeratorRegistry) {
    return res.status(503).json({ error: 'Blockchain not initialized' });
  }
  
  try {
    const { expertiseTags, passedQuiz } = req.body;
    // Convert tags to bytes32
    const hashes = expertiseTags.map(tag => ethers.id(tag));
    const tx = await ModeratorRegistry.register(hashes, passedQuiz);
    await tx.wait();
    res.json({ status: 'Moderator registered', txHash: tx.hash });
  } catch (e) {
    console.error('Register moderator error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Submit content
app.post('/api/content/submit', async (req, res) => {
  if (!ContentSubmission) {
    return res.status(503).json({ error: 'Blockchain not initialized' });
  }
  
  try {
    const { contentHash, taskDescription, requiredExpertiseTags, deadlineTimestamp, bountyAmount } = req.body;
    const hashes = requiredExpertiseTags.map(tag => ethers.id(tag));
    const tx = await ContentSubmission.submitContent(contentHash, taskDescription, hashes, deadlineTimestamp, { value: bountyAmount });
    await tx.wait();
    res.json({ status: 'Content submitted', txHash: tx.hash });
  } catch (e) {
    console.error('Submit content error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Claim moderation task
app.post('/api/moderation/claim', async (req, res) => {
  if (!ModerationTask) {
    return res.status(503).json({ error: 'Blockchain not initialized' });
  }
  
  try {
    const { contentHash, claimant } = req.body;
    const tx = await ModerationTask.claimBounty(contentHash, claimant);
    await tx.wait();
    res.json({ status: 'Task claimed', txHash: tx.hash });
  } catch (e) {
    console.error('Claim task error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Submit verdict
app.post('/api/moderation/verdict', async (req, res) => {
  if (!VerdictStorage) {
    return res.status(503).json({ error: 'Blockchain not initialized' });
  }
  
  try {
    const { contentHash, isAccurate, justification } = req.body;
    const tx = await VerdictStorage.recordVerdict(contentHash, isAccurate, justification);
    await tx.wait();
    res.json({ status: 'Verdict submitted', txHash: tx.hash });
  } catch (e) {
    console.error('Submit verdict error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Update reputation
app.post('/api/reputation/update', async (req, res) => {
  if (!ModeratorRegistry) {
    return res.status(503).json({ error: 'Blockchain not initialized' });
  }
  
  try {
    const { user, newScore } = req.body;
    const tx = await ModeratorRegistry.updateReputation(user, newScore);
    await tx.wait();
    res.json({ status: 'Reputation updated', txHash: tx.hash });
  } catch (e) {
    console.error('Update reputation error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// List all content submissions for moderation
app.get('/api/content/list', async (req, res) => {
  if (!ContentSubmission) {
    return res.status(503).json({ error: 'Blockchain not initialized' });
  }
  
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
    console.error('List content error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Get details for a single content submission
app.get('/api/content/:hash', async (req, res) => {
  if (!ContentSubmission) {
    return res.status(503).json({ error: 'Blockchain not initialized' });
  }
  
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
    console.error('Get content error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// List all moderators (top N)
app.get('/api/moderators', async (req, res) => {
  if (!ModeratorRegistry) {
    return res.status(503).json({ error: 'Blockchain not initialized' });
  }
  
  try {
    const N = 100;
    const addresses = await ModeratorRegistry.getTopModerators(N);
    const moderators = await Promise.all(addresses.map(async (address) => {
      const reputation = await ModeratorRegistry.getReputationScore(address);
      return {
        address,
        reputation: reputation.toString(),
      };
    }));
    res.json(moderators);
  } catch (e) {
    console.error('List moderators error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Get bounty results/winners for a content hash
app.get('/api/bounty/:hash/results', async (req, res) => {
  if (!ContentBounty) {
    return res.status(503).json({ error: 'Blockchain not initialized' });
  }
  
  try {
    const hash = req.params.hash;
    // For demo: fetch BountyClaimed events for this contentHash
    const filter = ContentBounty.filters.BountyClaimed(hash);
    const events = await ContentBounty.queryFilter(filter);
    const winners = events.map(ev => ({
      claimant: ev.args.claimant,
      amount: ev.args.amount.toString(),
      txHash: ev.transactionHash
    }));
    res.json({ winners });
  } catch (e) {
    console.error('Get bounty results error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Get moderator profile and reputation history
app.get('/api/moderator/:address', async (req, res) => {
  if (!ModeratorRegistry) {
    return res.status(503).json({ error: 'Blockchain not initialized' });
  }
  
  try {
    const address = req.params.address;
    const reputation = await ModeratorRegistry.getReputationScore(address);
    // Fetch reputation history from ReputationUpdated events
    const filter = ModeratorRegistry.filters.ReputationUpdated(address);
    const events = await ModeratorRegistry.queryFilter(filter);
    const history = events.map(ev => ({
      newReputation: ev.args.newReputation.toString(),
      blockNumber: ev.blockNumber,
      txHash: ev.transactionHash
    }));
    res.json({ address, reputation: reputation.toString(), history });
  } catch (e) {
    console.error('Get moderator profile error:', e.message);
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
    console.error('Onboarding error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    blockchain: !!ModeratorRegistry ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Initialize and start server
async function startServer() {
  const PORT = process.env.PORT || 5000;
  
  // Start server first
  const server = app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
  });
  
  // Initialize blockchain connection
  const blockchainInitialized = await initializeBlockchain();
  
  if (!blockchainInitialized) {
    console.log('⚠️  Server started but blockchain initialization failed');
    console.log('⚠️  API endpoints requiring blockchain will return 503 errors');
    console.log('⚠️  Please check your configuration and restart the server');
  } else {
    console.log('✅ Server fully initialized with blockchain connection');
  }
  
  return server;
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});