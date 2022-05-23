import { translateAddress, } from "@project-serum/anchor";
import { useState, useEffect } from "react";
import useSWR from "swr";
const makeCancelable = (promise) => {
    let rejectFn;
    const p = new Promise((resolve, reject) => {
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
export function useAnchorAccount(program, accountType, address) {
    const [loading, setLoading] = useState(false);
    const [account, setAccount] = useState();
    const [error, setError] = useState();
    useEffect(() => {
        if (!program || !address) {
            return;
        }
        setLoading(true);
        setAccount(undefined);
        setError(undefined);
        const { promise, cancel } = makeCancelable(program.account[accountType].fetch(address));
        promise
            .then((a) => setAccount(a))
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
        return cancel;
    }, [program, accountType, address]);
    return {
        loading,
        account,
        error,
    };
}
export function useLiveAnchorAccount(program, accountType, address) {
    const [loading, setLoading] = useState(false);
    const [account, setAccount] = useState();
    const [error, setError] = useState();
    const [slotUpdated, setSlotUpdated] = useState();
    useEffect(() => {
        if (!program || !address) {
            return;
        }
        setLoading(true);
        setAccount(undefined);
        setError(undefined);
        const { promise, cancel } = makeCancelable(program.account[accountType].fetch(address));
        promise
            .then((a) => setAccount(a))
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
        return cancel;
    }, [program, address]);
    useEffect(() => {
        if (!program || !address) {
            return;
        }
        // using raw connection listener here because anchor subscribe seems to only fire once
        const listener = program.provider.connection.onAccountChange(translateAddress(address), (account, context) => {
            try {
                setAccount(program.account[accountType].coder.accounts.decode(accountType, account.data));
                setSlotUpdated(context.slot);
            }
            catch (e) {
                setError(e.message);
            }
        });
        return () => {
            program.provider.connection.removeAccountChangeListener(listener);
        };
    }, [program, address]);
    return {
        loading,
        account,
        error,
        slotUpdated,
    };
}
function fetcher(program) {
    return function (accountType, address) {
        return program.account[accountType].fetch(address);
    };
}
export function useSWRAnchorAccount(program, accountType, address, swrOptions) {
    const { data: account, error, mutate, isValidating, } = useSWR(program && address && [accountType, translateAddress(address)], fetcher(program), swrOptions);
    const loading = !account;
    return {
        loading,
        account,
        error,
        mutate,
        isValidating,
    };
}
