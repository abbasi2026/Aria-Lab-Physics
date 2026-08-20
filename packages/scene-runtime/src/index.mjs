import { SimulationClock } from '../../physics-core/src/clock.mjs';
import { World2D } from '../../mechanics-engine/src/world2d.mjs';
import { CircuitNetwork } from '../../circuits-engine/src/mna.mjs';
import { TransientCircuit } from '../../circuits-engine/src/transient.mjs';
import { RayScene } from '../../optics-engine/src/ray-scene.mjs';
import { WaveGrid2D } from '../../waves-engine/src/wave-grid.mjs';
import { ProbeRecorder } from '../../measurement-engine/src/index.mjs';
import { DigitalCircuit } from '../../digital-engine/src/index.mjs';

const clone = value => structuredClone(value);
const alias = id => String(id).toLowerCase();
const isCircuitSwitchId = id => /spst|spdt|dpst|dpdt|pushmake|pushbreak|floatswitch|microswitch|switch/i.test(id);
const isOpticalSourceId = id => /(?:raybox|ray-box|ray-source|torch|optics\.lamp)$/i.test(id);
const isOpticalScreenId = id => /(?:screen|projection)$/i.test(id);

export class SceneRuntime {
  constructor(scene, { maxSamples = 5000, partDefinitions = [] } = {}) {
    this.original = clone(scene);
    this.scene = clone(scene);
    this.clock = new SimulationClock({ dt: scene.simulation?.dt ?? 1 / 120 });
    this.recorder = new ProbeRecorder({ maxSamples });
    this.status = 'paused';
    this.frame = null;
    this.partDefinitions = partDefinitions;
    this.adapter = createDomainAdapter(this.scene, { partDefinitions });
    this.listeners = new Set();
  }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(type) { for (const fn of this.listeners) fn({ type, status: this.status, time: this.clock.time, frame: this.snapshot() }); }
  play() { this.status = 'running'; this.emit('play'); }
  pause() { this.status = 'paused'; this.emit('pause'); }
  toggle() { this.status === 'running' ? this.pause() : this.play(); }
  step(count = 1) {
    for (let i = 0; i < count; i++) {
      this.frame = this.adapter.step(this.clock.dt, this.clock.time);
      this.clock.step();
      this.#recordProbes();
    }
    this.emit('step'); return this.snapshot();
  }
  tick() { if (this.status === 'running') return this.step(1); return this.snapshot(); }
  setPartProperties(instanceId, patch = {}) { const part=this.scene.parts?.find(x=>x.instanceId===instanceId); if(!part)return false; part.properties={...(part.properties??{}),...clone(patch)}; this.adapter.setPartProperties?.(instanceId,patch); return true; }
  reset(scene = this.original) {
    this.scene = clone(scene); this.original = clone(scene); this.clock = new SimulationClock({ dt: scene.simulation?.dt ?? 1 / 120 }); this.recorder.clear(); this.adapter = createDomainAdapter(this.scene, { partDefinitions: this.partDefinitions }); this.frame = null; this.status = 'paused'; this.emit('reset');
  }
  snapshot() { return { time: this.clock.time, status: this.status, domain: this.scene.domain, state: clone(this.frame ?? this.adapter.snapshot()) }; }
  #recordProbes() {
    for (const probe of this.scene.probes ?? []) {
      const value = this.adapter.measure(probe);
      if (Number.isFinite(value)) this.recorder.record(probe.id ?? probe.quantity, this.clock.time, value);
    }
  }
}

function createDomainAdapter(scene, options = {}) {
  if (scene.domain === 'mechanics') return mechanicsAdapter(scene);
  if (scene.domain === 'circuits' && scene.simulation?.circuitMode === 'digital') return digitalAdapter(scene, options);
  if (scene.domain === 'circuits') return circuitsAdapter(scene, options);
  if (scene.domain === 'optics') return opticsAdapter(scene);
  if (scene.domain === 'waves') return wavesAdapter(scene);
  return genericAdapter(scene);
}

