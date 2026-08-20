import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TransientCircuit } from '../../../packages/circuits-engine/src/transient.mjs';
import { rcCharging, rlCurrentRise } from '../../../packages/circuits-engine/src/index.mjs';
import { World2D } from '../../../packages/mechanics-engine/src/world2d.mjs';
import { RayScene } from '../../../packages/optics-engine/src/ray-scene.mjs';
import { WaveGrid2D } from '../../../packages/waves-engine/src/wave-grid.mjs';
import { SceneRuntime } from '../../../packages/scene-runtime/src/index.mjs';
import { createBlankScene, validateSceneShape } from '../../../packages/editor-core/src/index.mjs';
import { ComponentCatalog } from '../../../packages/component-library/src/index.mjs';

let passed=0;
const test=(name,fn)=>{fn();passed++;console.log(`PASS ${name}`);};
const near=(actual,expected,tolerance,message='')=>assert.ok(Math.abs(actual-expected)<=tolerance,`${message} expected ${expected}, got ${actual}`);

test('transient MNA RC charging agrees with analytic solution',()=>{
  const dt=1e-5,R=1000,C=1e-6,V=5,t=R*C;
  const net=new TransientCircuit({dt}).voltageSource('v','n1','0',V).resistor('r','n1','n2',R).capacitor('c','n2','0',C);
  net.runFor(t,dt);
  const expected=rcCharging({supplyVoltage:V,resistance:R,capacitance:C,time:t}).capacitorVoltage;
  near(net.lastResult.nodeVoltages.n2,expected,0.012,'RC voltage');
});

test('transient MNA RL current rise agrees with analytic solution',()=>{
  const dt=1e-5,R=10,L=0.01,V=5,t=L/R;
  const net=new TransientCircuit({dt}).voltageSource('v','n1','0',V).resistor('r','n1','n2',R).inductor('l','n2','0',L);
  net.runFor(t,dt);
  const expected=rlCurrentRise({supplyVoltage:V,resistance:R,inductance:L,time:t}).current;
  near(net.lastResult.branchCurrents.l,expected,0.006,'RL current');
});

test('nonlinear diode Newton solve converges and satisfies KCL',()=>{
  const net=new TransientCircuit({dt:1e-4,maxIterations:100}).voltageSource('v','n1','0',5).resistor('r','n1','n2',1000).diode('d','n2','0');
  const r=net.step();
  assert.equal(r.converged,true); assert.ok(r.nodeVoltages.n2>0.5&&r.nodeVoltages.n2<0.7);
  near(r.branchCurrents.r,r.branchCurrents.d,1e-9,'diode KCL');
});

test('SceneRuntime automatically uses transient solver for capacitor scene',()=>{
  const scene={...createBlankScene({domain:'circuits'}),simulation:{dt:1e-4,timeScale:1},parts:[
    {instanceId:'v',partId:'circuits.battery',transform:{position:{x:0,y:0}},properties:{voltage:5,nodeA:'n1',nodeB:'0'}},
    {instanceId:'r',partId:'circuits.resistor',transform:{position:{x:1,y:0}},properties:{resistance:1000,nodeA:'n1',nodeB:'n2'}},
    {instanceId:'c',partId:'circuits.capacitor',transform:{position:{x:2,y:0}},properties:{capacitance:1e-6,nodeA:'n2',nodeB:'0'}}],connections:[],probes:[{id:'vc',quantity:'voltage',node:'n2'}]};
  const runtime=new SceneRuntime(scene);runtime.step(10);const series=runtime.recorder.get('vc');assert.equal(series.length,10);assert.ok(series.at(-1).value>series[0].value);
});

test('rigid body torque integrates angular acceleration using inertia',()=>{
  const world=new World2D({gravity:{x:0,y:0},dt:0.1});const b=world.addBody({id:'box',mass:2,shape:{type:'box',width:2,height:1}});
  const inertia=2*(4+1)/12;b.applyTorque(3);world.step();near(b.angularVelocity,(3/inertia)*0.1,1e-12);assert.ok(b.angle>0);
});

test('off-center force produces torque',()=>{
  const world=new World2D({gravity:{x:0,y:0},dt:0.1});const b=world.addBody({id:'box',mass:1,shape:{type:'box',width:2,height:2}});
  b.applyForceAtPoint({x:0,y:2},{x:1,y:0});world.step();assert.ok(b.angularVelocity>0);assert.ok(b.velocity.y>0);
});

test('distance joint preserves target separation',()=>{
  const world=new World2D({gravity:{x:0,y:0},dt:0.01});world.addBody({id:'a',position:{x:0,y:0}});world.addBody({id:'b',position:{x:2,y:0},velocity:{x:1,y:0}});world.addDistanceJoint({id:'j',a:'a',b:'b',length:2});
  for(let i=0;i<200;i++)world.step();const a=world.bodies[0],b=world.bodies[1];near(Math.hypot(b.position.x-a.position.x,b.position.y-a.position.y),2,1e-8);
});

