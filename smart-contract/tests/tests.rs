use std::str::FromStr;

use ccd_redeem::*;
use concordium_smart_contract_testing::*;
use concordium_std::{PublicKeyEd25519, SignatureEd25519};
use hex::FromHex;

const ACCOUNT_0: AccountAddress = AccountAddress([0; 32]);
const ACC_INITIAL_BALANCE_0: Amount = Amount::from_ccd(200);

const ACCOUNT_1: AccountAddress = AccountAddress([1; 32]);
const ACC_INITIAL_BALANCE_1: Amount = Amount::from_ccd(100);

const INITIAL_CONTRACT_BALANCE: Amount = Amount::from_ccd(100);

const SIGNATURE: SignatureEd25519 = SignatureEd25519([
    11, 207, 228, 210, 226, 6, 107, 5, 236, 132, 134, 202, 65, 1, 111, 67, 93, 100, 177, 165, 253,
    57, 247, 109, 157, 227, 13, 38, 21, 165, 34, 51, 103, 221, 153, 173, 31, 148, 108, 187, 235,
    112, 39, 97, 158, 193, 82, 181, 223, 150, 172, 148, 114, 65, 80, 17, 229, 131, 2, 94, 17, 159,
    203, 9,
]);

const PUBLIC_KEY: PublicKeyEd25519 = PublicKeyEd25519([
    112, 87, 57, 61, 254, 196, 118, 51, 33, 233, 132, 233, 235, 220, 202, 230, 221, 122, 152, 13,
    52, 91, 43, 58, 247, 61, 234, 223, 107, 75, 124, 13,
]);

const AMOUNT: Amount = Amount::from_ccd(10);

// Seed: 9758DFD6DD81F57FA9AE75B3C92BED49B3C26C28723CEA00C9E1851CAED7BBF4
// Use to generate keys and signatures: https://cyphr.me/ed25519_tool/ed.html

fn prepare(chain: &mut Chain) -> ModuleDeploySuccess {
    let account_admin = Account::new(ACCOUNT_0, ACC_INITIAL_BALANCE_0);
    let account_other = Account::new(ACCOUNT_1, ACC_INITIAL_BALANCE_1);
    chain.create_account(account_admin);
    chain.create_account(account_other);

    let module =
        module_load_v1("target/concordium/wasm32-unknown-unknown/release/ccd_redeem.wasm.v1")
            .expect("Module is valid and exists");
    chain
        .module_deploy_v1(Signer::with_one_key(), ACCOUNT_0, module)
        .expect("Deploying valid module should succeed")
}

fn initialize(
    chain: &mut Chain,
    deployment: &ModuleDeploySuccess,
) -> Result<ContractInitSuccess, ContractInitError> {
    let coins = vec![(PUBLIC_KEY, AMOUNT)];
    let param_bytes = OwnedParameter::from_serial(&InitParam { coins })
        .expect("Parameters should be serialized successfully");

    chain.contract_init(
        Signer::with_one_key(),
        ACCOUNT_0,
        Energy::from(10000),
        InitContractPayload {
            mod_ref: deployment.module_reference,
            init_name: OwnedContractName::new_unchecked("init_ccd_redeem".to_string()),
            param: param_bytes,
            amount: INITIAL_CONTRACT_BALANCE,
        },
    )
}

#[test]
/// Test that initializing the contract succeeds with some state.
fn test_init() {
    let mut chain = Chain::new();

    let deployment = prepare(&mut chain);

    initialize(&mut chain, &deployment).expect("Initialization should always succeed");
}

