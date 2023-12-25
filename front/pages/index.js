
import { useState, useEffect } from 'react'
import { ethers } from 'ethers';

function Home() {

    const PERMITTOKENCONTRACT_ADDRESS = '0xDF1090Db8dF7F3F0579361fb85f53D605fd1B38f';   // address of token
    const SPENDERCONTRACT_ADDRESS = "0x9Df4A3DA65eF472B1989242AFa4ebc8557E54E52";  // 质押投票的合约地址

    const permitTokenContractAbi = [
        "function name() view returns (string)",
        "function nonces(address owner) view returns (uint256)",
        "function balanceOf(address account) view  returns (uint256)",
        "function permit(address owner, address spender, uint256 value, uint256 deadline,uint8 v,bytes32 r, bytes32 s)",
        "function allowance(address owner, address spender) public view  returns (uint256)",
        "function approve(address spender, uint256 amount) public returns (bool)",
        "function mint(address to, uint256 amount) public",  // mint代币， 这个不要放在前端， 可以放到管理员的页面
    ];

    const spenderContractAbi = [
        "function balances(address) view returns (uint256)",
        "function deposit(uint256 amount)",
        "function submitProposalForReview(uint256 amount)",
        "function createProposalWithOptions(string memory proposalDescription, string[] memory optionDescriptions, uint amount, uint256 endtime) returns (uint256)",
        "function processUserStakedProposal(address userAddress, string memory proposalDescription, uint256 stakeAmount, string[] memory optionDescriptions, uint256 stakeIndex, uint256 endtime) returns (uint256)",
        "function withdraw(uint256 amount)",
        "function getAvailableWithdrawBalance(address user) view returns (uint256)",
        "function setProposalEndTime(uint256 _proposalId, uint256 _newEndTime)",
        "function getProposalStatus(uint256 _proposalId) view returns (bool)",
        "function vote(uint256 _proposalId, uint256 _optionId, uint256 _amount)",
        "function getContractBalance() view returns (uint256)",
        "function pause()",
        "function unpause()",
        "function getUserVotingHistory(address _user) view returns (uint256[] proposalIds, uint256[] optionIds, uint256[] amounts)",
        "function proposalsLength() view returns (uint256)",
        "function getOptionsCount(uint256 proposalId) view returns (uint256)",
        "function getOptionVoteCount(uint256 proposalId, uint256 optionIndex) view returns (uint256)",
        "function getCurrentProposalId() view returns (uint256)",
        "function handleStakeRelease(address user, uint256 stakeIndex, bool penalizeStake)",
        "function settleRewards(uint256 proposalId, uint256 winningOptionId)",
        "function settleFundsForAverageQuality(uint256 _proposalId)",
        "function verifyComplianceAndExpectations(uint256 _proposalId)",
        "function checkQualityComplianceBelowExpectations(uint256 _proposalId)",
        "function deactivateProposal(uint256 _proposalId)",
        "function usedVotingRights(address) public view returns (uint256)", // 查询已用投票权函数，返回指定地址已使用的投票权数量
        "event Received(address indexed caller, uint amount, string message)",
        "event Deposited(address indexed user, uint amount)",
        "event Withdrawn(address indexed user, uint amount)",
        "event Voted(address indexed _address, uint256 indexed _proposalId, uint256 indexed _optionId, uint256 _amount)",
        "event ProposalAndOptionsSubmitted(address indexed user, uint256 indexed proposalIndex, string proposalDescription, string[] optionDescriptions)",
        "event DepositForProposal(address indexed staker, uint256 amount, bool staked, uint256 unlockTime, uint256 indexed stakeIndex)",
        "event TokensStaked(address indexed user, uint256 amount, bool isForProposal)",
        "event FundsSettledForAverageQuality(uint256 indexed proposalId, address indexed proposer, uint256 amountToReturn)",
        "event WithdrawalDetailed(address indexed user, uint256 amountWithdrawn, uint256 balanceAfterWithdrawal)",
        "event UnlockTimeUpdated(address indexed staker, uint256 indexed stakeIndex, uint256 newUnlockTime)",
        "event FundsPenalizedForNonCompliance(uint256 indexed proposalId, address indexed proposer, uint256 penalty)",
        "event ProposalStatusChanged(uint256 proposalId, bool isActive)",
        "event ProposalEndTime(uint256 _proposalId, uint256 endTime)",
        "event ProposalForUser(address indexed userAddress, uint256 indexed proposalId, string proposalDescription, uint256 stakeAmount, string[] optionDescriptions)",
        "event StakeReleased(address indexed user, uint256 stakeIndex, bool penalized, uint256 amountReleased)",
        "event ProposalEnded(uint256 indexed proposalId, bool isActive)",
        "event ProposalConcluded(uint256 indexed proposalId, bool isActive)",
        "event RewardDistributed(address indexed voter, uint256 proposalId, uint256 amount, bool isWinner)"
    ];

    const [provider, setProvider] = useState(); // provider是变量， setProvider 是函数
    const [account, setAccount] = useState();
    const [signer, setSigner] = useState();
    const [account_value, set_account_value] = useState();  // 当前账户在合约的余额
    const [min_amount, set_minAmount] = useState("0.00001");   
    const [balance, setBalance] = useState();
    const [allowance, setAllowance] = useState();
    const [depositAmount, setDepositAmount] = useState("0"); // 初始化为字符串 "0"
    const [withdrawAmount, setWithdrawAmount] = useState("0"); // 初始化为字符串 "0"
    const [contractBalance, setContractBalance] = useState("0");
    const [MintAmount, setMintAmount] = useState("0");
    const [proposalId, setProposalId] = useState();     // 设置提案的id
    const [proposalDescription, setProposalDescription] = useState('');
    const [proposal_Description, setProposal_Description] = useState('');
    const [UserAddress_forpro, set_serAddress_forpro] = useState('');

    const [optionText, setOptionText] = useState("");
    const [stake_Amount, set_StakeAmount] = useState('');

    const [optionDescriptions, setoptionDescriptions] = useState('');
    const [stakeIndex, setstakeIndex] = useState('');

    // 定义用户输入的质押代币数量的状态和更新函数
    const [userStakeAmount, setUserStakeAmount] = useState('');

    // 定义用户设置的提案结束时间的状态和更新函数
    const [userDefinedProposalEndTime, setUserDefinedProposalEndTime] = useState('');
    const [voteProposalID, setVoteProposalID] = useState(""); // 投票栏的提案
    const [voteOptionID, setVoteOptionID] = useState("");   // 投票栏的选项option
    const [voteAmount, setVoteAmount] = useState("");       // 投了多少票

    const [queryProposalID, setQueryProposalID] = useState('');  // 查询， 直接输入uint
    const [queryAccountAddress, setQueryAccountAddress] = useState("");
    const [availableWithdrawBalance, setAvailableWithdrawBalance] = useState("0");
    const [stakedAmount, setStakedAmount] = useState('');
    const [proposalEndTimestamp, setProposalEndTimestamp] = useState('');
    const [userAddressForRelease, setUserAddressForRelease] = useState('');
    const [stakeIndexForRelease, setStakeIndexForRelease] = useState('');
    const [penalizeStake, setPenalizeStake] = useState(false);
    const [proposalIdForSettle, setProposalIdForSettle] = useState('');
    const [winningOptionIdForSettle, setWinningOptionIdForSettle] = useState('');
    

    // 点击按钮的时候登录
    const connectOnclick = async () => {
        if (!window.ethereum) return;
    
        const providerWeb3 = new ethers.providers.Web3Provider(window.ethereum);
        setProvider(providerWeb3);
    
        const currenAccount = await providerWeb3.send("eth_requestAccounts", []);
        setAccount(currenAccount[0]);
        setSigner(providerWeb3.getSigner(currenAccount[0]));
    
        ethereum.on("accountsChanged", accountsChange => {
          setAccount(accountsChange[0]);
          setSigner(providerWeb3.getSigner(accountsChange[0]));
        });
      };

    useEffect(() => {
        if (!window.ethereum || !provider || !account) return;
    
        provider.getBalance(account).then(result => {
            setBalance(ethers.utils.formatEther(result));
        });
    }, [account, provider]);

    useEffect(() => {
        if (!signer) {
            return;
        }
        const contract = new ethers.Contract(SPENDERCONTRACT_ADDRESS, spenderContractAbi, signer);
        // Fetch and set the contract balance
        async function fetchContractBalance() {
            const balance = await contract.balances(account);
            set_account_value(ethers.utils.formatEther(balance));
        }
        fetchContractBalance();
    }, [account_value, signer]);
    
    useEffect(() => {
        if (!signer) return;
    
        const contract = new ethers.Contract(SPENDERCONTRACT_ADDRESS, spenderContractAbi, signer);
    
        async function fetchContractBalance() {
          const balance = await contract.getContractBalance();
          setContractBalance(ethers.utils.formatEther(balance));
        }
    
        fetchContractBalance();
      }, [contractBalance, signer]);

    // 授权， 质押代币的时候必须先授权， 才可以发送或者质押
    const approveAndSubmit = async () => {
        try {
            if (!signer) {
                alert("请连接钱包");
                return;
            }
            const permitTokenContract = new ethers.Contract(
                PERMITTOKENCONTRACT_ADDRESS,
                permitTokenContractAbi,
                signer
            );
            const balance = await permitTokenContract.balanceOf(account);
            const _amount = ethers.utils.parseEther(min_amount);
            if (balance.lt(_amount)) {
                alert("余额不足，无法授权这么多代币。");
                return;
            }
            const approvalTransaction = await permitTokenContract.approve(
                SPENDERCONTRACT_ADDRESS,
                _amount
            );
            await approvalTransaction.wait();
            const allowance = await permitTokenContract.allowance(account, SPENDERCONTRACT_ADDRESS);
            if (allowance.lt(_amount)) {
                alert("授权失败");
                return;
            }
            setAllowance(ethers.utils.formatEther(allowance));
            alert("授权成功");        
        } catch (error) {
            console.error("发生错误:", error);
            alert("发生错误。请查看控制台以获取详细信息。");
        }
    };

    const handleDeposit = async (depositAmount) => {
        console.log("handleDeposit 被调用，存款金额为: ", depositAmount);
        if (!signer) return;
        try {
            const permitTokenContract = new ethers.Contract(
                PERMITTOKENCONTRACT_ADDRESS,
                permitTokenContractAbi,
                signer
            );
            const allowance_valued = await permitTokenContract.allowance(account, SPENDERCONTRACT_ADDRESS);
            if (allowance_valued.lt(ethers.utils.parseEther(depositAmount))) {
                alert("allowance_valued 不足");
                return;
            }
            const contract = new ethers.Contract(
                SPENDERCONTRACT_ADDRESS,
                spenderContractAbi,
                signer
            );
            const tx = await contract.deposit(ethers.utils.parseEther(depositAmount));
            const receipt = await tx.wait(); // 等待交易被确认
    
            // 从收据中提取Deposited事件
            const depositedEvent = receipt.events?.find(event => event.event === 'Deposited');
            if (depositedEvent && depositedEvent.args) {
                const { user, amount } = depositedEvent.args;
                console.log("存款成功:");
                console.log(`存款者: ${user}`);
                console.log(`存款金额(FLARE): ${ethers.utils.formatEther(amount)}`);
                alert(`存款成功！金额: ${ethers.utils.formatEther(amount)} FLARE`);
            } else {
                console.log('没有找到Deposited事件，或者事件没有参数。');
            }
    
            const current_account_value = await contract.balances(account);
            set_account_value(ethers.utils.formatEther(current_account_value));
            const newBalance = await contract.getContractBalance();
            setContractBalance(ethers.utils.formatEther(newBalance));
        } catch (error) {
            console.error("发生错误:", error);
        }
    };
    

    const handleSubmitProposalForReview = async (amount) => {
        console.log("提交提案审查，质押金额为: ", amount);
        if (!signer) return;
    
        try {
            // 创建VotingContract合约实例
            const votingContract = new ethers.Contract(
                SPENDERCONTRACT_ADDRESS, 
                spenderContractAbi,      
                signer
            );
    
            // 调用合约的submitProposalForReview函数
            const tx = await votingContract.submitProposalForReview(ethers.utils.parseEther(amount));
            const receipt = await tx.wait(); // 等待交易被确认
    
            // 从事件中提取质押索引
            const depositForProposalEvent = receipt.events?.find(event => event.event === 'DepositForProposal');
            if (depositForProposalEvent && depositForProposalEvent.args) {
                const { staker, amount, staked, unlockTime, stakeIndex } = depositForProposalEvent.args;
                console.log('提案审查提交完成');
                console.log(`质押者: ${staker}`);
                console.log(`质押金额(FLARE): ${ethers.utils.formatEther(amount)}`);
                console.log(`是否质押: ${staked}`);
                console.log(`解锁时间: ${new Date(unlockTime * 1000).toLocaleString()}`);
                console.log(`质押索引: ${stakeIndex.toString()}`);
                alert(`提案审查提交成功，质押索引为：${stakeIndex}`);

            } else {
                console.log('没有找到DepositForProposal事件，或者事件没有参数。');
            }
        } catch (error) {
            console.error("提交提案审查失败:", error);
            alert('提交提案审查失败: ' + error.message);
        }
    };
    
    
    const handleWithdraw = async (withdrawAmount) => {
        if (!signer) return;
        console.log("handleWithdraw 被调用，撤销金额为: ", withdrawAmount);

        try {
            const contract = new ethers.Contract(
                SPENDERCONTRACT_ADDRESS,
                spenderContractAbi,
                signer
            );
            if (!withdrawAmount || ethers.utils.parseEther(withdrawAmount).lte(0)) {
                alert('提款金额应大于 0');
                console.log("无效的值。");
                return;
            }

            const accountValueInWei = ethers.utils.parseEther(account_value);
            if (ethers.utils.parseEther(withdrawAmount).gt(accountValueInWei)) {
                alert('提款金额超过账户余额');
                return;
            }

            let used_vote = await contract.usedVotingRights(account);
            if (ethers.utils.parseEther(withdrawAmount).gt(accountValueInWei.sub(used_vote))) {
                alert('在投票中， 投票的余额不能撤销！');
                return;
            }

            const tx = await contract.withdraw(ethers.utils.parseEther(withdrawAmount));
            await tx.wait();
            alert("取款成功！");
            const current_account_value = await contract.balances(account);
            set_account_value(ethers.utils.formatEther(current_account_value));
            const newBalance = await contract.getContractBalance();
            setContractBalance(ethers.utils.formatEther(newBalance));
        } catch (error) {
            console.error("发生错误:", error);
        }
    };

    const fetchAvailableWithdrawBalance = async () => {
        if (!signer) return;
        const contract = new ethers.Contract(SPENDERCONTRACT_ADDRESS, spenderContractAbi, signer);
        try {
            console.log(account)
            const current_balance = await contract.getAvailableWithdrawBalance(account);
            console.log(ethers.utils.formatEther(current_balance))

            setAvailableWithdrawBalance(ethers.utils.formatEther(current_balance));
        } catch (error) {
            console.error("获取可提款余额失败：", error);
        }
    };
    
    const Mint = async (MintAmount) => {
        if (!signer) return;
        console.log("Mint 的数量为: ", MintAmount);
        const contract = new ethers.Contract(PERMITTOKENCONTRACT_ADDRESS, permitTokenContractAbi, signer);

        // 判断是否有效（大于 0）
        let value = ethers.BigNumber.from(MintAmount);
        if (value.lte(0)) {
            alert('mint value should be more than 0');
            console.log("Invalid Mint.");
            return;
        }

        const pre_balance = await contract.balanceOf(account);
        console.log('mint 前的余额为：', ethers.utils.formatEther(pre_balance));

        const tx = await contract.mint(account, value);
        await tx.wait();
        alert("Mint成功！");
    
        const balance = await contract.balanceOf(account);
        console.log('mint 后的余额为：', ethers.utils.formatEther(balance));
    };
  
    const addProposalWithOptions = async (proposalDescription, optionTexts, amount, endtime) => {
        if (!signer) return;
        console.log(`准备提交的提案描述: ${proposalDescription}`);
        console.log(`提案的选项内容: ${optionTexts}`);
        console.log(`质押的代币数量: ${amount} FLARE`);
        console.log(`提案的结束时间: ${endtime}`);
        
        const contract = new ethers.Contract(SPENDERCONTRACT_ADDRESS, spenderContractAbi, signer);
    
        // 使用 split 方法按逗号分隔字符串，并去除两端可能的空格
        let optionsArray = optionTexts.split(',').map(option => option.trim());
    
        try {
            const tx = await contract.createProposalWithOptions(proposalDescription, optionsArray, ethers.utils.parseEther(amount), endtime);
            
            // 等待交易被确认
            const receipt = await tx.wait();
            
            // 在交易收据中查找特定的事件
            const proposalAndOptionsSubmittedEvent = receipt.events?.find(event => event.event === 'ProposalAndOptionsSubmitted');
            
            if (proposalAndOptionsSubmittedEvent && proposalAndOptionsSubmittedEvent.args) {
                // 从事件参数中提取信息
                const { user, proposalIndex, proposalDescription, optionDescriptions } = proposalAndOptionsSubmittedEvent.args;
                console.log("========== 新提案及其选项已提交 ==========");
                console.log(`提交者地址: ${user}`);
                console.log(`提案ID: ${proposalIndex.toString()}`);
                console.log(`提案描述: ${proposalDescription}`);
                console.log(`提案选项: ${optionDescriptions.join(', ')}`);
                alert(`提案及其选项已成功添加. 提案ID: ${proposalIndex}`);
            } else {
                console.log('没有找到ProposalAndOptionsSubmitted事件，或者事件没有参数。');
            }
        } catch (error) {
            console.error("提交提案及其选项时出现错误:", error);
            alert('添加提案及其选项时出错。');
        }
    };
    
    const processUserStakedProposal = async (userAddress, proposalDescription, stakeAmount, optionTexts, stakeIndex, endTime) => {
        if (!signer) return;
        console.log("处理用户质押的提案：", proposalDescription, "选项：", optionTexts, "质押金额：", stakeAmount, "质押索引：", stakeIndex, "结束时间：", endTime);
        
        const votingContract = new ethers.Contract(
            SPENDERCONTRACT_ADDRESS,
            spenderContractAbi,
            signer
        );
        try {
            const tx = await votingContract.processUserStakedProposal(
                userAddress,
                proposalDescription,
                ethers.utils.parseEther(stakeAmount),
                optionTexts,
                stakeIndex,
                endTime
            );

            // 等待交易被确认
            const receipt = await tx.wait();
            // 从事件中提取提案ID
            const proposalForUserEvent = receipt.events?.find(event => event.event === 'ProposalForUser');
            if (proposalForUserEvent && proposalForUserEvent.args) {
                const { userAddress, proposalId, proposalDescription, stakeAmount, optionDescriptions } = proposalForUserEvent.args;
                console.log("用户质押的提案已处理：");
                console.log("用户地址:", userAddress);
                console.log("提案ID:", proposalId.toString());
                console.log("提案描述:", proposalDescription);
                console.log("质押金额:", ethers.utils.formatEther(stakeAmount));
                console.log("选项描述:", optionDescriptions.join(', '));
                alert(`提案及选项已成功处理. 提案ID: ${proposalId}`);
            } else {
                console.log('没有找到ProposalForUser事件，或者事件没有参数。');
            }
    
        } catch (error) {
            console.error("处理提案及选项时出现错误：", error);
            alert('处理提案及选项时出错');
        }
    };
    
    const vote = async (voteProposalID, voteOptionID, voteAmount) => {
        if (!signer) return;
    
        // Parse the proposalID and optionID to integers
        const proposalIDInt = parseInt(voteProposalID, 10);
        const optionIDInt = parseInt(voteOptionID, 10);
        const voteAmountInt = ethers.utils.parseEther(voteAmount);
        
        const contract = new ethers.Contract(SPENDERCONTRACT_ADDRESS, spenderContractAbi, signer);
        const used_vote = await contract.usedVotingRights(account);
        const balance = await contract.balances(account);
    
        if (balance.sub(used_vote).lte(voteAmountInt)) {
            console.log('You do not have enough voting rights to cast this vote.');
            alert('You do not have enough voting rights.');
            return;
        }
    
        try {
            const tx = await contract.vote(proposalIDInt, optionIDInt, voteAmountInt);
            console.log('Awaiting confirmation...');
            const receipt = await tx.wait();  // Wait for transaction to be mined

            // 从收据中提取Voted事件
            const votedEvent = receipt.events?.find(event => event.event === 'Voted');
            if (votedEvent && votedEvent.args) {
                const { _address, _proposalId, _optionId, _amount } = votedEvent.args;
                console.log("投票事件详情：");
                console.log(`用户: ${_address}`);
                console.log(`提案ID: ${_proposalId.toString()}`);
                console.log(`选项ID: ${_optionId.toString()}`);
                console.log(`投票数量: ${ethers.utils.formatEther(_amount)}`);
                alert(`投票成功！提案ID: ${_proposalId}, 选项ID: ${_optionId}, 投票数量: ${ethers.utils.formatEther(_amount)}`);
            } else {
                console.log('No Voted event found or the event had no arguments.');
            }
        } catch (error) {
            console.error("投票过程中发生错误：", error);
            alert('投票失败');
        }
    };
    
    const fetchProposalOptions = async (queryProposalID) => {
        if (!signer) return;
        console.log("正在查询提案ID: ", queryProposalID);
        const contract = new ethers.Contract(SPENDERCONTRACT_ADDRESS, spenderContractAbi, signer);
        try {
            // 获取特定提案的选项数量
            const optionsCount = await contract.getOptionsCount(queryProposalID);
    
            // 遍历选项并获取每个选项的投票计数
            for (let i = 0; i < optionsCount; i++) {
                const voteCount = await contract.getOptionVoteCount(queryProposalID, i);
                console.log(`选项 ${i}: 投票数: ${ethers.utils.formatEther(voteCount)}`);
            }
        } catch (error) {
            console.error("获取选项失败：", error);
        }
    };
    
    const printUserVotingHistory = async (queryAccountAddress) => {
        if (!signer) {
            console.error("No signer found");
            return;
        }
        try {
            // 创建合约实例
            const contract = new ethers.Contract(SPENDERCONTRACT_ADDRESS, spenderContractAbi, signer);
            // 调用合约方法获取用户的投票记录
            const [proposalIds, optionIds, amounts] = await contract.getUserVotingHistory(queryAccountAddress);
            // 检查三个数组的长度是否一致
            if (!(proposalIds.length === optionIds.length && optionIds.length === amounts.length)) {
                throw new Error('The returned arrays do not match in length');
            }
            // 遍历每个投票记录
            for (let i = 0; i < proposalIds.length; i++) {
                // 输出每条投票记录的详细信息
                console.log(`Proposal ID: ${proposalIds[i]}, Option ID: ${optionIds[i]}, Amount: ${ethers.utils.formatEther(amounts[i])} 票数`);
            }
        } catch (error) {
            console.error("Error fetching voting history:", error);
            // 根据错误类型给用户合适的反馈
            alert("无法获取投票历史，请确保您连接了正确的网络并且合约地址及ABI是正确的。");
        }
    };
    
    const settleFundsForAverageQuality = async (proposalId) => {
        if (!signer) return;
        const contract = new ethers.Contract(SPENDERCONTRACT_ADDRESS, spenderContractAbi, signer);
    
        try {
            // 调用合约的settleFundsForAverageQuality函数
            const tx = await contract.settleFundsForAverageQuality(proposalId);
            console.log('等待交易确认...');
            const receipt = await tx.wait();  // 等待交易被挖矿确认

            // 从交易收据中提取FundsSettledForAverageQuality事件
            const fundsSettledEvent = receipt.events?.find(event => event.event === 'FundsSettledForAverageQuality');
            if (fundsSettledEvent && fundsSettledEvent.args) {
                const { proposalId, proposer, amountToReturn } = fundsSettledEvent.args;
                console.log(`提案ID ${proposalId} 的资金已结算:`);
                console.log(`提案者: ${proposer}`);
                console.log(`利润: ${ethers.utils.formatEther(amountToReturn)}`);
                alert(`提案ID ${proposalId} 的资金已成功结算. 利润: ${ethers.utils.formatEther(amountToReturn)}`);
            } else {
                console.log('没有找到FundsSettledForAverageQuality事件，或者事件没有参数。');
            }
        } catch (error) {
            console.error("结算资金时发生错误：", error);
            alert('结算资金失败。');
        }
    };
    
    const verifyComplianceAndExpectations = async (proposalId) => {
        if (!signer) return;
        const contract = new ethers.Contract(SPENDERCONTRACT_ADDRESS, spenderContractAbi, signer);
        try {
            // Call the verifyComplianceAndExpectations function
            const tx = await contract.verifyComplianceAndExpectations(proposalId);
            
            // Wait for the transaction to be mined and get the receipt
            const receipt = await tx.wait(); 
    
            // Extract the FundsSettledForAverageQuality event from the transaction receipt
            const fundsSettledEvent = receipt.events?.find(event => event.event === 'FundsSettledForAverageQuality');
    
            if (fundsSettledEvent && fundsSettledEvent.args) {
                const { proposalId, proposer, amountToReturn } = fundsSettledEvent.args;
                console.log(`提案ID ${proposalId} 的资金已结算:`);
                console.log(`提案者: ${proposer}`);
                console.log(`利润: ${ethers.utils.formatEther(amountToReturn)}`);
                alert(`提案ID ${proposalId} 的资金已成功结算. 利润: ${ethers.utils.formatEther(amountToReturn)}`);
            } else {
                console.log('FundsSettledForAverageQuality event not found or the event has no arguments.');
            }
        } catch (error) {
            console.error("Error verifying compliance:", error);
            alert('Error verifying compliance.');
        }
    };
    
    const checkQualityBelowExpectations = async (proposalId) => {
        if (!signer) return;
        const contract = new ethers.Contract(SPENDERCONTRACT_ADDRESS, spenderContractAbi, signer);

        try {
            // Call the checkQualityComplianceBelowExpectations function on the contract
            console.log(`提案ID ${proposalId} 的资金已结算:`);

            const tx = await contract.checkQualityComplianceBelowExpectations(proposalId);

            // Wait for the transaction to be mined and get the receipt
            const receipt = await tx.wait();
    
            // Extract the FundsPenalizedForNonCompliance event from the transaction receipt
            const fundsPenalizedEvent = receipt.events?.find(event => event.event === 'FundsPenalizedForNonCompliance');

            if (fundsPenalizedEvent && fundsPenalizedEvent.args) {
                const { proposalId, proposer, penalty } = fundsPenalizedEvent.args;
                console.log(`提案ID ${proposalId} 的资金已结算:`);
                console.log(`提案者: ${proposer}`);
                console.log(`惩罚: ${ethers.utils.formatEther(penalty)}`);
                alert(`提案ID ${proposalId} 的资金已成功结算. 惩罚 ${ethers.utils.formatEther(penalty)}`);
            } else {
                console.log('FundsPenalizedForNonCompliance event not found or the event has no arguments.');
            }
        } catch (error) {
            console.error("Error checking quality compliance:", error);
            alert('Error checking quality compliance.');
        }
    };
    
    const handleSettleRewards = async (proposalId, winningOptionId) => {
        if (!signer) return;
    
        try {
            const contract = new ethers.Contract(SPENDERCONTRACT_ADDRESS, spenderContractAbi, signer);

            const tx = await contract.settleRewards(proposalId, winningOptionId);
            console.log("奖励已分配:");
            const receipt = await tx.wait();  // 等待交易被确认
            // 从收据中提取'RewardDistributed'事件
    //         "event RewardDistributed(address indexed voter, uint256 proposalId, uint256 amount, bool isWinner)"

            const rewardDistributedEvents = receipt.events?.filter(event => event.event === 'RewardDistributed');
            if (rewardDistributedEvents && rewardDistributedEvents.length > 0) {
                rewardDistributedEvents.forEach((event) => {
                    const { voter, proposalId, amount, isWinner } = event.args;
                    console.log("奖励已分配:");
                    console.log("投票者地址:", voter);
                    console.log("提案ID:", proposalId.toString());
                    console.log("奖励金额（FLARE）:", ethers.utils.formatEther(amount));
                    console.log("是否为赢家:", isWinner ? '是' : '否');
                });
                alert(`奖励结算成功. 提案ID: ${proposalId}`);
            } else {
                console.log('没有找到RewardDistributed事件，或者事件没有参数。');
            }
        } catch (error) {
            console.error("奖励结算失败：", error);
            alert('奖励结算失败: ' + error.message);
        }
    };
    
    const deactivateProposal = async (proposalId) => {
        if (!signer) {
            console.error('Signer not found');
            return;
        }
    
        try {
            const contract = new ethers.Contract(SPENDERCONTRACT_ADDRESS, spenderContractAbi, signer);
            const tx = await contract.deactivateProposal(proposalId);
            console.log('Awaiting confirmation...');
            await tx.wait();
            console.log(`Proposal ${proposalId} has been deactivated`);
            alert(`Proposal ${proposalId} has been deactivated successfully.`);
        } catch (error) {
            console.error("Error deactivating proposal:", error);
            alert(`Error deactivating proposal: ${error.message}`);
        }
    };
    const handleReleaseStake = async (userAddress, stakeIndex, penalize) => {
        if (!signer) return;
        console.log("处理质押释放，用户地址：", userAddress, "质押索引：", stakeIndex, "是否处罚：", penalize);
    
        try {
            const contract = new ethers.Contract(SPENDERCONTRACT_ADDRESS, spenderContractAbi, signer);
            
            const tx = await contract.handleStakeRelease(userAddress, stakeIndex, penalize);
            const receipt = await tx.wait();  // 等待交易被确认
            const stakeReleasedEvent = receipt.events?.find(event => event.event === 'StakeReleased');

            if (stakeReleasedEvent && stakeReleasedEvent.args) {
                const { user, stakeIndex, penalized, amountReleased } = stakeReleasedEvent.args;
                console.log("质押已释放:");
                console.log("用户:", user);
                console.log("质押索引:", stakeIndex.toString());
                console.log("是否处罚:", penalized ? '是' : '否');
                console.log("释放金额（FLARE）:", ethers.utils.formatEther(amountReleased));
                alert(`质押释放处理成功. 用户: ${user}, 索引: ${stakeIndex}, 释放金额: ${ethers.utils.formatEther(amountReleased)} FLARE`);
            } else {
                console.log('没有找到StakeReleased事件，或者事件没有参数。');
            }
        } catch (error) {
            console.error("质押释放处理失败：", error);
            alert('质押释放处理失败: ' + error.message);
        }

        
    };
    
    return (
        <>
            <div className="topnav">
                <a className="nav-link" href="#">Home</a>
                <a className="nav-link" href="#">Article</a>
                <a className="nav-link" href="#">Tag</a>
                <a className="nav-link" href="#">About</a>
                {account ? (
                    <a className="nav-link right" href="#">Connected</a>
                ) : (
                    <a className="nav-link right" href="#" onClick={connectOnclick}>Connect Wallet</a>
                )}
            </div>
            <div className="container">
                <div className="row">
                    <h3 className="site-title">初版</h3>
    
                    <div className="account-info">
                        <h5>账号:{account}</h5>
                        <h5>金额:{balance}</h5>
                        <h5>授权金额:<span className="highlight">{allowance}</span></h5>
                        <h5>合约余额:{contractBalance}</h5>
                    </div>
    
                    <div className="contract-info">
                        <h5>该合约下当前账户余额:{account_value}</h5>
                    </div>
    
                    <button className="button" onClick={approveAndSubmit}>授权</button>
                </div>
    
                <div className="transaction">
                    <h5>Claim</h5>
                    <input 
                        className="input"
                        type="text"
                        value={MintAmount}
                        onChange={e => setMintAmount(e.target.value)}
                        placeholder="Amount to Mint"
                    />
                    <button className="button" onClick={() => Mint(MintAmount)}>Claim***</button>
                </div>
    
                <div className="transaction">
                    <h5>Deposit</h5>
                    <input 
                        className="input"
                        type="text"
                        value={depositAmount}
                        onChange={e => setDepositAmount(e.target.value)}
                        placeholder="Amount to deposit"
                    />
                    <button className="button" onClick={() => handleDeposit(depositAmount)}>Deposit</button>
                </div>


                <div className="transaction">
                    <h5>Withdraw</h5>
                    <input 
                        className="input"
                        type="text"
                        value={withdrawAmount}
                        onChange={e => setWithdrawAmount(e.target.value)}
                        placeholder="Amount to withdraw"
                    />
                    <button className="button" onClick={() => handleWithdraw(withdrawAmount)}>Withdraw</button>
                </div>

                <div className="transaction">
                    <h5>可提款余额</h5>
                    <input 
                        className="input"
                        type="text"
                        value={availableWithdrawBalance}
                        onChange={e => setAvailableWithdrawBalance(e.target.value)}
                        placeholder="Amount to withdraw"
                    />
                    <button className="button" onClick={() => fetchAvailableWithdrawBalance(availableWithdrawBalance)}>查询可提款余额</button>
                </div>
            </div>


            <div className="container">
                <h3 className="site-title">提案系统</h3>

                <div className="options-section">
                    <h5>创建提案及其选项</h5>
                    <input
                        className="input"
                        type="text"
                        value={proposalDescription}
                        onChange={e => setProposalDescription(e.target.value)}
                        placeholder="输入提案描述"
                    />
                    <input
                        className="input"
                        type="text"
                        value={optionText}
                        onChange={e => setOptionText(e.target.value)}
                        placeholder="输入选项内容，用逗号分隔"
                    />
                    <input
                        className="input"
                        type="text"
                        value={userStakeAmount} // 新增输入框对应的变量
                        onChange={e => setUserStakeAmount(e.target.value)}
                        placeholder="输入质押金额"
                    />
                    <input
                        className="input"
                        type="text"
                        value={userDefinedProposalEndTime} // 新增输入框对应的变量
                        onChange={e => setUserDefinedProposalEndTime(e.target.value)}
                        placeholder="输入提案结束时间"
                    />

                <button className="button" onClick={() => addProposalWithOptions(proposalDescription, optionText, userStakeAmount, userDefinedProposalEndTime)}>创建提案及选项</button>
                </div>

            <div className="staked-proposal-section">
                <h5>处理质押的提案</h5>
                <input
                    className="input"
                    type="text"
                    placeholder="输入用户地址"
                    onChange={e => set_serAddress_forpro(e.target.value)}
                />
                <input
                    className="input"
                    type="text"
                    placeholder="输入提案描述"
                    onChange={e => setProposal_Description(e.target.value)}
                />
                <input
                    className="input"
                    type="text"
                    placeholder="输入质押金额"
                    onChange={e => set_StakeAmount(e.target.value)}
                />
                <input
                    className="input"
                    type="text"
                    placeholder="输入选项内容，用逗号分隔"
                    onChange={e => setoptionDescriptions(e.target.value.split(','))}
                />
                <input
                    className="input"
                    type="text"
                    placeholder="输入质押索引"
                    onChange={e => setstakeIndex(e.target.value)}
                />
                <input
                    className="input"
                    type="text"
                    placeholder="输入提案结束时间戳"
                    onChange={e => setProposalEndTimestamp(e.target.value)}
                />
                <button className="button" onClick={() => processUserStakedProposal(UserAddress_forpro, proposal_Description, stake_Amount, optionDescriptions, stakeIndex, proposalEndTimestamp)}>处理提案***</button>
            </div>



            <div className="staked-proposal-section">
                <h5>提交提案审查</h5>
                <input
                    className="input"
                    type="text"
                    placeholder="输入质押金额（FLARE）"
                    onChange={e => setStakedAmount(e.target.value)}  // 更新质押金额
                />
                <button className="button" onClick={() => handleSubmitProposalForReview(stakedAmount)}>提交提案审查</button>
            </div>
                
                <div className="voting-section">
                    <h5>投票</h5>
                    <input
                        className="input"
                        type="text"
                        value={voteProposalID}
                        onChange={(e) => setVoteProposalID(e.target.value)}
                        placeholder="投案ID"
                    />
                    <input
                        className="input"
                        type="text"
                        value={voteOptionID}
                        onChange={(e) => setVoteOptionID(e.target.value)}
                        placeholder="选项ID"
                    />
                    <input
                        className="input"
                        type="text"
                        value={voteAmount}
                        onChange={(e) => setVoteAmount(e.target.value)}
                        placeholder="投票数额"
                    />
                    <button className="button" onClick={() => {vote(voteProposalID,voteOptionID, voteAmount)}}>投票</button>
                </div>

                <div className="proposal-info-section">
                    <h5>查询提案及其选项</h5>
                    <input
                        className="input"
                        type="text"
                        value={queryProposalID}
                        onChange={e => setQueryProposalID(e.target.value)}
                        placeholder="输入提案ID"
                    />
                    <button className="button" onClick={() => {fetchProposalOptions(queryProposalID)}}>查询提案</button>

                    <div id="output" className="output">
                    </div>
                </div>

                <div className="proposal-info-section">
                <h5>查询账户的投票记录</h5>
                    <input
                        className="input"
                        type="text"
                        value={queryAccountAddress}
                        onChange={e => setQueryAccountAddress(e.target.value)}
                        placeholder="输入账户地址"
                    />
                    <button className="button" onClick={() => {printUserVotingHistory(queryAccountAddress)}}>查询投票记录</button>
                </div>

                <div className="proposal-actions-section">
                    <h5>处理提案资金</h5>
                    <input
                        className="input"
                        type="text"
                        value={proposalId}
                        onChange={e => setProposalId(e.target.value)}
                        placeholder="输入提案ID"
                    />
                    <button className="button" onClick={() => {deactivateProposal(proposalId)}}>设置提案状态为未激活***</button>
                    <button className="button" onClick={() => {settleFundsForAverageQuality(proposalId)}}>提案内容质量一般***</button>
                    <button className="button" onClick={() => {verifyComplianceAndExpectations(proposalId)}}>提案内容质量优秀***</button>
                    <button className="button" onClick={() => {checkQualityBelowExpectations(proposalId)}}>提案内容质量很差或者不当言论***</button>

                </div>

            <div className="settle-rewards-section">
                <h5>结算奖励</h5>
                    <input
                        className="input"
                        type="text"
                        placeholder="输入提案ID"
                        onChange={e => setProposalIdForSettle(e.target.value)}
                    />
                    <input
                        className="input"
                        type="text"
                        placeholder="输入获胜选项ID"
                        onChange={e => setWinningOptionIdForSettle(e.target.value)}
                    />
                    <button className="button" onClick={() => {handleSettleRewards(proposalIdForSettle, winningOptionIdForSettle)}}>结算奖励***</button>
            </div>





            <div className="release-stake-section">
                <h5>处理质押释放</h5>
                <input
                    className="input"
                    type="text"
                    placeholder="输入用户地址"
                    onChange={e => setUserAddressForRelease(e.target.value)}
                />

                <div className="stake-index-and-penalize-section">
                    <input
                        className="input"
                        type="text"
                        placeholder="输入质押索引"
                        onChange={e => setStakeIndexForRelease(e.target.value)}
                    />
                    <div className="penalize-checkbox-section">
                        <label htmlFor="penalizeStake">是否处罚: </label>
                        <input
                            id="penalizeStake"
                            type="checkbox"
                            checked={penalizeStake}
                            onChange={e => setPenalizeStake(e.target.checked)}
                        />
                    </div>
                </div>
                <button className="button" onClick={() => handleReleaseStake(userAddressForRelease, stakeIndexForRelease, penalizeStake)}>释放质押***</button>
            </div>


                </div>

    
            <style jsx>
                {`
                * {
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                }
                body {
                    font-family: Arial, sans-serif;
                    background-color: #f4f4f4;
                }
                .topnav {
                    background-color: #333;
                    color: white;
                    padding: 15px 0;
                    text-align: center;
                }
                .nav-link {
                    padding: 10px 15px;
                    color: white;
                    text-decoration: none;
                }
                .right {
                    float: right;
                }
                .container {
                    padding: 20px;
                    background-color: white;
                    margin: 20px;
                    border-radius: 8px;
                    box-shadow: 0px 0px 5px #aaa;
                }
                .site-title {
                    text-align: center;
                    font-size: 24px;
                    margin-bottom: 20px;
                }
                .account-info, .contract-info {
                    margin-bottom: 15px;
                }
                .highlight {
                    color: red;
                    font-size: larger;
                }
                .button {
                    background-color: #007BFF;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    text-align: center;
                    cursor: pointer;
                    margin-top: 10px;
                }
                .button:hover {
                    background-color: #0056b3;
                }
                .transaction {
                    margin-top: 20px;
                }
                .input {
                    padding: 10px;
                    width: 200px;
                    margin-right: 10px;
                }
                .footer {
                    background-color: #333;
                    color: white;
                    padding: 15px 0;
                    text-align: center;
                }
                `}
            </style>
        </>
    );
}

export default Home;

