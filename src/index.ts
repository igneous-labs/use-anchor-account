import {
  IdlAccounts,
  Idl,
  Program,
  Address,
  translateAddress,
} from "@project-serum/anchor";
import { useState, useEffect } from "react";
import useSWR, { SWRConfiguration, KeyedMutator } from "swr";

interface CancelablePromise<T> {
  promise: Promise<T>;
  cancel: () => void;
}

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

export interface UseAnchorAccountResult<
  I extends Idl,
  A extends keyof IdlAccounts<I>,
> {
  loading: boolean;
  account?: IdlAccounts<I>[A];
  error?: string;
}

export function useAnchorAccount<I extends Idl, A extends keyof IdlAccounts<I>>(
  program: Program<I> | null | undefined,
  accountType: A,
  address: Address | null | undefined,
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
    const { promise, cancel } = makeCancelable(
      program.account[accountType].fetch(address),
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

export interface UseLiveAnchorAccountResult<
  I extends Idl,
  A extends keyof IdlAccounts<I>,
> extends UseAnchorAccountResult<I, A> {
  slotUpdated?: number;
}

export function useLiveAnchorAccount<
  I extends Idl,
  A extends keyof IdlAccounts<I>,
>(
  program: Program<I> | null | undefined,
  accountType: A,
  address: Address | null | undefined,
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
    const { promise, cancel } = makeCancelable(
      program.account[accountType].fetch(address),
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
              account.data,
            ),
          );
          setSlotUpdated(context.slot);
        } catch (e) {
          setError((e as Error).message);
        }
      },
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

function fetcher<I extends Idl, A extends keyof IdlAccounts<I>>(
  program: Program<I>,
) {
  return function (method: A, address: Address): Promise<IdlAccounts<I>[A]> {
    return program.account[method].fetch(address) as Promise<IdlAccounts<I>[A]>;
  };
}

export interface UseSWRAnchorAccountResult<
  I extends Idl,
  A extends keyof IdlAccounts<I>,
> {
  loading: boolean;
  account?: IdlAccounts<I>[A];
  mutate: KeyedMutator<IdlAccounts<I>[A]>;
  error?: string;
  isValidating: boolean;
}

export function useSWRAnchorAccount<
  I extends Idl,
  A extends keyof IdlAccounts<I>,
>(
  program: Program<I> | null | undefined,
  accountType: A,
  address: Address | null | undefined,
  swrOptions?: SWRConfiguration,
): UseSWRAnchorAccountResult<I, A> {
  const {
    data: account,
    error,
    mutate,
    isValidating,
  } = useSWR<IdlAccounts<I>[A]>(
    program && address && [accountType, address],
    fetcher(program!),
    swrOptions,
  );

  const loading = !account;

  return {
    loading,
    account,
    error,
    mutate,
    isValidating,
  };
}
