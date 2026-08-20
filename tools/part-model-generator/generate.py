from __future__ import annotations
import json, math, re, glob, csv, os, xml.etree.ElementTree as ET
from pathlib import Path
from collections import defaultdict, Counter

ROOT=Path(__file__).resolve().parents[2]
RAW=Path(os.environ.get('ARIA_LAB_CROCODILE_RESEARCH_DIR', ROOT.parent/'crocodile_physics_605_analysis'))
EXTRACTED=RAW/'extracted/Crocodile Physics 605'
PARTS_FULL=RAW/'output/parts_full.json'
COMPACT=ROOT/'datasets/legacy/crocodile-physics-605/parts_catalog_compact.csv'
OUT=ROOT/'datasets/parts'; CANON=OUT/'canonical'

DOMAIN={'Electronics':'circuits','Motion & Forces':'mechanics','Optics':'optics','Waves':'waves','Presentation':'presentation'}
ENGINE={'circuits':'circuits-engine','mechanics':'mechanics-engine','optics':'optics-engine','waves':'waves-engine','presentation':'experiment-runtime'}
CAT_FA={'Electronics':'الکترونیک','Analog':'آنالوگ','Digital':'دیجیتال','Power Supplies':'منابع تغذیه','Switches':'کلیدها','Input Components':'قطعات ورودی','Passive Components':'قطعات غیرفعال','Discrete Semiconductors':'نیمه‌رساناهای مجزا','Integrated Circuits':'مدارهای مجتمع','Signal Generators & Sound':'مولد سیگنال و صوت','Light Outputs':'خروجی‌های نوری','Meters':'اندازه‌گیرها','Pictorial':'نمای تصویری','Logic Gates':'گیت‌های منطقی','Flip-flops':'فلیپ‌فلاپ‌ها','Counters':'شمارنده‌ها','Decoders':'دیکودرها','Inputs':'ورودی‌ها','Outputs':'خروجی‌ها','Motion & Forces':'حرکت و نیرو','Mechanisms':'سازوکارها','Motion':'حرکت','Grounds':'سطوح افقی','Slopes':'سطوح شیب‌دار','Balls':'توپ‌ها','Blocks':'بلوک‌ها','Optics':'اپتیک','Ray Diagrams':'نمودارهای پرتو','Light Sources':'منابع نور','Lenses':'عدسی‌ها','Mirrors':'آینه‌ها','Transparent Objects':'اجسام شفاف','Opaque Objects':'اجسام کدر','Measurement Tools':'ابزارهای اندازه‌گیری','Waves':'موج‌ها','1D':'یک‌بعدی','2D':'دوبعدی','Sources':'منابع','Reflectors':'بازتاب‌دهنده‌ها','Obstacles':'موانع','Slits':'شکاف‌ها','Measurement':'اندازه‌گیری','Presentation':'ارائه و کنترل آزمایش'}

