// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract DEX {
    using SafeMath for uint256;

    struct Token {
        address tokenAddress;
        string name;
        string symbol;
    }

    struct LiquidityPool {
        uint256 tokenAReserve;
        uint256 tokenBReserve;
    }

    mapping(bytes32 => Token) public tokens;
    mapping(bytes32 => LiquidityPool) public liquidityPools;
    mapping(address => mapping(bytes32 => uint256)) public liquidity;

    uint256 public constant MINIMUM_LIQUIDITY = 10 ** 3;
    uint256 private constant FEE_PERCENT = 3; // 0.3% fee

    event AddLiquidity(
        address indexed provider,
        bytes32 poolId,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    );
    event RemoveLiquidity(
        address indexed provider,
        bytes32 poolId,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    );
    event Swap(
        address indexed user,
        bytes32 poolId,
        uint256 amountIn,
        uint256 amountOut,
        bool isAToB
    );

    function addToken(
        address _tokenAddress,
        string memory _name,
        string memory _symbol
    ) external {
        bytes32 tokenId = keccak256(abi.encodePacked(_tokenAddress));
        tokens[tokenId] = Token(_tokenAddress, _name, _symbol);
    }

    function createPool(bytes32 _tokenAId, bytes32 _tokenBId) external {
        require(
            tokens[_tokenAId].tokenAddress != address(0),
            "Token A does not exist"
        );
        require(
            tokens[_tokenBId].tokenAddress != address(0),
            "Token B does not exist"
        );
        bytes32 poolId = keccak256(abi.encodePacked(_tokenAId, _tokenBId));
        require(
            liquidityPools[poolId].tokenAReserve == 0,
            "Pool already exists"
        );
        liquidityPools[poolId] = LiquidityPool(0, 0);
    }

    function addLiquidity(
        bytes32 _poolId,
        uint256 _amountA,
        uint256 _amountB
    ) external {
        LiquidityPool storage pool = liquidityPools[_poolId];
        uint256 liquidity;
        uint256 balanceA = pool.tokenAReserve;
        uint256 balanceB = pool.tokenBReserve;

        if (balanceA == 0 && balanceB == 0) {
            liquidity = Math.sqrt(_amountA.mul(_amountB)).sub(
                MINIMUM_LIQUIDITY
            );
            _mint(address(0), MINIMUM_LIQUIDITY);
        } else {
            liquidity = Math.min(
                _amountA.mul(pool.tokenAReserve) / balanceA,
                _amountB.mul(pool.tokenBReserve) / balanceB
            );
        }

        require(liquidity > 0, "Insufficient liquidity minted");
        _mint(msg.sender, liquidity);

        _safeTransferFrom(
            tokens[_poolId].tokenAddress,
            msg.sender,
            address(this),
            _amountA
        );
        _safeTransferFrom(
            tokens[_poolId].tokenAddress,
            msg.sender,
            address(this),
            _amountB
        );

        pool.tokenAReserve = pool.tokenAReserve.add(_amountA);
        pool.tokenBReserve = pool.tokenBReserve.add(_amountB);

        emit AddLiquidity(msg.sender, _poolId, _amountA, _amountB, liquidity);
    }

    function removeLiquidity(bytes32 _poolId, uint256 _liquidity) external {
        LiquidityPool storage pool = liquidityPools[_poolId];
        uint256 balanceA = pool.tokenAReserve;
        uint256 balanceB = pool.tokenBReserve;
        uint256 totalSupply = _totalSupply(_poolId);

        uint256 amountA = _liquidity.mul(balanceA) / totalSupply;
        uint256 amountB = _liquidity.mul(balanceB) / totalSupply;
        require(amountA > 0 && amountB > 0, "Insufficient liquidity burned");

        _burn(msg.sender, _liquidity);
        _safeTransfer(tokens[_poolId].tokenAddress, msg.sender, amountA);
        _safeTransfer(tokens[_poolId].tokenAddress, msg.sender, amountB);

        pool.tokenAReserve = pool.tokenAReserve.sub(amountA);
        pool.tokenBReserve = pool.tokenBReserve.sub(amountB);

        emit RemoveLiquidity(msg.sender, _poolId, amountA, amountB, _liquidity);
    }

    function swap(
        bytes32 _poolId,
        uint256 _amountIn,
        uint256 _minAmountOut,
        bool _isAToB
    ) external {
        LiquidityPool storage pool = liquidityPools[_poolId];
        require(_amountIn > 0, "Insufficient input amount");

        (uint256 reserveIn, uint256 reserveOut) = _isAToB
            ? (pool.tokenAReserve, pool.tokenBReserve)
            : (pool.tokenBReserve, pool.tokenAReserve);

        uint256 amountInWithFee = _amountIn.mul(1000 - FEE_PERCENT);
        uint256 numerator = amountInWithFee.mul(reserveOut);
        uint256 denominator = reserveIn.mul(1000).add(amountInWithFee);
        uint256 amountOut = numerator / denominator;

        require(amountOut >= _minAmountOut, "Insufficient output amount");

        if (_isAToB) {
            _safeTransferFrom(
                tokens[_poolId].tokenAddress,
                msg.sender,
                address(this),
                _amountIn
            );
            _safeTransfer(tokens[_poolId].tokenAddress, msg.sender, amountOut);
            pool.tokenAReserve = pool.tokenAReserve.add(_amountIn);
            pool.tokenBReserve = pool.tokenBReserve.sub(amountOut);
        } else {
            _safeTransferFrom(
                tokens[_poolId].tokenAddress,
                msg.sender,
                address(this),
                _amountIn
            );
            _safeTransfer(tokens[_poolId].tokenAddress, msg.sender, amountOut);
            pool.tokenBReserve = pool.tokenBReserve.add(_amountIn);
            pool.tokenAReserve = pool.tokenAReserve.sub(amountOut);
        }

        emit Swap(msg.sender, _poolId, _amountIn, amountOut, _isAToB);
    }

    // Helper functions (not implemented for brevity)
    function _mint(address to, uint256 amount) internal {}
    function _burn(address from, uint256 amount) internal {}
    function _totalSupply(bytes32 poolId) internal view returns (uint256) {}
    function _safeTransfer(address token, address to, uint256 value) internal {}
    function _safeTransferFrom(
        address token,
        address from,
        address to,
        uint256 value
    ) internal {}
}
