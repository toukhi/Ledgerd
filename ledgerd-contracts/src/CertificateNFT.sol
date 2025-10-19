// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC721} from "openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "openzeppelin-contracts/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";

contract CertificateNFT is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    event CertificateIssued(
        uint256 indexed tokenId,
        address indexed to,
        address indexed issuer,
        string tokenURI
    );

    constructor(address initialOwner, string memory name_, string memory symbol_)
        ERC721(name_, symbol_)
        Ownable(initialOwner)
    {}

    function issue(address to, string memory tokenURI_) external onlyOwner returns (uint256 tokenId) {
        tokenId = ++_nextTokenId;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);
        emit CertificateIssued(tokenId, to, owner(), tokenURI_);
    }

    // Optional revoke. Do NOT override _burn in OZ v5.
    function revoke(uint256 tokenId) external onlyOwner {
        _burn(tokenId); // calls ERC721._burn (non-virtual in v5)
    }

    // Resolve multiple inheritance for ERC165
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
}