FA={
'Battery':'باتری','Variable voltage supply':'منبع ولتاژ متغیر','Voltage rail':'خط تغذیه ولتاژ','Zero volt rail':'خط صفر ولت','Ground':'زمین الکتریکی','Constant current source':'منبع جریان ثابت','SPST':'کلید SPST','SPDT':'کلید SPDT','DPST':'کلید DPST','DPDT':'کلید DPDT','Push-to-make switch':'کلید فشاری وصل‌شونده','Push-to-break switch':'کلید فشاری قطع‌شونده','SPDT relay':'رله SPDT','DPDT relay':'رله DPDT','Thermistor':'ترمیستور','Light dependent resistor':'مقاومت وابسته به نور','Variable resistor':'مقاومت متغیر','Potentiometer':'پتانسیومتر','Fuse':'فیوز','Resistor':'مقاومت','8 Resistors':'مجموعه ۸ مقاومت','Inductor':'سلف','Capacitor':'خازن','Electrolytic capacitor':'خازن الکترولیتی','Transformer':'ترانسفورماتور','Diode':'دیود','Zener':'دیود زنر','Thyristor':'تریستور','N-Channel MOSFET':'ماسفت کانال N','P-Channel MOSFET':'ماسفت کانال P','NPN transistor':'ترانزیستور NPN','PNP transistor':'ترانزیستور PNP','555 Timer':'تایمر ۵۵۵','324 Op-amp':'تقویت‌کننده عملیاتی ۳۲۴','741 Op-amp':'تقویت‌کننده عملیاتی ۷۴۱','Signal generator':'مولد سیگنال','Buzzer':'بازر','Loudspeaker':'بلندگو','Signal Lamp':'چراغ سیگنال','Filament Lamp':'لامپ رشته‌ای','Red LED':'LED قرمز','Green LED':'LED سبز','Yellow LED':'LED زرد','Seven segment display':'نمایشگر هفت‌قسمتی','Ammeter':'آمپرمتر','Voltmeter':'ولت‌متر','Motor':'موتور','Clock':'کلاک','Logic indicator':'نشانگر منطقی',
'Chain':'زنجیر','Constant speed motor':'موتور با سرعت ثابت','Flywheel':'چرخ طیار','Gear':'چرخ‌دنده','Generator':'ژنراتور','Electric motor':'موتور الکتریکی','Rack and pinion':'دنده شانه‌ای و پینیون','Torque':'گشتاور','Microswitch':'میکروسوئیچ','Solenoid':'سلونوئید','Space':'محیط شبیه‌سازی','Cart':'گاری آزمایشگاهی','Rod':'میله','Spring':'فنر','Brick':'آجر',
'Optical Space':'محیط اپتیکی','Near Object Marker':'نشانگر جسم نزدیک','Far Object Marker':'نشانگر جسم دور','Screen':'پرده','Eye':'چشم','Diverging beam':'دسته‌پرتو واگرا','Parallel beam':'دسته‌پرتو موازی','Ray box':'جعبه پرتو','Concave Lens':'عدسی مقعر','Convex Lens':'عدسی محدب','Plane Mirror':'آینه تخت','Concave Mirror':'آینه مقعر','Convex Mirror':'آینه محدب','Parabolic Mirror':'آینه سهموی','Prism':'منشور','Transparent Block':'بلوک شفاف','Semi-circular Block':'بلوک نیم‌دایره','Adjustable Slit':'شکاف قابل تنظیم','Opaque Ball':'توپ کدر','Opaque Block':'بلوک کدر','Opaque Triangle':'مثلث کدر','Ruler':'خط‌کش','Protractor':'نقاله','Marker':'نشانگر',
'Electromagnetic wavespace':'محیط موج الکترومغناطیسی','Sound wavespace':'محیط موج صوتی','Water wavespace':'محیط موج آب','Point Source':'منبع نقطه‌ای','Line Source':'منبع خطی','Moving Point Source':'منبع نقطه‌ای متحرک','Plane Reflector':'بازتاب‌دهنده تخت','Block':'بلوک','Sloped block':'بلوک شیب‌دار','Triangle':'مثلث','Circle':'دایره','Single Slit':'تک‌شکاف','Double Slit':'دوشکاف','Detector':'آشکارساز',
'Graph':'نمودار','Text':'متن','Instructions':'راهنمای مراحل','Picture':'تصویر','Animation':'پویانمایی','Button':'دکمه','Number':'کنترل عددی','Checkbox':'چک‌باکس','Drop-down list':'فهرست کشویی','Edit box':'کادر ویرایش','Pause':'مکث','Reload':'بازنشانی','Part Tray':'سینی قطعات'}
FA.update({
'1A Fuse':'فیوز ۱ آمپر','9V battery':'باتری ۹ ولت','Darlington driver':'درایور دارلینگتون','Half-H driver':'درایور نیم‌پل H','Float switch':'کلید شناور','LDR and Lamp':'مقاومت نوری و لامپ','LDR with Lamp':'مقاومت نوری همراه لامپ','Opto-isolator':'اپتوایزولاتور','Photo-transistor with lamp':'فوتوترانزیستور همراه لامپ',
'7414: Schmitt inverter':'۷۴۱۴: معکوس‌کننده اشمیت','7404: Inverter':'۷۴۰۴: معکوس‌کننده','7408: AND gate':'۷۴۰۸: گیت AND','7400: NAND gate':'۷۴۰۰: گیت NAND','7410: 3-input NAND gate':'۷۴۱۰: گیت NAND سه‌ورودی','7420: 4-input NAND gate':'۷۴۲۰: گیت NAND چهارورودی','7432: OR gate':'۷۴۳۲: گیت OR','7402: NOR gate':'۷۴۰۲: گیت NOR','7486: Exclusive-OR gate':'۷۴۸۶: گیت XOR','4043: RS flip-flop':'۴۰۴۳: فلیپ‌فلاپ RS','7474: D-type flip-flop':'۷۴۷۴: فلیپ‌فلاپ نوع D','4027: JK flip-flop (with set)':'۴۰۲۷: فلیپ‌فلاپ JK با Set','7473: JK flip-flop (without set)':'۷۴۷۳: فلیپ‌فلاپ JK بدون Set','4518: Decade (÷10) counter':'۴۵۱۸: شمارنده ده‌دهی','4026: Decade counter and 7-segment decoder':'۴۰۲۶: شمارنده ده‌دهی و دیکودر هفت‌قسمتی','4017: Decoded (1-of-10) decade counter':'۴۰۱۷: شمارنده ده‌دهی ۱ از ۱۰','4028: BCD to decimal (1-of-10) decoder':'۴۰۲۸: دیکودر BCD به ده‌دهی','4511: BCD to 7-segment display decoder':'۴۵۱۱: دیکودر BCD به نمایشگر هفت‌قسمتی',
'Latching logic input':'ورودی منطقی قفل‌شونده','Push button logic input':'ورودی منطقی فشاری','Custom logic input':'ورودی منطقی سفارشی','Target logic input':'ورودی منطقی هدف','Custom logic output':'خروجی منطقی سفارشی','Target logic output':'خروجی منطقی هدف',
'Ideal elastic ground':'سطح کاملاً کشسان','Ideal inelastic ground':'سطح کاملاً ناکشسان','Wooden ground':'سطح چوبی','Metal ground':'سطح فلزی','Rubber ground':'سطح لاستیکی','Glass ground':'سطح شیشه‌ای','Ice ground':'سطح یخی','Concrete ground':'سطح بتنی','Ideal elastic slope':'سطح شیب‌دار کاملاً کشسان','Ideal inelastic slope':'سطح شیب‌دار کاملاً ناکشسان','Wooden slope':'شیب چوبی','Metal slope':'شیب فلزی','Rubber slope':'شیب لاستیکی','Glass slope':'شیب شیشه‌ای','Ice slope':'شیب یخی','Concrete slope':'شیب بتنی',
'Ideal elastic ball':'توپ کاملاً کشسان','Ideal inelastic ball':'توپ کاملاً ناکشسان','Soccer ball':'توپ فوتبال','Basketball':'توپ بسکتبال','Cricket ball':'توپ کریکت','Golf ball':'توپ گلف','Tennis ball':'توپ تنیس','Billiard ball':'توپ بیلیارد','Wooden ball':'توپ چوبی','Rubber ball':'توپ لاستیکی','Metal ball':'توپ فلزی','Concrete ball':'توپ بتنی','Glass ball':'توپ شیشه‌ای','Ice ball':'توپ یخی','Ideal elastic block':'بلوک کاملاً کشسان','Ideal inelastic block':'بلوک کاملاً ناکشسان','Wooden block':'بلوک چوبی','Metal block':'بلوک فلزی','Rubber block':'بلوک لاستیکی','Glass block':'بلوک شیشه‌ای','Ice block':'بلوک یخی','Concrete block':'بلوک بتنی',
'Wave propagation space':'محیط انتشار موج','Wave penetration space':'محیط نفوذ موج','Wave reflection space':'محیط بازتاب موج','Wave interference space':'محیط تداخل موج','Wave pinned space':'محیط موج با انتهای ثابت','Wave plucking space':'محیط موج کشیده‌شده'
})
TYPE={'double':'number','int':'integer','bool':'boolean','string':'string','point':'vector2','color':'color','resource':'resource','resource-array':'array','string-array':'array','value-map':'object'}
UNIT_Q={'ampere':'current','volts':'voltage','ohm':'resistance','kiloohm':'resistance','microfarad':'capacitance','henry':'inductance','hertz':'frequency','nanometer':'wavelength','meter':'length','centimeter':'length','second':'time','kilogram':'mass','newton':'force','newton metre':'torque','newtons per metre':'spring_constant','joule':'energy','watt':'power','coulomb':'charge','degree':'angle','radian':'angle','metres per second':'speed','metres per second per second':'acceleration','kilogram metres per second':'momentum','kilograms per cubic metre':'density','cm3':'volume','gram metres squared':'moment_of_inertia','kilogram metres squared':'moment_of_inertia','revolutions per minute':'angular_speed'}
KEY_Q=[('voltage','voltage'),('current','current'),('resistance','resistance'),('capacit','capacitance'),('induct','inductance'),('frequency','frequency'),('wavelength','wavelength'),('mass','mass'),('density','density'),('volume','volume'),('radius','length'),('length','length'),('velocity','speed'),('speed','speed'),('acceleration','acceleration'),('force','force'),('weight','force'),('torque','torque'),('momentum','momentum'),('energy','energy'),('power','power'),('charge','charge'),('angle','angle'),('phase','angle'),('time','time')]

