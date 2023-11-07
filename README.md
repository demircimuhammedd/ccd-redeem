# Redeemable Physical CCDs

This project provides the necessary infrastructure for redeemable coins.

## Structure

- `smart-contract` provides the smart contract that allows to redeem coins for actual CCDs
- `frontend` provides the dapp where one enters the coin seed
- `backend` provides a server that can sponsor calls to the smart contract
- `seed-generator` provides a python script to generate coin seeds

# Test coins

- `F5jMLUoz6DJU2Uzth2cEbVKE3XQrUxfJByPNmJFYygjJ` - the contract's init data file `init.json` contains the corresponding public key
- `BBoAUNEJ5XYuVvs2U29Py78R3uPqdagsUryhjxb2mBf1` - the contract update data file `issue_coins.json` contains the corresponding public key