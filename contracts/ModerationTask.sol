 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// --- Interfaces for interacting with other contracts ---
interface IModeratorRegistry {
    function isRegistered(address _user) external view returns (bool);
    function hasPassedVerification(address _user) external view returns (bool);
    function hasExpertiseTag(address _user, bytes32 _tagHash) external view returns (bool);
    function getReputationScore(address _user) external view returns (uint256);
    function updateReputation(address _user, uint256 _newScore) external;
}

interface IVerdictStorage {
    struct Verdict {
        address moderator;
        bool isAccurate;
        uint256 timestamp;
        string justification;
    }
    function recordVerdict(bytes32 _contentHash, bool _isAccurate, string memory _justification) external;
    function getVerdicts(bytes32 _contentHash) external view returns (Verdict[] memory);
}

interface IContentSubmission {
    enum SubmissionStatus { Pending, UnderReview, Completed, Expired, Disputed }
    struct ContentDetails {
        address submitter;
        string taskDescription;
        bytes32[] requiredExpertiseHashes;
        uint256 submissionTimestamp;
        uint256 deadline;
        uint256 bountyAmount;
        SubmissionStatus status;
    }
    function submissions(bytes32 _contentHash) external view returns (
        address submitter,
        string memory taskDescription,
        bytes32[] memory requiredExpertiseHashes,
        uint256 submissionTimestamp,
        uint256 deadline,
        uint256 bountyAmount,
        SubmissionStatus status
    );
    function updateSubmissionStatus(bytes32 _contentHash, SubmissionStatus _newStatus) external;
}

interface IContentBounty {
    function claimBounty(bytes32 _contentHash, address payable _claimant) external;
}


/**
 * @title ModerationTask
 * @dev This contract manages the lifecycle of moderation tasks.
 * It allows verified and expert moderators to claim tasks and submit their verdicts.
 * It interacts with ModeratorRegistry, VerdictStorage, ContentSubmission, and ContentBounty contracts.
 * This is a standard, non-upgradeable contract.
 */
