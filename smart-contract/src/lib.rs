#![cfg_attr(not(feature = "std"), no_std)]
//! # A smart contract to redeem Concordium coins

// Use some datatypes to satisfy the CIS-3 standard (even though the package is named `concordium_cis2`)
use concordium_cis2::*;
use concordium_std::*;
use core::fmt::Debug;

/// List of supported entrypoints by the `permit` function (CIS3 standard).
const SUPPORTS_PERMIT_ENTRYPOINTS: [EntrypointName; 1] =
    [EntrypointName::new_unchecked("redeem")];

#[derive(Serialize, Clone, Copy, SchemaType)]
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
    WrongContract,
    WrongEntryPoint,
    NonceMismatch,
    Expired,
    MissingAccount,
    MalformedSignatureData,
}

/// Mapping errors related to contract invocations to CustomContractError.
impl From<TransferError> for Error {
    fn from(_te: TransferError) -> Self {
        Self::InvokeTransfer
    }
}

/// Mapping account signature error to CustomContractError
impl From<CheckAccountSignatureError> for Error {
    fn from(e: CheckAccountSignatureError) -> Self {
        match e {
            CheckAccountSignatureError::MissingAccount => Self::MissingAccount,
            CheckAccountSignatureError::MalformedData => Self::MalformedSignatureData,
        }
    }
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

fn verify_signature_and_redeem<S: HasStateApi>(
    host: &mut impl HasHost<State<S>, StateApiType = S>,
    crypto_primitives: &impl HasCryptoPrimitives,
    param: RedeemParam,
) -> Result<(), Error> {
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

/// An entrypoint that redeems the coin corresponding to the public key, if it has not been redeemed already.
///
/// It rejects if:
/// - It fails to parse the parameter.
/// - the coin is not found in the state
/// - the coin was already redeemed.
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
    // Parse parameters
    let param: RedeemParam = ctx.parameter_cursor().get()?;

    // Redeem after verifying the signature
    verify_signature_and_redeem(host, crypto_primitives, param)
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
        let res = host
            .state_mut()
            .coins
            .insert(key, CoinState::from_amount(amount));
        if res.is_some() {
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

#[derive(Serialize, SchemaType)]
pub struct ViewReturnData {
    pub coins: Vec<(PublicKeyEd25519, CoinState)>,
    pub admin: AccountAddress,
}

/// View function that returns the content of the state.
#[receive(contract = "ccd_redeem", name = "view", return_value = "ViewReturnData")]
fn view<S: HasStateApi>(
    _ctx: &impl HasReceiveContext,
    host: &impl HasHost<State<S>, StateApiType = S>,
) -> ReceiveResult<ViewReturnData> {
    let coins: Vec<(PublicKeyEd25519, CoinState)> =
        host.state().coins.iter().map(|x| (*x.0, *x.1)).collect();
    Ok(ViewReturnData {
        coins,
        admin: host.state().admin,
    })
}

/// Part of the parameter type for the contract function `permit`.
/// Specifies the message that is signed.
#[derive(SchemaType, Serialize)]
pub struct PermitMessage {
    /// The contract_address that the signature is intended for.
    pub contract_address: ContractAddress,
    /// A nonce to prevent replay attacks.
    pub nonce: u64,
    /// A timestamp to make signatures expire.
    pub timestamp: Timestamp,
    /// The entry_point that the signature is intended for.
    pub entry_point: OwnedEntrypointName,
    /// The serialized payload that should be forwarded to either the `transfer`
    /// or the `updateOperator` function.
    #[concordium(size_length = 2)]
    pub payload: Vec<u8>,
}

/// The parameter type for the contract function `permit`.
/// Takes a signature, the signer, and the message that was signed.
#[derive(Serialize, SchemaType)]
pub struct PermitParam {
    /// Signature/s. The CIS3 standard supports multi-sig accounts.
    pub signature: AccountSignatures,
    /// Account that created the above signature.
    pub signer: AccountAddress,
    /// Message that was signed.
    pub message: PermitMessage,
}

#[derive(Serialize)]
pub struct PermitParamPartial {
    /// Signature/s. The CIS3 standard supports multi-sig accounts.
    signature: AccountSignatures,
    /// Account that created the above signature.
    signer: AccountAddress,
}

/// Helper function to calculate the `message_hash`.
#[receive(
    contract = "ccd_redeem",
    name = "viewMessageHash",
    parameter = "PermitParam",
    return_value = "[u8;32]",
    crypto_primitives,
    mutable
)]
fn contract_view_message_hash<S: HasStateApi>(
    ctx: &impl HasReceiveContext,
    _host: &mut impl HasHost<State<S>, StateApiType = S>,
    crypto_primitives: &impl HasCryptoPrimitives,
) -> Result<[u8; 32], Error> {
    // Parse the parameter.
    let mut cursor = ctx.parameter_cursor();
    // The input parameter is `PermitParam` but we only read the initial part of it
    // with `PermitParamPartial`. I.e. we read the `signature` and the
    // `signer`, but not the `message` here.
    let param: PermitParamPartial = cursor.get()?;

    // The input parameter is `PermitParam` but we have only read the initial part
    // of it with `PermitParamPartial` so far. We read in the `message` now.
    // `(cursor.size() - cursor.cursor_position()` is the length of the message in
    // bytes.
    let mut message_bytes = vec![0; (cursor.size() - cursor.cursor_position()) as usize];

    cursor.read_exact(&mut message_bytes)?;

    // The message signed in the Concordium browser wallet is prepended with the
    // `account` address and 8 zero bytes. Accounts in the Concordium browser wallet
    // can either sign a regular transaction (in that case the prepend is
    // `account` address and the nonce of the account which is by design >= 1)
    // or sign a message (in that case the prepend is `account` address and 8 zero
    // bytes). Hence, the 8 zero bytes ensure that the user does not accidentally
    // sign a transaction. The account nonce is of type u64 (8 bytes).
    let mut msg_prepend = [0; 32 + 8];
    // Prepend the `account` address of the signer.
    msg_prepend[0..32].copy_from_slice(param.signer.as_ref());
    // Prepend 8 zero bytes.
    msg_prepend[32..40].copy_from_slice(&[0u8; 8]);
    // Calculate the message hash.
    let message_hash = crypto_primitives
        .hash_sha2_256(&[&msg_prepend[0..40], &message_bytes].concat())
        .0;

    Ok(message_hash)
}

/// Verify an ed25519 signature by an account key and allow redeeming a coin.
///
/// Note that at the moment the contract verifies two signatures: the "internal"
/// one is the singature by a private key associated with the coin's public key,
/// and the "external" one by an account key - required for the sponsired transaction.
///
/// It rejects if:
/// - It fails to parse the parameter.
/// - A different nonce is expected.
/// - The signature was intended for a different contract.
/// - The signature was intended for a different `entry_point`.
/// - The signature is expired.
/// - The signature can not be validated.
/// - The `redeem` action can fail if:
///     - the coin is not found in the state
///     - the coin was already redeemed.
#[receive(
    contract = "ccd_redeem",
    name = "permit",
    parameter = "PermitParam",
    crypto_primitives,
    mutable
)]
fn contract_permit<S: HasStateApi>(
    ctx: &impl HasReceiveContext,
    host: &mut impl HasHost<State<S>, StateApiType = S>,
    crypto_primitives: &impl HasCryptoPrimitives,
) -> Result<(), Error> {
    // Parse the parameter.
    let param: PermitParam = ctx.parameter_cursor().get()?;

    let message = param.message;

    // We don't store the nonce, because redeeming a coin is a one-time action.
    // However, the CIS-3 standard requires the nonce to be present in the input.
    // We assume that the correct nonce value in the message is zero.
    ensure_eq!(message.nonce, 0, Error::NonceMismatch);

    // Check that the signature was intended for this contract.
    ensure_eq!(
        message.contract_address,
        ctx.self_address(),
        Error::WrongContract
    );

    // Check signature is not expired.
    ensure!(
        message.timestamp > ctx.metadata().slot_time(),
        Error::Expired
    );

    let message_hash = contract_view_message_hash(ctx, host, crypto_primitives)?;

    // Check signature.
    let valid_signature =
        host.check_account_signature(param.signer, &param.signature, &message_hash)?;
    ensure!(valid_signature, Error::InvalidSignatures);

    if message.entry_point.as_entrypoint_name() == EntrypointName::new_unchecked("redeem") {
        // Parse the parameter.
        let redeem_params: RedeemParam = from_bytes(&message.payload)?;

        // Check that the sponsoree is the same as the account to redeem the coin to.
        ensure_eq!(param.signer, redeem_params.account, Error::NotAuthorized);

        // Redeem the coin after verifiying the signature.
        verify_signature_and_redeem(host, crypto_primitives, redeem_params)?;
    } else {
        bail!(Error::WrongEntryPoint)
    }

    Ok(())
}


