import json
import os
from typing import List
from blabel import LabelWriter
from nacl.signing import SigningKey
from nacl.encoding import HexEncoder

def base58encode(msg:bytes) -> bytes:
    ALPHABET = b'123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    m = int.from_bytes(msg,byteorder='big')
    output = b''
    while m:
        m, r = divmod(m, len(ALPHABET))
        output = ALPHABET[r:r+1] + output
    return output

def generate_labels(b58_seeds, amounts):
    label_writer = LabelWriter("style/coin_template.html", items_per_page=10, default_stylesheets=("style/style.css",))
    records = [dict(seed=s.decode(),amount=a//1_000_000) for s,a in zip(b58_seeds,amounts)]
    label_writer.write_labels(records, target="qr-coin-labels.pdf")

def generate_seeds(ccd_amounts: List[int]):
    n = len(ccd_amounts)
    # Good enough randomness for this demo
    seeds = [os.urandom(32) for _ in  range(n)]
    b58_seeds = [base58encode(s) for s in seeds]
    keys = [SigningKey(s) for s in seeds]
    sc_input = {"coins" : [[k.verify_key.encode(encoder=HexEncoder).decode(), f"{a}"] for k,a in zip(keys,ccd_amounts)]}
    generate_labels(b58_seeds, ccd_amounts)
    with open('qr-coin-seeds.json', 'w') as f:
        json.dump([f"{s}" for s in b58_seeds], f)    
    with open('qr-sc-input.json', 'w') as f:
        json.dump(sc_input, f)    

generate_seeds([2_000_000_000 for _ in range(10)])