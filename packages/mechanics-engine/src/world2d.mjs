const EPS = 1e-9;
const add = (a,b) => ({x:a.x+b.x,y:a.y+b.y});
const sub = (a,b) => ({x:a.x-b.x,y:a.y-b.y});
const mul = (a,s) => ({x:a.x*s,y:a.y*s});
const dot = (a,b) => a.x*b.x+a.y*b.y;
const cross = (a,b) => a.x*b.y-a.y*b.x;
const mag = a => Math.hypot(a.x,a.y);
const norm = a => { const m=mag(a); return m<EPS?{x:1,y:0}:{x:a.x/m,y:a.y/m}; };

function defaultInertia(mass, shape) {
  if (shape.type === 'circle') return 0.5 * mass * shape.radius * shape.radius;
  if (shape.type === 'box') {
    const width = shape.width ?? 1, height = shape.height ?? 1;
    return mass * (width * width + height * height) / 12;
  }
  return mass;
}

export class Body2D {
  constructor({ id, mass = 1, position = {x:0,y:0}, velocity = {x:0,y:0}, shape = {type:'circle',radius:0.5}, restitution = 0.5, friction = 0.2, staticBody = false, angle = 0, angularVelocity = 0, inertia = null } = {}) {
    if (!id) throw new Error('body id required');
    if (!staticBody && !(mass > 0)) throw new Error('mass must be > 0');
    this.id=id;
    this.mass=staticBody?Infinity:mass;
    this.invMass=staticBody?0:1/mass;
    this.position={...position};
    this.velocity={...velocity};
    this.force={x:0,y:0};
    this.shape=shape;
    this.restitution=restitution;
    this.friction=friction;
    this.staticBody=staticBody;
    this.angle=angle;
    this.angularVelocity=angularVelocity;
    this.torque=0;
    this.inertia=staticBody?Infinity:(inertia ?? defaultInertia(mass, shape));
    if (!staticBody && !(this.inertia > 0)) throw new Error('inertia must be > 0');
    this.invInertia=staticBody?0:1/this.inertia;
  }
  applyForce(force) { this.force=add(this.force,force); }
  applyTorque(torque) { if (!Number.isFinite(torque)) throw new Error('torque must be finite'); this.torque += torque; }
  applyForceAtPoint(force, worldPoint) {
    this.applyForce(force);
    this.applyTorque(cross(sub(worldPoint, this.position), force));
  }
  clearForces() { this.force={x:0,y:0}; this.torque=0; }
}

