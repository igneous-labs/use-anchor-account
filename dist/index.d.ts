import { IdlAccounts, Idl, Program, Address } from "@project-serum/anchor";
import { SWRConfiguration, KeyedMutator } from "swr";
export interface UseAnchorAccountResult<I extends Idl, A extends keyof IdlAccounts<I>> {
    loading: boolean;
    account?: IdlAccounts<I>[A];
    error?: string;
}
export declare function useAnchorAccount<I extends Idl, A extends keyof IdlAccounts<I>>(program: Program<I> | null | undefined, accountType: A, address: Address | null | undefined): UseAnchorAccountResult<I, A>;
export interface UseLiveAnchorAccountResult<I extends Idl, A extends keyof IdlAccounts<I>> extends UseAnchorAccountResult<I, A> {
    slotUpdated?: number;
}
export declare function useLiveAnchorAccount<I extends Idl, A extends keyof IdlAccounts<I>>(program: Program<I> | null | undefined, accountType: A, address: Address | null | undefined): UseLiveAnchorAccountResult<I, A>;
export interface UseSWRAnchorAccountResult<I extends Idl, A extends keyof IdlAccounts<I>> {
    loading: boolean;
    account?: IdlAccounts<I>[A];
    mutate: KeyedMutator<IdlAccounts<I>[A]>;
    error?: string;
    isValidating: boolean;
}
export declare function useSWRAnchorAccount<I extends Idl, A extends keyof IdlAccounts<I>>(program: Program<I> | null | undefined, accountType: A, address: Address | null | undefined, swrOptions?: SWRConfiguration): UseSWRAnchorAccountResult<I, A>;