/// The parameter type for the contract function `supportsPermit`.
#[derive(Debug, Serialize, SchemaType)]
pub struct SupportsPermitQueryParams {
    /// The list of supportPermit queries.
    #[concordium(size_length = 2)]
    pub queries: Vec<OwnedEntrypointName>,
}


/// Get the entrypoints supported by the `permit` function given a
/// list of entrypoints.
///
/// It rejects if:
/// - It fails to parse the parameter.
#[receive(
    contract = "ccd_redeem",
    name = "supportsPermit",
    parameter = "SupportsPermitQueryParams",
    return_value = "SupportsQueryResponse",
    error = "ContractError"
)]
fn contract_supports_permit<S: HasStateApi>(
    ctx: &impl HasReceiveContext,
    _host: &impl HasHost<State<S>, StateApiType = S>,
) -> Result<SupportsQueryResponse, Error> {
    // Parse the parameter.
    let params: SupportsPermitQueryParams = ctx.parameter_cursor().get()?;

    // Build the response.
    let mut response = Vec::with_capacity(params.queries.len());
    for entrypoint in params.queries {
        if SUPPORTS_PERMIT_ENTRYPOINTS.contains(&entrypoint.as_entrypoint_name()) {
            response.push(SupportResult::Support);
        } else {
            response.push(SupportResult::NoSupport);
        }
    }
    let result = SupportsQueryResponse::from(response);
    Ok(result)
}