def slug(s): return re.sub(r'[^a-z0-9]+','-',s.lower()).strip('-') or 'part'
def domain_for(p):
    prefix=p.get('class','').split('/')[0]
    return {'electronics':'circuits','motion':'mechanics','optics':'optics','waves':'waves','presentation':'presentation'}.get(prefix, DOMAIN[p['category_path'].split(' > ')[0]])
def part_id(p): return f"{domain_for(p)}.{slug(p['class'].split('/')[-1])}"
def cat_fa(path): return ' ← '.join(CAT_FA.get(x,x) for x in path.split(' > '))
def parse_default(v,kind):
    if v is None or v=='': return None
    s=str(v).strip()
    if kind=='boolean':
        if s.lower() in ('true','1'): return True
        if s.lower() in ('false','0'): return False
    if kind=='number':
        try:
            x=float(s); return x if math.isfinite(x) else s
        except:return s
    if kind=='integer':
        try:return int(float(s))
        except:return s
    if kind=='vector2':
        try:
            a,b=[float(x.strip()) for x in s.split(',')[:2]]; return {'x':a,'y':b}
        except:return s
    return s

def minmax(v):
    o={}
    if isinstance(v,dict):
        for it in v.get('values',[]):
            if it.get('key') in ('min','max'):
                try:o[it['key']]=float(it.get('value'))
                except:pass
    return o

