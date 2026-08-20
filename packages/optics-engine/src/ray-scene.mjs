import { clamp } from '../../physics-core/src/math.mjs';
const EPS=1e-9;
const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y}); const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y}); const mul=(a,s)=>({x:a.x*s,y:a.y*s}); const dot=(a,b)=>a.x*b.x+a.y*b.y; const cross=(a,b)=>a.x*b.y-a.y*b.x; const mag=a=>Math.hypot(a.x,a.y); const normalize=a=>{const m=mag(a);if(m<EPS)throw new Error('zero direction');return{x:a.x/m,y:a.y/m}};
export function reflect(direction, normal){const d=normalize(direction),n=normalize(normal);return normalize(sub(d,mul(n,2*dot(d,n))));}
export function refract(direction, normal, nIncident, nTransmit){let d=normalize(direction),n=normalize(normal);let cosi=clamp(dot(d,n),-1,1);if(cosi>0){n=mul(n,-1);}else{cosi=-cosi;}const eta=nIncident/nTransmit;const k=1-eta*eta*(1-cosi*cosi);if(k<0)return null;return normalize(add(mul(d,eta),mul(n,eta*cosi-Math.sqrt(k))));}
export function intersectRaySegment(ray, surface){const p=ray.origin,r=normalize(ray.direction),q=surface.a,s=sub(surface.b,surface.a);const rxs=cross(r,s);if(Math.abs(rxs)<EPS)return null;const qp=sub(q,p);const t=cross(qp,s)/rxs;const u=cross(qp,r)/rxs;if(t<=EPS||u<-EPS||u>1+EPS)return null;return{t,point:add(p,mul(r,t))};}
function circleCandidates(ray,circle){const d=normalize(ray.direction),oc=sub(ray.origin,circle.center);const b=2*dot(oc,d),c=dot(oc,oc)-circle.radius*circle.radius,disc=b*b-4*c;if(disc<0)return[];const root=Math.sqrt(disc);return[(-b-root)/2,(-b+root)/2].filter(t=>t>EPS).sort((a,b)=>a-b).map(t=>({t,point:add(ray.origin,mul(d,t))}));}
export function intersectRayCircle(ray,circle){const h=circleCandidates(ray,circle)[0];if(!h)return null;return{...h,normal:normalize(sub(h.point,circle.center))};}
function intersectSemicircleArc(ray,s){const hit=circleCandidates(ray,s).find(h=>{const local=sub(h.point,s.center),axis=s.axis??{x:1,y:0};return dot(local,axis)>=-EPS;});return hit?{...hit,normal:normalize(sub(hit.point,s.center))}:null;}
export function segmentNormal(surface){const s=sub(surface.b,surface.a);return normalize({x:-s.y,y:s.x});}
const outwardNormal=(a,b)=>{const s=sub(b,a);return normalize({x:s.y,y:-s.x});};

