import { SchemaType, detectConcordiumProvider } from "@concordium/browser-wallet-api-helpers";
import { CcdAmount, AccountTransactionType, unwrap, isRejectTransaction, getTransactionRejectReason } from '@concordium/web-sdk';
import { Alert, Button, Col, Container, Row, Form } from "react-bootstrap";
import { useCallback, useEffect, useState } from 'react';
import SignAccount from "./coinSignature";
import Connection from "./Connection";
import { Link, useParams } from "react-router-dom";
import checkSeed from "./checkSeed";

const SCHEMAS = {
    "contractName": "ccd_redeem",
    "entrypoints": {
        "issue": {
            "error": "FQ0AAAALAAAAUGFyc2VQYXJhbXMCDAAAAENvaW5Ob3RGb3VuZAITAAAAQ29pbkFscmVhZHlSZWRlZW1lZAIRAAAAQ29pbkFscmVhZHlFeGlzdHMCDgAAAEludm9rZVRyYW5zZmVyAhEAAABJbnZhbGlkU2lnbmF0dXJlcwINAAAATm90QXV0aG9yaXplZAINAAAAV3JvbmdDb250cmFjdAIPAAAAV3JvbmdFbnRyeVBvaW50Ag0AAABOb25jZU1pc21hdGNoAgcAAABFeHBpcmVkAg4AAABNaXNzaW5nQWNjb3VudAIWAAAATWFsZm9ybWVkU2lnbmF0dXJlRGF0YQI=",
            "parameter": "FAABAAAABQAAAGNvaW5zEAIPHiAAAAAK"
        },
        "permit": {
            "parameter": "FAADAAAACQAAAHNpZ25hdHVyZRIAAhIAAhUBAAAABwAAAEVkMjU1MTkBAQAAAB5AAAAABgAAAHNpZ25lcgsHAAAAbWVzc2FnZRQABQAAABAAAABjb250cmFjdF9hZGRyZXNzDAUAAABub25jZQUJAAAAdGltZXN0YW1wDQsAAABlbnRyeV9wb2ludBYBBwAAAHBheWxvYWQQAQI="
        },
        "redeem": {
            "error": "FQ0AAAALAAAAUGFyc2VQYXJhbXMCDAAAAENvaW5Ob3RGb3VuZAITAAAAQ29pbkFscmVhZHlSZWRlZW1lZAIRAAAAQ29pbkFscmVhZHlFeGlzdHMCDgAAAEludm9rZVRyYW5zZmVyAhEAAABJbnZhbGlkU2lnbmF0dXJlcwINAAAATm90QXV0aG9yaXplZAINAAAAV3JvbmdDb250cmFjdAIPAAAAV3JvbmdFbnRyeVBvaW50Ag0AAABOb25jZU1pc21hdGNoAgcAAABFeHBpcmVkAg4AAABNaXNzaW5nQWNjb3VudAIWAAAATWFsZm9ybWVkU2lnbmF0dXJlRGF0YQI=",
            "parameter": "FAADAAAACgAAAHB1YmxpY19rZXkeIAAAAAkAAABzaWduYXR1cmUeQAAAAAcAAABhY2NvdW50Cw=="
        },
        "setAdmin": {
            "error": "FQ0AAAALAAAAUGFyc2VQYXJhbXMCDAAAAENvaW5Ob3RGb3VuZAITAAAAQ29pbkFscmVhZHlSZWRlZW1lZAIRAAAAQ29pbkFscmVhZHlFeGlzdHMCDgAAAEludm9rZVRyYW5zZmVyAhEAAABJbnZhbGlkU2lnbmF0dXJlcwINAAAATm90QXV0aG9yaXplZAINAAAAV3JvbmdDb250cmFjdAIPAAAAV3JvbmdFbnRyeVBvaW50Ag0AAABOb25jZU1pc21hdGNoAgcAAABFeHBpcmVkAg4AAABNaXNzaW5nQWNjb3VudAIWAAAATWFsZm9ybWVkU2lnbmF0dXJlRGF0YQI=",
            "parameter": "Cw=="
        },
        "supportsPermit": {
            "error": "FQ0AAAALAAAAUGFyc2VQYXJhbXMCDAAAAENvaW5Ob3RGb3VuZAITAAAAQ29pbkFscmVhZHlSZWRlZW1lZAIRAAAAQ29pbkFscmVhZHlFeGlzdHMCDgAAAEludm9rZVRyYW5zZmVyAhEAAABJbnZhbGlkU2lnbmF0dXJlcwINAAAATm90QXV0aG9yaXplZAINAAAAV3JvbmdDb250cmFjdAIPAAAAV3JvbmdFbnRyeVBvaW50Ag0AAABOb25jZU1pc21hdGNoAgcAAABFeHBpcmVkAg4AAABNaXNzaW5nQWNjb3VudAIWAAAATWFsZm9ybWVkU2lnbmF0dXJlRGF0YQI=",
            "parameter": "FAABAAAABwAAAHF1ZXJpZXMQARYB",
            "returnValue": "EAEVAwAAAAkAAABOb1N1cHBvcnQCBwAAAFN1cHBvcnQCCQAAAFN1cHBvcnRCeQEBAAAAEAAM"
        },
        "view": {
            "returnValue": "FAACAAAABQAAAGNvaW5zEAIPHiAAAAAUAAIAAAAGAAAAYW1vdW50CgsAAABpc19yZWRlZW1lZAEFAAAAYWRtaW4L"
        },
        "viewMessageHash": {
            "parameter": "FAADAAAACQAAAHNpZ25hdHVyZRIAAhIAAhUBAAAABwAAAEVkMjU1MTkBAQAAAB5AAAAABgAAAHNpZ25lcgsHAAAAbWVzc2FnZRQABQAAABAAAABjb250cmFjdF9hZGRyZXNzDAUAAABub25jZQUJAAAAdGltZXN0YW1wDQsAAABlbnRyeV9wb2ludBYBBwAAAHBheWxvYWQQAQI=",
            "returnValue": "EyAAAAAC"
        }
    }
}

