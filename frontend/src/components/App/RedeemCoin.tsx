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
import SignAccount from './coinSignature';
import Connection from './Connection';
import { Link, useParams } from 'react-router-dom';
import checkSeed, { SeedError, isPrestineCoin } from './checkSeed';
import { BackspaceFill } from 'react-bootstrap-icons';

const SCHEMAS = {
    contractName: 'ccd_redeem',
    entrypoints: {
        issue: {
            error: 'FQ0AAAALAAAAUGFyc2VQYXJhbXMCDAAAAENvaW5Ob3RGb3VuZAITAAAAQ29pbkFscmVhZHlSZWRlZW1lZAIRAAAAQ29pbkFscmVhZHlFeGlzdHMCDgAAAEludm9rZVRyYW5zZmVyAhEAAABJbnZhbGlkU2lnbmF0dXJlcwINAAAATm90QXV0aG9yaXplZAINAAAAV3JvbmdDb250cmFjdAIPAAAAV3JvbmdFbnRyeVBvaW50Ag0AAABOb25jZU1pc21hdGNoAgcAAABFeHBpcmVkAg4AAABNaXNzaW5nQWNjb3VudAIWAAAATWFsZm9ybWVkU2lnbmF0dXJlRGF0YQI=',
            parameter: 'FAABAAAABQAAAGNvaW5zEAIPHiAAAAAK',
        },
        permit: {
            parameter:
                'FAADAAAACQAAAHNpZ25hdHVyZRIAAhIAAhUBAAAABwAAAEVkMjU1MTkBAQAAAB5AAAAABgAAAHNpZ25lcgsHAAAAbWVzc2FnZRQABQAAABAAAABjb250cmFjdF9hZGRyZXNzDAUAAABub25jZQUJAAAAdGltZXN0YW1wDQsAAABlbnRyeV9wb2ludBYBBwAAAHBheWxvYWQQAQI=',
        },
        redeem: {
            error: 'FQ0AAAALAAAAUGFyc2VQYXJhbXMCDAAAAENvaW5Ob3RGb3VuZAITAAAAQ29pbkFscmVhZHlSZWRlZW1lZAIRAAAAQ29pbkFscmVhZHlFeGlzdHMCDgAAAEludm9rZVRyYW5zZmVyAhEAAABJbnZhbGlkU2lnbmF0dXJlcwINAAAATm90QXV0aG9yaXplZAINAAAAV3JvbmdDb250cmFjdAIPAAAAV3JvbmdFbnRyeVBvaW50Ag0AAABOb25jZU1pc21hdGNoAgcAAABFeHBpcmVkAg4AAABNaXNzaW5nQWNjb3VudAIWAAAATWFsZm9ybWVkU2lnbmF0dXJlRGF0YQI=',
            parameter: 'FAADAAAACgAAAHB1YmxpY19rZXkeIAAAAAkAAABzaWduYXR1cmUeQAAAAAcAAABhY2NvdW50Cw==',
        },
        setAdmin: {
            error: 'FQ0AAAALAAAAUGFyc2VQYXJhbXMCDAAAAENvaW5Ob3RGb3VuZAITAAAAQ29pbkFscmVhZHlSZWRlZW1lZAIRAAAAQ29pbkFscmVhZHlFeGlzdHMCDgAAAEludm9rZVRyYW5zZmVyAhEAAABJbnZhbGlkU2lnbmF0dXJlcwINAAAATm90QXV0aG9yaXplZAINAAAAV3JvbmdDb250cmFjdAIPAAAAV3JvbmdFbnRyeVBvaW50Ag0AAABOb25jZU1pc21hdGNoAgcAAABFeHBpcmVkAg4AAABNaXNzaW5nQWNjb3VudAIWAAAATWFsZm9ybWVkU2lnbmF0dXJlRGF0YQI=',
            parameter: 'Cw==',
        },
        supportsPermit: {
            error: 'FQ0AAAALAAAAUGFyc2VQYXJhbXMCDAAAAENvaW5Ob3RGb3VuZAITAAAAQ29pbkFscmVhZHlSZWRlZW1lZAIRAAAAQ29pbkFscmVhZHlFeGlzdHMCDgAAAEludm9rZVRyYW5zZmVyAhEAAABJbnZhbGlkU2lnbmF0dXJlcwINAAAATm90QXV0aG9yaXplZAINAAAAV3JvbmdDb250cmFjdAIPAAAAV3JvbmdFbnRyeVBvaW50Ag0AAABOb25jZU1pc21hdGNoAgcAAABFeHBpcmVkAg4AAABNaXNzaW5nQWNjb3VudAIWAAAATWFsZm9ybWVkU2lnbmF0dXJlRGF0YQI=',
            parameter: 'FAABAAAABwAAAHF1ZXJpZXMQARYB',
            returnValue: 'EAEVAwAAAAkAAABOb1N1cHBvcnQCBwAAAFN1cHBvcnQCCQAAAFN1cHBvcnRCeQEBAAAAEAAM',
        },
        view: {
            returnValue: 'FAACAAAABQAAAGNvaW5zEAIPHiAAAAAUAAIAAAAGAAAAYW1vdW50CgsAAABpc19yZWRlZW1lZAEFAAAAYWRtaW4L',
        },
        viewMessageHash: {
            parameter:
                'FAADAAAACQAAAHNpZ25hdHVyZRIAAhIAAhUBAAAABwAAAEVkMjU1MTkBAQAAAB5AAAAABgAAAHNpZ25lcgsHAAAAbWVzc2FnZRQABQAAABAAAABjb250cmFjdF9hZGRyZXNzDAUAAABub25jZQUJAAAAdGltZXN0YW1wDQsAAABlbnRyeV9wb2ludBYBBwAAAHBheWxvYWQQAQI=',
            returnValue: 'EyAAAAAC',
        },
    },
};

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
    const redeemEntrypoint = 'ccd_redeem.redeem';

    const maxCost = 30000n;

    const params = useParams();

    const contractAddress = {
        index: 6952n,
        // index: 7048n, // a contract instance with 10 x 1000 ccd coins printed out for demo
        subindex: 0n,
    };

    const { coinSeed } = params;

    enum RedeemState {
        NoValidSeed,
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
            const answer = checkSeed(coinSeed);
            //Error handling if it is not prestine
            if(!isPrestineCoin(answer)){
                setRedeemState(RedeemState.NoValidSeed);
                switch(answer){
                    case SeedError.InvalidEncoding:
                    case SeedError.InvalidLength:
                        setErrorMessage('Provided seed is invalid.');  
                        break;
                    case SeedError.CoinNotFound:
                        setErrorMessage('Could not find the coin.');  
                        break;                            
                    default:
                        setErrorMessage('Coin already redeemed.');  
                        break;                           
                }
            } else {
                setCoinValue(answer);
                setRedeemState(RedeemState.GoodSeed);
            }

        } else {
            setRedeemState(RedeemState.NoValidSeed);
            setErrorMessage('Provided seed is invalid.');
        }
    }, []);

    const handleSubmitSign = useCallback(() => {
        if (account && coinSeed && redeemState == RedeemState.GoodSeed) {
            setRedeemState(RedeemState.Redeeming);
            const output = SignAccount(coinSeed, account);
            if (output.e) {
                setErrorMessage(output.e.toString());
                setRedeemState(RedeemState.RedeemFailure);
            } else {
                let param = {
                    public_key: unwrap(output.pubkey),
                    signature: unwrap(output.signature),
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
                                    address: contractAddress,
                                    receiveName: redeemEntrypoint,
                                    maxContractExecutionEnergy: maxCost,
                                },
                                param,
                                {
                                    type: SchemaType.Parameter,
                                    value: SCHEMAS.entrypoints.redeem.parameter,
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
                {redeemState == RedeemState.NoValidSeed && (
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
                {redeemState == RedeemState.GoodSeed && coinValue && (
                    <>
                        <Connection
                            verifier="a"
                            account={account}
                            authToken="a"
                            setAccount={setAccount}
                            setAuthToken={() => {}}
                        />
                        <Card>
                            <Card.Body>
                                <Card.Title>Redeem Coin</Card.Title>
                                <Card.Text>
                                    This will redeem coin <strong>{coinSeed}</strong> for account{' '}
                                    <strong>{account}</strong>. It's valued at {coinValue.toCcd()} CCD.
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
                {redeemState == RedeemState.RedeemSuccess && scPayload && (
                    <>
                        <Alert variant="success">
                            <Alert.Heading>Successfully reedemed</Alert.Heading>
                            <div>
                                {scPayload.pubkey ? <p>Coin public key: {scPayload.pubkey}</p> : null}
                                {scPayload.account ? <p>To account: {scPayload.account}</p> : null}
                            </div>
                        </Alert>
                    </>
                )}
            </Container>
        </>
    );
}

export default RedeemCoin;
