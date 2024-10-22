import { BigNumber } from "jsd-std";
import { Token } from "./Token";

interface LiquidityPool {
  tokenAReserve: BigNumber;
  tokenBReserve: BigNumber;
}

export class DEX {
  private tokens: Map<string, Token>;
  private liquidityPools: Map<string, LiquidityPool>;
  private liquidity: Map<string, Map<string, BigNumber>>;

  private readonly MINIMUM_LIQUIDITY = BigNumber.from(10).pow(3);
  private readonly FEE_PERCENT = BigNumber.from(3); // 0.3% fee

  constructor() {
    this.tokens = new Map();
    this.liquidityPools = new Map();
    this.liquidity = new Map();
  }

  public addToken(tokenAddress: string, name: string, symbol: string): void {
    const tokenId = this.hashAddress(tokenAddress);
    this.tokens.set(tokenId, new Token(name, symbol, 18, BigNumber.from(0)));
  }

  public createPool(tokenAId: string, tokenBId: string): void {
    if (!this.tokens.has(tokenAId)) throw new Error("Token A does not exist");
    if (!this.tokens.has(tokenBId)) throw new Error("Token B does not exist");

    const poolId = this.hashPoolId(tokenAId, tokenBId);
    if (this.liquidityPools.has(poolId)) throw new Error("Pool already exists");

    this.liquidityPools.set(poolId, {
      tokenAReserve: BigNumber.from(0),
      tokenBReserve: BigNumber.from(0),
    });
  }

  public addLiquidity(
    poolId: string,
    amountA: BigNumber,
    amountB: BigNumber
  ): void {
    const pool = this.liquidityPools.get(poolId);
    if (!pool) throw new Error("Pool does not exist");

    let liquidity: BigNumber;
    const { tokenAReserve, tokenBReserve } = pool;

    if (tokenAReserve.isZero() && tokenBReserve.isZero()) {
      liquidity = this.sqrt(amountA.mul(amountB)).sub(this.MINIMUM_LIQUIDITY);
      // Mint MINIMUM_LIQUIDITY to address(0)
    } else {
      liquidity = BigNumber.min(
        amountA.mul(tokenAReserve).div(tokenAReserve),
        amountB.mul(tokenBReserve).div(tokenBReserve)
      );
    }

    if (liquidity.lte(0)) throw new Error("Insufficient liquidity minted");

    pool.tokenAReserve = pool.tokenAReserve.add(amountA);
    pool.tokenBReserve = pool.tokenBReserve.add(amountB);

    const providerLiquidity =
      this.liquidity.get(msg.sender) || new Map<string, BigNumber>();
    providerLiquidity.set(
      poolId,
      (providerLiquidity.get(poolId) || BigNumber.from(0)).add(liquidity)
    );
    this.liquidity.set(msg.sender, providerLiquidity);

    this.emitAddLiquidity(msg.sender, poolId, amountA, amountB, liquidity);
  }

  public removeLiquidity(poolId: string, liquidity: BigNumber): void {
    const pool = this.liquidityPools.get(poolId);
    if (!pool) throw new Error("Pool does not exist");

    const { tokenAReserve, tokenBReserve } = pool;
    const totalSupply = this.getTotalSupply(poolId);

    const amountA = liquidity.mul(tokenAReserve).div(totalSupply);
    const amountB = liquidity.mul(tokenBReserve).div(totalSupply);

    if (amountA.lte(0) || amountB.lte(0))
      throw new Error("Insufficient liquidity burned");

    pool.tokenAReserve = pool.tokenAReserve.sub(amountA);
    pool.tokenBReserve = pool.tokenBReserve.sub(amountB);

    const providerLiquidity = this.liquidity.get(msg.sender);
    if (providerLiquidity) {
      providerLiquidity.set(
        poolId,
        (providerLiquidity.get(poolId) || BigNumber.from(0)).sub(liquidity)
      );
    }

    this.emitRemoveLiquidity(msg.sender, poolId, amountA, amountB, liquidity);
  }

  public swap(
    poolId: string,
    amountIn: BigNumber,
    minAmountOut: BigNumber,
    isAToB: boolean
  ): void {
    const pool = this.liquidityPools.get(poolId);
    if (!pool) throw new Error("Pool does not exist");

    if (amountIn.lte(0)) throw new Error("Insufficient input amount");

    const [reserveIn, reserveOut] = isAToB
      ? [pool.tokenAReserve, pool.tokenBReserve]
      : [pool.tokenBReserve, pool.tokenAReserve];

    const amountInWithFee = amountIn.mul(1000 - this.FEE_PERCENT);
    const numerator = amountInWithFee.mul(reserveOut);
    const denominator = reserveIn.mul(1000).add(amountInWithFee);
    const amountOut = numerator.div(denominator);

    if (amountOut.lt(minAmountOut))
      throw new Error("Insufficient output amount");

    if (isAToB) {
      pool.tokenAReserve = pool.tokenAReserve.add(amountIn);
      pool.tokenBReserve = pool.tokenBReserve.sub(amountOut);
    } else {
      pool.tokenBReserve = pool.tokenBReserve.add(amountIn);
      pool.tokenAReserve = pool.tokenAReserve.sub(amountOut);
    }

    this.emitSwap(msg.sender, poolId, amountIn, amountOut, isAToB);
  }

  private hashAddress(address: string): string {
    // Implement address hashing
    return address;
  }

  private hashPoolId(tokenAId: string, tokenBId: string): string {
    // Implement pool ID hashing
    return `${tokenAId}-${tokenBId}`;
  }

  private sqrt(value: BigNumber): BigNumber {
    // Implement square root for BigNumber
    return value.sqrt();
  }

  private getTotalSupply(poolId: string): BigNumber {
    // Implement total supply calculation
    return BigNumber.from(0);
  }

  private emitAddLiquidity(
    provider: string,
    poolId: string,
    amountA: BigNumber,
    amountB: BigNumber,
    liquidity: BigNumber
  ): void {
    console.log("AddLiquidity", {
      provider,
      poolId,
      amountA,
      amountB,
      liquidity,
    });
  }

  private emitRemoveLiquidity(
    provider: string,
    poolId: string,
    amountA: BigNumber,
    amountB: BigNumber,
    liquidity: BigNumber
  ): void {
    console.log("RemoveLiquidity", {
      provider,
      poolId,
      amountA,
      amountB,
      liquidity,
    });
  }

  private emitSwap(
    user: string,
    poolId: string,
    amountIn: BigNumber,
    amountOut: BigNumber,
    isAToB: boolean
  ): void {
    console.log("Swap", { user, poolId, amountIn, amountOut, isAToB });
  }
}

// Simulate the global msg object in Solidity
const msg = {
  sender: "0x1234567890123456789012345678901234567890",
};
