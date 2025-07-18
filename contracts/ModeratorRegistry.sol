 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title ModeratorRegistry
 * @dev Manages registered moderators, their expertise tags, verification status, and reputation score.
 * This contract integrates with off-chain identity verification, such as Civic Auth,
 * to ensure that only real and unique human users can participate in moderation.
 * This is a standard, non-upgradeable contract.
 */
contract ModeratorRegistry {
    // --- State Variables ---
    mapping(address => bool) public isRegistered; // Tracks if an address is registered
    mapping(address => mapping(bytes32 => bool)) public expertiseTags; // userAddress => tagHash => bool
    // This flag indicates if a user has passed an off-chain identity verification, e.g., Civic Auth.
    // Set to true by the contract owner after successful external verification.
    mapping(address => bool) public hasPassedVerification;
    mapping(address => uint256) public reputationScore; // Stores the reputation score for each user

    address public owner; // The address that deployed this contract

    // --- Events ---
    event UserRegistered(address indexed user, uint256 initialReputation);
    event ExpertiseTagAdded(address indexed user, bytes32 indexed tagHash);
    event ExpertiseTagRemoved(address indexed user, bytes32 indexed tagHash);
    // Event specifically for when a user's identity verification status is updated (e.g., by Civic Auth)
    event IdentityVerificationStatusUpdated(address indexed user, bool status);
    event ReputationUpdated(address indexed user, uint256 newReputation);
    // --- Badge System ---
    enum Badge { None, Bronze, Silver, Gold, Platinum }
    mapping(address => Badge) public moderatorBadges;
    event BadgeAssigned(address indexed moderator, Badge badge);

    // --- Constructor ---
    // Runs only once when the contract is deployed. Sets the deployer as the owner.
    constructor() {
        owner = msg.sender;
    }

    // --- Modifiers ---
    // Restricts function calls to only the owner of the contract.
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function.");
        _; // Continues execution of the function if the condition is met
    }

    // --- Civic Verification Modifier ---
    modifier onlyVerified() {
        require(hasPassedVerification[msg.sender], "Civic verification required");
        _;
    }

    // --- Core Logic Functions ---

    /**
     * @dev Allows a user to register on the platform.
     * This function sets their initial expertise tags.
     * The actual "quiz" or "cred verification" happens OFF-CHAIN.
     * The `_passedQuizVerification` parameter here is for the *quiz/expertise* verification,
     * not the identity verification (Civic Auth). Identity verification is set separately
     * by the owner via `setVerificationStatus`.
     * @param _expertiseHashes An array of bytes32 hashes representing the user's expertise tags.
     * @param _passedQuizVerification Boolean indicating if the user passed the off-chain quiz/creds.
     */
    function register(bytes32[] memory _expertiseHashes, bool _passedQuizVerification) public {
        require(!isRegistered[msg.sender], "Registration: User is already registered.");
        require(_passedQuizVerification, "Registration: Quiz/Expertise verification failed. Cannot register.");

        isRegistered[msg.sender] = true;

        for (uint i = 0; i < _expertiseHashes.length; i++) {
            require(_expertiseHashes[i] != bytes32(0), "Registration: Expertise tag cannot be zero.");
            expertiseTags[msg.sender][_expertiseHashes[i]] = true;
            emit ExpertiseTagAdded(msg.sender, _expertiseHashes[i]);
        }

        // hasPassedVerification (for Civic Auth) is NOT set here. It's set by the owner.
        reputationScore[msg.sender] = 70; // Assign initial reputation score

        emit UserRegistered(msg.sender, 70);
    }

    /**
     * @dev Allows a registered user to add a new expertise tag.
     * @param _tagHash The bytes32 hash of the expertise tag to add.
     */
    function addExpertiseTag(bytes32 _tagHash) public {
        require(isRegistered[msg.sender], "Add Expertise: User not registered.");
        require(_tagHash != bytes32(0), "Add Expertise: Tag cannot be zero.");
        require(!expertiseTags[msg.sender][_tagHash], "Add Expertise: Tag already exists.");

        expertiseTags[msg.sender][_tagHash] = true;
        emit ExpertiseTagAdded(msg.sender, _tagHash);
    }

    /**
     * @dev Allows a registered user to remove an expertise tag.
     * @param _tagHash The bytes32 hash of the expertise tag to remove.
     */
    function removeExpertiseTag(bytes32 _tagHash) public {
        require(isRegistered[msg.sender], "Remove Expertise: User not registered.");
        require(expertiseTags[msg.sender][_tagHash], "Remove Expertise: Tag does not exist.");

        expertiseTags[msg.sender][_tagHash] = false;
        emit ExpertiseTagRemoved(msg.sender, _tagHash);
    }

    /**
     * @dev Checks if a user has a specific expertise tag.
     * @param _user The address of the user.
     * @param _tagHash The bytes32 hash of the expertise tag.
     * @return True if the user has the tag, false otherwise.
     */
    function hasExpertiseTag(address _user, bytes32 _tagHash) public view returns (bool) {
        return expertiseTags[_user][_tagHash];
    }

    /**
     * @dev Allows the contract owner to update a user's *identity verification* status.
     * This function is called by a trusted backend (or manually by owner for MVP)
     * after a user successfully completes a Civic Auth flow (or similar identity check).
     * @param _user The address of the user whose status to update.
     * @param _status The new identity verification status (true if verified, false otherwise).
     */
    function setVerificationStatus(address _user, bool _status) public onlyOwner {
        require(isRegistered[_user], "Verification Status: User not registered.");
        hasPassedVerification[_user] = _status;
        emit IdentityVerificationStatusUpdated(_user, _status);
    }

    /**
     * @dev Allows the contract owner to update a user's reputation score.
     * This would be called by a trusted backend based on performance feedback.
     * @param _user The address of the user whose reputation to update.
     * @param _newScore The new reputation score.
     */
    function updateReputation(address _user, uint256 _newScore) public onlyOwner {
        require(isRegistered[_user], "Reputation Update: User not registered.");
        reputationScore[_user] = _newScore;
        emit ReputationUpdated(_user, _newScore);
    }

    /**
     * @dev Returns the reputation score of a given user.
     * @param _user The address of the user.
     * @return The reputation score.
     */
    function getReputationScore(address _user) public view returns (uint256) {
        return reputationScore[_user];
    }

    /**
     * @dev Allows the contract owner to increase a user's reputation score.
     * This function is designed for automated reputation updates.
     * @param _user The address of the user whose reputation to increase.
     * @param _amount The amount to increase the reputation by.
     */
    function increaseReputation(address _user, uint256 _amount) public onlyOwner {
        require(isRegistered[_user], "User not registered");
        reputationScore[_user] += _amount;
        emit ReputationUpdated(_user, reputationScore[_user]);
        _assignBadge(_user);
    }
    /**
     * @dev Allows the contract owner to decrease a user's reputation score.
     * This function is designed for automated reputation updates.
     * @param _user The address of the user whose reputation to decrease.
     * @param _amount The amount to decrease the reputation by.
     */
    function decreaseReputation(address _user, uint256 _amount) public onlyOwner {
        require(isRegistered[_user], "User not registered");
        if (reputationScore[_user] > _amount) {
            reputationScore[_user] -= _amount;
        } else {
            reputationScore[_user] = 0;
        }
        emit ReputationUpdated(_user, reputationScore[_user]);
        _assignBadge(_user);
    }
    function _assignBadge(address _user) internal {
        uint256 score = reputationScore[_user];
        Badge badge = Badge.None;
        if (score >= 1000) badge = Badge.Platinum;
        else if (score >= 500) badge = Badge.Gold;
        else if (score >= 250) badge = Badge.Silver;
        else if (score >= 100) badge = Badge.Bronze;
        moderatorBadges[_user] = badge;
        emit BadgeAssigned(_user, badge);
    }
    function getBadge(address _user) public view returns (Badge) {
        return moderatorBadges[_user];
    }
    // --- Leaderboard ---
    function getTopModerators(uint256 n) public view returns (address[] memory) {
        address[] memory mods = new address[](n);
        uint256[] memory scores = new uint256[](n);
        uint256 minScore;
        uint256 minIndex;
        for (uint i = 0; i < 2**16; i++) { // Arbitrary large loop limit for MVP
            address mod = address(uint160(i));
            if (isRegistered[mod]) {
                uint256 score = reputationScore[mod];
                if (score > minScore) {
                    mods[minIndex] = mod;
                    scores[minIndex] = score;
                    // Find new min
                    minScore = score;
                    minIndex = 0;
                    for (uint j = 1; j < n; j++) {
                        if (scores[j] < minScore) {
                            minScore = scores[j];
                            minIndex = j;
                        }
                    }
                }
            }
        }
        return mods;
    }
}