function genericAdapter(scene) {
  let snapshot = { parts: clone(scene.parts) };
  return { step: () => snapshot, snapshot: () => snapshot, measure: () => null };
}

function mechanicsAdapter(scene) {
  const sim = scene.simulation ?? {};
  const world = new World2D({ gravity: sim.gravity ?? { x: 0, y: -9.81 }, dt: sim.dt ?? 1 / 120, floorY: sim.floorY ?? null });
  const drives = new Map();
  for (const part of scene.parts) {
    const id = alias(part.partId); const p = part.properties ?? {}; const position = part.transform.position;
    const common = { id: part.instanceId, mass: p.mass ?? 1, position, velocity: { x: p.velocityX ?? 0, y: p.velocityY ?? 0 }, restitution: p.restitution ?? p.elasticity ?? 0.6, friction: p.friction ?? p['kinetic-friction'] ?? 0.2, staticBody: p.staticBody ?? false, angle: (part.transform.rotation ?? p.angle ?? 0) * Math.PI / 180, angularVelocity: p.angularVelocity ?? 0 };
    let body = null;
    if (id.includes('ball')) body = world.addBody({ ...common, shape: { type: 'circle', radius: p.radius ?? 0.5 } });
    else if (id.includes('block') || id.includes('ground')) body = world.addBody({ ...common, shape: { type: 'box', width: p.width ?? 1, height: p.height ?? 1 }, staticBody: id.includes('ground') || p.staticBody === true });
    if (body) drives.set(body.id, { forceX: Number(p.forceX ?? 0), forceY: Number(p.forceY ?? 0), torque: Number(p.torque ?? 0) });
  }
  for (const c of scene.connections ?? []) if (c.kind === 'mechanical') {
    if (c.properties?.type === 'spring') world.addSpring({ id: c.id, a: c.from.instanceId, b: c.to.instanceId, restLength: c.properties.restLength ?? 1, stiffness: c.properties.stiffness ?? 10, damping: c.properties.damping ?? 0.2 });
    else if (c.properties?.type === 'distance-joint') world.addDistanceJoint({ id: c.id, a: c.from.instanceId, b: c.to?.instanceId ?? null, anchor: c.properties.anchor ?? null, length: c.properties.length ?? c.properties.restLength ?? 1, stiffness: c.properties.stiffness ?? 1 });
  }
  const state = () => ({ bodies: world.snapshot() });
  return {
    step: dt => { for (const body of world.bodies) { const drive=drives.get(body.id); if(!drive)continue; if(drive.forceX||drive.forceY)body.applyForce({x:drive.forceX,y:drive.forceY}); if(drive.torque)body.applyTorque(drive.torque); } world.step(dt); return state(); }, snapshot: state,
    measure(probe) { const body = world.bodies.find(b => b.id === probe.instanceId); if (!body) return null; if (probe.quantity === 'position-x') return body.position.x; if (probe.quantity === 'position-y') return body.position.y; if (probe.quantity === 'velocity-x') return body.velocity.x; if (probe.quantity === 'velocity-y') return body.velocity.y; if (probe.quantity === 'speed') return Math.hypot(body.velocity.x, body.velocity.y); if (probe.quantity === 'momentum') return Number.isFinite(body.mass) ? body.mass * Math.hypot(body.velocity.x, body.velocity.y) : null; if (probe.quantity === 'angle') return body.angle; if (probe.quantity === 'angular-velocity') return body.angularVelocity; return null; }
  };
}
function logicalPorts(definition) {
  const ports = definition?.ports ?? [];
  const seen = new Set(), out = [];
  for (const port of ports) {
    if (port.kind !== 'electrical-terminal') continue;
    const role = String(port.legacyRole ?? port.id).split(',').map(x => x.trim()).filter(Boolean).sort().join(',');
    if (seen.has(role)) continue; seen.add(role); out.push(port);
  }
  return out;
}


