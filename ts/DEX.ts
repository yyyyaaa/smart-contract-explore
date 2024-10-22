import { BigNumber, Address } from "jsd-std";

export interface Token {
  tokenAddress: Address;
  name: string;
  symbol: string;
}

export interface LiquidityPool {
  tokenAReserve: BigNumber;
  tokenBReserve: BigNumber;
}

export interface DEXState {
  tokens: Map<string, Token>;
  liquidityPools: Map<string, LiquidityPool>;
  liquidity: Map<Address, Map<string, BigNumber>>;
}

export interface AddLiquidityEvent {
  provider: Address;
  poolId: string;
  amountA: BigNumber;
  amountB: BigNumber;
  liquidity: BigNumber;
}

export interface RemoveLiquidityEvent {
  provider: Address;
  poolId: string;
  amountA: BigNumber;
  amountB: BigNumber;
  liquidity: BigNumber;
}

export interface SwapEvent {
  user: Address;
  poolId: string;
  amountIn: BigNumber;
  amountOut: BigNumber;
  isAToB: boolean;
}

const MINIMUM_LIQUIDITY = BigNumber.from(10).pow(3);
const FEE_PERCENT = BigNumber.from(3); // 0.3% fee

export function initialize(): DEXState {
  return {
    tokens: new Map(),
    liquidityPools: new Map(),
    liquidity: new Map(),
  };
}

export function addToken(
  state: DEXState,
  {
    tokenAddress,
    name,
    symbol,
  }: { tokenAddress: Address; name: string; symbol: string }
): DEXState {
  const tokenId = hashAddress(tokenAddress);
  const newTokens = new Map(state.tokens);
  newTokens.set(tokenId, { tokenAddress, name, symbol });
  return { ...state, tokens: newTokens };
}

export function createPool(
  state: DEXState,
  { tokenAId, tokenBId }: { tokenAId: string; tokenBId: string }
): DEXState {
  if (!state.tokens.has(tokenAId)) throw new Error("Token A does not exist");
  if (!state.tokens.has(tokenBId)) throw new Error("Token B does not exist");

  const poolId = hashPoolId(tokenAId, tokenBId);
  if (state.liquidityPools.has(poolId)) throw new Error("Pool already exists");

  const newLiquidityPools = new Map(state.liquidityPools);
  newLiquidityPools.set(poolId, {
    tokenAReserve: BigNumber.from(0),
    tokenBReserve: BigNumber.from(0),
  });

  return { ...state, liquidityPools: newLiquidityPools };
}

export function addLiquidity(
  state: DEXState,
  {
    poolId,
    amountA,
    amountB,
    provider,
  }: {
    poolId: string;
    amountA: BigNumber;
    amountB: BigNumber;
    provider: Address;
  }
): [DEXState, AddLiquidityEvent] {
  const pool = state.liquidityPools.get(poolId);
  if (!pool) throw new Error("Pool does not exist");

  let liquidity: BigNumber;
  const { tokenAReserve, tokenBReserve } = pool;

  if (tokenAReserve.isZero() && tokenBReserve.isZero()) {
    liquidity = sqrt(amountA.mul(amountB)).sub(MINIMUM_LIQUIDITY);
    // Mint MINIMUM_LIQUIDITY to address(0)
  } else {
    liquidity = BigNumber.min(
      amountA.mul(tokenAReserve).div(tokenAReserve),
      amountB.mul(tokenBReserve).div(tokenBReserve)
    );
  }

  if (liquidity.lte(0)) throw new Error("Insufficient liquidity minted");

  const newLiquidityPools = new Map(state.liquidityPools);
  newLiquidityPools.set(poolId, {
    tokenAReserve: tokenAReserve.add(amountA),
    tokenBReserve: tokenBReserve.add(amountB),
  });

  const newLiquidity = new Map(state.liquidity);
  const providerLiquidity = newLiquidity.get(provider) || new Map();
  providerLiquidity.set(
    poolId,
    (providerLiquidity.get(poolId) || BigNumber.from(0)).add(liquidity)
  );
  newLiquidity.set(provider, providerLiquidity);

  const newState = {
    ...state,
    liquidityPools: newLiquidityPools,
    liquidity: newLiquidity,
  };

  const event: AddLiquidityEvent = {
    provider,
    poolId,
    amountA,
    amountB,
    liquidity,
  };

  return [newState, event];
}

