import { BigNumber } from "jsd-std";

export interface State {
  _count: BigNumber; // Underscore prefix indicates "private"
}

export interface CountChangedEvent {
  newCount: BigNumber;
}

// Public functions
export function initialize(initialCount: BigNumber): State {
  return { _count: initialCount };
}

export function increment(
  state: State,
  { amount }: { amount: BigNumber }
): [State, CountChangedEvent] {
  const newCount = state._count.add(amount);
  return [{ _count: newCount }, { newCount }];
}

export function decrement(
  state: State,
  { amount }: { amount: BigNumber }
): [State, CountChangedEvent] {
  if (state._count.lt(amount)) {
    throw new Error("Count cannot be negative");
  }
  const newCount = state._count.sub(amount);
  return [{ _count: newCount }, { newCount }];
}

export function getCount(state: State): BigNumber {
  return state._count;
}

// "Private" function (not exported)
function _emitCountChanged(newCount: BigNumber): void {
  console.log("CountChanged", { newCount });
}
