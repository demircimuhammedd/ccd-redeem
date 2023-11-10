import { useEffect, useState } from 'react';
import { Container, Row, Col, Button, Form } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { QrScanner } from '@yudiel/react-qr-scanner';
import { BackspaceFill, QrCodeScan } from 'react-bootstrap-icons';
import Connection from './Connection';
import { EventType, detectConcordiumProvider } from '@concordium/browser-wallet-api-helpers';
import coins from '../../assets/ccd_redeemable_coins.png';

function HomePage() {
    const navigate = useNavigate();

    enum HomeState {
        Initial,
        QRScan,
    }

    const [homeState, setHomeState] = useState<HomeState>(HomeState.Initial);
    const [coinSeed, setCoinSeed] = useState<string>('');
    const [account, setAccount] = useState<string>();

    const handleQR = (result: any) => {
        if (result) {
            console.log(result);
            return navigate('/redeem/' + result);
        }
    };
    useEffect(() => {
        detectConcordiumProvider().then((client) => {
            // Listen for relevant events from the wallet.
            client.on(EventType.AccountChanged, (account) => {
                console.debug('browserwallet event: accountChanged', { account });
                setAccount(account);
            });
            client.on(EventType.AccountDisconnected, () => {
                console.debug('browserwallet event: accountDisconnected');
                setAccount(undefined)
            });
            client.on(EventType.ChainChanged, (chain) => {
                console.debug('browserwallet event: chainChanged', { chain });
            });
            // Check if you are already connected
            client.getMostRecentlySelectedAccount().then(setAccount);
            return client;
        });
    }, []);

    return (
        <Container>
            {homeState == HomeState.Initial && account && (
                <>
                    <Row>
                        <Col>
                            <h1>Redeemable Coins</h1>
                        </Col>
                    </Row>
                    <Row className="align-items-end">
                        <Col sm={2}>
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setHomeState(HomeState.QRScan);
                                }}
                            >
                                <QrCodeScan className="align-middle" /> Scan Code
                            </Button>
                        </Col>
                        <Col className="text-start">
                            <Form.Label htmlFor="coinSeed">Coin Seed</Form.Label>
                            <Form.Control
                                type="text"
                                id="coinSeed"
                                placeholder="F5jMLUoz6DJU2Uzth2cEbVKE3XQrUxfJByPNmJFYygjJ"
                                aria-describedby="coinSeedHelpBlock"
                                onChange={(e) => setCoinSeed(e.target.value)}
                            />
                        </Col>
                        <Col sm={2}>
                            <Link to={'/redeem/' + coinSeed}>
                                <Button variant="primary">Redeem</Button>
                            </Link>
                        </Col>
                    </Row>
                    <Row>
                        <Col sm={2}></Col>
                        <Col className="text-start">
                            <Form.Text id="coinSeedHelpBlock" as={Col} muted className="text-start">
                                You can find the seed on the inside of the label on your coin.
                            </Form.Text>
                        </Col>
                    </Row>
                </>
            )}
            {homeState == HomeState.QRScan && (
                <>
                    <Row>
                        <Col sm={2}>
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setHomeState(HomeState.Initial);
                                }}
                            >
                                <BackspaceFill /> Go Back
                            </Button>
                        </Col>
                        <Col>
                            <h1>Scan QR Code on Coin</h1>
                        </Col>
                    </Row>
                    <Row>
                        <QrScanner
                            onDecode={(result) => handleQR(result)}
                            onError={(error) => console.log(error?.message)}
                        />
                    </Row>
                </>
            )}
            {homeState == HomeState.Initial && !account && (
                <>
                    <img src={coins} alt="CCD coins" width={200} />
                    <p>physical coin, redeemable for CCDs</p>
                    <Connection
                        verifier="a"
                        account={account}
                        authToken="a"
                        setAccount={setAccount}
                        setAuthToken={() => { }}
                    />
                </>
            )}
        </Container>
    );
}

export default HomePage;
