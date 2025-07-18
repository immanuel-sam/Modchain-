 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title ContentBounty
 * @dev Handles the financial aspect of the system, allowing users to set a bounty
 * for reviewing content and allowing a claimant to claim that bounty.
 * This is a standard, non-upgradeable contract.
 */
contract ContentBounty {
    address public owner; // The address that deployed the contract
    address public trustedCaller; // The address of the ModerationTask contract (or other trusted contract)
    mapping(bytes32 => uint256) public contentBounties; // contentHash => bountyAmount (in wei)

    event BountySet(bytes32 indexed contentHash, uint256 amount);
    event BountyClaimed(bytes32 indexed contentHash, address indexed claimant, uint256 amount);
    event BountyWithdrawn(bytes32 indexed contentHash, uint256 amount);

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
     * @dev Allows anyone to set a bounty for a piece of content.
     * The sender must send native currency (ETH/MATIC) with this transaction.
     * @param _contentHash A unique hash identifying the content.
     */
    function setBounty(bytes32 _contentHash) public payable {
        require(msg.value > 0, "Bounty must be greater than zero");
        require(_contentHash != bytes32(0), "Content hash cannot be zero.");
        require(contentBounties[_contentHash] == 0, "Bounty already set for this content.");

        contentBounties[_contentHash] = msg.value;
        emit BountySet(_contentHash, msg.value);
    }

    /**
     * @dev Allows a claimant to claim a bounty for a content hash.
     * This function should be called by a trusted entity (e.g., the ModerationTask contract
     * or a backend service after consensus) to pay out.
     * @param _contentHash The hash of the content whose bounty is being claimed.
     * @param _claimant The address to send the bounty to. Declared as `address payable`.
     */
    function claimBounty(bytes32 _contentHash, address payable _claimant) public onlyTrustedCaller {
        require(contentBounties[_contentHash] > 0, "No bounty set or already claimed.");
        require(_claimant != address(0), "Claimant address cannot be zero.");

        uint256 amount = contentBounties[_contentHash];
        contentBounties[_contentHash] = 0; // Set bounty to 0 to prevent double claiming

        (bool success, ) = _claimant.call{value: amount}("");
        require(success, "Bounty transfer failed.");
        emit BountyClaimed(_contentHash, _claimant, amount);
    }

    /**
     * @dev A fallback function to receive ETH if sent directly to the contract.
     */
    receive() external payable {}

    /**
     * @dev Allows the owner to withdraw any remaining funds from the contract.
     * This could be used for unspent bounties after a task expires or is cancelled.
     */
    function withdrawFunds() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw.");
        (bool success, ) = owner.call{value: balance}("");
        require(success, "Withdrawal failed.");
    }

    // --- View Function ---
    function getBountiesAbove(uint256 minAmount) public view returns (bytes32[] memory) {
        uint256 count = 0;
        for (uint i = 0; i < 2**16; i++) {
            bytes32 hash = bytes32(i);
            if (contentBounties[hash] > minAmount) {
                count++;
            }
        }
        bytes32[] memory hashes = new bytes32[](count);
        uint256 idx = 0;
        for (uint i = 0; i < 2**16; i++) {
            bytes32 hash = bytes32(i);
            if (contentBounties[hash] > minAmount) {
                hashes[idx++] = hash;
            }
        }
        return hashes;
    }
    // --- Withdraw Unclaimed Bounty ---
    function withdrawUnclaimedBounty(bytes32 _contentHash) public onlyOwner {
        require(contentBounties[_contentHash] > 0, "No bounty to withdraw");
        uint256 amount = contentBounties[_contentHash];
        contentBounties[_contentHash] = 0;
        (bool success, ) = owner.call{value: amount}("");
        require(success, "Withdrawal failed");
        emit BountyWithdrawn(_contentHash, amount);
    }
}
