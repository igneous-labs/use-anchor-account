import { IdlAccounts, Idl, Program, Address } from "@project-serum/anchor";
export declare type UseAnchorAccountResult<I extends Idl, A extends keyof IdlAccounts<I>> = {
    loading: boolean;
    account?: IdlAccounts<I>[A];
    error?: string;
};
export declare function useAnchorAccount<I extends Idl, A extends keyof IdlAccounts<I>>(program: Program<I> | null | undefined, accountType: A, address: Address | null | undefined): UseAnchorAccountResult<I, A>;
export declare type UseLiveAnchorAccountResult<I extends Idl, A extends keyof IdlAccounts<I>> = UseAnchorAccountResult<I, A> & {
    slotUpdated?: number;
};
export declare function useLiveAnchorAccount<I extends Idl, A extends keyof IdlAccounts<I>>(program: Program<I> | null | undefined, accountType: A, address: Address | null | undefined): UseLiveAnchorAccountResult<I, A>;
