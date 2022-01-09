import { IdlAccounts, Idl, Program, Address } from "@project-serum/anchor";
import { useState, useEffect } from "react";

type CancellablePromise<T> = Promise<T> & {
  cancel: () => void;
};

const makeCancelable = <T>(promise: Promise<T>) => {
  let rejectFn;
  const wrappedPromise = new Promise((resolve, reject) => {
    rejectFn = reject;
    Promise.resolve(promise).then(resolve).catch(reject);
  }) as CancellablePromise<T>;

  wrappedPromise.cancel = () => {
    rejectFn({ canceled: true });
  };
  return wrappedPromise;
};

export type UseAnchorAccountResult<
  I extends Idl,
  A extends keyof IdlAccounts<I>
> = {
  loading: boolean;
  account?: IdlAccounts<I>[A];
  error?: string;
};

export function useAnchorAccount<I extends Idl, A extends keyof IdlAccounts<I>>(
  program: Program<I> | null | undefined,
  accountType: A,
  address: Address | null | undefined
): UseAnchorAccountResult<I, A> {
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState<IdlAccounts<I>[A] | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!program || !address) {
      return;
    }
    setLoading(true);
    setAccount(undefined);
    setError(undefined);
    const promise = makeCancelable(program.account[accountType].fetch(address));
    promise
      .then(setAccount)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
    return promise.cancel;
  }, [program, address]);

  return {
    loading,
    account,
    error,
  };
}

export function useLiveAnchorAccount<
  I extends Idl,
  A extends keyof IdlAccounts<I>
>(
  program: Program<I> | null | undefined,
  accountType: A,
  address: Address | null | undefined
): UseAnchorAccountResult<I, A> {
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState<IdlAccounts<I>[A] | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!program || !address) {
      return;
    }
    setLoading(true);
    setAccount(undefined);
    setError(undefined);
    const promise = makeCancelable(program.account[accountType].fetch(address));
    promise
      .then(setAccount)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
    return promise.cancel;
  }, [program, address]);

  useEffect(() => {
    if (!program || !address || !account) {
      return;
    }
    const emitter = program.account[accountType].subscribe(address);
    emitter.on("change", setAccount);
    return () => {
      program.account[accountType].unsubscribe(address);
    };
  }, [account]);

  return {
    loading,
    account,
    error,
  };
}
