import assert from 'node:assert/strict';
import { nearlyEqual } from '../../../packages/physics-core/src/index.mjs';
import { CircuitNetwork } from '../../../packages/circuits-engine/src/index.mjs';
import { World2D } from '../../../packages/mechanics-engine/src/index.mjs';
import { RayScene, reflect, refract } from '../../../packages/optics-engine/src/index.mjs';
import { WaveGrid1D, WaveGrid2D } from '../../../packages/waves-engine/src/index.mjs';

function close(actual, expected, tolerance=1e-8, label='') { assert.ok(nearlyEqual(actual, expected, tolerance), `${label}: expected ${expected}, got ${actual}`); }
let passed=0; const test=(name,fn)=>{fn();passed++;console.log(`PASS ${name}`);};

test('MNA voltage divider',()=>{
  const c=new CircuitNetwork().voltageSource('V1','vin',0,10).resistor('R1','vin','mid',1000).resistor('R2','mid',0,1000);
  const s=c.solveDC(); close(s.nodeVoltages.vin,10,1e-10); close(s.nodeVoltages.mid,5,1e-10); close(s.branchCurrents.R1,0.005,1e-10); close(s.branchCurrents.R2,0.005,1e-10); close(s.voltageSourceCurrents.V1,-0.005,1e-10);
});

test('MNA current source',()=>{
  const c=new CircuitNetwork().currentSource('I1',0,'n',0.002).resistor('R','n',0,1000); const s=c.solveDC(); close(s.nodeVoltages.n,2,1e-10); close(s.branchCurrents.R,0.002,1e-10);
});

test('MNA floating circuit guard',()=>{
  const c=new CircuitNetwork().resistor('R','a','b',1000); assert.throws(()=>c.solveDC(),/singular|floating/i);
});

test('MNA switch states',()=>{
  const closed=new CircuitNetwork().voltageSource('V','v',0,5).switch('S','v','n',true,{onResistance:1}).resistor('R','n',0,1000).solveDC();
  assert.ok(closed.nodeVoltages.n>4.99);
  const open=new CircuitNetwork().voltageSource('V','v',0,5).switch('S','v','n',false,{offResistance:1e12}).resistor('R','n',0,1000).solveDC();
  assert.ok(open.nodeVoltages.n<1e-6);
});

test('Mechanics 2D gravity',()=>{
  const w=new World2D({gravity:{x:0,y:-10},dt:0.01}); const b=w.addBody({id:'ball',mass:2,position:{x:0,y:10},velocity:{x:0,y:0},shape:{type:'circle',radius:0.5}}); w.runFor(1); close(b.velocity.y,-10,1e-9); close(b.position.y,4.95,1e-9);
});

test('Mechanics 2D elastic circle collision',()=>{
  const w=new World2D({gravity:{x:0,y:0},dt:0.01}); const a=w.addBody({id:'a',mass:1,position:{x:-0.49,y:0},velocity:{x:1,y:0},shape:{type:'circle',radius:0.5},restitution:1,friction:0}); const b=w.addBody({id:'b',mass:1,position:{x:0.49,y:0},velocity:{x:-1,y:0},shape:{type:'circle',radius:0.5},restitution:1,friction:0}); w.step(0.001); close(a.velocity.x,-1,1e-9); close(b.velocity.x,1,1e-9);
});

test('Mechanics spring to anchor',()=>{
  const w=new World2D({gravity:{x:0,y:0},dt:0.1}); const b=w.addBody({id:'b',mass:1,position:{x:2,y:0},velocity:{x:0,y:0},shape:{type:'circle',radius:0.1}}); w.addSpring({id:'s',a:b,anchor:{x:0,y:0},restLength:1,stiffness:10,damping:0}); w.step(); close(b.velocity.x,-1,1e-9); close(b.position.x,1.9,1e-9);
});

test('Mechanics AABB elastic collision',()=>{
  const w=new World2D({gravity:{x:0,y:0},dt:0.001}); const a=w.addBody({id:'a',mass:1,position:{x:-0.49,y:0},velocity:{x:1,y:0},shape:{type:'box',width:1,height:1},restitution:1,friction:0}); const b=w.addBody({id:'b',mass:1,position:{x:0.49,y:0},velocity:{x:-1,y:0},shape:{type:'box',width:1,height:1},restitution:1,friction:0}); w.step(); close(a.velocity.x,-1,1e-9); close(b.velocity.x,1,1e-9);
});

