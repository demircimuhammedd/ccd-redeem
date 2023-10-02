import { useState } from "react";
import { Container, Row, Col, Button, Form } from "react-bootstrap";
import { Link } from "react-router-dom";

function HomePage() {
  const [coinSeed, setCoinSeed] = useState<string>('');
  return (
    <Container>
      <Row >
        <Col>
          <h1>Redeemable Coins</h1>
        </Col>
      </Row>
      <Row className="align-items-end">
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
    </Container>
  );
};

export default HomePage;