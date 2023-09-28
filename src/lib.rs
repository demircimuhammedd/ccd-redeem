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
    admin: AccountAddress,
    coins: StateMap<PublicKeyEd25519, CoinState, S>,
}

impl<S: HasStateApi> State<S> {
    fn empty(state_builder: &mut StateBuilder<S>, admin: AccountAddress) -> Self {
        State {
            admin,
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
        Self::InvokeTransfer
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
    InvokeTransfer,
    InvalidSignatures,
    NotAuthorized,
}

#[derive(Serialize, SchemaType)]
pub struct InitParam {
    pub coins: Vec<(PublicKeyEd25519, Amount)>,
}

/// Init function that creates a new smart contract.
/// Adds the coins provided as input to the state and sets the account that
/// deployed the contract to be the contract's admin.
#[init(contract = "ccd_redeem", payable)]
fn init<S: HasStateApi>(
    ctx: &impl HasInitContext,
    state_builder: &mut StateBuilder<S>,
    _amount: Amount,
) -> InitResult<State<S>> {
    let param: InitParam = ctx.parameter_cursor().get()?;
    let admin = ctx.init_origin();
    let mut state = State::empty(state_builder, admin);
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
pub struct RedeemParam {
    pub public_key: PublicKeyEd25519,
    pub signature: SignatureEd25519,
    pub account: AccountAddress,
}

/// An entrypoint that redeems the coin corresponding to the public key, if it was not redeemed already.
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
    let is_valid = crypto_primitives.verify_ed25519_signature(
        param.public_key,
        param.signature,
        &param.account.0,
    );
    ensure!(is_valid, Error::InvalidSignatures);

    // Redeem coin
    let amount = host.state_mut().redeem(param.public_key)?;
    host.invoke_transfer(&param.account, amount)?;

    Ok(())
}

/// Check whether the transaction `sender` is the admin.
fn sender_is_admin<S: HasStateApi>(ctx: &impl HasReceiveContext, state: &State<S>) -> bool {
    ctx.sender().matches_account(&state.admin)
}

/// An entrypoint that updates the admin.
/// Can be called only be the current admin.
#[receive(
    contract = "ccd_redeem",
    name = "setAdmin",
    parameter = "AccountAddress",
    error = "Error",
    mutable
)]
fn contract_set_admin<S: HasStateApi>(
    ctx: &impl HasReceiveContext,
    host: &mut impl HasHost<State<S>, StateApiType = S>,
) -> Result<(), Error> {
    let state = host.state_mut();
    ensure!(sender_is_admin(ctx, state), Error::NotAuthorized);
    let new_admin: AccountAddress = ctx.parameter_cursor().get()?;
    state.admin = new_admin;
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