export class RayScene {
  constructor(){this.surfaces=[];}
  addMirror(id,a,b){this.surfaces.push({id,type:'mirror',a,b});return this;}
  addScreen(id,a,b){this.surfaces.push({id,type:'screen',a,b});return this;}
  addAbsorber(id,a,b){this.surfaces.push({id,type:'absorber',a,b});return this;}
  addCircularAbsorber(id,{center,radius}){this.surfaces.push({id,type:'circularAbsorber',center:{...center},radius});return this;}
  addInterface(id,a,b,{nLeft=1,nRight=1.5}={}){this.surfaces.push({id,type:'interface',a,b,nLeft,nRight});return this;}
  addThinLens(id,{x,yMin=-10,yMax=10,focalLength}){if(!Number.isFinite(focalLength)||focalLength===0)throw new Error('nonzero focalLength required');this.surfaces.push({id,type:'thinLens',a:{x,y:yMin},b:{x,y:yMax},x,focalLength});return this;}
  addSphericalInterface(id,{center,radius,nInside=1.5,nOutside=1}={}){if(!center||!(radius>0)||!(nInside>0&&nOutside>0))throw new Error('invalid spherical interface');this.surfaces.push({id,type:'sphericalInterface',center:{...center},radius,nInside,nOutside});return this;}
  addSphericalMirror(id,{center,radius}={}){if(!center||!(radius>0))throw new Error('invalid spherical mirror');this.surfaces.push({id,type:'sphericalMirror',center:{...center},radius});return this;}
  addSphericalMirrorArc(id,{center,radius,axis={x:-1,y:0}}={}){if(!center||!(radius>0))throw new Error('invalid spherical mirror arc');this.surfaces.push({id,type:'sphericalMirrorArc',center:{...center},radius,axis:normalize(axis)});return this;}
  addPolygonInterface(id,points,{nInside=1.5,nOutside=1}={}){
    if(!Array.isArray(points)||points.length<3)throw new Error('polygon requires >=3 points');
    for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];this.surfaces.push({id,type:'polygonInterface',a:{...a},b:{...b},normal:outwardNormal(a,b),nInside,nOutside,edge:i});}return this;
  }
  addOpaquePolygon(id,points){for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];this.addAbsorber(id,a,b);}return this;}
  addSemicircularInterface(id,{center,radius,axis={x:1,y:0},nInside=1.5,nOutside=1}={}){
    const ax=normalize(axis),t={x:-ax.y,y:ax.x};
    this.surfaces.push({id,type:'semicircleArc',center:{...center},radius,axis:ax,nInside,nOutside});
    const a=add(center,mul(t,radius)),b=add(center,mul(t,-radius));
    this.surfaces.push({id,type:'semicircleFlat',a,b,normal:mul(ax,-1),nInside,nOutside});return this;
  }
  addParabolicMirror(id,{vertex,focalLength=1,height=4,direction=1,samples=24}={}){
    const pts=[];for(let i=0;i<=samples;i++){const y=-height/2+height*i/samples;const x=vertex.x+direction*(y*y/(4*Math.abs(focalLength)));pts.push({x,y:vertex.y+y});}
    for(let i=0;i<pts.length-1;i++)this.addMirror(id,pts[i],pts[i+1]);return this;
  }
  trace(ray,{maxInteractions=20,maxDistance=1e6}={}){
    let current={origin:{...ray.origin},direction:normalize(ray.direction)};const path=[{point:{...current.origin},event:'start'}];
    for(let step=0;step<maxInteractions;step++){
      let hit=null,surface=null;
      for(const s of this.surfaces){
        let h=null;
        if(['sphericalInterface','sphericalMirror','circularAbsorber'].includes(s.type))h=intersectRayCircle(current,s);
        else if(s.type==='semicircleArc'||s.type==='sphericalMirrorArc')h=intersectSemicircleArc(current,s);
        else h=intersectRaySegment(current,s);
        if(h&&h.t<maxDistance&&(!hit||h.t<hit.t)){hit=h;surface=s;}
      }
      if(!hit){path.push({point:add(current.origin,mul(current.direction,Math.min(maxDistance,1000))),event:'escape'});break;}
      const event=surface.type==='sphericalInterface'?'spherical-interface':(surface.type==='sphericalMirror'||surface.type==='sphericalMirrorArc')?'spherical-mirror':surface.type;
      path.push({point:hit.point,event,surfaceId:surface.id,edge:surface.edge});
      if(surface.type==='screen'||surface.type==='absorber'||surface.type==='circularAbsorber')break;
      let nextDir=current.direction;
      if(surface.type==='mirror')nextDir=reflect(current.direction,segmentNormal(surface));
      else if(surface.type==='sphericalMirror'||surface.type==='sphericalMirrorArc')nextDir=reflect(current.direction,hit.normal);
      else if(surface.type==='interface'){
        const n=segmentNormal(surface),side=dot(current.direction,n),nIncident=side<0?surface.nLeft:surface.nRight,nTransmit=side<0?surface.nRight:surface.nLeft;const r=refract(current.direction,n,nIncident,nTransmit);nextDir=r??reflect(current.direction,n);path[path.length-1].totalInternalReflection=r===null;
      } else if(surface.type==='polygonInterface'||surface.type==='semicircleFlat'||surface.type==='semicircleArc'){
        const n=surface.type==='semicircleArc'?hit.normal:surface.normal;const entering=dot(current.direction,n)<0,nIncident=entering?surface.nOutside:surface.nInside,nTransmit=entering?surface.nInside:surface.nOutside;const r=refract(current.direction,n,nIncident,nTransmit);nextDir=r??reflect(current.direction,n);path[path.length-1].totalInternalReflection=r===null;
      } else if(surface.type==='sphericalInterface'){
        const entering=dot(current.direction,hit.normal)<0,nIncident=entering?surface.nOutside:surface.nInside,nTransmit=entering?surface.nInside:surface.nOutside;const r=refract(current.direction,hit.normal,nIncident,nTransmit);nextDir=r??reflect(current.direction,hit.normal);path[path.length-1].totalInternalReflection=r===null;
      } else if(surface.type==='thinLens')nextDir=thinLensDirection(current.direction,hit.point,surface);
      current={origin:add(hit.point,mul(nextDir,1e-7)),direction:nextDir};
    }
    return{path,finalRay:current};
  }
}
export function thinLensDirection(direction,point,lens){const d=normalize(direction);if(Math.abs(d.x)<EPS)throw new Error('thin lens paraxial model requires nonzero x direction');const sign=Math.sign(d.x),slope=d.y/d.x,y=point.y,newSlope=slope-sign*y/lens.focalLength;return normalize({x:sign,y:newSlope*Math.abs(sign)});}
export const rayMath={add,sub,mul,dot,cross,normalize};
