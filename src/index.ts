import { IdlAccounts, Idl, Program, Address } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
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
    if (!program || !address) {
      return;
    }
    setLoading(true);
    setAccount(undefined);
    setError(undefined);
    const { promise, cancel } = makeCancelable(
      program.account[accountType].fetch(address)
    );
    promise
      .then((a) => setAccount(a as IdlAccounts<I>[A]))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
    return cancel;
  }, [program, address]);

  return {
    loading,
    account,
    error,
  };
}

type UpdatedAccount<I extends Idl, A extends keyof IdlAccounts<I>> = {
  account: IdlAccounts<I>[A];
  slotUpdated: number;
};

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
  const {
    loading,
    account: fetchedAccount,
    error: fetchError,
  } = useAnchorAccount(program, accountType, address);

  const [error, setError] = useState<string | undefined>();
  const [updatedAccount, setUpdatedAccount] = useState<
    UpdatedAccount<I, A> | undefined
  >();

  useEffect(() => {
    if (!program || !address || !fetchedAccount) {
      return;
    }
    // using raw connection listener here because anchor subscribe seems to only fire once
    const listener = program.provider.connection.onAccountChange(
      new PublicKey(address),
      (account, context) => {
        try {
          const updatedAccount = program.account[
            accountType
          ].coder.accounts.decode(accountType, account.data);
          setUpdatedAccount({
            account: updatedAccount,
            slotUpdated: context.slot,
          });
        } catch (e) {
          setError((e as Error).message);
        }
      }
    );
    return () => {
      program.provider.connection.removeAccountChangeListener(listener);
    };
  }, [fetchedAccount]);

  return {
    loading,
    account: updatedAccount ? updatedAccount.account : fetchedAccount,
    error: error ?? fetchError,
    slotUpdated: updatedAccount?.slotUpdated,
  };
}
