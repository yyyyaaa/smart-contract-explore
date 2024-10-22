import { BigNumber } from "jsd-std";

export interface CounterState {
  _count: BigNumber; // Underscore prefix indicates "private"
}

export interface CountChangedEvent {
  newCount: BigNumber;
}

// Public functions
export function initialize(initialCount: BigNumber): CounterState {
  return { _count: initialCount };
}

export function increment(
  state: CounterState,
  { amount }: { amount: BigNumber }
): [CounterState, CountChangedEvent] {
  const newCount = state._count.add(amount);
  return [{ _count: newCount }, { newCount }];
}

export function decrement(
  state: CounterState,
  { amount }: { amount: BigNumber }
): [CounterState, CountChangedEvent] {
  if (state._count.lt(amount)) {
    throw new Error("Count cannot be negative");
  }
  const newCount = state._count.sub(amount);
  return [{ _count: newCount }, { newCount }];
}

export function getCount(state: CounterState): BigNumber {
  return state._count;
}

// "Private" function (not exported)
function _emitCountChanged(newCount: BigNumber): void {
  console.log("CountChanged", { newCount });
}
