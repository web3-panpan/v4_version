// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20FlashMint.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract V1_Token is ERC20, ERC20Burnable, Pausable, Ownable, ERC20Permit, ERC20Votes, ERC20FlashMint {
    constructor() ERC20("V1_flare", "flare") ERC20Permit("V1_flare") {
        _mint(msg.sender, 10000000000000 * 10 ** decimals());
        _mint(0x30654B9D1C5c89f4ba05eEbE627Bc992AbEbccD9, 10000000000000 * 10 ** decimals());
        _mint(0x26DA4b4CB6a4164f1211C8faf2C03599fD882fa1, 10000000000000 * 10 ** decimals());  
        _mint(0x9Fd1Ff7D52f0D821Bd2E9f320B7e88f63F61cc7d, 10000000000000 * 10 ** decimals());  
        _mint(0x8bA92227E04B074fA8bD38B96c8e4a4342405cF9, 10000000000000 * 10 ** decimals());  
        
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount * 10 ** decimals());
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        whenNotPaused
        override
    {
        super._beforeTokenTransfer(from, to, amount);
    }

    // The following functions are overrides required by Solidity.

    function _afterTokenTransfer(address from, address to, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._burn(account, amount);
    }
}
