const EPS=1e-12;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const maxOf=array=>{let m=0;for(const v of array)m=Math.max(m,v);return m;};

export class WaveGrid1D {
  constructor({size=201,dx=0.01,dt=0.0005,waveSpeed=10,waveSpeedMap=null,damping=0,boundary='fixed',absorbingLayers=0,absorbingStrength=0.2}={}){
    if(size<3||dx<=0||dt<=0||waveSpeed<=0)throw new Error('invalid grid');
    this.size=size;this.dx=dx;this.dt=dt;this.waveSpeed=waveSpeed;this.damping=damping;this.boundary=boundary;
    this.waveSpeeds=new Float64Array(size);this.waveSpeeds.fill(waveSpeed);
    if(waveSpeedMap){if(waveSpeedMap.length!==size)throw new Error('1D waveSpeedMap length mismatch');for(let i=0;i<size;i++){if(!(waveSpeedMap[i]>0))throw new Error('wave speed must be > 0');this.waveSpeeds[i]=waveSpeedMap[i];}}
    this.#validateCfl();
    this.previous=new Float64Array(size);this.current=new Float64Array(size);this.next=new Float64Array(size);this.sponge=new Float64Array(size);this.time=0;
    if(boundary==='absorbing' && absorbingLayers===0) absorbingLayers=Math.max(2,Math.floor(size/12));
    if(absorbingLayers>0)this.setAbsorbingLayer(absorbingLayers,absorbingStrength);
  }
  #validateCfl(){const cfl=maxOf(this.waveSpeeds)*this.dt/this.dx;if(cfl>1+EPS)throw new Error(`1D CFL unstable: ${cfl}`);}
  setWaveSpeed(i,value){if(i<0||i>=this.size||!(value>0))throw new Error('invalid wave speed cell');const old=this.waveSpeeds[i];this.waveSpeeds[i]=value;try{this.#validateCfl();}catch(error){this.waveSpeeds[i]=old;throw error;}return this;}
  setAbsorbingLayer(layers,strength=0.2){if(!(layers>=0&&strength>=0))throw new Error('invalid absorbing layer');this.sponge.fill(0);const n=Math.min(Math.floor(layers),Math.floor(this.size/2));for(let i=0;i<n;i++){const x=(n-i)/Math.max(n,1);const d=strength*x*x;this.sponge[i]=Math.max(this.sponge[i],d);this.sponge[this.size-1-i]=Math.max(this.sponge[this.size-1-i],d);}return this;}
  set(i,value){this.current[i]=value;this.previous[i]=value;}
  add(i,value){this.current[i]+=value;this.previous[i]+=value;}
  sample(i){return this.current[i];}
  step({sources=[]}={}){
    for(let i=1;i<this.size-1;i++){
      const r=(this.waveSpeeds[i]*this.dt/this.dx)**2;const lap=this.current[i-1]-2*this.current[i]+this.current[i+1];const d=clamp(this.damping+this.sponge[i],0,0.95);
      this.next[i]=(2-d)*this.current[i]-(1-d)*this.previous[i]+r*lap;
    }
    if(this.boundary==='reflective'){this.next[0]=this.next[1];this.next[this.size-1]=this.next[this.size-2];}else{this.next[0]=0;this.next[this.size-1]=0;}
    for(const s of sources){if(s.index<0||s.index>=this.size)continue;const value=typeof s.value==='function'?s.value(this.time+this.dt):s.value;this.next[s.index]+=value;}
    [this.previous,this.current,this.next]=[this.current,this.next,this.previous];this.next.fill(0);this.time+=this.dt;return this.current;
  }
  energy(){let e=0;for(let i=1;i<this.size-1;i++){const vel=(this.current[i]-this.previous[i])/this.dt;const grad=(this.current[i+1]-this.current[i-1])/(2*this.dx);const c=this.waveSpeeds[i];e+=0.5*(vel*vel+c*c*grad*grad)*this.dx;}return e;}
}

export class WaveGrid2D {
  constructor({width=101,height=101,dx=0.01,dt=0.00025,waveSpeed=10,waveSpeedMap=null,damping=0,boundary='fixed',absorbingLayers=0,absorbingStrength=0.2}={}){
    if(width<3||height<3||dx<=0||dt<=0||waveSpeed<=0)throw new Error('invalid grid');
    this.width=width;this.height=height;this.dx=dx;this.dt=dt;this.waveSpeed=waveSpeed;this.damping=damping;this.boundary=boundary;const n=width*height;
    this.waveSpeeds=new Float64Array(n);this.waveSpeeds.fill(waveSpeed);
    if(waveSpeedMap){if(waveSpeedMap.length!==n)throw new Error('2D waveSpeedMap length mismatch');for(let i=0;i<n;i++){if(!(waveSpeedMap[i]>0))throw new Error('wave speed must be > 0');this.waveSpeeds[i]=waveSpeedMap[i];}}
    this.#validateCfl();
    this.previous=new Float64Array(n);this.current=new Float64Array(n);this.next=new Float64Array(n);this.obstacles=new Uint8Array(n);this.sponge=new Float64Array(n);this.time=0;
    if(boundary==='absorbing' && absorbingLayers===0) absorbingLayers=Math.max(2,Math.floor(Math.min(width,height)/10));
    if(absorbingLayers>0)this.setAbsorbingLayer(absorbingLayers,absorbingStrength);
  }
  #validateCfl(){const cfl=maxOf(this.waveSpeeds)*this.dt/this.dx;if(cfl>1/Math.sqrt(2)+EPS)throw new Error(`2D CFL unstable: ${cfl}`);}
  idx(x,y){return y*this.width+x;}
  setWaveSpeed(x,y,value){if(x<0||x>=this.width||y<0||y>=this.height||!(value>0))throw new Error('invalid wave speed cell');const i=this.idx(x,y),old=this.waveSpeeds[i];this.waveSpeeds[i]=value;try{this.#validateCfl();}catch(error){this.waveSpeeds[i]=old;throw error;}return this;}
  setWaveSpeedRegion({x0=0,y0=0,x1=this.width,y1=this.height,waveSpeed}){if(!(waveSpeed>0))throw new Error('waveSpeed must be > 0');const changed=[];for(let y=Math.max(0,y0);y<Math.min(this.height,y1);y++)for(let x=Math.max(0,x0);x<Math.min(this.width,x1);x++){const i=this.idx(x,y);changed.push([i,this.waveSpeeds[i]]);this.waveSpeeds[i]=waveSpeed;}try{this.#validateCfl();}catch(error){for(const [i,v] of changed)this.waveSpeeds[i]=v;throw error;}return this;}
  setAbsorbingLayer(layers,strength=0.2){if(!(layers>=0&&strength>=0))throw new Error('invalid absorbing layer');this.sponge.fill(0);const n=Math.min(Math.floor(layers),Math.floor(Math.min(this.width,this.height)/2));for(let y=0;y<this.height;y++)for(let x=0;x<this.width;x++){const edge=Math.min(x,y,this.width-1-x,this.height-1-y);if(edge<n){const q=(n-edge)/Math.max(n,1);this.sponge[this.idx(x,y)]=strength*q*q;}}return this;}
  set(x,y,value){const i=this.idx(x,y);this.current[i]=value;this.previous[i]=value;}
  addObstacle(x,y){this.obstacles[this.idx(x,y)]=1;}
  sample(x,y){return this.current[this.idx(x,y)];}
  step({sources=[]}={}){
    for(let y=1;y<this.height-1;y++)for(let x=1;x<this.width-1;x++){
      const i=this.idx(x,y);if(this.obstacles[i]){this.next[i]=0;continue;}
      const r=(this.waveSpeeds[i]*this.dt/this.dx)**2;const lap=this.current[this.idx(x-1,y)]+this.current[this.idx(x+1,y)]+this.current[this.idx(x,y-1)]+this.current[this.idx(x,y+1)]-4*this.current[i];const d=clamp(this.damping+this.sponge[i],0,0.95);
      this.next[i]=(2-d)*this.current[i]-(1-d)*this.previous[i]+r*lap;
    }
    if(this.boundary==='reflective'){
      for(let x=0;x<this.width;x++){this.next[this.idx(x,0)]=this.next[this.idx(x,1)];this.next[this.idx(x,this.height-1)]=this.next[this.idx(x,this.height-2)];}
      for(let y=0;y<this.height;y++){this.next[this.idx(0,y)]=this.next[this.idx(1,y)];this.next[this.idx(this.width-1,y)]=this.next[this.idx(this.width-2,y)];}
    } else {
      for(let x=0;x<this.width;x++){this.next[this.idx(x,0)]=0;this.next[this.idx(x,this.height-1)]=0;}for(let y=0;y<this.height;y++){this.next[this.idx(0,y)]=0;this.next[this.idx(this.width-1,y)]=0;}
    }
    for(const s of sources){if(s.x<0||s.x>=this.width||s.y<0||s.y>=this.height)continue;const value=typeof s.value==='function'?s.value(this.time+this.dt):s.value;this.next[this.idx(s.x,s.y)]+=value;}
    [this.previous,this.current,this.next]=[this.current,this.next,this.previous];this.next.fill(0);this.time+=this.dt;return this.current;
  }
  energy(){let e=0;for(let y=1;y<this.height-1;y++)for(let x=1;x<this.width-1;x++){const i=this.idx(x,y);if(this.obstacles[i])continue;const vel=(this.current[i]-this.previous[i])/this.dt;const gx=(this.current[this.idx(x+1,y)]-this.current[this.idx(x-1,y)])/(2*this.dx);const gy=(this.current[this.idx(x,y+1)]-this.current[this.idx(x,y-1)])/(2*this.dx);const c=this.waveSpeeds[i];e+=0.5*(vel*vel+c*c*(gx*gx+gy*gy))*this.dx*this.dx;}return e;}
}
