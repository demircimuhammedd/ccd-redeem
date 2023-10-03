import nacl from "tweetnacl";
import {Buffer} from 'buffer';
import {base58_to_binary} from "base58-js"

// This function computes the signature of CoinSecret on accountAddr
function signAccount(CoinSeeed: string, accountAddr: string) {
    try {
        // Decode base58 repesentation of ed25519 seed
        const seed = base58_to_binary(CoinSeeed);
        if (seed.length != 32) {
            throw new Error("CoinSecret must be 32 bytes long.");
        }
        const keys = nacl.sign.keyPair.fromSeed(seed)
        // Decode account address and sign it with key
        const message = Buffer.from(accountAddr, 'hex');
        const signature = nacl.sign.detached(message,keys.secretKey)
        const hexSignature = Buffer.from(signature).toString('hex')
        const hexPubKey = Buffer.from(keys.publicKey).toString('hex')
        return {message: accountAddr, pubkey: hexPubKey, signature: hexSignature}
    } catch(error) {
        return {e: error}
    }
}

export default signAccount;