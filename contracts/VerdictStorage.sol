 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title VerdictStorage
 * @dev Stores the verdicts (judgments) provided by moderators for specific pieces of content.
 * This is a standard, non-upgradeable contract.
 */
contract VerdictStorage {
    // --- Structs ---
    struct Verdict {
        address moderator;
        bool isAccurate; // The verdict itself: true for accurate/safe, false for hallucinated/harmful
        uint256 timestamp;
        string justification; // Optional justification/comments
    }

    // --- State Variables ---
    mapping(bytes32 => Verdict[]) public contentVerdicts; // contentHash => array of Verdicts

    address public owner; // The address that deployed this contract
    address public trustedCaller; // The address of the ModerationTask contract (or other trusted contract)

    // --- Events ---
    event VerdictRecorded(
        bytes32 indexed contentHash,
        address indexed moderator,
        bool isAccurate,
        string justification
    );
    event VerdictsByModerator(address indexed moderator, bytes32[] contentHashes);

    // --- Constructor ---
    constructor() {
        owner = msg.sender; // The deployer of the contract becomes the owner
    }

    // --- Modifiers ---
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function.");
        _;
    }

    modifier onlyTrustedCaller() {
        require(msg.sender == trustedCaller, "Only trusted caller can call this function.");
        _;
    }

    /**
     * @dev Allows the owner to set a trusted caller address.
     * This will typically be the ModerationTask contract.
     * @param _trustedCaller The address to set as the trusted caller.
     */
    function setTrustedCaller(address _trustedCaller) public onlyOwner {
        require(_trustedCaller != address(0), "Trusted caller address cannot be zero.");
        trustedCaller = _trustedCaller;
    }

    /**
     * @dev Records a verdict for a piece of content.
     * This function should primarily be called by the ModerationTask contract.
     * @param _contentHash The unique hash of the content being reviewed.
     * @param _isAccurate The moderator's judgment (true for accurate, false for inaccurate).
     * @param _justification Optional justification/comments from the moderator.
     */
    function recordVerdict(bytes32 _contentHash, bool _isAccurate, string memory _justification) public onlyTrustedCaller {
        require(_contentHash != bytes32(0), "Verdict: Content hash cannot be zero.");
        require(msg.sender != address(0), "Verdict: Caller cannot be zero address.");

        contentVerdicts[_contentHash].push(Verdict(msg.sender, _isAccurate, block.timestamp, _justification));
        emit VerdictRecorded(_contentHash, msg.sender, _isAccurate, _justification);
    }

    /**
     * @dev Retrieves all recorded verdicts for a given content hash.
     * @param _contentHash The unique hash of the content.
     * @return An array of Verdict structs for the given content hash.
     */
    function getVerdicts(bytes32 _contentHash) public view returns (Verdict[] memory) {
        return contentVerdicts[_contentHash];
    }

    // --- View Function ---
    function getVerdictsByModerator(address moderator) public view returns (bytes32[] memory) {
        uint256 count = 0;
        for (uint i = 0; i < 2**16; i++) {
            bytes32 hash = bytes32(i);
            Verdict[] storage verdictArr = contentVerdicts[hash];
            for (uint j = 0; j < verdictArr.length; j++) {
                if (verdictArr[j].moderator == moderator) {
                    count++;
                    break;
                }
            }
        }
        bytes32[] memory hashes = new bytes32[](count);
        uint256 idx = 0;
        for (uint i = 0; i < 2**16; i++) {
            bytes32 hash = bytes32(i);
            Verdict[] storage verdictArr = contentVerdicts[hash];
            for (uint j = 0; j < verdictArr.length; j++) {
                if (verdictArr[j].moderator == moderator) {
                    hashes[idx++] = hash;
                    break;
                }
            }
        }
        return hashes;
    }
}
