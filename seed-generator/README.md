# Seed Generator for Redeemable Coins

The script generates the necessary seeds for redeemable coins.

**Do not use in production!** 

## Requirements

The script requires python 3.10+ and the following packages:

- `pynacl`
- `pylabels`
- `reportlab`

which can be installed using `pip` (best in a virtual environment)

## Usage

Adapt the number of coins, amount per coin, and the label layout in `generator.py`.

The outputs are:

- `coin-labels.pdf` PDF file for printing labels with seed in base58 format
- `coin-seeds.json` JSON array of seed in base58 format
- `sc-input.json` JSON file with tuples (pub_key, amount) where pub_key is hex encode and amount is in microccd. This allows to initalize the coin smart contract
