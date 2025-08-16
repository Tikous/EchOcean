// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract DriftBottle {
    struct Bottle {
        uint256 id;
        address sender;
        string content;
        uint256 timestamp;
        bool isActive;
        uint256 replyCount;
    }
    
    struct Reply {
        uint256 bottleId;
        address replier;
        string content;
        uint256 timestamp;
        uint256 replyToReplyId; // 0 if replying to original bottle, else ID of reply being replied to
    }
    
    struct UserBottleState {
        bool hasViewed;
        bool hasReplied;
        bool hasSkipped;
    }
    
    // State variables
    uint256 private _bottleIdCounter;
    uint256 private _replyIdCounter;
    
    mapping(uint256 => Bottle) public bottles;
    mapping(uint256 => Reply) public replies;
    mapping(address => uint256[]) public userBottles; // bottles sent by user
    mapping(address => uint256[]) public userReplies; // reply IDs by user
    mapping(uint256 => uint256[]) public bottleReplies; // reply IDs for each bottle
    mapping(address => mapping(uint256 => UserBottleState)) public userBottleStates;
    mapping(bytes32 => bool) private hasUserReplied; // efficient tracking of user replies
    
    uint256[] public activeBottleIds;
    mapping(uint256 => uint256) private activeBottleIndex; // bottleId => index in activeBottleIds
    
    // Events
    event BottleSent(uint256 indexed bottleId, address indexed sender, uint256 timestamp);
    event BottleReceived(uint256 indexed bottleId, address indexed receiver, uint256 timestamp);
    event BottleReplied(uint256 indexed bottleId, uint256 indexed replyId, address indexed replier, uint256 timestamp);
    event BottleSkipped(uint256 indexed bottleId, address indexed skipper, uint256 timestamp);
    
    modifier bottleExists(uint256 bottleId) {
        require(bottleId > 0 && bottleId <= _bottleIdCounter, "Bottle does not exist");
        _;
    }
    
    modifier replyExists(uint256 replyId) {
        require(replyId > 0 && replyId <= _replyIdCounter, "Reply does not exist");
        _;
    }
    
    function sendBottle(string memory content) external {
        require(bytes(content).length > 0, "Content cannot be empty");
        require(bytes(content).length <= 1000, "Content too long");
        
        _bottleIdCounter++;
        uint256 bottleId = _bottleIdCounter;
        
        bottles[bottleId] = Bottle({
            id: bottleId,
            sender: msg.sender,
            content: content,
            timestamp: block.timestamp,
            isActive: true,
            replyCount: 0
        });
        
        userBottles[msg.sender].push(bottleId);
        activeBottleIds.push(bottleId);
        activeBottleIndex[bottleId] = activeBottleIds.length - 1;
        
        emit BottleSent(bottleId, msg.sender, block.timestamp);
    }
    
    function getRandomBottle() external view returns (uint256) {
        require(activeBottleIds.length > 0, "No bottles available");
        
        // Generate random seed using multiple sources for better randomness
        uint256 seed = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            msg.sender,
            activeBottleIds.length,
            block.number
        )));
        
        // Simple direct random selection - no state checking for minimal gas
        uint256 randomIndex = seed % activeBottleIds.length;
        uint256 bottleId = activeBottleIds[randomIndex];
        
        // Only ensure it's not user's own bottle and it's active
        require(bottles[bottleId].sender != msg.sender, "Cannot view your own bottle");
        require(bottles[bottleId].isActive, "Bottle is not active");
        
        return bottleId;
    }
    
    function replyToBottle(uint256 bottleId, string memory content) external bottleExists(bottleId) {
        require(bytes(content).length > 0, "Reply content cannot be empty");
        require(bytes(content).length <= 1000, "Reply content too long");
        require(bottles[bottleId].isActive, "Bottle is not active");
        require(bottles[bottleId].sender != msg.sender, "Cannot reply to your own bottle");
        
        // Use a simple mapping to track if user replied to specific bottle
        // This is much more gas efficient than nested state struct
        bytes32 replyKey = keccak256(abi.encodePacked(msg.sender, bottleId));
        require(!hasUserReplied[replyKey], "Already replied to this bottle");
        
        _replyIdCounter++;
        uint256 replyId = _replyIdCounter;
        
        replies[replyId] = Reply({
            bottleId: bottleId,
            replier: msg.sender,
            content: content,
            timestamp: block.timestamp,
            replyToReplyId: 0
        });
        
        // Mark user as replied using efficient key mapping
        hasUserReplied[replyKey] = true;
        
        // Update arrays and counters
        userReplies[msg.sender].push(replyId);
        bottleReplies[bottleId].push(replyId);
        bottles[bottleId].replyCount++;
        
        emit BottleReplied(bottleId, replyId, msg.sender, block.timestamp);
    }
    
    function replyToReply(uint256 replyId, string memory content) external replyExists(replyId) {
        require(bytes(content).length > 0, "Reply content cannot be empty");
        require(bytes(content).length <= 1000, "Reply content too long");
        
        Reply memory originalReply = replies[replyId];
        require(originalReply.replier != msg.sender, "Cannot reply to your own reply");
        
        uint256 bottleId = originalReply.bottleId;
        require(bottles[bottleId].isActive, "Bottle is not active");
        
        _replyIdCounter++;
        uint256 newReplyId = _replyIdCounter;
        
        replies[newReplyId] = Reply({
            bottleId: bottleId,
            replier: msg.sender,
            content: content,
            timestamp: block.timestamp,
            replyToReplyId: replyId
        });
        
        userReplies[msg.sender].push(newReplyId);
        bottleReplies[bottleId].push(newReplyId);
        bottles[bottleId].replyCount++;
        
        emit BottleReplied(bottleId, newReplyId, msg.sender, block.timestamp);
    }
    
    function skipBottle(uint256 bottleId) external bottleExists(bottleId) {
        require(bottles[bottleId].isActive, "Bottle is not active");
        require(bottles[bottleId].sender != msg.sender, "Cannot skip your own bottle");
        
        bytes32 replyKey = keccak256(abi.encodePacked(msg.sender, bottleId));
        require(!hasUserReplied[replyKey], "Cannot skip bottle you've replied to");
        
        UserBottleState storage state = userBottleStates[msg.sender][bottleId];
        require(!state.hasSkipped, "Already skipped this bottle");
        
        state.hasSkipped = true;
        
        emit BottleSkipped(bottleId, msg.sender, block.timestamp);
    }
    

    // View functions
    function getBottle(uint256 bottleId) external view bottleExists(bottleId) returns (Bottle memory) {
        return bottles[bottleId];
    }
    
    function getReply(uint256 replyId) external view replyExists(replyId) returns (Reply memory) {
        return replies[replyId];
    }
    
    function getBottleReplies(uint256 bottleId) external view bottleExists(bottleId) returns (uint256[] memory) {
        return bottleReplies[bottleId];
    }
    
    function getUserBottles(address user) external view returns (uint256[] memory) {
        return userBottles[user];
    }
    
    function getUserReplies(address user) external view returns (uint256[] memory) {
        return userReplies[user];
    }
    
    function getUserBottleState(address user, uint256 bottleId) external view returns (UserBottleState memory) {
        return userBottleStates[user][bottleId];
    }
    
    function hasUserRepliedToBottle(address user, uint256 bottleId) external view returns (bool) {
        bytes32 replyKey = keccak256(abi.encodePacked(user, bottleId));
        return hasUserReplied[replyKey];
    }
    
    function getActiveBottleCount() external view returns (uint256) {
        return activeBottleIds.length;
    }
    
    function getBottleCount() external view returns (uint256) {
        return _bottleIdCounter;
    }
    
    function getReplyCount() external view returns (uint256) {
        return _replyIdCounter;
    }
    
    function getTotalReplies() external view returns (uint256) {
        return _replyIdCounter;
    }
    
    // Admin functions (if needed for moderation)
    function deactivateBottle(uint256 bottleId) external bottleExists(bottleId) {
        require(bottles[bottleId].sender == msg.sender, "Only sender can deactivate");
        
        bottles[bottleId].isActive = false;
        
        // Remove from active bottles array
        uint256 index = activeBottleIndex[bottleId];
        uint256 lastBottleId = activeBottleIds[activeBottleIds.length - 1];
        
        activeBottleIds[index] = lastBottleId;
        activeBottleIndex[lastBottleId] = index;
        
        activeBottleIds.pop();
        delete activeBottleIndex[bottleId];
    }
}