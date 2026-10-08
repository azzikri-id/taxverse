// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface ITaxVerse {
    function bayarPajak(bytes32 vehicleId) external;
}

/// @notice KHUSUS TEST. Token jahat yang mencoba memanggil ulang `bayarPajak`
///         di tengah transfer, untuk membuktikan proteksi reentrancy bekerja.
contract ReentrantToken is ERC20 {
    ITaxVerse public target;
    bytes32 public vehicleId;

    constructor() ERC20("Evil Token", "EVIL") {
        _mint(msg.sender, 1e30);
    }

    function setTarget(ITaxVerse target_, bytes32 vehicleId_) external {
        target = target_;
        vehicleId = vehicleId_;
    }

    function transferFrom(address from, address to, uint256 value) public override returns (bool) {
        if (address(target) != address(0)) {
            target.bayarPajak(vehicleId); // serangan: masuk lagi sebelum panggilan pertama selesai
        }
        return super.transferFrom(from, to, value);
    }
}