test('mechanics SceneRuntime exposes angular motion and distance joint',()=>{
  const scene={...createBlankScene({domain:'mechanics'}),simulation:{dt:.01,gravity:{x:0,y:0}},parts:[
    {instanceId:'a',partId:'mechanics.block',transform:{position:{x:0,y:0},rotation:0},properties:{mass:1,width:1,height:1,torque:1}},
    {instanceId:'b',partId:'mechanics.block',transform:{position:{x:2,y:0},rotation:0},properties:{mass:1,width:1,height:1}}],connections:[{id:'j',kind:'mechanical',from:{instanceId:'a'},to:{instanceId:'b'},properties:{type:'distance-joint',length:2}}],probes:[{id:'omega',instanceId:'a',quantity:'angular-velocity'}]};
  const runtime=new SceneRuntime(scene);runtime.step(20);assert.ok(runtime.recorder.get('omega').at(-1).value>0);
});

test('spherical glass interface keeps central ray undeviated through both surfaces',()=>{
  const scene=new RayScene().addSphericalInterface('glass',{center:{x:0,y:0},radius:1,nInside:1.5,nOutside:1});
  const result=scene.trace({origin:{x:-3,y:0},direction:{x:1,y:0}},{maxInteractions:4});const hits=result.path.filter(p=>p.event==='spherical-interface');assert.equal(hits.length,2);near(result.finalRay.direction.y,0,1e-12);assert.ok(result.finalRay.direction.x>0);
});

test('off-axis ray bends at spherical refractive surface',()=>{
  const scene=new RayScene().addSphericalInterface('glass',{center:{x:0,y:0},radius:1,nInside:1.5,nOutside:1});
  const result=scene.trace({origin:{x:-3,y:.5},direction:{x:1,y:0}},{maxInteractions:1});assert.ok(Math.abs(result.finalRay.direction.y)>1e-4);
});

test('heterogeneous wave medium propagates more slowly in low-speed region',()=>{
  const map=new Array(31*21).fill(1);for(let y=0;y<21;y++)for(let x=16;x<31;x++)map[y*31+x]=0.5;
  const grid=new WaveGrid2D({width:31,height:21,dx:1,dt:.3,waveSpeed:1,waveSpeedMap:map});grid.set(8,10,1);for(let i=0;i<35;i++)grid.step();
  assert.ok(Math.abs(grid.sample(13,10))>Math.abs(grid.sample(23,10))*10);
});

test('absorbing layer reduces late reflected energy versus fixed boundary',()=>{
  const run=boundary=>{const g=new WaveGrid2D({width:41,height:41,dx:1,dt:.35,waveSpeed:1,boundary,absorbingLayers:boundary==='absorbing'?6:0,absorbingStrength:.35});g.set(20,20,1);for(let i=0;i<160;i++)g.step();return g.energy();};
  const fixed=run('fixed'),absorbed=run('absorbing');assert.ok(absorbed<fixed*0.5,`absorbed=${absorbed}, fixed=${fixed}`);
});

test('waves SceneRuntime supports medium regions, obstacles and energy probe',()=>{
  const scene={...createBlankScene({domain:'waves'}),simulation:{dt:.2,waveSpeed:1},parts:[
    {instanceId:'space',partId:'waves.space-2d',transform:{position:{x:0,y:0}},properties:{width:21,height:21,dx:1,boundary:'absorbing',absorbingLayers:3}},
    {instanceId:'medium',partId:'aria.waves.medium-region',transform:{position:{x:11,y:0}},properties:{x0:11,y0:0,x1:21,y1:21,waveSpeed:.6}},
    {instanceId:'obstacle',partId:'aria.waves.obstacle',transform:{position:{x:10,y:10}},properties:{width:1,height:5}},
    {instanceId:'source',partId:'waves.point-source',transform:{position:{x:5,y:10}},properties:{amplitude:1,frequency:1}}],connections:[],probes:[{id:'energy',quantity:'energy'}]};
  const runtime=new SceneRuntime(scene);runtime.step(20);assert.equal(runtime.recorder.get('energy').length,20);assert.ok(runtime.snapshot().state.energy>0);
});


test('Stage 5 reference scenes validate and execute',()=>{
  for(const name of ['circuit-rc-transient','mechanics-rotational-joint','optics-spherical-interface','waves-heterogeneous-absorbing']){
    const scene=JSON.parse(readFileSync(new URL(`../../../content/scenes/stage5/${name}.json`,import.meta.url),'utf8'));
    assert.equal(validateSceneShape(scene),true);const runtime=new SceneRuntime(scene);runtime.step(3);assert.ok(runtime.snapshot().time>0);
  }
});

test('component catalog exposes scene-extension properties without mutating canonical schema',()=>{
  const catalog=new ComponentCatalog([]);const props=catalog.propertyDescriptors('aria.native',{torque:2,enabled:true});assert.deepEqual(props.map(p=>p.key),['torque','enabled']);assert.equal(props[0].role,'scene-extension');
});

console.log(`\nStage 5: ${passed} tests passed.`);
