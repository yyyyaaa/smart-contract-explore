import { BigNumber, Contract } from "hyperweb-core";

export class Token extends Contract {
  public readonly name: string;
  public readonly symbol: string;
  public readonly decimals: number;
  // Do we need to support BigNumber<"uint8"> and other number types?
  private totalSupply: BigNumber<"uint8">;
  private balances: Map<string, BigNumber>;
  private allowances: Map<string, Map<string, BigNumber>>;

  constructor(
    name: string,
    symbol: string,
    decimals: number,
    initialSupply: BigNumber
  ) {
    this.name = name;
    this.symbol = symbol;
    this.decimals = decimals;
    this.totalSupply = initialSupply.mul(BigNumber.from(10).pow(decimals));
    this.balances = new Map([[msg.sender, this.totalSupply]]);
    this.allowances = new Map();
    this.logTransfer(
      "0x0000000000000000000000000000000000000000",
      msg.sender,
      this.totalSupply
    );
  }

  public balanceOf(account: string): BigNumber {
    return this.balances.get(account) ?? BigNumber.from(0);
  }

  public transfer(recipient: string, amount: BigNumber): boolean {
    return this.transferFrom(msg.sender, recipient, amount);
  }

  public approve(spender: string, amount: BigNumber): boolean {
    let ownerAllowances = this.allowances.get(msg.sender);
    if (!ownerAllowances) {
      ownerAllowances = new Map();
      this.allowances.set(msg.sender, ownerAllowances);
    }
    ownerAllowances.set(spender, amount);
    this.logApproval(msg.sender, spender, amount);
    return true;
  }

  public transferFrom(
    sender: string,
    recipient: string,
    amount: BigNumber
  ): boolean {
    const senderBalance = this.balances.get(sender) ?? BigNumber.from(0);

    validate(senderBalance.gte(amount), "Insufficient balance");

    if (sender !== msg.sender) {
      const allowance =
        this.allowances.get(sender)?.get(msg.sender) ?? BigNumber.from(0);
      validate(allowance.gte(amount), "Insufficient allowance");
      this.allowances.get(sender)!.set(msg.sender, allowance.sub(amount));
    }

    this.balances.set(sender, senderBalance.sub(amount));
    const recipientBalance = this.balances.get(recipient) ?? BigNumber.from(0);
    this.balances.set(recipient, recipientBalance.add(amount));

    this.logTransfer(sender, recipient, amount);
    return true;
  }

  public allowance(owner: string, spender: string): BigNumber {
    return this.allowances.get(owner)?.get(spender) ?? BigNumber.from(0);
  }

  private logTransfer(from: string, to: string, value: BigNumber): void {
    // Simulate event emission
    console.log("Transfer", { from, to, value });
  }

  private logApproval(owner: string, spender: string, value: BigNumber): void {
    // Simulate event emission
    console.log("Approval", { owner, spender, value });
  }
}

// Simulate the global msg object in Solidity
const msg = {
  sender: "0x1234567890123456789012345678901234567890",
};
