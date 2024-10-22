import { BigNumber } from "jsd-std";

export interface CounterState {
  count: BigNumber;
}

export interface CountChangedEvent {
  newCount: BigNumber;
}

export function initialize(initialCount: BigNumber): CounterState {
  return { count: initialCount };
}

export function increment(
  state: CounterState,
  { amount }: { amount: BigNumber }
): [CounterState, CountChangedEvent] {
  const newCount = state.count.add(amount);
  return [{ count: newCount }, { newCount }];
}

export function decrement(
  state: CounterState,
  { amount }: { amount: BigNumber }
): [CounterState, CountChangedEvent] {
  if (state.count.lt(amount)) {
    throw new Error("Count cannot be negative");
  }
  const newCount = state.count.sub(amount);
  return [{ count: newCount }, { newCount }];
}

export function getCount(state: CounterState): BigNumber {
  return state.count;
}