type Result = {
    account: string,
    pubkey: string,
}

function RedeemCoin() {

    const redeemEntrypoint = 'ccd_redeem.redeem';

    const maxCost = 30000n;

    const params = useParams();

    const contractAddress = {
        index: 6952n,
        subindex: 0n,
    };

    const { coinSeed } = params;

    const [newCoinSeed, setNewCoinSeed] = useState<string>('');

    const [goodSeed, setGoodSeed] = useState<boolean>();

    const [account, setAccount] = useState<string>();

    const [coinSecret, setCoinSecret] = useState<string>('');

    const [errorMessage, setErrorMessage] = useState<string>('');

    //Remove once we have a backend
    const [scPayload, setSCPayload] = useState<Result | undefined>(undefined);

    useEffect(
        () => {
            detectConcordiumProvider()
                .then(client => {
                    // Listen for relevant events from the wallet.
                    client.on('accountChanged', account => {
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
                })
        }, []);

    useEffect(
        () => {
            if (coinSeed && checkSeed(coinSeed)) {
                setGoodSeed(true)
            }
            else {
                setGoodSeed(false)
                setErrorMessage("Provided seed invalid")
            }
        }, []);

    const handleSubmitSign = useCallback(
        () => {
            if (account && coinSeed && goodSeed) {
                const output = SignAccount(coinSeed, account);
                if (output.e) {
                    setErrorMessage(output.e.toString())
                } else {
                    let param = {
                        public_key: unwrap(output.pubkey),
                        signature: unwrap(output.signature),
                        account: account,

                    };
                    detectConcordiumProvider()
                        .then(walletClient => {
                            walletClient.sendTransaction(
                                account,
                                AccountTransactionType.Update,
                                {
                                    amount: new CcdAmount(0n),
                                    address: contractAddress,
                                    receiveName: redeemEntrypoint,
                                    maxContractExecutionEnergy: maxCost,
                                },
                                param,
                                {
                                    type: SchemaType.Parameter,
                                    value: SCHEMAS.entrypoints.redeem.parameter,
                                },
                                0
                            )
                                .then(txHash => walletClient.getGrpcClient().waitForTransactionFinalization(txHash))
                                .then(res => { if (isRejectTransaction(res.summary)) { setErrorMessage("Rejected"); console.log(getTransactionRejectReason(res.summary)) } else setSCPayload({ account: account, pubkey: unwrap(output.pubkey)}) })
                        })
                        .catch(err => console.log(err))
                }
            }
        },
        [account, coinSeed, goodSeed],
    );

    return (
        <>
            <Container>
                {errorMessage && (
                    <>
                        <Row>
                            <Col>
                                <Alert key="warning" variant="warning">
                                    {errorMessage}
                                </Alert>
                            </Col>
                        </Row>
                    </>
                )}
                <Row >
                    <Col>
                        <h1>Redeemable Coins</h1>
                    </Col>
                </Row>
                {!goodSeed && (
                    <>
                        <Row className="mb-3">
                            <Col>
                                <Form.Label htmlFor="coinSeed">Coin Seed</Form.Label>
                                <Form.Control
                                    type="text"
                                    id="coinSeed"
                                    placeholder="F5jMLUoz6DJU2Uzth2cEbVKE3XQrUxfJByPNmJFYygjJ"
                                    aria-describedby="coinSeedHelpBlock"
                                    value={newCoinSeed}
                                    onChange={(e) => setNewCoinSeed(e.target.value)}
                                />
                                <Form.Text id="coinSeedHelpBlock" muted>
                                    You can find the seed on the inside of the label on your coin.
                                </Form.Text>
                            </Col>
                        </Row>
                        <Row className="mb-3">
                            <Col>
                                <Link to={'/redeem/' + newCoinSeed} ><Button variant="primary">Redeem</Button></Link>
                            </Col>
                        </Row>
                    </>
                )
                }
                {goodSeed && (
                    <>
                        <Connection
                            verifier="a"
                            account={account}
                            authToken="a"
                            setAccount={setAccount}
                            setAuthToken={() => { }}
                        />
                        <Row>
                            <Col className="text-start">
                                <div>Redeem coin</div>
                                <strong>{coinSeed}</strong>
                                <div>for account</div>
                                <strong>{account}</strong>
                                <div>?</div>
                            </Col>
                        </Row>
                        <Row>
                            <Col>
                                <Button variant="primary" onClick={handleSubmitSign}>Redeem!</Button>
                            </Col>
                        </Row>
                    </>
                )
                }
                {scPayload && (
                    <>
                        <Row >
                            <Col>
                                <h2>Successfully reedemed</h2>
                            </Col>
                        </Row>
                        <Row>
                            <Col>
                                <div>
                                    {scPayload.pubkey ? <p>Coin public key: { scPayload.pubkey }</p> : null}
                                    {scPayload.account ? <p>To account: {scPayload.account}</p> : null}
                                </div>
                            </Col>
                        </Row>
                    </>
                )}
            </Container>
        </>
    );
}

export default RedeemCoin;
