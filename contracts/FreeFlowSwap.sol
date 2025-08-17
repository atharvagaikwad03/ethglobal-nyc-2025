// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IFlowSwapRouter {
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

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
    function exactOutputSingle(ExactOutputSingleParams calldata params) external payable returns (uint256 amountIn);
    function swapExactFLOWForWFLOW(uint256 amountOutMin, address recipient, uint256 deadline) external payable returns (uint256 amountOut);
    function swapExactWFLOWForFLOW(uint256 amountIn, uint256 amountOutMin, address recipient, uint256 deadline) external returns (uint256 amountOut);
}

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}

contract FreeFlowSwap {
    address public immutable FLOW_SWAP_ROUTER;
    address public constant WFLOW = 0xd3bF53DAC106A0290B0483EcBC89d40FcC961f3e;
    uint24 public constant DEFAULT_FEE = 3000;
    
    address public owner;
    
    event SwapExecuted(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor(address _flowSwapRouter) {
        require(_flowSwapRouter != address(0), "Invalid router");
        FLOW_SWAP_ROUTER = _flowSwapRouter;
        owner = msg.sender;
    }
    
    function swapFLOWToWFLOW(
        uint256 amountOutMinimum,
        address recipient,
        uint256 deadline
    ) external payable returns (uint256 amountOut) {
        require(msg.value > 0, "No FLOW sent");
        require(recipient != address(0), "Invalid recipient");
        
        amountOut = IFlowSwapRouter(FLOW_SWAP_ROUTER).swapExactFLOWForWFLOW{value: msg.value}(
            amountOutMinimum,
            recipient,
            deadline
        );
        
        emit SwapExecuted(msg.sender, address(0), WFLOW, msg.value, amountOut);
    }
    
    function swapWFLOWToFLOW(
        uint256 amountIn,
        uint256 amountOutMinimum,
        address recipient,
        uint256 deadline
    ) external returns (uint256 amountOut) {
        require(amountIn > 0, "Invalid amount");
        require(recipient != address(0), "Invalid recipient");
        
        IERC20(WFLOW).transferFrom(msg.sender, address(this), amountIn);
        IERC20(WFLOW).approve(FLOW_SWAP_ROUTER, amountIn);
        
        amountOut = IFlowSwapRouter(FLOW_SWAP_ROUTER).swapExactWFLOWForFLOW(
            amountIn,
            amountOutMinimum,
            recipient,
            deadline
        );
        
        emit SwapExecuted(msg.sender, WFLOW, address(0), amountIn, amountOut);
    }
    
    function swapExactInput(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMinimum,
        address recipient,
        uint256 deadline
    ) external payable returns (uint256 amountOut) {
        require(recipient != address(0), "Invalid recipient");
        require(
            (tokenIn == address(0) && tokenOut == WFLOW) ||
            (tokenIn == WFLOW && tokenOut == address(0)),
            "Invalid pair"
        );
        
        IFlowSwapRouter.ExactInputSingleParams memory params = IFlowSwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: DEFAULT_FEE,
            recipient: recipient,
            deadline: deadline,
            amountIn: amountIn,
            amountOutMinimum: amountOutMinimum,
            sqrtPriceLimitX96: 0
        });
        
        if (tokenIn == address(0)) {
            require(msg.value == amountIn, "Incorrect FLOW amount");
            amountOut = IFlowSwapRouter(FLOW_SWAP_ROUTER).exactInputSingle{value: msg.value}(params);
        } else {
            IERC20(WFLOW).transferFrom(msg.sender, address(this), amountIn);
            IERC20(WFLOW).approve(FLOW_SWAP_ROUTER, amountIn);
            amountOut = IFlowSwapRouter(FLOW_SWAP_ROUTER).exactInputSingle(params);
        }
        
        emit SwapExecuted(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
    }
    
    function swapExactOutput(
        address tokenIn,
        address tokenOut,
        uint256 amountOut,
        uint256 amountInMaximum,
        address recipient,
        uint256 deadline
    ) external payable returns (uint256 amountIn) {
        require(recipient != address(0), "Invalid recipient");
        require(
            (tokenIn == address(0) && tokenOut == WFLOW) ||
            (tokenIn == WFLOW && tokenOut == address(0)),
            "Invalid pair"
        );
        
        IFlowSwapRouter.ExactOutputSingleParams memory params = IFlowSwapRouter.ExactOutputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: DEFAULT_FEE,
            recipient: recipient,
            deadline: deadline,
            amountOut: amountOut,
            amountInMaximum: amountInMaximum,
            sqrtPriceLimitX96: 0
        });
        
        if (tokenIn == address(0)) {
            require(msg.value >= amountInMaximum, "Insufficient FLOW sent");
            amountIn = IFlowSwapRouter(FLOW_SWAP_ROUTER).exactOutputSingle{value: msg.value}(params);
            
            if (msg.value > amountIn) {
                (bool success, ) = msg.sender.call{value: msg.value - amountIn}("");
                require(success, "Refund failed");
            }
        } else {
            uint256 currentAllowance = IERC20(WFLOW).allowance(msg.sender, address(this));
            require(currentAllowance >= amountInMaximum, "Insufficient allowance");
            
            amountIn = IFlowSwapRouter(FLOW_SWAP_ROUTER).exactOutputSingle(params);
            
            IERC20(WFLOW).transferFrom(msg.sender, address(this), amountIn);
            IERC20(WFLOW).approve(FLOW_SWAP_ROUTER, amountIn);
            
            IFlowSwapRouter(FLOW_SWAP_ROUTER).exactOutputSingle(params);
        }
        
        emit SwapExecuted(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
    }
    
    function quote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external pure returns (uint256 amountOut) {
        require(
            (tokenIn == address(0) && tokenOut == WFLOW) ||
            (tokenIn == WFLOW && tokenOut == address(0)),
            "Invalid pair"
        );
        amountOut = amountIn;
    }
    
    function recoverTokens(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance");
        IERC20(token).transfer(owner, balance);
    }
    
    function recoverFLOW() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance");
        payable(owner).transfer(balance);
    }
    
    receive() external payable {}
}