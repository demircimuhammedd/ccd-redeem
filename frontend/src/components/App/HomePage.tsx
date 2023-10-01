import { useState } from "react";
import { Container, Row, Col, Button, Form } from "react-bootstrap";
import {Link} from "react-router-dom";

function HomePage() { 
    const [coinSeed, setCoinSeed] = useState<string>('');
    return (
        <Container>
          <Row >
            <Col class="text-center m-4">
              <Row>
                <h1>Redeemable Coins</h1>
              </Row>
              <Row>
                <h3 className="text-muted">Get your CCDs now!</h3>
              </Row>
            </Col>
          </Row>
          <Row className="mb-3">
            <Col>
            <Form.Label htmlFor="coinSeed">Coin Seed</Form.Label>
            <Form.Control
              type="text"
              id="coinSeed"
              placeholder="F5jMLUoz6DJU2Uzth2cEbVKE3XQrUxfJByPNmJFYygjJ"
              aria-describedby="coinSeedHelpBlock"
              value={coinSeed} 
              onChange={(e) => setCoinSeed(e.target.value)}
            />
            <Form.Text id="coinSeedHelpBlock" muted>
              You can find the seed on the inside of the label on your coin.
            </Form.Text>
            </Col>
          </Row>
          <Row className="mb-3">
            <Col>
              <Link to={'/redeem/' + coinSeed} ><Button variant="primary">Redeem</Button></Link>
            </Col>   
          </Row>     
        </Container>
    );
};

export default HomePage;