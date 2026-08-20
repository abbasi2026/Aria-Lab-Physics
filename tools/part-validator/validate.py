import json, glob, sys
from pathlib import Path
from collections import Counter
from jsonschema import Draft202012Validator
ROOT=Path(__file__).resolve().parents[2]
schema=json.load(open(ROOT/'datasets/schemas/part.schema.json',encoding='utf-8'))
validator=Draft202012Validator(schema)
files=sorted(glob.glob(str(ROOT/'datasets/parts/canonical/*/*.json')))
errors=[]; ids=set(); legacy=set(); counts=Counter(); ports=0; props=0
for f in files:
    data=json.load(open(f,encoding='utf-8'))
    for e in validator.iter_errors(data): errors.append(f"{f}: {'/'.join(map(str,e.path))}: {e.message}")
    if data['id'] in ids: errors.append(f"duplicate id: {data['id']}")
    ids.add(data['id'])
    lc=data.get('source',{}).get('legacyClass')
    if lc in legacy: errors.append(f"duplicate legacy class: {lc}")
    legacy.add(lc)
    propkeys=[p['key'] for p in data['properties']]
    if len(propkeys)!=len(set(propkeys)): errors.append(f"{data['id']}: duplicate property keys")
    portids=[p['id'] for p in data['ports']]
    if len(portids)!=len(set(portids)): errors.append(f"{data['id']}: duplicate port ids")
    for key in data['solver']['inputs']+data['solver']['outputs']:
        if key not in propkeys: errors.append(f"{data['id']}: solver references unknown property {key}")
    counts[data['domain']]+=1; ports+=len(data['ports']); props+=len(data['properties'])
registry=json.load(open(ROOT/'datasets/parts/registry.json',encoding='utf-8'))
palette=json.load(open(ROOT/'datasets/parts/palette.json',encoding='utf-8'))
if registry['canonicalPartCount']!=len(files): errors.append('registry canonical count mismatch')
if len(palette['entries'])!=206: errors.append('palette entry count must be 206 for Stage 1 baseline')
missing={e['canonicalPartId'] for e in palette['entries']}-ids
if missing: errors.append(f'palette references missing canonical ids: {sorted(missing)}')
if errors:
    print('\n'.join(errors)); print(f'FAILED: {len(errors)} issue(s)'); sys.exit(1)
print(f'PASS: {len(files)} canonical parts, {len(palette["entries"])} palette entries, {props} normalized property records, {ports} extracted ports.')
print('Domains:', dict(counts))
