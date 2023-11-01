import { Routes, Route, BrowserRouter } from 'react-router-dom';
import HomePage from './HomePage';
import RedeemCoin from './RedeemCoin';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/redeem/" element={<RedeemCoin />} />
                <Route path="/redeem/:coinSeed" element={<RedeemCoin />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