function digitalAdapter(scene,{partDefinitions=[]}={}){
  const circuit=new DigitalCircuit(scene,{partDefinitions});
  let result=circuit.snapshot();
  return {
    step:dt=>{result=circuit.evaluate(dt);return result;},
    snapshot:()=>result,
    measure:probe=>circuit.measure(probe),
    restoreMemory:memory=>{circuit.restoreMemory(memory);result=circuit.snapshot();},
    setPartProperties:(instanceId,patch)=>circuit.setPartProperties(instanceId,patch)
  };
}

function circuitsAdapter(scene, { partDefinitions = [] } = {}) {
  let result = { nodeVoltages: { 0: 0 }, branchCurrents: {}, partNodes: {} };
  const defs = new Map(partDefinitions.map(d => [d.id, d]));
  const parent = new Map();
  const key = (instanceId, portId) => `${instanceId}:${portId}`;
  const find = x => { if (!parent.has(x)) parent.set(x, x); const p = parent.get(x); if (p !== x) parent.set(x, find(p)); return parent.get(x); };
  const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(rb, ra); };
  for (const part of scene.parts) for (const port of logicalPorts(defs.get(part.partId))) find(key(part.instanceId, port.id));
  for (const c of scene.connections ?? []) if (c.kind === 'electrical' && c.from.portId && c.to.portId) union(key(c.from.instanceId, c.from.portId), key(c.to.instanceId, c.to.portId));
  let groundRoot = null;
  for (const part of scene.parts) {
    const id = alias(part.partId), ports = logicalPorts(defs.get(part.partId));
    if (id.includes('battery') || id.includes('voltage-source') || id.includes('vslide')) {
      const neg = ports.find(p => /negative|minus|t2/i.test(p.id)) ?? ports[1]; if (neg) { groundRoot = find(key(part.instanceId, neg.id)); break; }
    }
  }
  const roots = [...new Set([...parent.keys()].map(find))]; if (!groundRoot && roots.length) groundRoot = roots[0];
  const nodeNames = new Map(); let nodeCounter = 1; if (groundRoot) nodeNames.set(groundRoot, '0');
  for (const root of roots) if (!nodeNames.has(root)) nodeNames.set(root, `n${nodeCounter++}`);
  const nodeFor = (part, index, fallback) => { const explicit = part.properties?.[fallback]; if (explicit !== undefined && explicit !== null && explicit !== '') return String(explicit); const ports = logicalPorts(defs.get(part.partId)); const port = ports[index]; return port ? nodeNames.get(find(key(part.instanceId, port.id))) : null; };
  const partNodes = {};
  for (const part of scene.parts) { const p=part.properties??{}; partNodes[part.instanceId]={ a:nodeFor(part,0,'nodeA')??p.from??'0', b:nodeFor(part,1,'nodeB')??p.to??part.instanceId }; }
  const isLed=id=>/(?:^|[-.])(red|green|yellow)?-?led(?:$|-)/i.test(id)||/\.led$/i.test(id);
  const isVariableResistor=id=>/vresistor|potentiometer|ldr|thermistor/i.test(id);
  const isLoad=id=>/motor|buzzer|loudspeaker/i.test(id);
  const isFuse=id=>/fuse/i.test(id);
  const sourceVoltage=(id,p,time=0)=>{
    if(/vpulse|clock/.test(id)){const low=Number(p.lowVoltage??p.low??0),high=Number(p.highVoltage??p.high??p.voltage??5),frequency=Math.max(1e-9,Number(p.frequency??1)),duty=Math.max(0,Math.min(1,Number(p.dutyCycle??p.duty??.5)));return ((time*frequency)%1)<duty?high:low;}
    return Number(p.voltage??p.value??(id.includes('9v')?9:6));
  };
  const resistanceFor=(id,p)=>{
    if(/ammeter/.test(id))return Number(p.resistance??1e-6); if(/voltmeter/.test(id))return Number(p.resistance??1e9);
    if(/lamp/.test(id))return Number(p.resistance??30); if(/motor/.test(id))return Number(p.resistance??30); if(/buzzer/.test(id))return Number(p.resistance??60); if(/loudspeaker/.test(id))return Number(p.resistance??8); if(isFuse(id))return Number(p.resistance??.02);
    if(/ldr/.test(id)){const light=Math.max(0,Math.min(1,Number(p.lightLevel??p.light??.5)));return Number(p.resistance??(1e5/(1+99*light)));}
    if(/thermistor/.test(id)){const r0=Number(p.r0??p.resistanceAt25??1000),beta=Number(p.beta??3500),tempC=Number(p.temperature??25),t=tempC+273.15,t0=298.15;return Number(p.resistance??r0*Math.exp(beta*(1/t-1/t0)));}
    return Math.max(1e-9,Number(p.resistance??p.value??p.maxResistance??1000));
  };
  const dynamic = scene.parts.some(part => /capacitor|inductor|diode|led|zener/i.test(part.partId));
  const fuseRatings=new Map(scene.parts.filter(p=>isFuse(alias(p.partId))).map(p=>[p.instanceId,Number(p.properties?.rating??p.properties?.maxCurrent??1)]));
  const blownFuses=new Set();
  const decorate=r=>({ ...r, partNodes, blownFuses:[...blownFuses] });

  if (dynamic) {
    const transient = new TransientCircuit({ dt: scene.simulation?.dt ?? 1e-4 });
    for (const part of scene.parts) {
      const id=alias(part.partId),p=part.properties??{}, {a,b}=partNodes[part.instanceId];
      if (isLed(id)) transient.led(part.instanceId,a,b,{forwardVoltage:Number(p.forwardVoltage??(id.includes('green')?2.2:id.includes('yellow')?2.0:1.9)),onResistance:Number(p.onResistance??20),offResistance:Number(p.offResistance??1e9)});
      else if (id.includes('resistor')||isVariableResistor(id)||isLoad(id)||isFuse(id)) transient.resistor(part.instanceId,a,b,resistanceFor(id,p));
      else if (id.includes('battery')||id.includes('voltage-source')||id.includes('vslide')||id.includes('vpulse')||id.endsWith('.clock')) transient.voltageSource(part.instanceId,a,b,time=>sourceVoltage(id,p,time));
      else if (id.includes('current-source')||id.endsWith('.current')) transient.currentSource(part.instanceId,a,b,Number(p.current??.001));
      else if (id.includes('capacitor')) { const capacitance=Number(p.capacitance??1e-6),initialVoltage=Number(p.initialVoltage??(Number.isFinite(Number(p.charge))?Number(p.charge)/capacitance:0));transient.capacitor(part.instanceId,a,b,capacitance,{initialVoltage}); }
      else if (id.includes('inductor')) transient.inductor(part.instanceId,a,b,Number(p.inductance??1e-3),{initialCurrent:Number(p.initialCurrent??0)});
      else if (id.includes('diode')||id.includes('zener')) transient.diode(part.instanceId,a,b,{saturationCurrent:Number(p.saturationCurrent??1e-12),ideality:Number(p.ideality??1),thermalVoltage:Number(p.thermalVoltage??.02585)});
      else if (isCircuitSwitchId(id)) transient.resistor(part.instanceId,a,b,(p.closed??p.on??!id.includes('pushbreak'))?1e-9:1e15);
      else if (id.includes('ammeter')||id.includes('voltmeter')) transient.resistor(part.instanceId,a,b,resistanceFor(id,p));
    }
    return {
      step: dt => {
        result=decorate(transient.step(dt));
        for(const [id,rating] of fuseRatings){
          if(!blownFuses.has(id) && Math.abs(result.branchCurrents?.[id]??0)>rating){
            blownFuses.add(id);
            const component=transient.components.find(c=>c.id===id && c.type==='resistor');
            if(component) component.resistance=1e15;
          }
        }
        return decorate(result);
      },
      snapshot: () => decorate(result),
      measure: probe => measureCircuitProbe(probe,result,partNodes)
    };
  }

  const solve = () => {
    const net=new CircuitNetwork();
    for(const part of scene.parts){
      const id=alias(part.partId),p=part.properties??{}, {a,b}=partNodes[part.instanceId];
      if(id.includes('resistor')||isVariableResistor(id)||isLoad(id)||isFuse(id))net.resistor(part.instanceId,a,b,blownFuses.has(part.instanceId)?1e15:resistanceFor(id,p));
      else if(id.includes('battery')||id.includes('voltage-source')||id.includes('vslide')||id.includes('vpulse')||id.endsWith('.clock'))net.voltageSource(part.instanceId,a,b,sourceVoltage(id,p,0));
      else if(id.includes('current-source')||id.endsWith('.current'))net.currentSource(part.instanceId,a,b,Number(p.current??.001));
      else if(isCircuitSwitchId(id))net.switch(part.instanceId,a,b,p.closed??p.on??!id.includes('pushbreak'));
      else if(/lamp/.test(id))net.lamp(part.instanceId,a,b,{resistance:resistanceFor(id,p)});
      else if(/ammeter/.test(id)||/voltmeter/.test(id))net.resistor(part.instanceId,a,b,resistanceFor(id,p));
    }
    let solved=net.solveDC();
    let changed=false;for(const [id,rating] of fuseRatings){if(!blownFuses.has(id)&&Math.abs(solved.branchCurrents?.[id]??0)>rating){blownFuses.add(id);changed=true;}}
    if(changed)return solve();
    result=decorate(solved);return result;
  };
  try{solve();}catch(error){result=decorate({error:error.message,nodeVoltages:{0:0},branchCurrents:{}});}
  return {step:()=>{try{return solve();}catch(error){return result=decorate({error:error.message,nodeVoltages:{0:0},branchCurrents:{}});}},snapshot:()=>decorate(result),measure:probe=>measureCircuitProbe(probe,result,partNodes)};
}
function measureCircuitProbe(probe,result,partNodes){
  if(probe.quantity==='current')return result.branchCurrents?.[probe.instanceId]??null;
  if(probe.quantity==='voltage'){
    if(probe.node!==undefined)return result.nodeVoltages?.[probe.node]??null;
    const nodes=partNodes[probe.instanceId];if(nodes)return (result.nodeVoltages?.[nodes.a]??0)-(result.nodeVoltages?.[nodes.b]??0);
    return null;
  }
  if(probe.quantity==='fuse-blown')return (result.blownFuses??[]).includes(probe.instanceId)?1:0;
  return null;
}

