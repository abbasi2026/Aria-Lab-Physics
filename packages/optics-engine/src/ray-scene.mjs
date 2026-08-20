import { clamp } from '../../physics-core/src/math.mjs';
const EPS=1e-9;
const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y}); const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y}); const mul=(a,s)=>({x:a.x*s,y:a.y*s}); const dot=(a,b)=>a.x*b.x+a.y*b.y; const cross=(a,b)=>a.x*b.y-a.y*b.x; const mag=a=>Math.hypot(a.x,a.y); const normalize=a=>{const m=mag(a);if(m<EPS)throw new Error('zero direction');return{x:a.x/m,y:a.y/m}};
export function reflect(direction, normal){const d=normalize(direction),n=normalize(normal);return normalize(sub(d,mul(n,2*dot(d,n))));}
export function refract(direction, normal, nIncident, nTransmit){let d=normalize(direction),n=normalize(normal);let cosi=clamp(dot(d,n),-1,1);let etai=nIncident,etat=nTransmit;if(cosi>0){n=mul(n,-1);}else{cosi=-cosi;}const eta=etai/etat;const k=1-eta*eta*(1-cosi*cosi);if(k<0)return null;return normalize(add(mul(d,eta),mul(n,eta*cosi-Math.sqrt(k))));}
export function intersectRaySegment(ray, surface){const p=ray.origin,r=normalize(ray.direction),q=surface.a,s=sub(surface.b,surface.a);const rxs=cross(r,s);if(Math.abs(rxs)<EPS)return null;const qp=sub(q,p);const t=cross(qp,s)/rxs;const u=cross(qp,r)/rxs;if(t<=EPS||u<-EPS||u>1+EPS)return null;return{t,point:add(p,mul(r,t))};}
export function segmentNormal(surface){const s=sub(surface.b,surface.a);return normalize({x:-s.y,y:s.x});}

export class RayScene {
  constructor(){this.surfaces=[];}
  addMirror(id,a,b){this.surfaces.push({id,type:'mirror',a,b});return this;}
  addScreen(id,a,b){this.surfaces.push({id,type:'screen',a,b});return this;}
  addInterface(id,a,b,{nLeft=1,nRight=1.5}={}){this.surfaces.push({id,type:'interface',a,b,nLeft,nRight});return this;}
  addThinLens(id,{x,yMin=-10,yMax=10,focalLength}){if(!Number.isFinite(focalLength)||focalLength===0)throw new Error('nonzero focalLength required');this.surfaces.push({id,type:'thinLens',a:{x,y:yMin},b:{x,y:yMax},x,focalLength});return this;}
  trace(ray,{maxInteractions=20,maxDistance=1e6}={}){
    let current={origin:{...ray.origin},direction:normalize(ray.direction)}; const path=[{point:{...current.origin},event:'start'}];
    for(let step=0;step<maxInteractions;step++){
      let hit=null,surface=null;
      for(const s of this.surfaces){const h=intersectRaySegment(current,s);if(h&&h.t<maxDistance&&(!hit||h.t<hit.t)){hit=h;surface=s;}}
      if(!hit){path.push({point:add(current.origin,mul(current.direction,Math.min(maxDistance,1000))),event:'escape'});break;}
      path.push({point:hit.point,event:surface.type,surfaceId:surface.id});
      if(surface.type==='screen')break;
      let nextDir=current.direction;
      if(surface.type==='mirror') nextDir=reflect(current.direction,segmentNormal(surface));
      else if(surface.type==='interface'){
        const n=segmentNormal(surface); const side=dot(current.direction,n); const nIncident=side<0?surface.nLeft:surface.nRight; const nTransmit=side<0?surface.nRight:surface.nLeft;
        const r=refract(current.direction,n,nIncident,nTransmit); nextDir=r??reflect(current.direction,n); path[path.length-1].totalInternalReflection=r===null;
      } else if(surface.type==='thinLens') nextDir=thinLensDirection(current.direction,hit.point,surface);
      current={origin:add(hit.point,mul(nextDir,1e-7)),direction:nextDir};
    }
    return {path,finalRay:current};
  }
}

export function thinLensDirection(direction, point, lens){
  const d=normalize(direction); if(Math.abs(d.x)<EPS) throw new Error('thin lens paraxial model requires nonzero x direction');
  const sign=Math.sign(d.x); const slope=d.y/d.x; const y=point.y; const newSlope=slope-sign*y/lens.focalLength; return normalize({x:sign,y:newSlope*Math.abs(sign)});
}
export const rayMath={add,sub,mul,dot,cross,normalize};
