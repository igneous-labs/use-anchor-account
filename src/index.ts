import { IdlAccounts, Idl, Program, Address } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
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

export type UseLiveAnchorAccountResult<
  I extends Idl,
  A extends keyof IdlAccounts<I>
> = UseAnchorAccountResult<I, A> & { slotUpdated?: number };

export function useLiveAnchorAccount<
  I extends Idl,
  A extends keyof IdlAccounts<I>
>(
  program: Program<I> | null | undefined,
  accountType: A,
  address: Address | null | undefined
): UseLiveAnchorAccountResult<I, A> {
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState<IdlAccounts<I>[A] | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [slotUpdated, setSlotUpdated] = useState<number | undefined>();

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
    // using raw connection listener here because anchor subscribe seems to only fire once
    const listener = program.provider.connection.onAccountChange(
      new PublicKey(address),
      (account, context) => {
        try {
          setAccount(
            program.account[accountType].coder.accounts.decode(
              accountType,
              account.data
            )
          );
          setSlotUpdated(context.slot);
        } catch (e) {
          setError((e as Error).message);
        }
      }
    );
    return () => {
      program.provider.connection.removeAccountChangeListener(listener);
    };
  }, [account]);

  return {
    loading,
    account,
    error,
    slotUpdated,
  };
}
