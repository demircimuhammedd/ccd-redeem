# Seed Generator for Redeemable Coins

Both `basic-generator.py` and `qr-generator.py` can generates the necessary seeds for redeemable coins.
The difference between the generators are the generated coin labels.

**Do not use in production!** 

## Requirements

The script `basic-generator.py` requires python 3.10+ and the following packages:

- `pynacl`
- `pylabels`
- `reportlab`

The script `basic-generator.py` requires python 3.10+ and the following packages:

- `pynacl`
- `blabel`

These packages can be installed using `pip` (ideally in a virtual environment).

## Usage

Adapt the number of coins, amount per coin, and the label layout in `basic-generator.py`.

The outputs are:

- `coin-labels.pdf` PDF file for printing labels with seed in base58 format
- `coin-seeds.json` JSON array of seed in base58 format
- `sc-input.json` JSON file with tuples (pub_key, amount) where pub_key is hex encode and amount is in microccd. This allows to initalize the coin smart contract

If labels with QR codes are needed, adapt the number of coins, amount per coin, and the label layout in `qr-generator.py`.

The outputs are:

- `qr-coin-labels.pdf` PDF file for printing labels with seed in base58 format
- `qr-coin-seeds.json` JSON array of seed in base58 format
- `qr-sc-input.json` JSON file with tuples (pub_key, amount) where pub_key is hex encode and amount is in microccd. This allows to initalize the coin smart contract
