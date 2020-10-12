pragma solidity 0.6.0;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import "./EIP712MetaTransaction.sol";

contract SimpleTimeLocked is EIP712MetaTransaction("SimpleTimeLocked","1"){

    address public creator;
    address public owner;
    uint256 public unlockDate;
    uint256 public createdAt;

    modifier onlyOwner {
        address payable payee = msgSender();
        require(payee == owner);
        _;
    }

    constructor(
        address _creator,
        address _owner,
        uint256 _unlockDate
    ) public {
        creator = _creator;
        owner = _owner;
        unlockDate = _unlockDate;
        createdAt = now;
    }

    // keep all the ether sent to this address
    receive() external payable {
        address payable payee = msgSender();
        emit Received(payee, msg.value);
    }

    // callable by owner only, after specified time
    function withdraw() onlyOwner public {
       require(now >= unlockDate);
       address payable payee = msgSender();
       //now send all the balance
       payee.transfer(address(this).balance);
       emit Withdrew(msgSender(), address(this).balance);
    }
    
  
    // callable by owner only, after specified time, only for Tokens implementing ERC20
    function withdrawTokens(address _tokenContract) onlyOwner public {
       require(now >= unlockDate);
       ERC20 token = ERC20(_tokenContract);
       //now send all the token balance
       uint256 tokenBalance = token.balanceOf(address(this));
       token.transfer(owner, tokenBalance);
       emit WithdrewTokens(_tokenContract, msgSender(), tokenBalance);
    }
    
    /*Interestingly, now—which is equivalent to block.timestamp—may not be as accurate as one may think. 
    It is up to the miner to pick it, so it could be up to 15 minutes (900 seconds) off as explained in the following formula:*/
    
    // parent.timestamp >= block.timestamp <= now + 900 seconds
    // As a consequence, now shouldn’t be used for measuring small time units
    
    

    function info() public view returns(address, address, uint256, uint256, uint256) {
        return (creator, owner, unlockDate, createdAt, address(this).balance);
    }

    event Received(address from, uint256 amount);
    event Withdrew(address to, uint256 amount);
    event WithdrewTokens(address tokenContract, address to, uint256 amount);
}