#[test]
/// Test redeeming a coin.
fn test_redeem() {
    let mut chain = Chain::new();

    let deployment = prepare(&mut chain);

    let init_info =
        initialize(&mut chain, &deployment).expect("Initialization should always succeed");

    let param = OwnedParameter::from_serial(&RedeemParam {
        public_key: PUBLIC_KEY,
        account: ACCOUNT_1,
        signature: SIGNATURE,
    })
    .expect("Parameters should be serialized successfully");

    chain
        .contract_update(
            Signer::with_one_key(),
            ACCOUNT_1,
            Address::Account(ACCOUNT_1),
            Energy::from(10000),
            UpdateContractPayload {
                amount: Amount::zero(),
                address: init_info.contract_address,
                receive_name: OwnedReceiveName::new_unchecked("ccd_redeem.redeem".to_string()),
                message: param,
            },
        )
        .expect("Contract call succeeds");

    let res = chain
        .contract_invoke(
            ACCOUNT_1,
            Address::Account(ACCOUNT_1),
            Energy::from(10000),
            UpdateContractPayload {
                amount: Amount::zero(),
                address: init_info.contract_address,
                receive_name: OwnedReceiveName::new_unchecked("ccd_redeem.view".to_string()),
                message: OwnedParameter::empty(),
            },
        )
        .expect("Contract view call succeeds");
    let result = from_bytes::<ViewReturnData>(res.return_value.as_slice())
        .expect("Data deserialized successfully");
    assert!(
        result
            .coins
            .get(0)
            .expect("First element expected to exist")
            .1
            .is_redeemed,
        "The coin is expected to be redeemed"
    )
}

#[test]
fn test_encoding() {
    //Initialize contract with public key from 'generator.py'
    let buffer = <[u8; 32]>::from_hex("0e74d2be36734c232e527b2ecc8d981ec898979f860359220274acf9c6def8f9").expect("Hex decoding pk should work");
    let pubkey = PublicKeyEd25519(buffer);
    //Initialize redeeming account from base58 string
    let account_str = "4r81HqikiXBfwxjNJKJAWdw6an2jq4aGSZZAy8fM3fQ9a7x9mH";
    let account_addr = AccountAddress::from_str(account_str).expect("Can decode account from base58");
    println!("{:?}", account_addr.0);
    //Initialize signature on account address from hex signature as produced by dapp
    let buffer = <[u8; 64]>::from_hex("f7cef8a2afcc2b9ab10da90289610ecbfd4bd95043990145120e3c4b47a3b9a0e0d25fa686869beb1da504aa5a2dc7573fd0a5bf7e67fd6414e33614c8518703").expect("Hex decoding sig should work");
    let signature = SignatureEd25519(buffer);


    // Setup chain and module
    let mut chain = Chain::new();
    let account_admin = Account::new(ACCOUNT_0, ACC_INITIAL_BALANCE_0);
    let account_other = Account::new(account_addr, ACC_INITIAL_BALANCE_1);
    chain.create_account(account_admin);
    chain.create_account(account_other);
    let module =
        module_load_v1("target/concordium/wasm32-unknown-unknown/release/ccd_redeem.wasm.v1")
            .expect("Module is valid and exists");
    let deployment = chain
        .module_deploy_v1(Signer::with_one_key(), ACCOUNT_0, module)
        .expect("Deploying valid module should succeed");

    // Initialize contract with a coin for public key
    let coins = vec![(pubkey, AMOUNT)];
    let param_bytes = OwnedParameter::from_serial(&InitParam { coins })
        .expect("Parameters should be serialized successfully");
    let init_info = chain.contract_init(
        Signer::with_one_key(),
        ACCOUNT_0,
        Energy::from(10000),
        InitContractPayload {
            mod_ref: deployment.module_reference,
            init_name: OwnedContractName::new_unchecked("init_ccd_redeem".to_string()),
            param: param_bytes,
            amount: INITIAL_CONTRACT_BALANCE,
        },
    ).expect("Initialization should always succeed");

    // Craft redeem call
    let param = OwnedParameter::from_serial(&RedeemParam {
        public_key: pubkey,
        account: account_addr,
        signature: signature,
    })
    .expect("Parameters should be serialized successfully");

    chain
        .contract_update(
            Signer::with_one_key(),
            account_addr,
            Address::Account(account_addr),
            Energy::from(10000),
            UpdateContractPayload {
                amount: Amount::zero(),
                address: init_info.contract_address,
                receive_name: OwnedReceiveName::new_unchecked("ccd_redeem.redeem".to_string()),
                message: param,
            },
        )
        .expect("Contract call succeeds");

    
}
