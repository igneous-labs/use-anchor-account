import {
  IdlAccounts,
  Idl,
  Program,
  Address,
  translateAddress,
} from "@project-serum/anchor";
import { useState, useEffect } from "react";

type CancelablePromise<T> = {
  promise: Promise<T>;
  cancel: () => void;
};

const makeCancelable = <T>(promise: Promise<T>): CancelablePromise<T> => {
  let rejectFn;
  const p: Promise<T> = new Promise((resolve, reject) => {
    rejectFn = reject;
    Promise.resolve(promise).then(resolve).catch(reject);
  });
  return {
    promise: p,
    cancel: () => {
      rejectFn({ canceled: true });
    },
  };
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
    setLoading(true);
    setAccount(undefined);
    setError(undefined);
    if (!program || !address) {
      return;
    }
    const { promise, cancel } = makeCancelable(
      program.account[accountType].fetch(address)
    );
    promise
      .then((a) => setAccount(a as IdlAccounts<I>[A]))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
    return cancel;
  }, [program, accountType, address]);

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
    setLoading(true);
    setAccount(undefined);
    setError(undefined);
    if (!program || !address) {
      return;
    }
    const { promise, cancel } = makeCancelable(
      program.account[accountType].fetch(address)
    );
    promise
      .then((a) => setAccount(a as IdlAccounts<I>[A]))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
    return cancel;
  }, [program, address]);

  useEffect(() => {
    if (!program || !address || !account) {
      return;
    }
    // using raw connection listener here because anchor subscribe seems to only fire once
    const listener = program.provider.connection.onAccountChange(
      translateAddress(address),
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
