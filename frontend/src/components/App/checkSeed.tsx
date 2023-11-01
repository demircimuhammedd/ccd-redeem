import { base58_to_binary } from 'base58-js';

function checkSeed(CoinSeeed: string) {
    try {
        const seed = base58_to_binary(CoinSeeed);
        if (seed.length != 32) {
            return false;
        }
        return true;
    } catch (error) {
        return false;
    }
}

export default checkSeed;