test('Mechanics floor restitution',()=>{
  const w=new World2D({gravity:{x:0,y:0},floorY:0,dt:0.01}); const b=w.addBody({id:'b',mass:1,position:{x:0,y:0.4},velocity:{x:0,y:-2},shape:{type:'circle',radius:0.5},restitution:0.5,friction:0}); w.step(); close(b.position.y,0.5,1e-9); close(b.velocity.y,1,1e-9);
});

test('Optics reflection vector',()=>{const r=reflect({x:1,y:-1},{x:0,y:1});close(r.x,Math.SQRT1_2,1e-12);close(r.y,Math.SQRT1_2,1e-12);});

test('Optics refraction vector',()=>{const r=refract({x:Math.cos(Math.PI/6),y:Math.sin(Math.PI/6)},{x:-1,y:0},1,1.5); assert.ok(r); close(Math.asin(r.y)*180/Math.PI,19.47122063449069,1e-9);});

test('Optics ray scene mirror to screen',()=>{
  const s=new RayScene().addMirror('m',{x:-10,y:0},{x:10,y:0}).addScreen('screen',{x:2,y:0.1},{x:2,y:5}); const tr=s.trace({origin:{x:0,y:1},direction:{x:1,y:-1}}); assert.equal(tr.path[1].surfaceId,'m'); assert.equal(tr.path[2].surfaceId,'screen'); close(tr.path[2].point.y,1,1e-6);
});

test('Optics RayScene total internal reflection',()=>{
  const s=new RayScene().addInterface('glass-air',{x:0,y:-10},{x:0,y:10},{nLeft:1.5,nRight:1}); const tr=s.trace({origin:{x:-1,y:0},direction:{x:0.5,y:Math.sqrt(3)/2}},{maxInteractions:1}); assert.equal(tr.path[1].surfaceId,'glass-air'); assert.equal(tr.path[1].totalInternalReflection,true); assert.ok(tr.finalRay.direction.x<0);
});

test('Optics thin lens parallel ray',()=>{
  const s=new RayScene().addThinLens('L',{x:0,yMin:-5,yMax:5,focalLength:2}).addScreen('S',{x:2,y:-1},{x:2,y:1}); const tr=s.trace({origin:{x:-2,y:1},direction:{x:1,y:0}}); assert.equal(tr.path[1].surfaceId,'L'); assert.equal(tr.path[2].surfaceId,'S'); close(tr.path[2].point.y,0,1e-6);
});

test('WaveGrid1D impulse stencil',()=>{
  const g=new WaveGrid1D({size:7,dx:1,dt:0.5,waveSpeed:1}); g.set(3,1); g.step(); close(g.sample(3),0.5,1e-12); close(g.sample(2),0.25,1e-12); close(g.sample(4),0.25,1e-12);
});

test('WaveGrid1D source injection',()=>{ const g=new WaveGrid1D({size:7,dx:1,dt:0.5,waveSpeed:1}); g.step({sources:[{index:3,value:1}]}); close(g.sample(3),1,1e-12); });

test('WaveGrid1D CFL guard',()=>{assert.throws(()=>new WaveGrid1D({size:7,dx:1,dt:1.01,waveSpeed:1}),/CFL/);});

test('WaveGrid2D impulse symmetry',()=>{
  const g=new WaveGrid2D({width:7,height:7,dx:1,dt:0.25,waveSpeed:1}); g.set(3,3,1); g.step(); close(g.sample(3,3),0.75,1e-12); close(g.sample(2,3),0.0625,1e-12); close(g.sample(4,3),0.0625,1e-12); close(g.sample(3,2),0.0625,1e-12); close(g.sample(3,4),0.0625,1e-12);
});

test('WaveGrid2D obstacle',()=>{const g=new WaveGrid2D({width:7,height:7,dx:1,dt:0.25,waveSpeed:1});g.set(3,3,1);g.addObstacle(4,3);g.step();close(g.sample(4,3),0,1e-12);});

console.log(`PASS Stage 3 simulation tests: ${passed}`);
