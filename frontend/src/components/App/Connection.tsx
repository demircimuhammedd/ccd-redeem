import React, { useCallback } from 'react';
import { detectConcordiumProvider } from '@concordium/browser-wallet-api-helpers';
import { Row, Col, Button } from 'react-bootstrap';

interface ConnectionProps {
    verifier: string;
    account?: string;
    authToken?: string;
    setAccount: (account: string | undefined) => void;
    setAuthToken: (token: string) => void;
}

/**
 * Component that allows the user to connect with their wallet and authorize with the backend
 */
export default function Connection({ verifier, account, authToken, setAccount, setAuthToken }: ConnectionProps) {
    const handleConnect = useCallback(
        () =>
            detectConcordiumProvider()
                .then((provider) => provider.connect())
                .then(setAccount),
        []
    );

    const handleAuthorize = useCallback(async () => {
        if (!account) {
            throw new Error('Unreachable');
        }
        const provider = await detectConcordiumProvider();
        setAuthToken("0");
    }, [account]);

    return (
        <>
            {!account && (
                <>
                    <Row>
                        <Col>
                            <Button variant="success" onClick={handleConnect}>
                                Connect Wallet
                            </Button>
                        </Col>
                    </Row>
                </>
            )}
        </>
    );
}
