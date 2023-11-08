import json
from pathlib import Path
from blabel import LabelWriter

def get_path(file:str):
    return (Path(__file__).parent).joinpath(file)

def base58encode(msg:bytes) -> bytes:
    ALPHABET = b'123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    m = int.from_bytes(msg,byteorder='big')
    output = b''
    while m:
        m, r = divmod(m, len(ALPHABET))
        output = ALPHABET[r:r+1] + output
    return output

def generate_labels(b58_seeds, amounts, template_file, style_file, target):
    target = get_path(target)
    template_file = get_path(template_file)
    style_file = get_path(style_file)
    label_writer = LabelWriter(template_file, items_per_page=10, default_stylesheets=(style_file,))
    records = [dict(seed=s[2:-1],amount=a//1_000_000,count=i%2) for i,(s,a) in enumerate(zip(b58_seeds,amounts))]
    label_writer.write_labels(records, target=target)

def reprint_labels(file: str = "qr-coin-seeds.json"):
    with open(get_path(file)) as f:
        print(__file__)
        b58_seeds = json.load(f)
        ccd_amounts = [2_000_000_000 for _ in range(10)]
        generate_labels(b58_seeds, ccd_amounts, "style/coin_template2.html","style/style2.css","qr-coin-labels.pdf")
        generate_labels(b58_seeds, ccd_amounts, "style/coin_template.html","style/style.css","qr-coin-labels2.pdf")

reprint_labels()