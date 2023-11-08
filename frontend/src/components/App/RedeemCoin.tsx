import { SchemaType, detectConcordiumProvider } from '@concordium/browser-wallet-api-helpers';
import {
    AccountTransactionType,
    unwrap,
    isRejectTransaction,
    getTransactionRejectReason,
    CcdAmount,
} from '@concordium/web-sdk';
import { Alert, Button, Col, Container, Row, Card, Spinner } from 'react-bootstrap';
import { useCallback, useEffect, useState } from 'react';
import { signAccount } from './coinSignature';
import Connection from './Connection';
import { Link, useParams } from 'react-router-dom';
import checkSeed, { SeedError, isPristineCoin } from './checkSeed';
import { BackspaceFill, Bank } from 'react-bootstrap-icons';
import Constants from "./Constants";

function getErrorMsg(error: any) {
    if (error.rejectReason) {
        switch (error.rejectReason) {
            case -2:
                return 'Coin does not exist.';
            case -3:
                return 'Coin is already redeemed.';
            default:
        }
    }
    return 'Unspecified error';
}

type Result = {
    account: string;
    pubkey: string;
};

function RedeemCoin() {

    const params = useParams();

    const { coinSeed } = params;

    enum RedeemState {
        NoValidSeed,
        RedeemedSeed,
        GoodSeed,
        Redeeming,
        RedeemSuccess,
        RedeemFailure,
    }

    const [redeemState, setRedeemState] = useState<RedeemState>();
    const [coinValue, setCoinValue] = useState<CcdAmount>();

    const [account, setAccount] = useState<string>();

    const [errorMessage, setErrorMessage] = useState<string>('');

    //Remove once we have a backend
    const [scPayload, setSCPayload] = useState<Result | undefined>(undefined);

    useEffect(() => {
        detectConcordiumProvider().then((client) => {
            // Listen for relevant events from the wallet.
            client.on('accountChanged', (account) => {
                console.debug('browserwallet event: accountChange', { account });
                setAccount(account);
            });
            client.on('accountDisconnected', () => {
                console.debug('browserwallet event: accountDisconnected');
                client.getMostRecentlySelectedAccount().then(setAccount);
            });
            client.on('chainChanged', (chain) => {
                console.debug('browserwallet event: chainChanged', { chain });
            });
            // Check if you are already connected
            client.getMostRecentlySelectedAccount().then(setAccount);
            return client;
        });
    }, []);

    useEffect(() => {
        if (coinSeed) {
            checkSeed(coinSeed).then(answer => {
                switch (answer) {
                    case SeedError.InvalidEncoding:
                    case SeedError.InvalidLength:
                        setRedeemState(RedeemState.NoValidSeed);
                        setErrorMessage('Provided seed is invalid.');
                        break;
                    case SeedError.CoinNotFound:
                        setRedeemState(RedeemState.NoValidSeed);
                        setErrorMessage('Could not find the coin.');
                        break;
                    case SeedError.DeserializationFailed:
                        setRedeemState(RedeemState.NoValidSeed);
                        setErrorMessage('Could not deserialize the response.');
                        break;
                    default:
                        if (isPristineCoin(answer)) {
                            setCoinValue(new CcdAmount(answer.amount));
                            console.log(answer);
                            setRedeemState(RedeemState.GoodSeed);
                        } else {
                            setRedeemState(RedeemState.RedeemedSeed);
                            setCoinValue(new CcdAmount(answer.amount));
                        }
                        break;
                }
            }
            )
        }
    }, []);

    const handleSubmitSign = useCallback(() => {
        if (account && coinSeed && redeemState == RedeemState.GoodSeed) {
            setRedeemState(RedeemState.Redeeming);
            const output = signAccount(coinSeed, account);
            if (output.e != undefined) {
                setErrorMessage(output.e.toString());
                setRedeemState(RedeemState.RedeemFailure);
            }
            else {
                let param = {
                    public_key: output.pubkey,
                    signature: output.signature,
                    account: account,
                };
                detectConcordiumProvider()
                    .then((walletClient) => {
                        walletClient
                            .sendTransaction(
                                account,
                                AccountTransactionType.Update,
                                {
                                    amount: CcdAmount.fromCcd(0n),
                                    address: Constants.CONTRACT_ADDRESS,
                                    receiveName: Constants.REDEEM_ENTRYPOINT_FULL,
                                    maxContractExecutionEnergy: Constants.MAX_COST,
                                },
                                param,
                                {
                                    type: SchemaType.Parameter,
                                    value: Constants.SCHEMAS.entrypoints.redeem.parameter,
                                },
                                0,
                            )
                            .then((txHash) => walletClient.getGrpcClient().waitForTransactionFinalization(txHash))
                            .then((res) => {
                                const txSummary = res.summary;
                                if (isRejectTransaction(txSummary)) {
                                    setRedeemState(RedeemState.RedeemFailure);
                                    setErrorMessage(
                                        'Could not reedeem coin! ' + getErrorMsg(getTransactionRejectReason(txSummary)),
                                    );
                                    console.log(getTransactionRejectReason(txSummary));
                                } else {
                                    setSCPayload({ account: account, pubkey: unwrap(output.pubkey) });
                                    setRedeemState(RedeemState.RedeemSuccess);
                                }
                            }).catch(err => {
                                console.log(err);
                                setErrorMessage(err.toString());
                                setRedeemState(RedeemState.RedeemFailure);
                            });
                    })
                    .catch((err) => {
                        console.log(err);
                        setErrorMessage(err.toString());
                        setRedeemState(RedeemState.RedeemFailure);
                    });
            }
        }
    }, [account, coinSeed, redeemState]);

    return (
        <>
            <Container>
                {errorMessage && (
                    <>
                        <Row>
                            <Col>
                                <Alert key="danger" variant="danger">
                                    {errorMessage}
                                </Alert>
                            </Col>
                        </Row>
                    </>
                )}
                {!coinSeed && (
                    <>
                    <Row>
                            <Link to={'/'}>
                                <Button variant="primary">
                                    <Bank /> Enter Coin Seed
                                </Button>
                            </Link>
                    </Row>
                    </>                     
                )}
                {redeemState == RedeemState.RedeemedSeed && coinValue && (
                    <>
                    <Row>
                        <Col>
                            <Alert key="warning" variant="warning">
                                Coin already redeemed. It was valued at <span style={{ color: '#ff6200' }}><strong>{coinValue.toCcd().toString()} CCD</strong></span>.
                            </Alert>
                        </Col>
                    </Row>
                    <Row>
                            <Link to={'/'}>
                                <Button variant="primary">
                                    <Bank /> Redeem another coin
                                </Button>
                            </Link>
                    </Row>
                    </>                    
                )}
                {(redeemState == RedeemState.NoValidSeed) || (redeemState == RedeemState.RedeemFailure) && (
                    <>
                        <Row>
                            <Link to={'/'}>
                                <Button variant="primary">
                                    <BackspaceFill /> Go Back
                                </Button>
                            </Link>
                        </Row>
                    </>
                )}
                {redeemState == RedeemState.GoodSeed && coinValue && !account &&(
                    <>
                        <Card>
                            <Card.Body>
                                <Card.Title>Redeem Coin</Card.Title>
                                <Card.Text>
                                    Coin <strong><span style={{ color: 'blue' }}>{coinSeed}</span></strong> is reedemable at a value of <span style={{ color: '#ff6200' }}><strong>{coinValue.toCcd().toString()} CCD</strong></span>.
                                </Card.Text>
                                <Connection
                                    verifier="a"
                                    account={account}
                                    authToken="a"
                                    setAccount={setAccount}
                                    setAuthToken={() => { }}
                                />
                            </Card.Body>
                        </Card>
                    </>
                )}
                {redeemState == RedeemState.GoodSeed && coinValue && account &&(
                    <>
                        <Connection
                            verifier="a"
                            account={account}
                            authToken="a"
                            setAccount={setAccount}
                            setAuthToken={() => { }}
                        />
                        <Card>
                            <Card.Body>
                                <Card.Title>Redeem Coin</Card.Title>
                                <Card.Text>
                                    This will redeem coin <strong><span style={{ color: 'blue' }}>{coinSeed}</span></strong> for account{' '}
                                    <strong><span style={{ color: 'green' }}>{account}</span></strong>.<br />
                                    It's valued at <span style={{ color: '#ff6200' }}><strong>{coinValue.toCcd().toString()} CCD</strong></span>.
                                </Card.Text>
                                <Button variant="primary" onClick={handleSubmitSign}>
                                    Redeem!
                                </Button>
                            </Card.Body>
                        </Card>
                    </>
                )}
                {redeemState == RedeemState.Redeeming && (
                    <>
                        <Spinner animation="border" role="status">
                            <span className="visually-hidden">Redeeming...</span>
                        </Spinner>
                    </>
                )}
                {redeemState == RedeemState.RedeemSuccess && scPayload && coinValue && (
                    <>
                        <Alert variant="success">
                            <Alert.Heading>Successfully reedemed <span style={{ color: '#ff6200' }}><strong>{coinValue.toCcd().toString()} CCD</strong></span></Alert.Heading>
                            <div>
                                {scPayload.pubkey ? <p>Coin public key: {scPayload.pubkey}</p> : null}
                                {scPayload.account ? <p>To account: {scPayload.account}</p> : null}
                            </div>
                        </Alert>
                    </>
                )}
                {redeemState == RedeemState.RedeemSuccess && (
                    <>
                        <Row>
                            <Link to={'/'}>
                                <Button variant="success">
                                    <Bank /> Redeem more
                                </Button>
                            </Link>
                        </Row>
                    </>
                )}
            </Container>
        </>
    );
}

export default RedeemCoin;
