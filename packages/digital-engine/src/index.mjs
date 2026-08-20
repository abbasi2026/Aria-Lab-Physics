const key=(instanceId,portId)=>`${instanceId}:${portId}`;
const norm=v=>Boolean(Number(v)||v===true||v==='true'||v==='high');

const GATES={
  'circuits.7408':{inputs:2,op:v=>v.every(Boolean)},
  'circuits.7432':{inputs:2,op:v=>v.some(Boolean)},
  'circuits.7404':{inputs:1,op:v=>!v[0]},
  'circuits.7414':{inputs:1,op:v=>!v[0]},
  'circuits.7400':{inputs:2,op:v=>!v.every(Boolean)},
  'circuits.7402':{inputs:2,op:v=>!v.some(Boolean)},
  'circuits.7486':{inputs:2,op:v=>Boolean(v[0])!==Boolean(v[1])},
  'circuits.7410':{inputs:3,op:v=>!v.every(Boolean)},
  'circuits.7420':{inputs:4,op:v=>!v.every(Boolean)}
};
const INPUT_RE=/logic-input|push-button-logic-input/;
const OUTPUT_RE=/logic-output/;
const CLOCK_RE=/\.clock$/;
const SEGMENTS=['a','b','c','d','e','f','g'];
const DIGITS={
  '1111110':0,'0110000':1,'1101101':2,'1111001':3,'0110011':4,
  '1011011':5,'1011111':6,'1110000':7,'1111111':8,'1111011':9
};

export function isDigitalPart(partId=''){
  const id=String(partId).toLowerCase();return Boolean(GATES[id]||INPUT_RE.test(id)||OUTPUT_RE.test(id)||CLOCK_RE.test(id)||id.includes('seven-segment-display'));
}
export function digitalPartKind(partId=''){
  const id=String(partId).toLowerCase();if(GATES[id])return 'gate';if(CLOCK_RE.test(id))return 'clock';if(INPUT_RE.test(id))return 'input';if(OUTPUT_RE.test(id))return 'output';if(id.includes('seven-segment-display'))return 'seven-segment';return null;
}

function unionFind(endpoints,connections){
  const parent=new Map();const find=x=>{if(!parent.has(x))parent.set(x,x);const p=parent.get(x);if(p!==x)parent.set(x,find(p));return parent.get(x)};const union=(a,b)=>{const ra=find(a),rb=find(b);if(ra!==rb)parent.set(rb,ra)};
  endpoints.forEach(find);for(const c of connections??[]){if(!c.from?.instanceId||!c.to?.instanceId||!c.from?.portId||!c.to?.portId)continue;union(key(c.from.instanceId,c.from.portId),key(c.to.instanceId,c.to.portId));}
  return {find};
}

export class DigitalCircuit {
  constructor(scene,{partDefinitions=[]}={}){
    this.scene=structuredClone(scene);this.time=0;this.defs=new Map(partDefinitions.map(d=>[d.id,d]));
    const endpoints=[];for(const p of this.scene.parts??[])for(const port of this.defs.get(p.partId)?.ports??[])endpoints.push(key(p.instanceId,port.id));
    this.uf=unionFind(endpoints,this.scene.connections??[]);this.last={time:0,nets:{},parts:{},conflicts:[]};
  }
  ports(part){return (this.defs.get(part.partId)?.ports??[]).filter(p=>p.kind==='electrical-terminal');}
  net(part,port){return this.uf.find(key(part.instanceId,typeof port==='string'?port:port.id));}
  evaluate(dt=0){this.time+=Number(dt)||0;const parts=this.scene.parts??[],nets={},drives=new Map(),partState={},conflicts=[];
    const drive=(net,value,source)=>{const v=Boolean(value);if(!drives.has(net))drives.set(net,new Map());drives.get(net).set(source,v);};
    for(const part of parts){const id=String(part.partId).toLowerCase(),ports=this.ports(part),p=part.properties??{};if(INPUT_RE.test(id)&&ports[0])drive(this.net(part,ports[0]),norm(p.value??p.on??0),part.instanceId);else if(CLOCK_RE.test(id)&&ports[0]){const f=Math.max(1e-9,Number(p.frequency??1)),d=Math.max(0,Math.min(1,Number(p.dutyCycle??.5))),phase=((this.time*f)%1+1)%1;drive(this.net(part,ports[0]),phase<d,part.instanceId);}}
    const resolve=()=>{conflicts.length=0;for(const [net,map] of drives){const list=[...map.entries()].map(([source,value])=>({source,value}));const vals=new Set(list.map(x=>x.value));if(vals.size>1)conflicts.push({net,sources:list.map(x=>x.source)});nets[net]=list.some(x=>x.value);}};resolve();
    for(let pass=0;pass<Math.max(2,parts.length);pass++){
      let changed=false;
      for(const part of parts){const id=String(part.partId).toLowerCase(),spec=GATES[id];if(!spec)continue;const ports=this.ports(part);if(ports.length<spec.inputs+1)continue;const ins=ports.slice(0,spec.inputs).map(port=>Boolean(nets[this.net(part,port)]));const out=Boolean(spec.op(ins)),outNet=this.net(part,ports[spec.inputs]);const before=nets[outNet];drive(outNet,out,part.instanceId);resolve();if(before!==nets[outNet])changed=true;partState[part.instanceId]={kind:'gate',inputs:ins,output:out};}
      if(!changed)break;
    }
    for(const part of parts){const id=String(part.partId).toLowerCase(),ports=this.ports(part),kind=digitalPartKind(id);if(kind==='input'||kind==='clock'){const value=ports[0]?Boolean(nets[this.net(part,ports[0])]):false;partState[part.instanceId]={kind,value};}
      else if(kind==='output'){const value=ports[0]?Boolean(nets[this.net(part,ports[0])]):false;partState[part.instanceId]={kind,value};}
      else if(kind==='seven-segment'){const seg={};for(const name of SEGMENTS){const port=ports.find(p=>p.id===name);seg[name]=port?Boolean(nets[this.net(part,port)]):false;}const bits=SEGMENTS.map(s=>seg[s]?'1':'0').join('');partState[part.instanceId]={kind,segments:seg,digit:DIGITS[bits]??null};}
    }
    this.last={time:this.time,nets:{...nets},parts:partState,conflicts};return this.last;
  }
  snapshot(){return structuredClone(this.last);}
  measure(probe){const state=this.last.parts?.[probe.instanceId];if(!state)return null;if(probe.quantity==='logic'){const v=state.value??state.output;return typeof v==='boolean'?(v?1:0):null;}if(probe.quantity==='digit')return state.digit;return null;}
}

export const digitalGateSpecs=Object.freeze({...GATES});