def xml_metadata():
    m={}
    for f in glob.glob(str(EXTRACTED/'*domain/parts/*.xml')):
        root=ET.parse(f).getroot()
        for el in root.findall('.//part'):
            c=el.get('class')
            if not c: continue
            r=m.setdefault(c,{'proto':None,'ports':[],'quantities':{}}); r['proto']=el.get('proto') or r['proto']
            for pe in el.findall('./p'):
                if pe.get('key') and pe.get('quantity'): r['quantities'][pe.get('key')]=pe.get('quantity')
            for pad in el.findall('./pad'):
                role=pad.get('role') or ''; pc=pad.get('class') or ''
                if 'terminal' in role or 'terminal' in pc or 'connector' in role or 'axle' in role or 'mechanical' in role:
                    rr=[x.strip() for x in role.split(',') if x.strip()]
                    name=rr[-1] if rr and rr[-1]!='terminal' else f"port-{len(r['ports'])+1}"
                    r['ports'].append({'id':slug(name),'legacyRole':role,'legacyClass':pc})
    def resolve(c,seen=None):
        seen=set() if seen is None else seen
        if not c or c in seen:return {'ports':[],'quantities':{}}
        seen.add(c); r=m.get(c,{'proto':None,'ports':[],'quantities':{}}); b=resolve(r['proto'],seen)
        q=dict(b['quantities']); q.update(r['quantities'])
        raw_ports=r['ports'] or b['ports']; seenp=set(); ports=[]
        for pp in raw_ports:
            sig=pp.get('legacyRole','')
            if sig not in seenp: seenp.add(sig); ports.append(pp)
        return {'ports':ports,'quantities':q}
    return {c:resolve(c) for c in m}

