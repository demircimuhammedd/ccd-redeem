use ccd_redeem::*;
use concordium_smart_contract_testing::*;
use concordium_std::{PublicKeyEd25519, SignatureEd25519};

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
    let coins = vec![(PUBLIC_KEY, Amount::from_ccd(10))];
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
        .contract_invoke(
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
}
