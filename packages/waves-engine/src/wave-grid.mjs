function index1(i,n){if(i<0||i>=n)return null;return i;}
export class WaveGrid1D {
  constructor({size=201,dx=0.01,dt=0.0005,waveSpeed=10,damping=0,boundary='fixed'}={}){
    if(size<3||dx<=0||dt<=0||waveSpeed<=0)throw new Error('invalid grid'); const cfl=waveSpeed*dt/dx;if(cfl>1+1e-12)throw new Error(`1D CFL unstable: ${cfl}`);
    this.size=size;this.dx=dx;this.dt=dt;this.waveSpeed=waveSpeed;this.damping=damping;this.boundary=boundary;this.previous=new Float64Array(size);this.current=new Float64Array(size);this.next=new Float64Array(size);this.time=0;
  }
  set(i,value){this.current[i]=value;this.previous[i]=value;}
  add(i,value){this.current[i]+=value;this.previous[i]+=value;}
  sample(i){return this.current[i];}
  step({sources=[]}={}){const r=(this.waveSpeed*this.dt/this.dx)**2;for(let i=1;i<this.size-1;i++){const lap=this.current[i-1]-2*this.current[i]+this.current[i+1];this.next[i]=(2-this.damping)*this.current[i]-(1-this.damping)*this.previous[i]+r*lap;}if(this.boundary==='fixed'){this.next[0]=0;this.next[this.size-1]=0;}else if(this.boundary==='reflective'){this.next[0]=this.next[1];this.next[this.size-1]=this.next[this.size-2];}for(const s of sources){if(s.index<0||s.index>=this.size)continue;const value=typeof s.value==='function'?s.value(this.time+this.dt):s.value;this.next[s.index]+=value;}[this.previous,this.current,this.next]=[this.current,this.next,this.previous];this.next.fill(0);this.time+=this.dt;return this.current;}
  energy(){let e=0;for(let i=1;i<this.size-1;i++){const vel=(this.current[i]-this.previous[i])/this.dt;const grad=(this.current[i+1]-this.current[i-1])/(2*this.dx);e+=0.5*(vel*vel+this.waveSpeed*this.waveSpeed*grad*grad)*this.dx;}return e;}
}

export class WaveGrid2D {
  constructor({width=101,height=101,dx=0.01,dt=0.00025,waveSpeed=10,damping=0,boundary='fixed'}={}){
    if(width<3||height<3||dx<=0||dt<=0||waveSpeed<=0)throw new Error('invalid grid');const cfl=waveSpeed*dt/dx;if(cfl>1/Math.sqrt(2)+1e-12)throw new Error(`2D CFL unstable: ${cfl}`);
    this.width=width;this.height=height;this.dx=dx;this.dt=dt;this.waveSpeed=waveSpeed;this.damping=damping;this.boundary=boundary;const n=width*height;this.previous=new Float64Array(n);this.current=new Float64Array(n);this.next=new Float64Array(n);this.obstacles=new Uint8Array(n);this.time=0;
  }
  idx(x,y){return y*this.width+x;}
  set(x,y,value){const i=this.idx(x,y);this.current[i]=value;this.previous[i]=value;}
  addObstacle(x,y){this.obstacles[this.idx(x,y)]=1;}
  sample(x,y){return this.current[this.idx(x,y)];}
  step({sources=[]}={}){const r=(this.waveSpeed*this.dt/this.dx)**2;for(let y=1;y<this.height-1;y++)for(let x=1;x<this.width-1;x++){const i=this.idx(x,y);if(this.obstacles[i]){this.next[i]=0;continue;}const lap=this.current[this.idx(x-1,y)]+this.current[this.idx(x+1,y)]+this.current[this.idx(x,y-1)]+this.current[this.idx(x,y+1)]-4*this.current[i];this.next[i]=(2-this.damping)*this.current[i]-(1-this.damping)*this.previous[i]+r*lap;}if(this.boundary==='fixed'){for(let x=0;x<this.width;x++){this.next[this.idx(x,0)]=0;this.next[this.idx(x,this.height-1)]=0;}for(let y=0;y<this.height;y++){this.next[this.idx(0,y)]=0;this.next[this.idx(this.width-1,y)]=0;}}for(const s of sources){if(s.x<0||s.x>=this.width||s.y<0||s.y>=this.height)continue;const value=typeof s.value==='function'?s.value(this.time+this.dt):s.value;this.next[this.idx(s.x,s.y)]+=value;}[this.previous,this.current,this.next]=[this.current,this.next,this.previous];this.next.fill(0);this.time+=this.dt;return this.current;}
}
