import { BigNumber } from "jsd-std";

export interface TokenState {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: BigNumber;
  balances: Map<string, BigNumber>;
  allowances: Map<string, Map<string, BigNumber>>;
}

export interface TransferEvent {
  from: string;
  to: string;
  value: BigNumber;
}

export interface ApprovalEvent {
  owner: string;
  spender: string;
  value: BigNumber;
}

// Special function named "initialize" to replace the constructor
// in class-based approach
export function initialize(
  name: string,
  symbol: string,
  decimals: number,
  initialSupply: BigNumber,
  initialOwner: string
): [TokenState, TransferEvent] {
  const totalSupply = initialSupply.mul(BigNumber.from(10).pow(decimals));
  const balances = new Map<string, BigNumber>([[initialOwner, totalSupply]]);
  const allowances = new Map<string, Map<string, BigNumber>>();

  return [
    { name, symbol, decimals, totalSupply, balances, allowances },
    {
      from: "0x0000000000000000000000000000000000000000",
      to: initialOwner,
      value: totalSupply,
    },
  ];
}

export function balanceOf(
  state: TokenState,
  { account }: { account: string }
): BigNumber {
  return state.balances.get(account) ?? BigNumber.from(0);
}

export function transfer(
  state: TokenState,
  { from, to, amount }: { from: string; to: string; amount: BigNumber }
): [TokenState, TransferEvent] {
  const fromBalance = state.balances.get(from) ?? BigNumber.from(0);
  validate(fromBalance.gte(amount), "Insufficient balance");

  const newFromBalance = fromBalance.sub(amount);
  const newToBalance = (state.balances.get(to) ?? BigNumber.from(0)).add(
    amount
  );

  const newBalances = new Map(state.balances);
  newBalances.set(from, newFromBalance);
  newBalances.set(to, newToBalance);

  return [
    { ...state, balances: newBalances },
    { from, to, value: amount },
  ];
}

export function allowance(
  state: TokenState,
  { owner, spender }: { owner: string; spender: string }
): BigNumber {
  return state.allowances.get(owner)?.get(spender) ?? BigNumber.from(0);
}

export function approve(
  state: TokenState,
  {
    owner,
    spender,
    amount,
  }: { owner: string; spender: string; amount: BigNumber }
): [TokenState, ApprovalEvent] {
  const newAllowances = new Map(state.allowances);
  const ownerAllowances =
    newAllowances.get(owner) ?? new Map<string, BigNumber>();
  ownerAllowances.set(spender, amount);
  newAllowances.set(owner, ownerAllowances);

  return [
    { ...state, allowances: newAllowances },
    { owner, spender, value: amount },
  ];
}

export function transferFrom(
  state: TokenState,
  {
    sender,
    recipient,
    amount,
    spender,
  }: { sender: string; recipient: string; amount: BigNumber; spender: string }
): [TokenState, TransferEvent] {
  const senderBalance = state.balances.get(sender) ?? BigNumber.from(0);
  validate(senderBalance.gte(amount), "Insufficient balance");

  const currentAllowance =
    state.allowances.get(sender)?.get(spender) ?? BigNumber.from(0);
  validate(currentAllowance.gte(amount), "Insufficient allowance");

  const newSenderBalance = senderBalance.sub(amount);
  const newRecipientBalance = (
    state.balances.get(recipient) ?? BigNumber.from(0)
  ).add(amount);
  const newAllowance = currentAllowance.sub(amount);

  const newBalances = new Map(state.balances);
  newBalances.set(sender, newSenderBalance);
  newBalances.set(recipient, newRecipientBalance);

  const newAllowances = new Map(state.allowances);
  const senderAllowances = new Map(
    newAllowances.get(sender) ?? new Map<string, BigNumber>()
  );
  senderAllowances.set(spender, newAllowance);
  newAllowances.set(sender, senderAllowances);

  return [
    { ...state, balances: newBalances, allowances: newAllowances },
    { from: sender, to: recipient, value: amount },
  ];
}
