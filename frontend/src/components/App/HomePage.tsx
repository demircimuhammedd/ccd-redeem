import { useEffect, useState } from 'react';
import { Container, Row, Col, Button, Form } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { QrReader } from 'react-qr-reader';
import { BackspaceFill, QrCodeScan } from 'react-bootstrap-icons';
import { Result } from '@zxing/library';

function HomePage() {
    const navigate = useNavigate();

    enum HomeState {
        Initial,
        QRScan,
    }

    const [homeState, setHomeState] = useState<HomeState>();
    const [coinSeed, setCoinSeed] = useState<string>('');

    const handleQR = (result: Result | null | undefined, error: any) => {
        if (error) {
            console.log(error);
        }
        if (result) {
            console.log(result);
            return navigate('/redeem/' + result.getText());
        }
    };

    useEffect(() => {
        setHomeState(HomeState.Initial);
    }, []);

    return (
        <Container>
            {homeState == HomeState.Initial && (
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
                        <QrReader
                            constraints={{}}
                            onResult={(result, error) => {
                                handleQR(result, error);
                            }}
                        />
                    </Row>
                </>
            )}
        </Container>
    );
}

export default HomePage;
