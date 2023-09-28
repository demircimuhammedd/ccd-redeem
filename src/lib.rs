#![cfg_attr(not(feature = "std"), no_std)]

//! # A Concordium V1 smart contract
use concordium_std::*;
use core::fmt::Debug;

#[derive(Serialize)]
struct CoinState {
    amount: Amount,
    is_redeemed: bool,
}

/// Smart contract state.
#[derive(Serial, DeserialWithState)]
#[concordium(state_parameter = "S")]
pub struct State<S> {
    coins: StateMap<PublicKeyEd25519, CoinState, S>,
}

impl<S: HasStateApi> State<S> {
    fn empty(state_builder: &mut StateBuilder<S>) -> Self {
        State {
            coins: state_builder.new_map(),
        }
    }

    fn redeem(&mut self, key: PublicKeyEd25519) -> Result<Amount, Error> {
        if let Some(mut c) = self.coins.get_mut(&key) {
            if c.is_redeemed {
                Err(Error::CoinAlreadyRedeemed)
            } else {
                c.is_redeemed = true;
                Ok(c.amount)
            }
        } else {
            Err(Error::CoinNotFound)
        }
    }
}

/// Mapping errors related to contract invocations to CustomContractError.
impl From<TransferError> for Error {
    fn from(_te: TransferError) -> Self {
        Self::InvokeTransferError
    }
}

/// Smart contract errors.
#[derive(Debug, PartialEq, Eq, Reject, Serial, SchemaType)]
enum Error {
    /// Failed parsing the parameter.
    #[from(ParseError)]
    ParseParams,
    CoinNotFound,
    CoinAlreadyRedeemed,
    InvokeTransferError,
    InvalidSignatures,
}

#[derive(Serialize, SchemaType)]
struct InitParam {
    coins: Vec<(PublicKeyEd25519, Amount)>,
}

/// Init function that creates a new smart contract.
#[init(contract = "ccd_redeem")]
fn init<S: HasStateApi>(
    ctx: &impl HasInitContext,
    state_builder: &mut StateBuilder<S>,
) -> InitResult<State<S>> {
    let param: InitParam = ctx.parameter_cursor().get()?;
    let mut state = State::empty(state_builder);
    for (key, amount) in param.coins {
        state.coins.insert(
            key,
            CoinState {
                amount,
                is_redeemed: false,
            },
        );
    }
    Ok(state)
}

#[derive(Serialize, SchemaType)]
struct RedeemParam {
    public_key: PublicKeyEd25519,
    signature: SignatureEd25519,
    account: AccountAddress,
}

/// Receive function that redeems the coin corresponding to the public key, if it was not redeemed already.
#[receive(
    contract = "ccd_redeem",
    name = "redeem",
    parameter = "RedeemParam",
    error = "Error",
    crypto_primitives,
    mutable
)]
fn contract_redeem<S: HasStateApi>(
    ctx: &impl HasReceiveContext,
    host: &mut impl HasHost<State<S>, StateApiType = S>,
    crypto_primitives: &impl HasCryptoPrimitives,
) -> Result<(), Error> {
    let param: RedeemParam = ctx.parameter_cursor().get()?;

    // Verify coin signature 
    let is_valid = crypto_primitives.verify_ed25519_signature(param.public_key, param.signature, &param.account.0);
    ensure!(is_valid,Error::InvalidSignatures);

    // Redeem coin
    let amount = host.state_mut().redeem(param.public_key)?;
    host.invoke_transfer(&param.account, amount)?;

    Ok(())
}

/// View function that returns the content of the state.
#[receive(contract = "ccd_redeem", name = "view", return_value = "State")]
fn view<'b, S: HasStateApi>(
    _ctx: &impl HasReceiveContext,
    host: &'b impl HasHost<State<S>, StateApiType = S>,
) -> ReceiveResult<&'b State<S>> {
    Ok(host.state())
}

#[concordium_cfg_test]
mod tests {
    use super::*;
    use test_infrastructure::*;

    #[concordium_test]
    /// Test that initializing the contract succeeds with some state.
    fn test_init() {
        let mut ctx = TestInitContext::empty();

        let mut state_builder = TestStateBuilder::new();

        let initial_coins: Vec<(PublicKeyEd25519, Amount)> = Vec::new();
        let parameter_bytes = to_bytes(&initial_coins);
        ctx.set_parameter(&parameter_bytes);

        let state_result = init(&ctx, &mut state_builder);
        state_result.expect_report("Contract initialization results in error");
    }

    #[concordium_test]
    /// Test redeeming a coin.
    fn test_redeem() {
        let mut state_builder = TestStateBuilder::new();

        // Initializing state
        let _initial_state = State::empty(&mut state_builder);

        let _ctx = TestReceiveContext::empty();
    }
}
