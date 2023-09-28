#![cfg_attr(not(feature = "std"), no_std)]

//! # A Concordium V1 smart contract
use concordium_std::*;
use core::fmt::Debug;

#[derive(Serialize, Clone, Copy)]
pub struct CoinState {
    pub amount: Amount,
    pub is_redeemed: bool,
}

impl CoinState {
    // Create a new coin that is not redeemed.
    fn from_amount(amount: Amount) -> Self {
        CoinState {
            amount,
            is_redeemed: false,
        }
    }
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
    CoinAlreadyExists,
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
        state.coins.insert(key, CoinState::from_amount(amount));
    }
    Ok(state)
}

#[derive(Serialize, SchemaType)]
pub struct RedeemParam {
    pub public_key: PublicKeyEd25519,
    pub signature: SignatureEd25519,
    pub account: AccountAddress,
}

/// An entrypoint that redeems the coin corresponding to the public key, if it has not been redeemed already.
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

#[derive(Serialize, SchemaType)]
pub struct IssueParam {
    pub coins: Vec<(PublicKeyEd25519, Amount)>,
}

/// An entrypoint for batch issue of coins.
///
/// It rejects if:
/// - It fails to parse the parameter.
/// - Any of the coins are already issued (that is, the corresponding keys are
///  already in the state).
#[receive(
    contract = "ccd_redeem",
    name = "issue",
    parameter = "IssueParam",
    error = "Error",
    mutable
)]
fn contract_issue<S: HasStateApi>(
    ctx: &impl HasReceiveContext,
    host: &mut impl HasHost<State<S>, StateApiType = S>,
) -> Result<(), Error> {
    let param: IssueParam = ctx.parameter_cursor().get()?;

    for (key, amount) in param.coins {
        if let Some(_) = host
            .state_mut()
            .coins
            .insert(key, CoinState::from_amount(amount))
        {
            return Err(Error::CoinAlreadyExists);
        }
    }

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

#[derive(Serialize)]
pub struct ViewReturnData {
    pub coins: Vec<(PublicKeyEd25519, CoinState)>,
    pub admin: AccountAddress,
}

/// View function that returns the content of the state.
#[receive(contract = "ccd_redeem", name = "view", return_value = "State")]
fn view<'b, S: HasStateApi>(
    _ctx: &impl HasReceiveContext,
    host: &'b impl HasHost<State<S>, StateApiType = S>,
) -> ReceiveResult<ViewReturnData> {
    let coins: Vec<(PublicKeyEd25519, CoinState)> =
        host.state().coins.iter().map(|x| (*x.0, *x.1)).collect();
    Ok(ViewReturnData {
        coins,
        admin: host.state().admin,
    })
}