function segmentFromPart(part, defaultLength = 4) {
  const p = part.properties ?? {}; const length = Number(p.length ?? p.height ?? defaultLength); const angle = (part.transform.rotation ?? 0) * Math.PI / 180; const dx = Math.cos(angle) * length / 2, dy = Math.sin(angle) * length / 2; const c = part.transform.position;
  return [{ x: c.x - dx, y: c.y - dy }, { x: c.x + dx, y: c.y + dy }];
}
function opticsAdapter(scene) {
  const rayScene = new RayScene(); const sources = []; let rays = [], focus = null;
  const rotatePoint=(point,part)=>{const a=(part.transform.rotation??0)*Math.PI/180,c=Math.cos(a),si=Math.sin(a),x=point.x*c-point.y*si,y=point.x*si+point.y*c;return{x:x+part.transform.position.x,y:y+part.transform.position.y};};
  const rectPoints=(part,w=2,h=3)=>[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]].map(([x,y])=>rotatePoint({x,y},part));
  const trianglePoints=(part,w=2.4,h=2.2)=>[[ -w/2,-h/2],[ w/2,-h/2],[0,h/2]].map(([x,y])=>rotatePoint({x,y},part));
  for (const part of scene.parts) {
    const id = alias(part.partId); const p = part.properties ?? {};
    if (isOpticalSourceId(id) || id.includes('nearaxisobject') || id.includes('faraxisobject')) {
      const angle = Number.isFinite(Number(p.angleDeg)) ? Number(p.angleDeg) * Math.PI / 180 : ((part.transform.rotation??0)*Math.PI/180 || Math.atan2(Number(p.directionY ?? 0), Number(p.directionX ?? 1)));
      const base = { x: Math.cos(angle), y: Math.sin(angle) };
      const isFar=id.includes('faraxisobject'), isNear=id.includes('nearaxisobject');
      const count = Math.max(1, Math.min(nineOr(p.rayCount, id.includes('raybox') || id.includes('torch') || isFar ? 5 : 3), 11));
      const height = Number(p.beamHeight ?? (isNear?0:2));
      const spread = Number(p.spreadDeg ?? (id.includes('lamp')||isNear ? 24 : 0)) * Math.PI / 180;
      sources.push({ partId: part.instanceId, origin: { ...part.transform.position }, base, count, height, spread });
    }
    else if (id.includes('concavemirror') || id.includes('convexmirror')) {
      const f=Math.abs(Number(p.focalLength??p.flength??2)),radius=Math.max(.2,2*f),concave=id.includes('concave');const center={x:part.transform.position.x+(concave?-radius:radius),y:part.transform.position.y};rayScene.addSphericalMirrorArc(part.instanceId,{center,radius,axis:{x:concave?1:-1,y:0}});
    }
    else if (id.includes('parabolicmirror')) rayScene.addParabolicMirror(part.instanceId,{vertex:{...part.transform.position},focalLength:Number(p.focalLength??p.flength??2),height:Number(p.height??4),direction:1});
    else if (id.includes('spherical-mirror')) rayScene.addSphericalMirror(part.instanceId, { center: { ...part.transform.position }, radius: Number(p.radius ?? 1) });
    else if (id.includes('spherical-interface') || id.includes('glass-sphere')) rayScene.addSphericalInterface(part.instanceId, { center: { ...part.transform.position }, radius: Number(p.radius ?? 1), nInside: Number(p.nInside ?? p.refractiveIndex ?? 1.5), nOutside: Number(p.nOutside ?? 1) });
    else if (id.includes('planemirror') || (id.includes('mirror')&&!id.includes('parabolic'))) { const [a, b] = segmentFromPart(part); rayScene.addMirror(part.instanceId, a, b); }
    else if (isOpticalScreenId(id)) { const [a, b] = segmentFromPart(part,Number(p.length??4)); rayScene.addScreen(part.instanceId, a, b); }
    else if (id.includes('adjustableslit')) { const gap=Math.max(.05,Number(p.gap??p.slitWidth??.7)),height=Math.max(gap+.2,Number(p.height??4)),x=part.transform.position.x,y=part.transform.position.y;rayScene.addAbsorber(part.instanceId,{x,y:y-height/2},{x,y:y-gap/2});rayScene.addAbsorber(part.instanceId,{x,y:y+gap/2},{x,y:y+height/2}); }
    else if (id.includes('opaqueball')) rayScene.addCircularAbsorber(part.instanceId,{center:{...part.transform.position},radius:Number(p.radius??.8)});
    else if (id.includes('opaqueblock')) rayScene.addOpaquePolygon(part.instanceId,rectPoints(part,Number(p.width??1.5),Number(p.height??2.4)));
    else if (id.includes('opaquetriangle')) rayScene.addOpaquePolygon(part.instanceId,trianglePoints(part,Number(p.width??2.2),Number(p.height??2.2)));
    else if (id.includes('transparentblock')) rayScene.addPolygonInterface(part.instanceId,rectPoints(part,Number(p.width??1.7),Number(p.height??2.8)),{nInside:Number(p.refractiveIndex??p.refindex??1.5),nOutside:Number(p.nOutside??1)});
    else if (id.includes('prism')) rayScene.addPolygonInterface(part.instanceId,trianglePoints(part,Number(p.width??2.4),Number(p.height??2.2)),{nInside:Number(p.refractiveIndex??p.refindex??1.6),nOutside:Number(p.nOutside??1)});
    else if (id.includes('semicircularblock')) rayScene.addSemicircularInterface(part.instanceId,{center:{...part.transform.position},radius:Number(p.radius??1.5),axis:{x:Math.cos((part.transform.rotation??0)*Math.PI/180),y:Math.sin((part.transform.rotation??0)*Math.PI/180)},nInside:Number(p.refractiveIndex??p.refindex??1.5),nOutside:Number(p.nOutside??1)});
    else if (id.includes('eye')) { const f=Number(p.focalLength??1.2),h=Number(p.height??2);rayScene.addThinLens(`${part.instanceId}:lens`,{x:part.transform.position.x,yMin:part.transform.position.y-h/2,yMax:part.transform.position.y+h/2,focalLength:f});rayScene.addScreen(`${part.instanceId}:retina`,{x:part.transform.position.x+f,y:part.transform.position.y-h/2},{x:part.transform.position.x+f,y:part.transform.position.y+h/2}); }
    else if (id.includes('interface')) { const [a, b] = segmentFromPart(part); rayScene.addInterface(part.instanceId, a, b, { nLeft: Number(p.nLeft ?? p.refractiveIndex1 ?? 1), nRight: Number(p.nRight ?? p.refractiveIndex ?? 1.5) }); }
    else if (id.includes('lens')) {
      const fallbackF = id.includes('concave') ? -2 : 2;
      rayScene.addThinLens(part.instanceId, { x: part.transform.position.x, yMin: part.transform.position.y - Number(p.height ?? 4) / 2, yMax: part.transform.position.y + Number(p.height ?? 4) / 2, focalLength: Number(p.focalLength ?? p.flength ?? p['focal-length'] ?? fallbackF) });
    }
  }
  const trace = () => {
    rays = [];
    for (const source of sources) {
      for (let i = 0; i < source.count; i++) {
        const t = source.count === 1 ? 0 : i / (source.count - 1) - 0.5;
        const offset = t * source.height;
        const normal = { x: -source.base.y, y: source.base.x };
        const theta = t * source.spread;
        const ca = Math.cos(theta), sa = Math.sin(theta);
        const direction = { x: source.base.x * ca - source.base.y * sa, y: source.base.x * sa + source.base.y * ca };
        const origin = { x: source.origin.x + normal.x * offset, y: source.origin.y + normal.y * offset };
        const traced = rayScene.trace({ origin, direction }, { maxInteractions: 30 });
        rays.push({ sourceId: source.partId, path: traced.path, finalRay: traced.finalRay });
      }
    }
    focus = estimateRayFocus(rays);
    return { path: rays[0]?.path ?? [], rays, focus };
  };
  trace();
  return {
    step: trace,
    snapshot: () => ({ path: rays[0]?.path ?? [], rays, focus }),
    measure(probe) {
      if (probe.quantity === 'interaction-count') return Math.max(0, (rays[0]?.path?.length ?? 1) - 1);
      if (probe.quantity === 'focus-x') return focus?.x ?? null;
      if (probe.quantity === 'focus-y') return focus?.y ?? null;
      if (probe.quantity === 'screen-hits') return rays.reduce((n,r)=>n+(r.path?.some(p=>p.event==='screen')?1:0),0);
      if (probe.quantity === 'absorbed-rays') return rays.reduce((n,r)=>n+(r.path?.some(p=>p.event==='absorber'||p.event==='circularAbsorber')?1:0),0);
      return null;
    }
  };
}
function nineOr(value, fallback){ const n=Number(value); return Number.isFinite(n)?Math.round(n):fallback; }
function estimateRayFocus(rays){
  const valid = rays.map(r=>r.finalRay).filter(r=>r?.origin&&r?.direction&&Math.abs(r.direction.x)>1e-9);
  if(valid.length<2)return null;
  const points=[];
  for(let i=0;i<valid.length;i++) for(let j=i+1;j<valid.length;j++){
    const a=valid[i],b=valid[j]; const det=a.direction.x*b.direction.y-a.direction.y*b.direction.x;
    if(Math.abs(det)<1e-8)continue;
    const dx=b.origin.x-a.origin.x,dy=b.origin.y-a.origin.y;
    const t=(dx*b.direction.y-dy*b.direction.x)/det;
    if(t<=1e-6)continue;
    const x=a.origin.x+t*a.direction.x,y=a.origin.y+t*a.direction.y;
    if(Number.isFinite(x)&&Number.isFinite(y)&&Math.abs(x)<1e4&&Math.abs(y)<1e4)points.push({x,y});
  }
  if(!points.length)return null;
  points.sort((a,b)=>a.x-b.x); const mid=points[Math.floor(points.length/2)];
  return {x:mid.x,y:mid.y,samples:points.length};
}

