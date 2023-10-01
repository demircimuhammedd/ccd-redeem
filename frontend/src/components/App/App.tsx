import { detectConcordiumProvider } from "@concordium/browser-wallet-api-helpers";
import { Col, Container, Row } from "react-bootstrap";
import { useCallback, useEffect, useState } from 'react';
import SignAccount from "./coinSignature";
import Connection from "./Connection";

function App() {
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

    const handleSubmitSign = useCallback(
        () => {
            if (account) {
                const output = SignAccount(coinSecret, account);
                if (output.e) {
                    setErrorMessage(output.e.toString())
                } else {
                    setSCPayload(output)
                }
            }
        },
        [account, coinSecret],
    );

    return (
        <>
            <Container>
                {errorMessage && (
                    <>
                        <Row>
                            <Col>
                                <p>{errorMessage}</p>
                            </Col>
                        </Row>
                    </>
                )}
                <Row>
                    <Col>
                        <>
                            <Connection
                                verifier="a"
                                account={account}
                                authToken="a"
                                setAccount={setAccount}
                                setAuthToken={() => { }}
                            />
                        </>
                    </Col>
                </Row>
                <hr />
                <Row>
                    <Col>
                        <input type="text" id="coinsecret" value={coinSecret} onChange={(e) => setCoinSecret(e.target.value)} />
                        <button onClick={handleSubmitSign}>Sign</button>
                    </Col>
                </Row>
                {scPayload && (
                    <>
                        <Row>
                            <Col>
                                <div>
                                    {scPayload.message? <p>Message: {scPayload.message}</p>: null}
                                    {scPayload.pubkey? <p>Pubkey: {scPayload.pubkey}</p>: null}
                                    {scPayload.signature? <p>Signature: {scPayload.signature}</p>: null}
                                </div>
                            </Col>
                        </Row>
                    </>
                )}
            </Container>
        </>
    );
}

export default App;
