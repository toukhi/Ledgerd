// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "./CertificateNFT.sol";

contract CertificateFactory {
    event CollectionCreated(address indexed issuer, address indexed collection, string name, string symbol);

    mapping(address => address[]) private _collectionsByIssuer;
    mapping(address => address) public issuerOfCollection;

    function createCollection(string memory name_, string memory symbol_) external returns (address collection) {
        collection = address(new CertificateNFT(msg.sender, name_, symbol_));
        _collectionsByIssuer[msg.sender].push(collection);
        issuerOfCollection[collection] = msg.sender;
        emit CollectionCreated(msg.sender, collection, name_, symbol_);
    }

    function collectionsByIssuer(address issuer) external view returns (address[] memory) {
        return _collectionsByIssuer[issuer];
    }

    function isIssuerCollection(address issuer, address collection) external view returns (bool) {
        return issuerOfCollection[collection] == issuer;
    }
}
