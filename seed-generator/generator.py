# This script generates Ed25519 private key seeds and saves them in json file and as labels in a pdf.

from nacl.signing import SigningKey
from nacl.encoding import HexEncoder
from hashlib import sha256
from typing import List
import labels
import os
import json
from reportlab.graphics import shapes
from reportlab.lib import colors

def base58encode(msg:bytes) -> bytes:
    ALPHABET = b'123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    m = int.from_bytes(msg,byteorder='big')
    output = b''
    while m:
        m, r = divmod(m, len(ALPHABET))
        output = ALPHABET[r:r+1] + output
    return output

# from pylabels example code
def draw_label(label, width, height, info):
    msgs,amount = info
    # QR code as side length of ~70pts (about an inch)
    l = 70 # folded label side length pt
    # Shape of label
    r = shapes.Rect(5, 5, 2*l, l)
    r.fillColor = None
    r.strokeColor = colors.HexColor('#000000')
    label.add(r)
    # Add lid to hold down folded paper
    r = shapes.Rect(5, 5, 2*l+10, l)
    r.fillColor = None
    r.strokeColor = colors.HexColor('#000000')
    label.add(r)
    # Add seed make with enough left-padding for lid
    for i, m in enumerate(msgs):
        label.add(shapes.String(20, 12*(4-i), str(m), fontName="Courier", fontSize=12))
    # Add outer label with amount
    # Gray background to hide seed
    r = shapes.Rect(5, 80, l, l)
    r.fillColor = colors.HexColor('#666666')
    r.strokeColor = colors.HexColor('#666666')
    label.add(r) 
    # Coin
    r = shapes.Circle(5+l//2, 80+l//2, l//2-1)
    r.fillColor = colors.HexColor('#000000')
    r.strokeColor = colors.HexColor('#ffffff')
    label.add(r)     
    r = shapes.Circle(5+l//2, 80+l//2, l//2-5)
    r.fillColor = colors.HexColor('#000000')
    r.strokeColor = colors.HexColor('#ffffff')
    label.add(r)  
    # manual layout for 4 digits
    s = shapes.String(15, 80+l//2-5, str(amount//1_000_000), fontName="Courier", fontSize=20)
    s.fillColor = colors.HexColor('#ffffff')
    label.add(s) 


#https://stackoverflow.com/questions/312443/how-do-i-split-a-list-into-equally-sized-chunks
def chunks(lst, n):
    """Yield successive n-sized chunks from lst."""
    for i in range(0, len(lst), n):
        yield lst[i:i + n]

# from pylabels example code
def generate_labels(seeds: List[bytes], amounts: List[int]):
    # A4 paper with 105mm x 57 mm labels in 2 columns and 5 rows
    specs = labels.Specification(210, 297, 2, 5, 105, 57, corner_radius=0)
    # Create the sheet.
    sheet = labels.Sheet(specs, draw_label, border=True)
    for s,a in zip(seeds, amounts):
        msgs = list(chunks(s.decode(),16))
        sheet.add_label((msgs,a))
    sheet.save('coin-labels.pdf')

def generate_seeds(ccd_amounts: List[int]):
    n = len(ccd_amounts)
    seeds = [os.urandom(32) for _ in  range(n)]
    b58_seeds = [base58encode(s) for s in seeds]
    keys = [SigningKey(s) for s in seeds]
    sc_input = {"coins" : [[k.verify_key.encode(encoder=HexEncoder).decode(), f"{a}"] for k,a in zip(keys,ccd_amounts)]}
    generate_labels(b58_seeds, ccd_amounts)
    with open('coin-seeds.json', 'w') as f:
        json.dump([f"{s}" for s in b58_seeds], f)    
    with open('sc-input.json', 'w') as f:
        json.dump(sc_input, f)    

generate_seeds([1_000_000_000 for _ in range(10)])