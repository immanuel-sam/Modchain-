// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Minimal ERC721 interface for Remix (replace with OpenZeppelin import if available)
interface IERC721 {
    function safeMint(address to, uint256 tokenId) external;
}

contract NFTProofOfModeration {
    string public name = "AI TrustGuard Moderator Badge";
    string public symbol = "AITG-MOD";
    uint256 public nextTokenId = 1;
    address public owner;
    mapping(uint256 => address) public ownerOf;
    mapping(address => uint256[]) public tokensOf;
    event Minted(address indexed moderator, uint256 tokenId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function mint(address moderator) public onlyOwner returns (uint256) {
        uint256 tokenId = nextTokenId++;
        ownerOf[tokenId] = moderator;
        tokensOf[moderator].push(tokenId);
        emit Minted(moderator, tokenId);
        return tokenId;
    }

    function getTokensOf(address moderator) public view returns (uint256[] memory) {
        return tokensOf[moderator];
    }
} 