function wavesAdapter(scene) {
  const space = scene.parts.find(p => alias(p.partId).includes('space')) ?? scene.parts[0]; const p = space?.properties ?? {}; const sim = scene.simulation ?? {};
  const width = Math.max(3, Math.round(Number(p.width ?? 41))), height = Math.max(3, Math.round(Number(p.height ?? 31))), dx = Number(p.dx ?? 1), waveSpeed = Number(sim.waveSpeed ?? p.waveSpeed ?? 1); const dt = Number(sim.dt ?? 0.25);
  const rawMap = Array.isArray(p.waveSpeedMap) ? p.waveSpeedMap : null;
  const grid = new WaveGrid2D({ width, height, dx, dt, waveSpeed, waveSpeedMap: rawMap, damping: Number(p.damping ?? 0.002), boundary: p.boundary ?? 'fixed', absorbingLayers: Number(p.absorbingLayers ?? 0), absorbingStrength: Number(p.absorbingStrength ?? 0.2) });
  for (const part of scene.parts) {
    const id=alias(part.partId), q=part.properties??{};
    if(id.includes('medium-region')) grid.setWaveSpeedRegion({x0:Math.round(q.x0??part.transform.position.x),y0:Math.round(q.y0??part.transform.position.y),x1:Math.round(q.x1??((q.x0??part.transform.position.x)+(q.width??1))),y1:Math.round(q.y1??((q.y0??part.transform.position.y)+(q.height??1))),waveSpeed:Number(q.waveSpeed??waveSpeed)});
    if(id.includes('obstacle')) { const cx=Math.round(part.transform.position.x),cy=Math.round(part.transform.position.y),rw=Math.max(1,Math.round(q.width??1)),rh=Math.max(1,Math.round(q.height??1)); for(let y=cy-Math.floor(rh/2);y<=cy+Math.floor((rh-1)/2);y++)for(let x=cx-Math.floor(rw/2);x<=cx+Math.floor((rw-1)/2);x++)if(x>=0&&x<width&&y>=0&&y<height)grid.addObstacle(x,y); }
  }
  const sources = scene.parts.filter(x => alias(x.partId).includes('source')).map(source => ({ x: Math.max(1, Math.min(width - 2, Math.round(source.transform.position.x))), y: Math.max(1, Math.min(height - 2, Math.round(source.transform.position.y))), amplitude: Number(source.properties?.amplitude ?? 1), frequency: Number(source.properties?.frequency ?? 1) }));
  const step = () => { grid.step({ sources: sources.map(s => ({ x: s.x, y: s.y, value: t => s.amplitude * Math.sin(2 * Math.PI * s.frequency * t) })) }); return snapshot(); };
  const snapshot = () => ({ width, height, time: grid.time, values: Array.from(grid.current), energy: grid.energy() });
  return { step, snapshot, measure(probe) { if (probe.quantity === 'energy') return grid.energy(); if (probe.quantity !== 'displacement') return null; const x = Math.max(0, Math.min(width - 1, Math.round(probe.x ?? width / 2))), y = Math.max(0, Math.min(height - 1, Math.round(probe.y ?? height / 2))); return grid.sample(x, y); } };
}