export function removeLiquidity(
  state: DEXState,
  {
    poolId,
    liquidity,
    provider,
  }: { poolId: string; liquidity: BigNumber; provider: Address }
): [DEXState, RemoveLiquidityEvent] {
  const pool = state.liquidityPools.get(poolId);
  if (!pool) throw new Error("Pool does not exist");

  const { tokenAReserve, tokenBReserve } = pool;
  const totalSupply = getTotalSupply(state, poolId);

  const amountA = liquidity.mul(tokenAReserve).div(totalSupply);
  const amountB = liquidity.mul(tokenBReserve).div(totalSupply);

  if (amountA.lte(0) || amountB.lte(0))
    throw new Error("Insufficient liquidity burned");

  const newLiquidityPools = new Map(state.liquidityPools);
  newLiquidityPools.set(poolId, {
    tokenAReserve: tokenAReserve.sub(amountA),
    tokenBReserve: tokenBReserve.sub(amountB),
  });

  const newLiquidity = new Map(state.liquidity);
  const providerLiquidity = newLiquidity.get(provider) || new Map();
  providerLiquidity.set(
    poolId,
    (providerLiquidity.get(poolId) || BigNumber.from(0)).sub(liquidity)
  );
  newLiquidity.set(provider, providerLiquidity);

  const newState = {
    ...state,
    liquidityPools: newLiquidityPools,
    liquidity: newLiquidity,
  };

  const event: RemoveLiquidityEvent = {
    provider,
    poolId,
    amountA,
    amountB,
    liquidity,
  };

  return [newState, event];
}

export function swap(
  state: DEXState,
  {
    poolId,
    amountIn,
    minAmountOut,
    isAToB,
    user,
  }: {
    poolId: string;
    amountIn: BigNumber;
    minAmountOut: BigNumber;
    isAToB: boolean;
    user: Address;
  }
): [DEXState, SwapEvent] {
  const pool = state.liquidityPools.get(poolId);
  if (!pool) throw new Error("Pool does not exist");

  if (amountIn.lte(0)) throw new Error("Insufficient input amount");

  const [reserveIn, reserveOut] = isAToB
    ? [pool.tokenAReserve, pool.tokenBReserve]
    : [pool.tokenBReserve, pool.tokenAReserve];

  const amountInWithFee = amountIn.mul(1000 - FEE_PERCENT);
  const numerator = amountInWithFee.mul(reserveOut);
  const denominator = reserveIn.mul(1000).add(amountInWithFee);
  const amountOut = numerator.div(denominator);

  if (amountOut.lt(minAmountOut)) throw new Error("Insufficient output amount");

  const newLiquidityPools = new Map(state.liquidityPools);
  newLiquidityPools.set(poolId, {
    tokenAReserve: isAToB
      ? pool.tokenAReserve.add(amountIn)
      : pool.tokenAReserve.sub(amountOut),
    tokenBReserve: isAToB
      ? pool.tokenBReserve.sub(amountOut)
      : pool.tokenBReserve.add(amountIn),
  });

  const newState = { ...state, liquidityPools: newLiquidityPools };

  const event: SwapEvent = { user, poolId, amountIn, amountOut, isAToB };

  return [newState, event];
}

// Helper functions
function hashAddress(address: Address): string {
  // Implement address hashing
  return "";
}

function hashPoolId(tokenAId: string, tokenBId: string): string {
  // Implement pool ID hashing
  return "";
}

function sqrt(value: BigNumber): BigNumber {
  // Implement square root for BigNumber
  return BigNumber.from(0);
}

function getTotalSupply(state: DEXState, poolId: string): BigNumber {
  // Implement total supply calculation
  return BigNumber.from(0);
}
