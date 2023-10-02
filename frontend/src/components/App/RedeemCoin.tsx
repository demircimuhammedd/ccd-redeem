import { detectConcordiumProvider } from "@concordium/browser-wallet-api-helpers";
import { Alert, Button, Col, Container, Row, Form } from "react-bootstrap";
import { useCallback, useEffect, useState } from 'react';
import SignAccount from "./coinSignature";
import Connection from "./Connection";
import { Link, useParams } from "react-router-dom";
import checkSeed from "./checkSeed";

function RedeemCoin() {

    const params = useParams();
    const { coinSeed } = params;

    const [newCoinSeed, setNewCoinSeed] = useState<string>('');

    const [goodSeed, setGoodSeed] = useState<boolean>();

    const [account, setAccount] = useState<string>();

    const [coinSecret, setCoinSecret] = useState<string>('');

    const [errorMessage, setErrorMessage] = useState<string>('');

    //Remove once we have a backend
    const [scPayload, setSCPayload] = useState<string>('');

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
                    setSCPayload(output)
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
                                <h2>Placeholder Result</h2>
                            </Col>
                        </Row>
                        <Row>
                            <Col>
                                <div>
                                    {scPayload.message ? <p>Message: {scPayload.message}</p> : null}
                                    {scPayload.pubkey ? <p>Pubkey: {scPayload.pubkey}</p> : null}
                                    {scPayload.signature ? <p>Signature: {scPayload.signature}</p> : null}
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