contract ModerationTask {

    // --- Enums ---
    enum TaskStatus {
        Open,           // Task is available for moderators to claim
        InProgress,     // Task has been claimed by at least one moderator
        AwaitingConsensus, // All required verdicts received, awaiting final decision
        Closed,         // Task is finalized (bounty paid, disputed, or expired)
        Disputed        // Task is under dispute review
    }

    // --- Structs ---
    struct ModerationTaskDetails {
        bytes32 contentHash;            // Unique identifier for the content
        address submitter;              // Address of the original content submitter
        bytes32[] requiredExpertise;    // Expertise tags required for this task
        uint256 deadline;               // Deadline for moderation
        uint256 bountyAmount;           // Bounty for this task (from ContentSubmission)
        TaskStatus status;              // Current status of the moderation task
        address[] assignedModerators;   // List of moderators who have claimed this task
        // Mappings within structs are implicitly initialized, no 'new mapping()' needed
        mapping(address => bool) hasModeratorClaimed;
        mapping(address => bool) hasModeratorSubmittedVerdict;
        uint256 verdictsReceivedCount;  // Count of verdicts submitted for this task
    }

    // --- State Variables ---
    mapping(bytes32 => ModerationTaskDetails) public moderationTasks;

    address public owner; // The address that deployed this contract

    // Contract instances for interaction
    IModeratorRegistry public moderatorRegistry;
    IVerdictStorage public verdictStorage;
    IContentSubmission public contentSubmission;
    IContentBounty public contentBounty;

    // --- Events ---
    event TaskCreated(
        bytes32 indexed contentHash,
        address indexed submitter,
        uint256 bountyAmount,
        uint256 deadline,
        bytes32[] requiredExpertise
    );
    event TaskClaimed(bytes32 indexed contentHash, address indexed moderator);
    event VerdictSubmitted(bytes32 indexed contentHash, address indexed moderator, bool isAccurate);
    event TaskStatusChanged(bytes32 indexed contentHash, TaskStatus newStatus);
    event ConsensusReached(bytes32 indexed contentHash, bool finalVerdict);
    event BountyDistributed(bytes32 indexed contentHash, address[] recipients, uint256 totalAmount);

    // --- DAO Voting for Disputes ---
    struct DisputeVote {
        mapping(address => bool) hasVoted;
        mapping(bool => uint256) votes; // true/false => count
        address[] voters;
        bool resolved;
        bool result;
    }
    mapping(bytes32 => DisputeVote) public disputeVotes;
    event DisputeVoteCast(bytes32 indexed contentHash, address indexed voter, bool vote);
    event DisputeResolved(bytes32 indexed contentHash, bool result);

    // --- Configurable Consensus ---
    uint256 public consensusThreshold = 3;
    function setConsensusThreshold(uint256 _threshold) public onlyOwner {
        require(_threshold > 0, "Threshold must be positive");
        consensusThreshold = _threshold;
    }

    // --- Civic Verification Modifier ---
    modifier onlyVerified() {
        require(moderatorRegistry.hasPassedVerification(msg.sender), "Civic verification required");
        _;
    }

    // --- Enhanced Queries ---
    function getTasksByStatus(TaskStatus status) public view returns (bytes32[] memory) {
        uint256 count = 0;
        for (uint i = 0; i < 2**16; i++) {
            bytes32 hash = bytes32(i);
            if (moderationTasks[hash].contentHash != bytes32(0) && moderationTasks[hash].status == status) {
                count++;
            }
        }
        bytes32[] memory hashes = new bytes32[](count);
        uint256 idx = 0;
        for (uint i = 0; i < 2**16; i++) {
            bytes32 hash = bytes32(i);
            if (moderationTasks[hash].contentHash != bytes32(0) && moderationTasks[hash].status == status) {
                hashes[idx++] = hash;
            }
        }
        return hashes;
    }
    function getTasksByModerator(address moderator) public view returns (bytes32[] memory) {
        uint256 count = 0;
        for (uint i = 0; i < 2**16; i++) {
            bytes32 hash = bytes32(i);
            ModerationTaskDetails storage task = moderationTasks[hash];
            if (task.contentHash != bytes32(0) && task.hasModeratorClaimed[moderator]) {
                count++;
            }
        }
        bytes32[] memory hashes = new bytes32[](count);
        uint256 idx = 0;
        for (uint i = 0; i < 2**16; i++) {
            bytes32 hash = bytes32(i);
            ModerationTaskDetails storage task = moderationTasks[hash];
            if (task.contentHash != bytes32(0) && task.hasModeratorClaimed[moderator]) {
                hashes[idx++] = hash;
            }
        }
        return hashes;
    }

    // --- Constructor ---
    /**
     * @dev Initializes the ModerationTask contract.
     * Sets the owner and the addresses of dependent contracts.
     * @param _moderatorRegistryAddress The address of the ModeratorRegistry contract.
     * @param _verdictStorageAddress The address of the VerdictStorage contract.
     * @param _contentSubmissionAddress The address of the ContentSubmission contract.
     * @param _contentBountyAddress The address of the ContentBounty contract.
     */
    constructor(
        address _moderatorRegistryAddress,
        address _verdictStorageAddress,
        address _contentSubmissionAddress,
        address _contentBountyAddress
    ) {
        owner = msg.sender;

        require(_moderatorRegistryAddress != address(0), "ModeratorRegistry address cannot be zero.");
        require(_verdictStorageAddress != address(0), "VerdictStorage address cannot be zero.");
        require(_contentSubmissionAddress != address(0), "ContentSubmission address cannot be zero.");
        require(_contentBountyAddress != address(0), "ContentBounty address cannot be zero.");

        moderatorRegistry = IModeratorRegistry(_moderatorRegistryAddress);
        verdictStorage = IVerdictStorage(_verdictStorageAddress);
        contentSubmission = IContentSubmission(_contentSubmissionAddress);
        contentBounty = IContentBounty(_contentBountyAddress);
    }

    // --- Modifiers ---
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function.");
        _;
    }

    // --- Core Logic Functions ---

    /**
     * @dev Creates a new moderation task based on a content submission.
     * This function should primarily be called by a trusted backend or owner
     * when new content is submitted to ContentSubmission.
     * @param _contentHash The unique hash of the content.
     */
    function createTask(bytes32 _contentHash) public onlyOwner {
        // Retrieve content details from the ContentSubmission contract
        (
            address submitter,
            string memory taskDescription, // Not stored in ModerationTaskDetails struct
            bytes32[] memory requiredExpertiseHashes,
            uint256 submissionTimestamp, // Not stored in ModerationTaskDetails struct
            uint256 deadline,
            uint256 bountyAmount,
            IContentSubmission.SubmissionStatus submissionStatus
        ) = contentSubmission.submissions(_contentHash);

        require(submitter != address(0), "Task Creation: Content not found in ContentSubmission.");
        require(submissionStatus == IContentSubmission.SubmissionStatus.Pending, "Task Creation: Content is not in Pending status.");
        require(moderationTasks[_contentHash].contentHash == bytes32(0), "Task Creation: Task already exists.");

        // Assign values to the struct fields individually
        // Mappings within structs cannot be initialized directly in the constructor syntax.
        // They are implicitly initialized to their default values (e.g., false for bool)
        // when the struct is created in storage.
        ModerationTaskDetails storage newTask = moderationTasks[_contentHash];
        newTask.contentHash = _contentHash;
        newTask.submitter = submitter;
        newTask.requiredExpertise = requiredExpertiseHashes; // Assign the entire array
        newTask.deadline = deadline;
        newTask.bountyAmount = bountyAmount;
        newTask.status = TaskStatus.Open;
        newTask.assignedModerators = new address[](0); // Initialize dynamic array
        newTask.verdictsReceivedCount = 0;

        contentSubmission.updateSubmissionStatus(_contentHash, IContentSubmission.SubmissionStatus.UnderReview);

        emit TaskCreated(_contentHash, submitter, bountyAmount, deadline, requiredExpertiseHashes);
    }

    /**
     * @dev Allows a verified moderator with matching expertise to claim an open task.
     * @param _contentHash The hash of the content for the task to claim.
     */
    function claimTask(bytes32 _contentHash) public onlyVerified {
        ModerationTaskDetails storage task = moderationTasks[_contentHash];

        require(task.contentHash != bytes32(0), "Claim Task: Task does not exist.");
        require(task.status == TaskStatus.Open || task.status == TaskStatus.InProgress, "Claim Task: Task is not open or in progress.");
        require(block.timestamp <= task.deadline, "Claim Task: Task deadline has passed.");

        bool hasMatchingExpertise = false;
        for (uint i = 0; i < task.requiredExpertise.length; i++) {
            if (moderatorRegistry.hasExpertiseTag(msg.sender, task.requiredExpertise[i])) {
                hasMatchingExpertise = true;
                break;
            }
        }
        require(hasMatchingExpertise, "Claim Task: Moderator does not have required expertise.");

        require(!task.hasModeratorClaimed[msg.sender], "Claim Task: Moderator already claimed this task.");

        task.assignedModerators.push(msg.sender);
        task.hasModeratorClaimed[msg.sender] = true;

        if (task.status == TaskStatus.Open) {
            task.status = TaskStatus.InProgress;
            emit TaskStatusChanged(_contentHash, TaskStatus.InProgress);
        }

        emit TaskClaimed(_contentHash, msg.sender);
    }

    /**
     * @dev Allows an assigned moderator to submit their verdict for a task.
     * This function will record the verdict in the VerdictStorage contract.
     * @param _contentHash The hash of the content for the task.
     * @param _isAccurate The moderator's verdict (true for accurate, false for hallucinated/harmful).
     * @param _justification Optional justification/comments from the moderator.
     */
    function submitVerdict(bytes32 _contentHash, bool _isAccurate, string memory _justification) public onlyVerified {
        ModerationTaskDetails storage task = moderationTasks[_contentHash];

        require(task.contentHash != bytes32(0), "Submit Verdict: Task does not exist.");
        require(task.status == TaskStatus.InProgress, "Submit Verdict: Task is not in progress.");
        require(block.timestamp <= task.deadline, "Submit Verdict: Task deadline has passed.");

        require(task.hasModeratorClaimed[msg.sender], "Submit Verdict: Moderator has not claimed this task.");
        require(!task.hasModeratorSubmittedVerdict[msg.sender], "Submit Verdict: Moderator already submitted a verdict for this task.");

        // Record the verdict in the VerdictStorage contract (onlyOwner of VerdictStorage will be this ModerationTask contract)
        verdictStorage.recordVerdict(_contentHash, _isAccurate, _justification);

        task.hasModeratorSubmittedVerdict[msg.sender] = true;
        task.verdictsReceivedCount++;

        if (task.verdictsReceivedCount >= consensusThreshold && task.status == TaskStatus.InProgress) {
            task.status = TaskStatus.AwaitingConsensus;
            emit TaskStatusChanged(_contentHash, TaskStatus.AwaitingConsensus);
            // Automatically trigger consensus and distribution if threshold met
            _calculateConsensusAndDistributeBounty(_contentHash);
        }

        emit VerdictSubmitted(_contentHash, msg.sender, _isAccurate);
    }

    /**
     * @dev Internal function to calculate consensus and distribute bounty.
     * This is triggered automatically once enough verdicts are received.
     * This implements Phase 4 & 5 logic.
     * @param _contentHash The hash of the content.
     */
    function _calculateConsensusAndDistributeBounty(bytes32 _contentHash) internal {
        ModerationTaskDetails storage task = moderationTasks[_contentHash];
        require(task.status == TaskStatus.AwaitingConsensus, "Consensus: Task not in AwaitingConsensus status.");

        IVerdictStorage.Verdict[] memory verdicts = verdictStorage.getVerdicts(_contentHash);
        require(verdicts.length == task.verdictsReceivedCount, "Consensus: Verdict count mismatch.");

        uint256 trueVotes = 0;
        uint256 falseVotes = 0;
        // Store moderators who voted for the final consensus
        address[] memory alignedModerators = new address[](task.assignedModerators.length); // Max possible size
        uint256 alignedCount = 0;

        // Simple majority consensus (for MVP)
        for (uint i = 0; i < verdicts.length; i++) {
            if (verdicts[i].isAccurate) {
                trueVotes++;
            } else {
                falseVotes++;
            }
        }

        bool finalVerdictIsAccurate;
        if (trueVotes >= falseVotes) { // Simple majority, true wins ties
            finalVerdictIsAccurate = true;
        } else {
            finalVerdictIsAccurate = false;
        }

        // Identify aligned moderators and update reputation
        for (uint i = 0; i < verdicts.length; i++) {
            if (verdicts[i].isAccurate == finalVerdictIsAccurate) {
                alignedModerators[alignedCount] = verdicts[i].moderator;
                alignedCount++;
                // Optional: Reputation gain for aligned moderators
                uint256 currentRep = moderatorRegistry.getReputationScore(verdicts[i].moderator);
                moderatorRegistry.updateReputation(verdicts[i].moderator, currentRep + 5); // Example gain
            } else {
                // Optional: Reputation loss for misaligned moderators
                uint256 currentRep = moderatorRegistry.getReputationScore(verdicts[i].moderator);
                if (currentRep > 5) { // Prevent score from going too low
                    moderatorRegistry.updateReputation(verdicts[i].moderator, currentRep - 5); // Example loss
                }
            }
        }

        // Distribute bounty
        uint256 totalBounty = task.bountyAmount;
        if (alignedCount > 0 && totalBounty > 0) {
            uint256 sharePerModerator = totalBounty / alignedCount;
            for (uint i = 0; i < alignedCount; i++) {
                address payable moderator = payable(alignedModerators[i]);
                if (moderator != address(0)) { // Ensure it's a valid address
                    // Call claimBounty on the ContentBounty contract
                    contentBounty.claimBounty(_contentHash, moderator);
                }
            }
            emit BountyDistributed(_contentHash, alignedModerators, totalBounty);
        }

        // Finalize task status
        task.status = TaskStatus.Closed;
        contentSubmission.updateSubmissionStatus(_contentHash, IContentSubmission.SubmissionStatus.Completed);
        emit TaskStatusChanged(_contentHash, TaskStatus.Closed);
        emit ConsensusReached(_contentHash, finalVerdictIsAccurate);
    }


    /**
     * @dev Allows the owner to close a task manually (e.g., if expired or for dispute resolution).
     * @param _contentHash The hash of the content for the task.
     */
    function closeTask(bytes32 _contentHash) public onlyOwner {
        ModerationTaskDetails storage task = moderationTasks[_contentHash];
        require(task.contentHash != bytes32(0), "Close Task: Task does not exist.");
        require(task.status != TaskStatus.Closed, "Close Task: Task is already closed.");

        // If closing an open/in-progress task due to expiration, etc.
        if (block.timestamp > task.deadline && task.status != TaskStatus.AwaitingConsensus) {
            // Optionally, mark content submission as expired here
            contentSubmission.updateSubmissionStatus(_contentHash, IContentSubmission.SubmissionStatus.Expired);
        } else if (task.status == TaskStatus.AwaitingConsensus) {
            // If manually closing a task that reached consensus but wasn't fully processed
            _calculateConsensusAndDistributeBounty(_contentHash);
        }

        task.status = TaskStatus.Closed;
        emit TaskStatusChanged(_contentHash, TaskStatus.Closed);
    }

    /**
     * @dev Allows the owner to handle disputes.
     * For MVP, this is a placeholder. In a full system, this would involve
     * re-evaluation logic and potential re-distribution of bounties/reputation.
     * @param _contentHash The hash of the content for the disputed task.
     */
    function handleDispute(bytes32 _contentHash) public onlyOwner {
        ModerationTaskDetails storage task = moderationTasks[_contentHash];
        require(task.contentHash != bytes32(0), "Handle Dispute: Task does not exist.");
        // Corrected the condition: only checking for TaskStatus.Closed as 'Completed' is not in this enum
        require(task.status == TaskStatus.Closed, "Handle Dispute: Task is not closed.");

        // Update the ModerationTask's status to Disputed
        task.status = TaskStatus.Disputed; // Set the task status to Disputed
        // Mark content submission as disputed
        contentSubmission.updateSubmissionStatus(_contentHash, IContentSubmission.SubmissionStatus.Disputed);

        // --- Dispute Resolution Logic (Placeholder for Phase 4 & 5 improvements) ---
        // This is where you would implement:
        // 1. Triggering a secondary review by high-reputation moderators.
        // 2. Re-calculating consensus based on the secondary review.
        // 3. Adjusting bounties/reputation based on the new outcome.
        // 4. Potentially penalizing the submitter's reputation for false disputes.

        emit TaskStatusChanged(_contentHash, TaskStatus.Disputed); // Now TaskStatus.Disputed is valid
    }

    // --- DAO Voting for Disputes ---
    function voteOnDispute(bytes32 _contentHash, bool vote) public onlyVerified {
        DisputeVote storage dv = disputeVotes[_contentHash];
        require(!dv.hasVoted[msg.sender], "Already voted");
        require(!dv.resolved, "Dispute already resolved");
        dv.hasVoted[msg.sender] = true;
        dv.votes[vote]++;
        dv.voters.push(msg.sender);
        emit DisputeVoteCast(_contentHash, msg.sender, vote);
        if (dv.votes[true] + dv.votes[false] >= consensusThreshold) {
            dv.resolved = true;
            dv.result = dv.votes[true] > dv.votes[false];
            emit DisputeResolved(_contentHash, dv.result);
            // Optionally, update task status and reputation here
        }
    }
}
