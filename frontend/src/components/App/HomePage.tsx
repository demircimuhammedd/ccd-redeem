import { useEffect, useState } from "react";
import { Container, Row, Col, Button, Form, Alert } from "react-bootstrap";
import { Link } from "react-router-dom";
import { QrReader } from 'react-qr-reader';
import { BackspaceFill, QrCodeScan } from "react-bootstrap-icons";

function HomePage() {

  enum HomeState {
    Initial,
    QRScan,
    QRGoodScan,
    QRFailure,
  }

  const [homeState, setHomeState] = useState<HomeState>();
  const [coinSeed, setCoinSeed] = useState<string>('');

  const handleQR = (result,error) => {
      if(error){
        console.log(error)
      }
      if(result){
        console.log(result);
        if(result.text){
          setHomeState(HomeState.QRGoodScan)
          setCoinSeed(result.text)
        }
      }
  };

  useEffect(
    () => {
      setHomeState(HomeState.Initial)
    }, []);

  return (
    <Container>
      {homeState == HomeState.Initial && (
        <>
          <Row >
            <Col>
              <h1>Redeemable Coins</h1>
            </Col>
          </Row>
          <Row className="align-items-end">
            <Col sm={2}>
              <Button variant="secondary" onClick={() => {setHomeState(HomeState.QRScan)}}><QrCodeScan/> Scan Code</Button>
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
              <Link to={'/redeem/' + coinSeed} ><Button variant="primary">Redeem</Button></Link>
            </Col>
          </Row>
          <Row>
            <Form.Text id="coinSeedHelpBlock" as={Col} muted className="text-start">
              You can find the seed on the inside of the label on your coin.
            </Form.Text>
          </Row>
        </>
      )}
      {homeState == HomeState.QRScan && (
        <>
          <Row >
            <Col sm={2}>
              <Button variant="secondary" onClick={() => {setHomeState(HomeState.Initial)}}><BackspaceFill/> Go Back</Button>
            </Col>
            <Col>
              <h1>Scan QR Code on Coin</h1>
            </Col>
          </Row>
          <Row >
            <QrReader 
              onResult={(result, error) => {handleQR(result,error)}}
            />
          </Row>            
        </>
      )} 
      {homeState == HomeState.QRGoodScan && (
        <>
          <Row className="align-items-end">
            <Col>
              Scan Result: {coinSeed}
            </Col>
            <Col sm={2}>
              <Link to={'/redeem/' + coinSeed} ><Button variant="primary">Redeem</Button></Link>
            </Col>
          </Row>        
        </>
      )}
      {homeState == HomeState.QRFailure && (
        <>
          <Row >
            <Col sm={2}>
              <Button variant="secondary" onClick={() => {setHomeState(HomeState.Initial)}}><BackspaceFill/>Go Back</Button>
            </Col>
            <Col>
                <Alert key="danger" variant="danger">
                  Could not scan QR code.
                </Alert>
            </Col>
          </Row>    
        </>
      )}
    </Container>
  );
};

export default HomePage;