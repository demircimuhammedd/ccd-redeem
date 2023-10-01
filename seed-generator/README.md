# Seed Generator for Redeemable Coins

The script generates the necessary seeds for redeemable coins.

**Do not use in production!** 

## Requirements

The script requires python 3.10+ and the following packages:

- `pynacl`
- `pylabels`
- `reportlab`

which can be installed using `pip`.

## Usage

Adapt the number of coins, amount per coin, and the label layout in `generator.py`.

The outputs are:

- `coin-labels.pdf` the pdf for the labels
- `coin-seeds.json` the list of seeds
- `sc-input.json` list of ed25519 public keys with corresponding amounts