def family(p):
    d=domain_for(p); c=p['category_path']; l=p['label'].lower()
    if d=='circuits':
        if 'Digital' in c:return 'digital-logic'
        if 'Meters' in c:return 'instrumentation'
        if 'Power Supplies' in c:return 'source'
        if 'Semiconductor' in c or 'Integrated Circuits' in c:return 'nonlinear-or-active-device'
        if any(x in l for x in ('motor','relay','buzzer','loudspeaker','lamp','solenoid')):return 'electromechanical-or-load'
        return 'analog-network'
    if d=='mechanics':
        if 'Mechanisms' in c:return 'mechanism'
        if 'Grounds' in c or 'Slopes' in c:return 'static-collider'
        if 'Balls' in c or 'Blocks' in c or l in ('cart','rod'):return 'rigid-body'
        if l=='spring':return 'constraint-force'
        if l=='space':return 'world-environment'
        return 'mechanics-component'
    if d=='optics':
        if 'Light Sources' in c:return 'ray-source'
        if 'Lenses' in c or 'Transparent Objects' in c:return 'refractive-optic'
        if 'Mirrors' in c:return 'reflective-optic'
        if 'Opaque Objects' in c:return 'ray-obstacle'
        if 'Measurement Tools' in c:return 'measurement-tool'
        return 'ray-scene-component'
    if d=='waves':
        if '1D' in c:return 'wave-medium-1d'
        if c.endswith('2D'):return 'wave-medium-2d'
        if 'Sources' in c:return 'wave-source'
        if 'Reflectors' in c:return 'wave-reflector'
        if 'Obstacles' in c:return 'wave-obstacle'
        if 'Slits' in c:return 'wave-aperture'
        if 'Measurement' in c:return 'wave-detector'
        return 'wave-component'
    return 'presentation-control'

def capabilities(f):
    mp={'digital-logic':['connectable','digital-logic-simulation'],'instrumentation':['connectable','electrical-measurement'],'source':['connectable','electrical-source'],'nonlinear-or-active-device':['connectable','electrical-simulation'],'electromechanical-or-load':['connectable','electrical-simulation'],'analog-network':['connectable','electrical-simulation'],'mechanism':['mechanical-coupling'],'static-collider':['collision-surface','material-properties'],'rigid-body':['transformable','collision','force-observables'],'constraint-force':['force-law','mechanical-coupling'],'world-environment':['simulation-environment'],'mechanics-component':['mechanical-simulation'],'ray-source':['ray-emission','wavelength-control'],'refractive-optic':['refraction','ray-tracing'],'reflective-optic':['reflection','ray-tracing'],'ray-obstacle':['ray-blocking','ray-tracing'],'measurement-tool':['measurement'],'ray-scene-component':['ray-tracing'],'wave-medium-1d':['wave-propagation'],'wave-medium-2d':['wave-propagation'],'wave-source':['wave-emission'],'wave-reflector':['wave-boundary-interaction'],'wave-obstacle':['wave-boundary-interaction'],'wave-aperture':['wave-boundary-interaction'],'wave-detector':['wave-measurement'],'wave-component':['wave-simulation'],'presentation-control':['experiment-ui']}
    return mp.get(f,[])

