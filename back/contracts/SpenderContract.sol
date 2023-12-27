// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol"; 
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20FlashMint.sol";


contract VotingContract is ReentrancyGuard,  Pausable,Ownable{

    uint256 constant MAX_UINT256 = type(uint256).max;
    address public myToken;  // 用于投票的代币地址
    using Counters for Counters.Counter;
    Counters.Counter private _proposalIds;
    Counters.Counter private _UserStakeIdCounter; // 用于跟踪每次质押的计数器

    constructor(address _myToken) {
        myToken = _myToken;
    }

    event Received(address caller, uint amount, string message);
    event Deposited(address indexed user, uint amount);
    event Withdrawn(address indexed user, uint amount);
    event Voted(address indexed _address, uint256 indexed _proposalId, uint256 indexed _optionId, uint256 _amount);
    event ProposalAndOptionsSubmitted(address indexed user, uint256 indexed proposalIndex, string proposalDescription, string[] optionDescriptions, uint256 endtime);
    event DepositForProposal(address indexed staker, uint256 amount, bool staked, uint256 unlockTime, uint256 indexed stakeIndex);
    event TokensStaked(address indexed user, uint256 amount, bool isForProposal);
    event FundsSettledForAverageQuality(uint256 indexed proposalId, address indexed proposer, uint256 amountToReturn);
    event WithdrawalDetailed(address indexed user, uint256 amountWithdrawn, uint256 balanceAfterWithdrawal);
    event UnlockTimeUpdated(address indexed staker, uint256 indexed stakeIndex, uint256 newUnlockTime);
    event FundsPenalizedForNonCompliance(uint256 indexed proposalId, address indexed proposer, uint256 penalty);
    event ProposalStatusChanged(uint256 proposalId, bool isActive);
    event ProposalEndTime(uint256 _proposalId, uint256 endTime);
    event ProposalForUser(address indexed userAddress, uint256 indexed proposalId, string proposalDescription, uint256 stakeAmount, string[] optionDescriptions, uint256 endtime);
    event StakeReleased(address indexed user, uint256 stakeIndex, bool penalized, uint256 amountReleased);
    event ProposalEnded(uint256 indexed proposalId, bool isActive);
    event ProposalConcluded(uint256 indexed proposalId, bool isActive);
    event RewardDistributed(address indexed voter, uint256 proposalId, uint256 amount, bool isWinner);


    mapping(uint256 => uint256) public votingEndTimes;  // 投票结束时间
    mapping(address => uint256) public balances;

    mapping(uint256 => address[]) public proposalVoters;


    // 提案
    struct Proposal {
        address proposer; // 提案发起人
        string description; // 提案描述
        uint256 stakeAmount; // 质押代币数量
        bool active; // 提案是否活跃
        bool isSettled; // 添加属性以跟踪提案是否已结算
        bool isWagered;
        uint256 endTime;
    }
    // 提议选项
    struct Option {
        string description; // 选项描述
        uint256 voteCount; // 投票计数
        // ...其他属性
    }

    struct Stake {
        uint256 amount;      // 质押的金额
        uint256 unlockTime;  // 资金解锁的时间
        address staker;      // 质押者地址
        bool isWagered;
    }

    struct VoteRecord {
        uint256 proposalId; // 提案ID
        uint256 optionId;   // 用户选择的选项ID
        uint256 amount;     // 投票数量
    }

    mapping(address => VoteRecord[]) public userVotingHistory;    // 用户的投票历史记录映射
    mapping(address => Stake[]) public stakesForUser;
    Proposal[] public proposals; // 提案数组
    mapping(uint256 => Option[]) public proposalOptions; // 提案ID到选项数组的映射
    mapping(address => mapping(uint256 => bool)) public voters;

    mapping(address => uint256) public proposalTokenDeposits;
    mapping(address => uint256) public usedVotingRights;

    address[] public UserStakerAddresses; // 质押者地址数组
    uint256[] public UserSstakeAmounts; 


    mapping(address => mapping(uint256 => uint256)) public votingRecords;
    mapping(address => mapping(uint256 => uint256)) public added_proposal;

    mapping(uint256 => address[]) public voterAddressesByProposal;
    mapping(uint256 => uint256[]) public optionIdsByProposal;
    mapping(uint256 => uint256[]) public voteCountsByProposal;
    mapping(address => mapping(uint256 => uint256)) public voterIndexInProposal;


    // 常规质押代币
    function deposit(uint256 amount) public {
        require(
            IERC20(myToken).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        balances[msg.sender] = balances[msg.sender] + amount;
        emit Deposited(msg.sender, amount);
    }


    function submitProposalForReview(uint256 amount) public returns(uint256){
        
        require(balances[msg.sender] >= amount, "Insufficient balance");
        require(balances[msg.sender] - usedVotingRights[msg.sender] >= amount, "Insufficient balance");
        uint256 unlockTime = block.timestamp + 7 days; // 假设7天后解锁

        uint256 User_stakeIndex = _UserStakeIdCounter.current();
        _UserStakeIdCounter.increment(); // 自动增加质押计数器

        // 根据amount的值设置isWagered
        bool isWagered;
        if (amount > 0) {
            isWagered = true;
            proposalTokenDeposits[msg.sender] += amount;
        } else {
            isWagered = false;
        }

        UserStakerAddresses.push(msg.sender);
        UserSstakeAmounts.push(amount);
        emit DepositForProposal(msg.sender, amount, isWagered, unlockTime, User_stakeIndex);
        return User_stakeIndex; // 返回新创建的质押索引， 用于标记。。。 不等于提案id
    }

    function createProposalWithOptions(
        string memory proposalDescription,
        string[] memory optionDescriptions,
        uint amount,
        uint256 endtime
    ) public onlyOwner returns (uint256) {
        // 创建提案
        uint256 proposalId = _proposalIds.current(); // 获取新的提案ID
        _proposalIds.increment(); // 增加提案ID

        bool isWagered = amount > 0;

        uint256 unlockTime = block.timestamp + (endtime * 1 days); // 使用endtime * 1 days计算

        proposals.push(Proposal({
            proposer: msg.sender,
            description: proposalDescription,
            stakeAmount: amount,
            active: true,
            isSettled: false,
            isWagered: isWagered,
            endTime: unlockTime
        }));

        // 为提案添加选项
        for (uint i = 0; i < optionDescriptions.length; i++) {
            proposalOptions[proposalId].push(Option({
                description: optionDescriptions[i],
                voteCount: 0
            }));
        }
        // 触发事件
        emit ProposalAndOptionsSubmitted(msg.sender, proposalId, proposalDescription, optionDescriptions, unlockTime);

        return proposalId; // 返回新创建的提案ID
    }

    function processUserStakedProposal(
        address userAddress,
        string memory proposalDescription,
        uint256 stakeAmount,
        string[] memory optionDescriptions,
        uint256 stakeIndex,
        uint256 endtime
    ) public onlyOwner returns (uint256){

        address UserAddress = UserStakerAddresses[stakeIndex];
        uint256 UserAmount = UserSstakeAmounts[stakeIndex];
        require(UserAddress == userAddress, "the address is not same");
        require(stakeAmount == UserAmount, "Staked amount does not match or insufficient");

        uint256 unlockTime = block.timestamp + (endtime * 1 days); // 使用endtime * 1 days计算

        bool isWagered;
        if (stakeAmount > 0) {
            isWagered = true;
        } else {
            isWagered = false;
        }
        proposals.push(Proposal({
            proposer: userAddress,
            description: proposalDescription,
            stakeAmount: stakeAmount,
            active: true,
            isSettled: false,
            isWagered: isWagered,
            endTime: unlockTime
        }));

       uint256 proposalId = _proposalIds.current(); // 获取新的提案ID
        _proposalIds.increment(); // 增加提案ID

        for (uint256 i = 0; i < optionDescriptions.length; i++) {
            proposalOptions[proposalId].push(Option({
                description: optionDescriptions[i],
                voteCount: 0
            }));
        }
        emit ProposalForUser(userAddress, proposalId, proposalDescription, stakeAmount, optionDescriptions, unlockTime);

        return proposalId;
    }

    function withdraw(uint256 _amount) public nonReentrant {

        // 确保用户有足够的余额来提取
        uint256 availableBalance = getAvailableWithdrawBalance(msg.sender);
        require(availableBalance >= _amount, "Not enough available balance to withdraw");

        // 在余额更新前执行转账
        require(IERC20(myToken).transfer(msg.sender, _amount), "Transfer failed");

        // 更新余额
        balances[msg.sender] = balances[msg.sender] - _amount;

        // 触发提款事件
        emit WithdrawalDetailed(msg.sender, _amount, balances[msg.sender]);
    }

    function getAvailableWithdrawBalance(address user) public view returns (uint256) {
        uint256 totalBalance = balances[user];
        uint256 lockedForVoting = usedVotingRights[user];
        uint256 lockedInProposals = proposalTokenDeposits[user];

        // 计算因提案和投票锁定的代币总量
        uint256 totalLocked = lockedForVoting + lockedInProposals;
        return totalBalance > totalLocked ? totalBalance - totalLocked : 0;
    }

    function getProposalStatus(uint256 _proposalId) view public returns(bool){
        Proposal storage proposal = proposals[_proposalId];
        return proposal.active;
    }

    // 投票
    function vote(uint256 _proposalId, uint256 _optionId, uint256 _amount) public whenNotPaused {
        require(_proposalId < proposals.length, "The proposal does not exist");
        require(_optionId < proposalOptions[_proposalId].length, "The option does not exist");
        require(block.timestamp < proposals[_proposalId].endTime, "The voting period for this proposal has ended");
        require(proposals[_proposalId].active, "The proposal is not active");

        uint256 remainingVotingRights = balances[msg.sender] - usedVotingRights[msg.sender] - proposalTokenDeposits[msg.sender];
        require(remainingVotingRights >= _amount, "Insufficient voting rights");

        usedVotingRights[msg.sender] = usedVotingRights[msg.sender] + _amount;
        proposalOptions[_proposalId][_optionId].voteCount += _amount;
        votingRecords[msg.sender][_proposalId] += _amount;
        voters[msg.sender][_proposalId] = true;
        userVotingHistory[msg.sender].push(VoteRecord(_proposalId, _optionId, _amount));
        proposalVoters[_proposalId].push(msg.sender);

        // 记录投票者地址、选项ID和投票数
        voterAddressesByProposal[_proposalId].push(msg.sender);
        optionIdsByProposal[_proposalId].push(_optionId);
        voteCountsByProposal[_proposalId].push(_amount);

        // 记录投票者在提案中的索引
        voterIndexInProposal[msg.sender][_proposalId] = voterAddressesByProposal[_proposalId].length - 1;

        emit Voted(msg.sender, _proposalId, _optionId, _amount);
    }

    // Get the balance of the contract itself in MyToken
    function getContractBalance() public view returns (uint) {
        return IERC20(myToken).balanceOf(address(this));
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }


    function getUserVotingHistory(address _user)
        public
        view
        returns (
            uint256[] memory proposalIds,
            uint256[] memory optionIds,
            uint256[] memory amounts
        )
    {
        VoteRecord[] storage records = userVotingHistory[_user];
        proposalIds = new uint256[](records.length);
        optionIds = new uint256[](records.length);
        amounts = new uint256[](records.length);

        for (uint256 i = 0; i < records.length; i++) {
            proposalIds[i] = records[i].proposalId;
            optionIds[i] = records[i].optionId;
            amounts[i] = records[i].amount;
        }
    }

    function proposalsLength() public view returns (uint256) {
        return proposals.length;
    }

    function getOptionsCount(uint256 proposalId) public view returns (uint256) {
        return proposalOptions[proposalId].length;
    }

    function getOptionVoteCount(uint256 proposalId, uint256 optionIndex) public view returns (uint256) {
        require(proposalId < proposalsLength(), "Proposal does not exist.");
        require(optionIndex < proposalOptions[proposalId].length, "Option does not exist.");
        return proposalOptions[proposalId][optionIndex].voteCount;
    }

    function getCurrentProposalId() public view returns (uint256) {
        uint256 proposalArrayLength = proposals.length;
        uint256 currentCounterValue = _proposalIds.current();

        if (proposalArrayLength == currentCounterValue) {
            // 如果数组长度和计数器的值相等，返回当前的提案ID
            return currentCounterValue - 1;
        } else {
            // 如果不相等，可以返回一个错误标识或默认值
            return MAX_UINT256; // 例如返回一个最大值表示错误
        }
    }   

    function handleStakeRelease(address user, uint256 stakeIndex, bool penalizeStake) public onlyOwner {
        // 确保索引在范围内
        require(stakeIndex < UserSstakeAmounts.length, "Stake index out of bounds");
        uint256 amountToRelease = UserSstakeAmounts[stakeIndex];
        proposalTokenDeposits[user] -= amountToRelease;

        // 如果需要罚款，则计算并扣除罚款
        if (penalizeStake) {
            uint256 penaltyAmount = amountToRelease * 10 / 100; // 计算10%罚款
            amountToRelease -= penaltyAmount; // 减去罚款
            balances[user] -= penaltyAmount; // 从用户余额扣除罚款
        }
        // 清除处理过的质押金额
        UserSstakeAmounts[stakeIndex] = 0;

        // 触发事件，通知质押已被释放
        emit StakeReleased(user, stakeIndex, penalizeStake, amountToRelease);
    }

    function settleRewards(uint256 proposalId, uint256 winningOptionId) public onlyOwner nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.active, "Proposal must be inactive to settle rewards.");
        require(!proposal.isSettled, "Rewards already settled");

        uint256 totalVotesForWinningOption = proposalOptions[proposalId][winningOptionId].voteCount;
        require(totalVotesForWinningOption > 0, "No votes for winning option");
        // 假设的奖池总金额和平台收取比例

        for (uint256 i = 0; i < voterAddressesByProposal[proposalId].length; i++) {
            address voter = voterAddressesByProposal[proposalId][i];
            uint256 optionId = optionIdsByProposal[proposalId][i];
            uint256 voteCount = voteCountsByProposal[proposalId][i];
            require(usedVotingRights[voter] >= voteCount, "Not enough locked voting rights");

            usedVotingRights[voter] -= voteCount; 

            if (optionId == winningOptionId) {
                // 计算并分配奖励给赢家
                uint256 voterReward = (voteCount * 98) / 100;
                balances[voter] += voterReward; // 更新赢家余额
                emit RewardDistributed(voter, proposalId, voterReward, true);
            } else {

                balances[voter] -= voteCount; // 更新输家余额
                emit RewardDistributed(voter, proposalId, 0, false);
            }
        }
        // 更新提案状态
        proposal.isSettled = true;
    }

    function settleFundsForAverageQuality(uint256 _proposalId) public onlyOwner {
        require(_proposalId < proposals.length, "Proposal does not exist.");
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.active, "Proposal is still active.");
        require(!proposal.isSettled, "Funds already settled");
        deactivateProposal(_proposalId);  // 将提案状态设置为非活跃

        uint256 stakedAmount = proposal.stakeAmount;
        if(proposal.isWagered) {
            uint256 currentDeposit = proposalTokenDeposits[proposal.proposer];
            proposalTokenDeposits[proposal.proposer] = stakedAmount > currentDeposit ? 0 : currentDeposit - stakedAmount;
        }else{
            proposal.isSettled = true;
        }
        uint256 serviceFee = (proposal.stakeAmount * 3) / 100; // Calculating 3% service fee
        uint256 reward = (proposal.stakeAmount * 5) / 100; // Calculating 5% reward
        uint256 profit = reward - serviceFee;

        balances[proposal.proposer] += profit; // Updating balance without actual transfer

        emit FundsSettledForAverageQuality(_proposalId, proposal.proposer, profit);
    }

    function verifyComplianceAndExpectations(uint256 _proposalId) public onlyOwner {
        require(_proposalId < proposals.length, "Proposal does not exist.");
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.active, "Proposal is still active.");
        require(!proposal.isSettled, "Funds already settled");
        deactivateProposal(_proposalId);  // 将提案状态设置为非活跃
        uint256 stakedAmount = proposal.stakeAmount;
        if(proposal.isWagered) {
            // 确保不会导致下溢
            uint256 currentDeposit = proposalTokenDeposits[proposal.proposer];
            proposalTokenDeposits[proposal.proposer] = stakedAmount > currentDeposit ? 0 : currentDeposit - stakedAmount;
        }else{
            proposal.isSettled = true;
        }
        uint256 serviceFee = (proposal.stakeAmount * 3) / 100; // Calculating 3% service fee
        uint256 reward = (proposal.stakeAmount * 10) / 100; // Calculating 10% reward
        uint256 profit = reward - serviceFee;

        balances[proposal.proposer] += profit; // Updating balance without actual transfer

        emit FundsSettledForAverageQuality(_proposalId, proposal.proposer, profit);
    }

    function checkQualityComplianceBelowExpectations(uint256 _proposalId) public onlyOwner {
        require(_proposalId < proposals.length, "Proposal does not exist.");
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.active, "Proposal is still active.");
        require(!proposal.isSettled, "Funds already settled");
        deactivateProposal(_proposalId);  // 将提案状态设置为非活跃

        uint256 stakedAmount = proposal.stakeAmount;
        if(proposal.isWagered) {
            // 确保不会导致下溢
            uint256 currentDeposit = proposalTokenDeposits[proposal.proposer];
            proposalTokenDeposits[proposal.proposer] = stakedAmount > currentDeposit ? 0 : currentDeposit - stakedAmount;
        }else{
            proposal.isSettled = true;
        }
        uint256 punishment = (proposal.stakeAmount * 5) / 100; // Calculating 5% punishment

        balances[proposal.proposer] -= punishment; // Updating balance without actual transfer

        emit FundsPenalizedForNonCompliance(_proposalId, proposal.proposer, punishment);
    }

    function deactivateProposal(uint256 _proposalId) public {
        Proposal storage proposal = proposals[_proposalId];
        if (block.timestamp > proposal.endTime || proposal.active) {
            proposal.active = false;
            emit ProposalStatusChanged(_proposalId, false);
        }
    }
} 
