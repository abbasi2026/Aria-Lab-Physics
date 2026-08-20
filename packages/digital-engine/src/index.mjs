const endpointKey=(instanceId,portId)=>`${instanceId}:${portId}`;
const norm=v=>Boolean(Number(v)||v===true||v==='true'||v==='high');
const p=id=>({id,kind:'electrical-terminal'});

const GATES={
  'circuits.7408':{inputs:['t1','t2'],output:'t3',op:v=>v.every(Boolean)},
  'circuits.7432':{inputs:['t1','t2'],output:'t3',op:v=>v.some(Boolean)},
  'circuits.7404':{inputs:['t1'],output:'t2',op:v=>!v[0]},
  'circuits.7414':{inputs:['t1'],output:'t2',op:v=>!v[0]},
  'circuits.7400':{inputs:['t1','t2'],output:'t3',op:v=>!v.every(Boolean)},
  'circuits.7402':{inputs:['t1','t2'],output:'t3',op:v=>!v.some(Boolean)},
  'circuits.7486':{inputs:['t1','t2'],output:'t3',op:v=>Boolean(v[0])!==Boolean(v[1])},
  'circuits.7410':{inputs:['t1','t2','t3'],output:'t4',op:v=>!v.every(Boolean)},
  'circuits.7420':{inputs:['t1','t2','t3','t4'],output:'t5',op:v=>!v.every(Boolean)}
};
const VIRTUAL_PORTS={
  'circuits.7474':['d','clk','set','reset','q','qbar'],
  'circuits.7473':['j','k','clk','reset','q','qbar'],
  'circuits.4027':['j','k','clk','set','reset','q','qbar'],
  'circuits.4043-without-enable':['s','r','q','qbar'],
  'circuits.4017':['clk','reset','q0','q1','q2','q3','q4','q5','q6','q7','q8','q9','carry'],
  'circuits.4518':['clk','reset','b0','b1','b2','b3'],
  'circuits.4026':['clk','reset','a','b','c','d','e','f','g'],
  'circuits.4511':['b0','b1','b2','b3','a','b','c','d','e','f','g'],
  'circuits.4028':['b0','b1','b2','b3','q0','q1','q2','q3','q4','q5','q6','q7','q8','q9']
};
const INPUT_RE=/logic-input|push-button-logic-input/;
const OUTPUT_RE=/logic-output/;
const CLOCK_RE=/\.clock$/;
const SEGMENTS=['a','b','c','d','e','f','g'];
const SEGMENT_BITS={0:'1111110',1:'0110000',2:'1101101',3:'1111001',4:'0110011',5:'1011011',6:'1011111',7:'1110000',8:'1111111',9:'1111011'};
const DIGITS=Object.fromEntries(Object.entries(SEGMENT_BITS).map(([digit,bits])=>[bits,Number(digit)]));
const SEGMENT_STATE=digit=>Object.fromEntries(SEGMENTS.map((s,i)=>[s,(SEGMENT_BITS[((digit%10)+10)%10]??'0000000')[i]==='1']));

export function digitalVirtualPorts(partId=''){return (VIRTUAL_PORTS[String(partId).toLowerCase()]??[]).map(p);}
export function isDigitalPart(partId=''){const id=String(partId).toLowerCase();return Boolean(GATES[id]||VIRTUAL_PORTS[id]||INPUT_RE.test(id)||OUTPUT_RE.test(id)||CLOCK_RE.test(id)||id.includes('seven-segment-display'));}
export function digitalPartKind(partId=''){const id=String(partId).toLowerCase();if(GATES[id])return 'gate';if(CLOCK_RE.test(id))return 'clock';if(INPUT_RE.test(id))return 'input';if(OUTPUT_RE.test(id))return 'output';if(id.includes('seven-segment-display'))return 'seven-segment';if(/7474/.test(id))return 'd-flipflop';if(/7473|4027/.test(id))return 'jk-flipflop';if(/4043/.test(id))return 'rs-latch';if(/4017/.test(id))return 'decade-counter';if(/4518/.test(id))return 'bcd-counter';if(/4026/.test(id))return 'counter-seven-segment';if(/4511/.test(id))return 'bcd-seven-segment';if(/4028/.test(id))return 'bcd-decimal';return null;}

function unionFind(endpoints,connections){const parent=new Map();const find=x=>{if(!parent.has(x))parent.set(x,x);const q=parent.get(x);if(q!==x)parent.set(x,find(q));return parent.get(x)};const union=(a,b)=>{const ra=find(a),rb=find(b);if(ra!==rb)parent.set(rb,ra)};endpoints.forEach(find);for(const c of connections??[]){if(c.from?.instanceId&&c.to?.instanceId&&c.from?.portId&&c.to?.portId)union(endpointKey(c.from.instanceId,c.from.portId),endpointKey(c.to.instanceId,c.to.portId));}return{find};}

