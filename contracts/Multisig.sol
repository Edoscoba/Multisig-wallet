
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


contract Multisig {
    uint8 public quorum;
    uint8 public noOfValidSigners;
    uint256 public txCount;

    struct Transaction {
        uint256 id;
        uint256 amount;
        address sender;
        address recipient;
        bool isCompleted;
        uint256 timestamp;
        uint256 noOfApproval;
        address tokenAddress;
        address[] transactionSigners;
    }

    mapping(address => bool) public isValidSigner;
    mapping(uint => Transaction) public transactions; 
    mapping(address => mapping(uint256 => bool)) hasSigned;

    uint8 public proposedQuorum;
    mapping(address => bool) hasApprovedNewQuorum;
    uint8 public quorumApprovals; // Counter for quorum change approvals

    constructor(uint8 _quorum, address[] memory _validSigners) {
        quorum = _quorum;

        for(uint256 i = 0; i < _validSigners.length; i++) {
            require(_validSigners[i] != address(0), "zero address not allowed");
            isValidSigner[_validSigners[i]] = true;
        }

        noOfValidSigners = uint8(_validSigners.length);

        if (!isValidSigner[msg.sender]){
            isValidSigner[msg.sender] = true;
            noOfValidSigners += 1;
        }
    }

     function transfer(uint256 _amount, address _recipient, address _tokenAddress) external {
        require(msg.sender != address(0), "address zero found");
        require(isValidSigner[msg.sender], "invalid signer");

        require(_amount > 0, "can't send zero amount");
        require(_recipient != address(0), "address zero found");
        require(_tokenAddress != address(0), "address zero found");

        require(IERC20(_tokenAddress).balanceOf(address(this)) >= _amount, "insufficient funds");

        uint256 _txId = txCount + 1;
        Transaction storage trx = transactions[_txId];
        
        trx.id = _txId;
        trx.amount = _amount;
        trx.recipient = _recipient;
        trx.sender = msg.sender;
        trx.timestamp = block.timestamp;
        trx.tokenAddress = _tokenAddress; 
        trx.noOfApproval += 1;
        trx.transactionSigners.push(msg.sender);
        hasSigned[msg.sender][_txId] = true;

        txCount += 1;
    }

    function approveTx(uint8 _txId) external {
        Transaction storage trx = transactions[_txId];

        require(IERC20(trx.tokenAddress).balanceOf(address(this)) >= trx.amount, "insufficient funds");

        require(trx.id != 0, "invalid tx id");
        require(!trx.isCompleted, "transaction already completed");
        require(trx.noOfApproval < quorum, "approvals already reached");

        // for(uint256 i = 0; i < trx.transactionSigners.length; i++) {
        //     if(trx.transactionSigners[i] == msg.sender) {
        //         revert("can't sign twice");
        //     }
        // }

        require(isValidSigner[msg.sender], "not a valid signer");
        require(!hasSigned[msg.sender][_txId], "can't sign twice");

        hasSigned[msg.sender][_txId] = true;
        trx.noOfApproval += 1;
        trx.transactionSigners.push(msg.sender);

        if(trx.noOfApproval == quorum) {
            trx.isCompleted = true;
            IERC20(trx.tokenAddress).transfer(trx.recipient, trx.amount);
        }
    }



    function updateQuorum(uint8 _newQuorum) external {
        require(isValidSigner[msg.sender], "only valid signers can propose");
        require(_newQuorum > 0, "new quorum must be greater than 0");
        require(_newQuorum <= noOfValidSigners, "quorum cannot exceed number of signers");

        proposedQuorum = _newQuorum;
        quorumApprovals = 0; 
        resetQuorumApprovals();
    }

    function approveNewQuorum() external {
        require(isValidSigner[msg.sender], "only valid signers can approve");
        require(proposedQuorum > 0, "no quorum change proposed");
        require(!hasApprovedNewQuorum[msg.sender], "already approved quorum change");

        hasApprovedNewQuorum[msg.sender] = true;
        quorumApprovals += 1;

        
        if (quorumApprovals >= quorum) {
            quorum = proposedQuorum;
            proposedQuorum = 0; 
            resetQuorumApprovals(); 
        }
    }

    function resetQuorumApprovals() internal {
        for (uint256 i = 0; i < noOfValidSigners; i++) {
            address signer = msg.sender; 
            hasApprovedNewQuorum[signer] = false;
        }
    }
}