def quantity(raw,xq):
    k=raw.get('key',''); d=raw.get('display') or {}; u=d.get('unit')
    if k in xq:return xq[k]
    if u in UNIT_Q:return UNIT_Q[u]
    kl=k.lower()
    for needle,q in KEY_Q:
        if needle in kl:return q

def role(raw,editable,observable):
    k=raw.get('key',''); flags=set((raw.get('flags') or '').split(','))
    if observable or k.startswith('user-'):return 'observable'
    if 'computed' in flags:return 'computed'
    if editable:return 'parameter'
    if k in {'pos-x','pos-y','orientation','offset','width','height','radius','velocity-x','velocity-y','angular-velocity'}:return 'state'
    if any(x in k for x in ('img','icon','colour','color','font','line-style','fill','meta-')):return 'rendering'
    if 'proxy' in flags:return 'binding'
    return 'internal'

def main():
    parts=json.load(open(PARTS_FULL,encoding='utf-8')); xm=xml_metadata(); OUT.mkdir(parents=True,exist_ok=True)
    compact_obs=defaultdict(set)
    with open(COMPACT,encoding='utf-8-sig',newline='') as fh:
        for row in csv.DictReader(fh):
            vals=(row.get('observable_association_properties') or '').split(';')
            compact_obs[row.get('class','')].update(v.strip() for v in vals if v.strip())
    for d in set(DOMAIN.values()):(CANON/d).mkdir(parents=True,exist_ok=True)
    grouped=defaultdict(list)
    for p in parts:grouped[p['class']].append(p)
    palette=[]
    for i,p in enumerate(parts,1):
        palette.append({'id':f'palette.{i:03d}','canonicalPartId':part_id(p),'name':p['label'],'nameFa':FA.get(p['label'],p['label']),'translationStatus':'verified-dictionary' if p['label'] in FA else 'pending','categoryPath':p['category_path'],'categoryPathFa':cat_fa(p['category_path']),'legacyClass':p['class']})
    canonical=[]; dcount=Counter(); fcount=Counter(); rcount=Counter(); pending=[]
    for lc,placements in sorted(grouped.items()):
        p=placements[0]; d=domain_for(p); pid=part_id(p); fam=family(p); dcount[d]+=1; fcount[f'{d}/{fam}']+=1
        if p['label'] not in FA:pending.append(p['label'])
        editable=set(); obs=set(compact_obs.get(lc,set()))
        for pl in placements:
            editable.update(c.get('model_property') for c in (pl.get('ui_controls') or []) if c.get('model_property'))
            obs.update(pl.get('observable_association_properties') or [])
        x=xm.get(lc,{'ports':[],'quantities':{}}); props=[]
        for raw in p.get('properties',[]):
            k=raw.get('key')
            if not k:continue
            kind=TYPE.get(raw.get('type') or '','unknown'); ed=k in editable; ob=k in obs or k.startswith('user-'); rr=role(raw,ed,ob); rcount[rr]+=1
            q={'key':k,'label':raw.get('label') or k.replace('-',' ').title(),'kind':kind,'role':rr,'editable':ed,'observable':ob,'legacyType':raw.get('type') or None,'legacyFlags':[z for z in (raw.get('flags') or '').split(',') if z]}
            qq=quantity(raw,x['quantities']); disp=raw.get('display') or {}; dv=parse_default(raw.get('default'),kind)
            if qq:q['quantity']=qq
            if disp.get('unit'):q['defaultUnit']=disp['unit']
            if disp.get('allowed_units'):q['allowedUnits']=disp['allowed_units']
            if dv is not None:q['default']=dv
            q.update(minmax(raw.get('validator')))
            if raw.get('validator'):q['legacyValidator']=raw['validator']
            props.append(q)
        used=Counter(); ports=[]
        for pr in x['ports']:
            used[pr['id']]+=1; pp=dict(pr); pp['id']=pr['id'] if used[pr['id']]==1 else f"{pr['id']}-{used[pr['id']]}"; pp['kind']='electrical-terminal' if ('terminal' in (pp.get('legacyRole') or '') or 'terminal' in (pp.get('legacyClass') or '')) else 'mechanical-connector'; ports.append(pp)
        model={'schemaVersion':'1.0.0','id':pid,'name':p['label'],'nameFa':FA.get(p['label'],p['label']),'translationStatus':'verified-dictionary' if p['label'] in FA else 'pending','domain':d,'version':1,'categories':[{'path':z['category_path'],'pathFa':cat_fa(z['category_path'])} for z in placements],'capabilities':capabilities(fam),'ports':ports,'properties':props,'solver':{'engine':ENGINE[d],'family':fam,'status':'not-applicable' if d=='presentation' else 'contract-defined; implementation-pending','inputs':[z['key'] for z in props if z['role']=='parameter'],'outputs':[z['key'] for z in props if z['role']=='observable'],'contractNotes':'Interface extracted from clean-room legacy research. Numerical equations must be independently specified and verified by golden tests.' if d!='presentation' else 'Presentation/control component; no standalone physics solver.'},'rendering':{'status':'implementation-pending','legacyIconHint':p.get('icon') or None,'interaction':'experiment-authoring-control' if d=='presentation' else 'drag/configure/observe'},'source':{'baseline':'Crocodile Physics 605 clean-room research dataset','legacyClass':lc,'legacyProto':p.get('proto'),'definitionFile':p.get('definition_file'),'inheritanceChain':p.get('inheritance_chain',[]),'paletteOccurrences':len(placements)},'migration':{'dataModel':'generated','solverImplementation':'pending','visualImplementation':'pending','scientificReview':'required','evidenceLevel':'high' if p.get('definition_found') else 'low'}}
        canonical.append(model); (CANON/d/f'{pid}.json').write_text(json.dumps(model,ensure_ascii=False,indent=2),encoding='utf-8')
    registry={'schemaVersion':'1.0.0','canonicalPartCount':len(canonical),'paletteEntryCount':len(palette),'domains':dict(dcount),'parts':[{'id':m['id'],'name':m['name'],'nameFa':m['nameFa'],'domain':m['domain'],'family':m['solver']['family'],'propertyCount':len(m['properties']),'portCount':len(m['ports']),'translationStatus':m['translationStatus']} for m in canonical]}
    (OUT/'registry.json').write_text(json.dumps(registry,ensure_ascii=False,indent=2),encoding='utf-8'); (OUT/'palette.json').write_text(json.dumps({'schemaVersion':'1.0.0','entries':palette},ensure_ascii=False,indent=2),encoding='utf-8'); (OUT/'canonical-parts.json').write_text(json.dumps(canonical,ensure_ascii=False,indent=2),encoding='utf-8')
    summary={'canonicalPartCount':len(canonical),'paletteEntryCount':len(palette),'duplicatePaletteEntries':len(palette)-len(canonical),'domainCounts':dict(dcount),'familyCounts':dict(fcount),'propertyRoleCounts':dict(rcount),'translationPendingCount':len(set(pending)),'translationPending':sorted(set(pending)),'notes':['203 canonical classes are represented by 206 palette placements because Ruler, Protractor and Marker appear in two palettes.','Solver contracts are interface specifications only; numerical behavior requires independent scientific implementation and golden tests.']}
    (OUT/'generation-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8'); print(json.dumps(summary,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