export class DigitalCircuit{
  constructor(scene,{partDefinitions=[]}={}){this.scene=structuredClone(scene);this.time=0;this.defs=new Map(partDefinitions.map(d=>[d.id,d]));this.memory=new Map();const endpoints=[];for(const part of this.scene.parts??[])for(const port of this.ports(part))endpoints.push(endpointKey(part.instanceId,port.id));this.uf=unionFind(endpoints,this.scene.connections??[]);this.last={time:0,nets:{},parts:{},conflicts:[]};}
  ports(part){const real=(this.defs.get(part.partId)?.ports??[]).filter(x=>x.kind==='electrical-terminal');return real.length?real:digitalVirtualPorts(part.partId);}
  net(part,portId){return this.uf.find(endpointKey(part.instanceId,typeof portId==='string'?portId:portId.id));}
  #memory(part){if(!this.memory.has(part.instanceId))this.memory.set(part.instanceId,{q:Boolean(part.properties?.initialQ??false),count:Number(part.properties?.initialCount??0)%10,prevClock:false});return this.memory.get(part.instanceId);}
  evaluate(dt=0){this.time+=Number(dt)||0;const parts=this.scene.parts??[],nets={},drives=new Map(),partState={},conflicts=[];
    const drive=(net,value,source)=>{if(!net)return;if(!drives.has(net))drives.set(net,new Map());drives.get(net).set(source,Boolean(value));};
    const resolve=()=>{conflicts.length=0;for(const [net,map] of drives){const list=[...map.entries()];const vals=new Set(list.map(x=>x[1]));if(vals.size>1)conflicts.push({net,sources:list.map(x=>x[0])});nets[net]=list.some(x=>x[1]);}};
    const value=(part,portId)=>Boolean(nets[this.net(part,portId)]);
    const outputMemory=part=>{const id=String(part.partId).toLowerCase(),kind=digitalPartKind(id),m=this.#memory(part);if(kind==='d-flipflop'||kind==='jk-flipflop'||kind==='rs-latch'){drive(this.net(part,'q'),m.q,`${part.instanceId}:q`);drive(this.net(part,'qbar'),!m.q,`${part.instanceId}:qbar`);}else if(kind==='decade-counter'){for(let i=0;i<10;i++)drive(this.net(part,`q${i}`),m.count===i,`${part.instanceId}:q${i}`);drive(this.net(part,'carry'),m.count<5,`${part.instanceId}:carry`);}else if(kind==='bcd-counter'){for(let i=0;i<4;i++)drive(this.net(part,`b${i}`),Boolean(m.count&(1<<i)),`${part.instanceId}:b${i}`);}else if(kind==='counter-seven-segment'){const seg=SEGMENT_STATE(m.count);for(const name of SEGMENTS)drive(this.net(part,name),seg[name],`${part.instanceId}:${name}`);}};
    // Primary sources.
    for(const part of parts){const id=String(part.partId).toLowerCase(),ports=this.ports(part),props=part.properties??{};if(INPUT_RE.test(id)&&ports[0])drive(this.net(part,ports[0]),norm(props.value??props.on??0),part.instanceId);else if(CLOCK_RE.test(id)&&ports[0]){const f=Math.max(1e-9,Number(props.frequency??1)),d=Math.max(0,Math.min(1,Number(props.dutyCycle??.5))),phase=((this.time*f)%1+1)%1;drive(this.net(part,ports[0]),phase<d,part.instanceId);}}
    // Stateful outputs from previous state.
    for(const part of parts)if(['d-flipflop','jk-flipflop','rs-latch','decade-counter','bcd-counter','counter-seven-segment'].includes(digitalPartKind(part.partId)))outputMemory(part);
    resolve();
    const solveCombinational=()=>{for(let pass=0;pass<Math.max(2,parts.length);pass++){let changed=false;for(const part of parts){const id=String(part.partId).toLowerCase(),spec=GATES[id];if(spec){const ins=spec.inputs.map(port=>value(part,port)),out=Boolean(spec.op(ins)),net=this.net(part,spec.output),before=nets[net];drive(net,out,part.instanceId);resolve();if(before!==nets[net])changed=true;partState[part.instanceId]={kind:'gate',inputs:ins,output:out};continue;}const kind=digitalPartKind(id);if(kind==='bcd-seven-segment'||kind==='bcd-decimal'){const digit=[0,1,2,3].reduce((n,i)=>n+(value(part,`b${i}`)?1<<i:0),0);if(kind==='bcd-seven-segment'){const seg=SEGMENT_STATE(digit);for(const name of SEGMENTS){const net=this.net(part,name),before=nets[net];drive(net,seg[name],`${part.instanceId}:${name}`);resolve();if(before!==nets[net])changed=true;}partState[part.instanceId]={kind,digit,segments:seg};}else{for(let i=0;i<10;i++){const net=this.net(part,`q${i}`),before=nets[net];drive(net,digit===i,`${part.instanceId}:q${i}`);resolve();if(before!==nets[net])changed=true;}partState[part.instanceId]={kind,digit};}}}if(!changed)break;}};
    solveCombinational();
    // Update stateful parts from settled inputs.
    let stateChanged=false;
    for(const part of parts){const kind=digitalPartKind(part.partId);if(!['d-flipflop','jk-flipflop','rs-latch','decade-counter','bcd-counter','counter-seven-segment'].includes(kind))continue;const m=this.#memory(part);const oldQ=m.q,oldCount=m.count;
      if(kind==='rs-latch'){const s=value(part,'s'),r=value(part,'r');if(s&&!r)m.q=true;else if(r&&!s)m.q=false;partState[part.instanceId]={kind,q:m.q,invalid:s&&r};}
      else {const reset=value(part,'reset'),set=value(part,'set'),clk=value(part,'clk'),rising=clk&&!m.prevClock;if(reset){m.q=false;m.count=0;}else if(set&&(kind==='d-flipflop'||kind==='jk-flipflop'))m.q=true;else if(rising){if(kind==='d-flipflop')m.q=value(part,'d');else if(kind==='jk-flipflop'){const j=value(part,'j'),k=value(part,'k');if(j&&!k)m.q=true;else if(!j&&k)m.q=false;else if(j&&k)m.q=!m.q;}else m.count=(m.count+1)%10;}m.prevClock=clk;partState[part.instanceId]={kind,q:m.q,count:m.count,rising};}
      if(oldQ!==m.q||oldCount!==m.count)stateChanged=true;outputMemory(part);
    }
    if(stateChanged){resolve();solveCombinational();}
    // Visible sink/source state.
    for(const part of parts){const id=String(part.partId).toLowerCase(),ports=this.ports(part),kind=digitalPartKind(id);if(kind==='input'||kind==='clock'){partState[part.instanceId]={kind,value:ports[0]?value(part,ports[0]):false};}else if(kind==='output'){partState[part.instanceId]={kind,value:ports[0]?value(part,ports[0]):false};}else if(kind==='seven-segment'){const seg={};for(const name of SEGMENTS){const port=ports.find(x=>x.id===name);seg[name]=port?value(part,port.id):false;}const bits=SEGMENTS.map(s=>seg[s]?'1':'0').join('');partState[part.instanceId]={kind,segments:seg,digit:DIGITS[bits]??null};}else if(['d-flipflop','jk-flipflop','rs-latch'].includes(kind)){const m=this.#memory(part);partState[part.instanceId]={...(partState[part.instanceId]??{}),kind,q:m.q,qbar:!m.q};}else if(['decade-counter','bcd-counter','counter-seven-segment'].includes(kind)){const m=this.#memory(part);partState[part.instanceId]={...(partState[part.instanceId]??{}),kind,count:m.count,digit:m.count};}}
    this.last={time:this.time,nets:{...nets},parts:partState,conflicts:[...conflicts],memory:Object.fromEntries([...this.memory].map(([id,m])=>[id,{...m}]))};return this.last;}
  restoreMemory(memory={}){for(const [id,m] of Object.entries(memory??{}))this.memory.set(id,{q:Boolean(m.q),count:Number(m.count??0)%10,prevClock:Boolean(m.prevClock)});return this;}
  setPartProperties(instanceId,patch={}){const part=this.scene.parts?.find(x=>x.instanceId===instanceId);if(!part)return false;part.properties={...(part.properties??{}),...structuredClone(patch)};return true;}
  snapshot(){return structuredClone(this.last);}
  measure(probe){const state=this.last.parts?.[probe.instanceId];if(!state)return null;if(probe.quantity==='logic'){const v=state.value??state.output??state.q;return typeof v==='boolean'?(v?1:0):null;}if(probe.quantity==='digit')return Number.isInteger(state.digit)?state.digit:null;if(probe.quantity==='count')return Number.isInteger(state.count)?state.count:null;return null;}
}
export const digitalGateSpecs=Object.freeze({...GATES});
