// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IWFLOW {
    function deposit() external payable;
    function withdraw(uint256) external;
    function balanceOf(address) external view returns (uint256);
    function transfer(address, uint256) external returns (bool);
    function transferFrom(address, address, uint256) external returns (bool);
    function approve(address, uint256) external returns (bool);
    function allowance(address, address) external view returns (uint256);
}

library TransferHelper {
    function safeTransferFrom(address token, address from, address to, uint256 value) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(0x23b872dd, from, to, value)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "STF");
    }

    function safeTransfer(address token, address to, uint256 value) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(0xa9059cbb, to, value)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "ST");
    }

    function safeTransferETH(address to, uint256 value) internal {
        (bool success, ) = to.call{value: value}(new bytes(0));
        require(success, "STE");
    }
}

contract FlowSwapRouter {
    using TransferHelper for address;
    
    address public immutable WFLOW;
    address public owner;
    
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    
    struct ExactOutputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountOut;
        uint256 amountInMaximum;
        uint160 sqrtPriceLimitX96;
    }
    
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }
    
    struct ExactOutputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountOut;
        uint256 amountInMaximum;
    }
    
    event Swap(
        address indexed tokenIn,
        address indexed tokenOut,
        address indexed recipient,
        uint256 amountIn,
        uint256 amountOut
    );
    
    modifier checkDeadline(uint256 deadline) {
        require(block.timestamp <= deadline, "Transaction too old");
        _;
    }
    
    constructor(address _wflow) {
        WFLOW = _wflow;
        owner = msg.sender;
    }
    
    receive() external payable {
        require(msg.sender == WFLOW, "Not WFLOW");
    }
    
    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        checkDeadline(params.deadline)
        returns (uint256 amountOut)
    {
        require(params.amountIn > 0, "Invalid amount");
        
        bool isInputFLOW = params.tokenIn == address(0);
        bool isOutputFLOW = params.tokenOut == address(0);
        
        require(
            (isInputFLOW && params.tokenOut == WFLOW) || 
            (params.tokenIn == WFLOW && isOutputFLOW),
            "Invalid pair"
        );
        
        if (isInputFLOW) {
            require(msg.value == params.amountIn, "Incorrect FLOW amount");
            
            IWFLOW(WFLOW).deposit{value: msg.value}();
            
            amountOut = msg.value;
            require(amountOut >= params.amountOutMinimum, "Too little received");
            
            WFLOW.safeTransfer(params.recipient, amountOut);
        } else {
            TransferHelper.safeTransferFrom(
                WFLOW,
                msg.sender,
                address(this),
                params.amountIn
            );
            
            IWFLOW(WFLOW).withdraw(params.amountIn);
            
            amountOut = params.amountIn;
            require(amountOut >= params.amountOutMinimum, "Too little received");
            
            TransferHelper.safeTransferETH(params.recipient, amountOut);
        }
        
        emit Swap(
            isInputFLOW ? address(0) : WFLOW,
            isOutputFLOW ? address(0) : WFLOW,
            params.recipient,
            params.amountIn,
            amountOut
        );
    }
    
    function exactOutputSingle(ExactOutputSingleParams calldata params)
        external
        payable
        checkDeadline(params.deadline)
        returns (uint256 amountIn)
    {
        require(params.amountOut > 0, "Invalid amount");
        
        bool isInputFLOW = params.tokenIn == address(0);
        bool isOutputFLOW = params.tokenOut == address(0);
        
        require(
            (isInputFLOW && params.tokenOut == WFLOW) || 
            (params.tokenIn == WFLOW && isOutputFLOW),
            "Invalid pair"
        );
        
        amountIn = params.amountOut;
        require(amountIn <= params.amountInMaximum, "Too much requested");
        
        if (isInputFLOW) {
            require(msg.value >= amountIn, "Insufficient FLOW sent");
            
            IWFLOW(WFLOW).deposit{value: amountIn}();
            
            WFLOW.safeTransfer(params.recipient, params.amountOut);
            
            if (msg.value > amountIn) {
                TransferHelper.safeTransferETH(msg.sender, msg.value - amountIn);
            }
        } else {
            TransferHelper.safeTransferFrom(
                WFLOW,
                msg.sender,
                address(this),
                amountIn
            );
            
            IWFLOW(WFLOW).withdraw(amountIn);
            
            TransferHelper.safeTransferETH(params.recipient, params.amountOut);
        }
        
        emit Swap(
            isInputFLOW ? address(0) : WFLOW,
            isOutputFLOW ? address(0) : WFLOW,
            params.recipient,
            amountIn,
            params.amountOut
        );
    }
    
    function exactInput(ExactInputParams calldata params)
        external
        payable
        checkDeadline(params.deadline)
        returns (uint256 amountOut)
    {
        (address tokenIn, address tokenOut) = decodeFirstPool(params.path);
        
        bool isInputFLOW = tokenIn == address(0);
        bool isOutputFLOW = tokenOut == address(0);
        
        require(
            (isInputFLOW && tokenOut == WFLOW) || 
            (tokenIn == WFLOW && isOutputFLOW),
            "Invalid path"
        );
        
        if (isInputFLOW) {
            require(msg.value == params.amountIn, "Incorrect FLOW amount");
            
            IWFLOW(WFLOW).deposit{value: msg.value}();
            amountOut = msg.value;
            
            require(amountOut >= params.amountOutMinimum, "Too little received");
            WFLOW.safeTransfer(params.recipient, amountOut);
        } else {
            TransferHelper.safeTransferFrom(
                WFLOW,
                msg.sender,
                address(this),
                params.amountIn
            );
            
            IWFLOW(WFLOW).withdraw(params.amountIn);
            amountOut = params.amountIn;
            
            require(amountOut >= params.amountOutMinimum, "Too little received");
            TransferHelper.safeTransferETH(params.recipient, amountOut);
        }
        
        emit Swap(
            isInputFLOW ? address(0) : WFLOW,
            isOutputFLOW ? address(0) : WFLOW,
            params.recipient,
            params.amountIn,
            amountOut
        );
    }
    
    function exactOutput(ExactOutputParams calldata params)
        external
        payable
        checkDeadline(params.deadline)
        returns (uint256 amountIn)
    {
        (address tokenOut, address tokenIn) = decodeFirstPool(params.path);
        
        bool isInputFLOW = tokenIn == address(0);
        bool isOutputFLOW = tokenOut == address(0);
        
        require(
            (isInputFLOW && tokenOut == WFLOW) || 
            (tokenIn == WFLOW && isOutputFLOW),
            "Invalid path"
        );
        
        amountIn = params.amountOut;
        require(amountIn <= params.amountInMaximum, "Too much requested");
        
        if (isInputFLOW) {
            require(msg.value >= amountIn, "Insufficient FLOW sent");
            
            IWFLOW(WFLOW).deposit{value: amountIn}();
            WFLOW.safeTransfer(params.recipient, params.amountOut);
            
            if (msg.value > amountIn) {
                TransferHelper.safeTransferETH(msg.sender, msg.value - amountIn);
            }
        } else {
            TransferHelper.safeTransferFrom(
                WFLOW,
                msg.sender,
                address(this),
                amountIn
            );
            
            IWFLOW(WFLOW).withdraw(amountIn);
            TransferHelper.safeTransferETH(params.recipient, params.amountOut);
        }
        
        emit Swap(
            isInputFLOW ? address(0) : WFLOW,
            isOutputFLOW ? address(0) : WFLOW,
            params.recipient,
            amountIn,
            params.amountOut
        );
    }
    
    function swapExactFLOWForWFLOW(uint256 amountOutMin, address recipient, uint256 deadline)
        external
        payable
        checkDeadline(deadline)
        returns (uint256 amountOut)
    {
        require(msg.value > 0, "No FLOW sent");
        
        IWFLOW(WFLOW).deposit{value: msg.value}();
        amountOut = msg.value;
        
        require(amountOut >= amountOutMin, "Insufficient output amount");
        WFLOW.safeTransfer(recipient, amountOut);
        
        emit Swap(address(0), WFLOW, recipient, msg.value, amountOut);
    }
    
    function swapExactWFLOWForFLOW(uint256 amountIn, uint256 amountOutMin, address recipient, uint256 deadline)
        external
        checkDeadline(deadline)
        returns (uint256 amountOut)
    {
        require(amountIn > 0, "Invalid amount");
        
        TransferHelper.safeTransferFrom(WFLOW, msg.sender, address(this), amountIn);
        IWFLOW(WFLOW).withdraw(amountIn);
        
        amountOut = amountIn;
        require(amountOut >= amountOutMin, "Insufficient output amount");
        
        TransferHelper.safeTransferETH(recipient, amountOut);
        
        emit Swap(WFLOW, address(0), recipient, amountIn, amountOut);
    }
    
    function swapFLOWForExactWFLOW(uint256 amountOut, address recipient, uint256 deadline)
        external
        payable
        checkDeadline(deadline)
        returns (uint256 amountIn)
    {
        require(amountOut > 0, "Invalid amount");
        require(msg.value >= amountOut, "Insufficient FLOW sent");
        
        amountIn = amountOut;
        IWFLOW(WFLOW).deposit{value: amountIn}();
        WFLOW.safeTransfer(recipient, amountOut);
        
        if (msg.value > amountIn) {
            TransferHelper.safeTransferETH(msg.sender, msg.value - amountIn);
        }
        
        emit Swap(address(0), WFLOW, recipient, amountIn, amountOut);
    }
    
    function swapWFLOWForExactFLOW(uint256 amountOut, uint256 amountInMax, address recipient, uint256 deadline)
        external
        checkDeadline(deadline)
        returns (uint256 amountIn)
    {
        require(amountOut > 0, "Invalid amount");
        
        amountIn = amountOut;
        require(amountIn <= amountInMax, "Excessive input amount");
        
        TransferHelper.safeTransferFrom(WFLOW, msg.sender, address(this), amountIn);
        IWFLOW(WFLOW).withdraw(amountIn);
        TransferHelper.safeTransferETH(recipient, amountOut);
        
        emit Swap(WFLOW, address(0), recipient, amountIn, amountOut);
    }
    
    function decodeFirstPool(bytes memory path) internal pure returns (address tokenA, address tokenB) {
        require(path.length >= 43, "Invalid path");
        
        assembly {
            tokenA := div(mload(add(add(path, 0x20), 0)), 0x1000000000000000000000000)
            tokenB := div(mload(add(add(path, 0x20), 23)), 0x1000000000000000000000000)
        }
    }
    
    function refundFLOW() external {
        if (address(this).balance > 0) {
            TransferHelper.safeTransferETH(msg.sender, address(this).balance);
        }
    }
    
    function unwrapWFLOW(uint256 amountMinimum, address recipient) external {
        uint256 balanceWFLOW = IWFLOW(WFLOW).balanceOf(address(this));
        require(balanceWFLOW >= amountMinimum, "Insufficient WFLOW");
        
        if (balanceWFLOW > 0) {
            IWFLOW(WFLOW).withdraw(balanceWFLOW);
            TransferHelper.safeTransferETH(recipient, balanceWFLOW);
        }
    }
    
    function sweepToken(address token, uint256 amountMinimum, address recipient) external {
        uint256 balanceToken = IWFLOW(token).balanceOf(address(this));
        require(balanceToken >= amountMinimum, "Insufficient token");
        
        if (balanceToken > 0) {
            token.safeTransfer(recipient, balanceToken);
        }
    }
}