export class World2D {
  constructor({ gravity = {x:0,y:-9.81}, dt = 1/120, floorY = null, jointIterations = 6 } = {}) {
    this.gravity=gravity; this.dt=dt; this.floorY=floorY; this.bodies=[]; this.springs=[]; this.joints=[]; this.jointIterations=jointIterations;
  }
  addBody(spec) { const b=spec instanceof Body2D?spec:new Body2D(spec); this.bodies.push(b); return b; }
  addSpring({ id, a, b = null, anchor = null, restLength, stiffness, damping = 0 }) {
    if (!(restLength>=0 && stiffness>=0 && damping>=0)) throw new Error('invalid spring');
    const s={id,a,b,anchor,restLength,stiffness,damping}; this.springs.push(s); return s;
  }
  addDistanceJoint({ id, a, b = null, anchor = null, length, stiffness = 1 }) {
    if (!(length >= 0) || !(stiffness > 0 && stiffness <= 1)) throw new Error('invalid distance joint');
    if (!b && !anchor) throw new Error('distance joint requires b or anchor');
    const j={id,a,b,anchor,length,stiffness}; this.joints.push(j); return j;
  }
  body(ref) { return typeof ref === 'string' ? this.bodies.find(x=>x.id===ref) : ref; }
  step(dt=this.dt) {
    for (const s of this.springs) this.#applySpring(s);
    for (const b of this.bodies) {
      if (b.staticBody) continue;
      const acc=add(this.gravity,mul(b.force,b.invMass));
      b.velocity=add(b.velocity,mul(acc,dt));
      b.position=add(b.position,mul(b.velocity,dt));
      const angularAcceleration=b.torque*b.invInertia;
      b.angularVelocity += angularAcceleration*dt;
      b.angle += b.angularVelocity*dt;
    }
    for (let iter=0;iter<this.jointIterations;iter++) for (const j of this.joints) this.#solveDistanceJoint(j, dt);
    if (this.floorY !== null) for (const b of this.bodies) this.#solveFloor(b);
    for (let i=0;i<this.bodies.length;i++) for (let j=i+1;j<this.bodies.length;j++) this.#collide(this.bodies[i],this.bodies[j]);
    for (const b of this.bodies) b.clearForces();
    return this.snapshot();
  }
  runFor(seconds, dt=this.dt) { const steps=Math.round(seconds/dt); for(let i=0;i<steps;i++) this.step(dt); return this.snapshot(); }
  snapshot() { return this.bodies.map(b=>({id:b.id,position:{...b.position},velocity:{...b.velocity},angle:b.angle,angularVelocity:b.angularVelocity})); }
  #applySpring(s) {
    const a=this.body(s.a);
    const b=s.b?this.body(s.b):null;
    if(!a || (!b && !s.anchor)) throw new Error(`spring ${s.id ?? ''} endpoint missing`);
    const pb=b?b.position:s.anchor; const delta=sub(pb,a.position); const d=mag(delta); const n=norm(delta);
    const rel=b?dot(sub(b.velocity,a.velocity),n):-dot(a.velocity,n);
    const forceMag=s.stiffness*(d-s.restLength)+s.damping*rel;
    const f=mul(n,forceMag); a.applyForce(f); if(b) b.applyForce(mul(f,-1));
  }
  #solveDistanceJoint(j, dt) {
    const a=this.body(j.a), b=j.b?this.body(j.b):null;
    if(!a || (!b && !j.anchor)) throw new Error(`joint ${j.id ?? ''} endpoint missing`);
    const pb=b?b.position:j.anchor;
    const delta=sub(pb,a.position); const distance=mag(delta); const n=norm(delta);
    const error=distance-j.length;
    const totalInv=a.invMass+(b?.invMass??0);
    if(totalInv<=0) return;
    const correction=error*j.stiffness/totalInv;
    if(!a.staticBody) a.position=add(a.position,mul(n,correction*a.invMass));
    if(b && !b.staticBody) b.position=sub(b.position,mul(n,correction*b.invMass));
    const va=a.velocity, vb=b?b.velocity:{x:0,y:0};
    const relative=dot(sub(vb,va),n);
    const bias=Math.max(-10,Math.min(10,error/Math.max(dt,EPS)*0.15));
    const impulse=(relative+bias)/totalInv;
    if(!a.staticBody) a.velocity=add(a.velocity,mul(n,impulse*a.invMass));
    if(b && !b.staticBody) b.velocity=sub(b.velocity,mul(n,impulse*b.invMass));
  }
  #solveFloor(b) {
    if(b.staticBody) return;
    const radius=b.shape.type==='circle'?b.shape.radius:(b.shape.height??1)/2;
    const bottom=b.position.y-radius;
    if(bottom < this.floorY) {
      b.position.y += this.floorY-bottom;
      if(b.velocity.y<0) b.velocity.y = -b.velocity.y*b.restitution;
      const tangentDecay=Math.max(0,1-b.friction*0.1); b.velocity.x*=tangentDecay;
    }
  }
  #collide(a,b) {
    if(a.invMass+b.invMass===0) return;
    if(a.shape.type==='circle' && b.shape.type==='circle') return resolveCircle(a,b);
    if(a.shape.type==='box' && b.shape.type==='box') return resolveAabb(a,b);
  }
}

function applyImpulse(a,b,normal,penetration) {
  const totalInv=a.invMass+b.invMass; if(totalInv===0) return;
  const correction=mul(normal,Math.max(0,penetration-1e-6)/totalInv*0.8);
  if(!a.staticBody) a.position=sub(a.position,mul(correction,a.invMass));
  if(!b.staticBody) b.position=add(b.position,mul(correction,b.invMass));
  const rv=sub(b.velocity,a.velocity); const velAlong=dot(rv,normal); if(velAlong>0) return;
  const e=Math.min(a.restitution,b.restitution); const j=-(1+e)*velAlong/totalInv; const impulse=mul(normal,j);
  if(!a.staticBody) a.velocity=sub(a.velocity,mul(impulse,a.invMass));
  if(!b.staticBody) b.velocity=add(b.velocity,mul(impulse,b.invMass));
  const rv2=sub(b.velocity,a.velocity); const tangentRaw=sub(rv2,mul(normal,dot(rv2,normal))); const tm=mag(tangentRaw);
  if(tm>EPS){const t=mul(tangentRaw,1/tm); let jt=-dot(rv2,t)/totalInv; const mu=Math.sqrt(a.friction*b.friction); const max=Math.abs(j)*mu; jt=Math.max(-max,Math.min(max,jt)); const fi=mul(t,jt); if(!a.staticBody)a.velocity=sub(a.velocity,mul(fi,a.invMass)); if(!b.staticBody)b.velocity=add(b.velocity,mul(fi,b.invMass));}
}
function resolveCircle(a,b){const d=sub(b.position,a.position);const dist=mag(d);const r=a.shape.radius+b.shape.radius;if(dist>=r)return false;const n=norm(d);applyImpulse(a,b,n,r-dist);return true;}
function resolveAabb(a,b){const ah=(a.shape.height??1)/2,aw=(a.shape.width??1)/2,bh=(b.shape.height??1)/2,bw=(b.shape.width??1)/2;const dx=b.position.x-a.position.x,px=aw+bw-Math.abs(dx);if(px<=0)return false;const dy=b.position.y-a.position.y,py=ah+bh-Math.abs(dy);if(py<=0)return false;if(px<py)applyImpulse(a,b,{x:Math.sign(dx)||1,y:0},px);else applyImpulse(a,b,{x:0,y:Math.sign(dy)||1},py);return true;}

export const vec2 = { add, sub, mul, dot, cross, magnitude: mag, normalize: norm };
