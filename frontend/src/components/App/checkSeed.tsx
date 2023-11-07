import { WalletApi, detectConcordiumProvider } from '@concordium/browser-wallet-api-helpers';
import { CcdAmount, ContractContext, deserializeTypeValue, serializeTypeValue } from '@concordium/web-sdk';
import {
    typeSchemaFromBase64,
} from '@concordium/wallet-connectors';
import Constants from "./Constants";
import { Buffer } from "buffer/";
import { keysFromSeed } from './coinSignature';

export interface CoinInfo {
    amount: string,
    is_redeemed: boolean
};

export enum SeedError {
    InvalidEncoding,
    InvalidLength,
    CoinNotFound,
    DeserializationFailed
}
export type SeedAnswer = CoinInfo | SeedError

export function isPristineCoin(a: CoinInfo): boolean {
    return !a.is_redeemed
}

function checkSeed(coinSeed: string): Promise<SeedAnswer> {
    const keys = keysFromSeed(coinSeed);
    if (keys instanceof Error) {
        return Promise.resolve(SeedError.InvalidLength)
    } else {
        // Check if the coin exists and is pristine
        return detectConcordiumProvider().then(
            (walletClient) => {
                return getCoinInfo(keys.hexPublicKey, walletClient).then(res => {
                    if ((res.tag == "success") && (res.returnValue)) {
                        let schema = typeSchemaFromBase64(Constants.SCHEMAS.entrypoints.viewCoin.returnValue);
                        console.log(res);
                        try {
                            let val: unknown = deserializeTypeValue(Buffer.from(res.returnValue, 'hex'), schema.value);
                            let coinInfo = val as CoinInfo;
                            return coinInfo
                        }
                        catch (err) {
                            return SeedError.DeserializationFailed
                        }
                    } else {
                        return SeedError.CoinNotFound
                    }
                })
            })
    }
}

export default checkSeed;

function getCoinInfo(pk: string, walletClient: WalletApi) {
    console.log(pk);
    let schema = typeSchemaFromBase64(Constants.SCHEMAS.entrypoints.viewCoin.parameter);
    let param = serializeTypeValue(pk, schema.value);
    let context: ContractContext = { contract: Constants.CONTRACT_ADDRESS, amount: new CcdAmount(0), method: Constants.VIEW_COIN_ENTRYPOINT_FULL, parameter: param, energy: Constants.MAX_COST };
    return walletClient.getGrpcClient().invokeContract(context)
}