import { detectConcordiumProvider } from '@concordium/browser-wallet-api-helpers';
import { CcdAmount } from '@concordium/web-sdk';
import { base58_to_binary } from 'base58-js';

export type PrestineCoin = CcdAmount;
export type RedeemedCoin = CcdAmount;
export enum SeedError {
    InvalidEncoding,
    InvalidLength,
    CoinNotFound
}
export type SeedAnswer = PrestineCoin | RedeemedCoin | SeedError

export function isPrestineCoin(a: unknown): a is PrestineCoin {
    return a === "PrestineCoin"
}

function checkSeed(CoinSeeed: string): SeedAnswer {
    try {
        // Extract the 32 bytes seed
        const seed = base58_to_binary(CoinSeeed);
        if (seed.length != 32) {
            return SeedError.InvalidLength
        }        
    } catch (error) {
        return SeedError.InvalidLength
    }
    // Check if the coin exists and is prestine
    detectConcordiumProvider().then(
        (walletClient) => {
            //return CcdAmount.fromCcd(0n) as PrestineCoin;
    });
    return SeedError.CoinNotFound
}

export default checkSeed;
