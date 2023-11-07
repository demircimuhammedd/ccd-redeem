import nacl from 'tweetnacl';
import { Buffer } from 'buffer';
import { base58_to_binary } from 'base58-js';
import { decode } from 'wif';

// This function computes the signature of CoinSecret on accountAddr
export function signAccount(CoinSeeed: string, accountAddr: string) {
        const keys = keysFromSeed(CoinSeeed);
        if (keys instanceof Error) {
            return {e: keys}
        } else {
        // Decode account address and sign it with key (this requires base58check decoding)
        const message = decode(accountAddr).privateKey;
        const signature = nacl.sign.detached(message, keys.bytesSecretKey);
        const hexSignature = Buffer.from(signature).toString('hex');
        return { message: message, pubkey: keys.hexPublicKey, signature: hexSignature };
        }
};

export function keysFromSeed(coinSeed: string) {
        // Decode base58 repesentation of ed25519 seed
        const seed = base58_to_binary(coinSeed);
        if (seed.length != 32) {
            return new Error('CoinSecret must be 32 bytes long.');
        }
        const keys = nacl.sign.keyPair.fromSeed(seed);
        return { hexPublicKey: Buffer.from(keys.publicKey).toString('hex'), bytesSecretKey: keys.secretKey }
}
