 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Interface for ContentBounty
interface IContentBounty {
    function setBounty(bytes32 _contentHash) external payable;
}

/**
 * @title ContentSubmission
 * @dev Handles content submission, associated bounties, task descriptions,
 * required expertise, and deadlines.
 * This is a standard, non-upgradeable contract.
 */
contract ContentSubmission {

    // --- Enums ---
    enum SubmissionStatus {
        Pending,        // Just submitted, awaiting moderation
        UnderReview,    // A moderator has picked it up
        Completed,      // Moderation finished, bounty may be claimed
        Expired,        // Deadline passed without completion
        Disputed        // Content verdict is disputed
    }

    // --- Structs ---
    struct ContentDetails {
        address submitter;
        string taskDescription;
        bytes32[] requiredExpertiseHashes;
        uint256 submissionTimestamp;
        uint256 deadline;
        uint256 bountyAmount;
        SubmissionStatus status;
    }

    // --- State Variables ---
    mapping(bytes32 => ContentDetails) public submissions;

    address public owner; // The address that deployed this contract
    IContentBounty public contentBountyContract; // Instance of the ContentBounty contract

    // --- Events ---
    event ContentSubmitted(
        bytes32 indexed contentHash,
        address indexed submitter,
        uint256 bountyAmount,
        uint256 deadline,
        string taskDescription
    );
    event SubmissionStatusUpdated(bytes32 indexed contentHash, SubmissionStatus newStatus);
    event ContentExpired(bytes32 indexed contentHash);

    // --- Constructor ---
    // Sets the owner and the address of the ContentBounty contract.
    constructor(address _contentBountyAddress) {
        owner = msg.sender;
        require(_contentBountyAddress != address(0), "ContentBounty address cannot be zero.");
        contentBountyContract = IContentBounty(_contentBountyAddress);
    }

    // --- Modifiers ---
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function.");
        _;
    }

    // --- Civic Verification Modifier ---
    modifier onlyVerified(address user) {
        // This will be checked off-chain or by the backend, as this contract does not have direct Civic integration
        require(user != address(0), "Verification required");
        _;
    }

    // --- Core Logic Functions ---

    /**
     * @dev Allows a user to submit content for review with a bounty and requirements.
     * The submitter must send native currency (ETH/MATIC) as the bounty.
     * @param _contentHash A unique hash identifying the content (e.g., keccak256 of the content).
     * @param _taskDescription A short description of the task or expectation for moderators.
     * @param _requiredExpertiseHashes An array of bytes32 hashes representing expertise tags required for this task.
     * @param _deadlineTimestamp The Unix timestamp by which the task must be completed.
     */
    function submitContent(
        bytes32 _contentHash,
        string memory _taskDescription,
        bytes32[] memory _requiredExpertiseHashes,
        uint256 _deadlineTimestamp
    ) public payable onlyVerified(msg.sender) {
        require(msg.value > 0, "Submission: Bounty must be greater than zero.");
        require(_contentHash != bytes32(0), "Submission: Content hash cannot be zero.");
        require(submissions[_contentHash].submitter == address(0), "Submission: Content already submitted.");
        require(_deadlineTimestamp > block.timestamp, "Submission: Deadline must be in the future.");
        require(_requiredExpertiseHashes.length > 0, "Submission: At least one expertise tag is required.");

        submissions[_contentHash] = ContentDetails({
            submitter: msg.sender,
            taskDescription: _taskDescription,
            requiredExpertiseHashes: _requiredExpertiseHashes,
            submissionTimestamp: block.timestamp,
            deadline: _deadlineTimestamp,
            bountyAmount: msg.value,
            status: SubmissionStatus.Pending
        });

        // Transfer the bounty to the ContentBounty contract for safekeeping
        contentBountyContract.setBounty{value: msg.value}(_contentHash);

        emit ContentSubmitted(
            _contentHash,
            msg.sender,
            msg.value,
            _deadlineTimestamp,
            _taskDescription
        );
    }

    /**
     * @dev Allows the owner to update the status of a submission.
     * This would typically be called by a trusted backend after moderation actions.
     * @param _contentHash The hash of the content.
     * @param _newStatus The new status for the submission.
     */
    function updateSubmissionStatus(bytes32 _contentHash, SubmissionStatus _newStatus) public onlyOwner {
        require(submissions[_contentHash].submitter != address(0), "Status Update: Content not found.");
        submissions[_contentHash].status = _newStatus;
        emit SubmissionStatusUpdated(_contentHash, _newStatus);
    }

    // --- View Functions ---
    function getSubmissionsByStatus(SubmissionStatus status) public view returns (bytes32[] memory) {
        uint256 count = 0;
        for (uint i = 0; i < 2**16; i++) {
            bytes32 hash = bytes32(i);
            if (submissions[hash].submitter != address(0) && submissions[hash].status == status) {
                count++;
            }
        }
        bytes32[] memory hashes = new bytes32[](count);
        uint256 idx = 0;
        for (uint i = 0; i < 2**16; i++) {
            bytes32 hash = bytes32(i);
            if (submissions[hash].submitter != address(0) && submissions[hash].status == status) {
                hashes[idx++] = hash;
            }
        }
        return hashes;
    }
    function getSubmissionsBySubmitter(address submitter) public view returns (bytes32[] memory) {
        uint256 count = 0;
        for (uint i = 0; i < 2**16; i++) {
            bytes32 hash = bytes32(i);
            if (submissions[hash].submitter == submitter) {
                count++;
            }
        }
        bytes32[] memory hashes = new bytes32[](count);
        uint256 idx = 0;
        for (uint i = 0; i < 2**16; i++) {
            bytes32 hash = bytes32(i);
            if (submissions[hash].submitter == submitter) {
                hashes[idx++] = hash;
            }
        }
        return hashes;
    }

    // --- Expiry Logic ---
    function expireContent(bytes32 _contentHash) public onlyOwner {
        require(submissions[_contentHash].submitter != address(0), "Content not found");
        require(submissions[_contentHash].status == SubmissionStatus.Pending || submissions[_contentHash].status == SubmissionStatus.UnderReview, "Cannot expire");
        require(submissions[_contentHash].deadline < block.timestamp, "Deadline not passed");
        submissions[_contentHash].status = SubmissionStatus.Expired;
        emit ContentExpired(_contentHash);
    }
}
