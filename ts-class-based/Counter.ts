import { BigNumber } from "jsd-std";

export class Counter {
  private count: BigNumber;

  constructor(initialCount: BigNumber) {
    this.count = initialCount;
  }

  public increment(amount: BigNumber): void {
    this.count = this.count.add(amount);
    this.emitCountChanged();
  }

  public decrement(amount: BigNumber): void {
    if (this.count.lt(amount)) {
      throw new Error("Count cannot be negative");
    }
    this.count = this.count.sub(amount);
    this.emitCountChanged();
  }

  public getCount(): BigNumber {
    return this.count;
  }

  private emitCountChanged(): void {
    // Simulate event emission
    console.log("CountChanged", { newCount: this.count });
  }
}
