import { solveDCNetwork } from '../../circuits-engine/src/mna.mjs';

const norm=n=>(n===0||n==='0'||n==='gnd'||n==='ground')?'0':String(n);
const V=(result,a,b='0')=>(result.nodeVoltages?.[norm(a)]??0)-(result.nodeVoltages?.[norm(b)]??0);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

export class ActiveCircuitNetwork {
  constructor({maxIterations=50,tolerance=1e-8}={}){this.linear=[];this.active=[];this.maxIterations=maxIterations;this.tolerance=tolerance;this.state={thyristors:{}};this.lastResult={nodeVoltages:{'0':0},branchCurrents:{},activeStates:{}};}
  resistor(id,a,b,r){if(!(r>0))throw new Error('resistance must be > 0');this.linear.push({id,type:'resistor',from:norm(a),to:norm(b),resistance:Number(r)});return this;}
  voltageSource(id,a,b,v){this.linear.push({id,type:'voltageSource',from:norm(a),to:norm(b),voltage:Number(v)});return this;}
  currentSource(id,a,b,i){this.linear.push({id,type:'currentSource',from:norm(a),to:norm(b),current:Number(i)});return this;}
  switch(id,a,b,closed,{onResistance=1e-6,offResistance=1e12}={}){return this.resistor(id,a,b,closed?onResistance:offResistance);}
  bjt(id,{collector,base,emitter,type='npn',beta=100,vbeOn=0.65,baseResistance=1000,outputResistance=1e6,saturationResistance=5}={}){this.active.push({id,kind:'bjt',collector:norm(collector),base:norm(base),emitter:norm(emitter),type,beta,vbeOn,baseResistance,outputResistance,saturationResistance});return this;}
  mosfet(id,{drain,gate,source,type='n',threshold=2.5,onResistance=.5,offResistance=1e9}={}){this.active.push({id,kind:'mosfet',drain:norm(drain),gate:norm(gate),source:norm(source),type,threshold,onResistance,offResistance});return this;}
  opamp(id,{output,inverting,noninverting,reference='0',gain=1e5}={}){this.active.push({id,kind:'opamp',output:norm(output),inverting:norm(inverting),noninverting:norm(noninverting),reference:norm(reference),gain});return this;}
  relaySPDT(id,{com,no,nc,coil1,coil2,coilResistance=120,pickupCurrent=.03,contactResistance=.02,offResistance=1e12}={}){this.active.push({id,kind:'relay-spdt',com:norm(com),no:norm(no),nc:norm(nc),coil1:norm(coil1),coil2:norm(coil2),coilResistance,pickupCurrent,contactResistance,offResistance});return this;}
  relayDPDT(id,{coil1,coil2,poles=[],coilResistance=120,pickupCurrent=.03,contactResistance=.02,offResistance=1e12}={}){this.active.push({id,kind:'relay-dpdt',coil1:norm(coil1),coil2:norm(coil2),poles:poles.map(p=>({com:norm(p.com),no:norm(p.no),nc:norm(p.nc)})),coilResistance,pickupCurrent,contactResistance,offResistance});return this;}
  thyristor(id,{anode,gate,cathode,gateThreshold=.7,holdingCurrent=.01,onResistance=.8,offResistance=1e12}={}){this.active.push({id,kind:'thyristor',anode:norm(anode),gate:norm(gate),cathode:norm(cathode),gateThreshold,holdingCurrent,onResistance,offResistance});if(!(id in this.state.thyristors))this.state.thyristors[id]=false;return this;}
  reset(){for(const id of Object.keys(this.state.thyristors))this.state.thyristors[id]=false;this.lastResult={nodeVoltages:{'0':0},branchCurrents:{},activeStates:{}};}
  solve(){
    let guess=this.lastResult?.nodeVoltages??{'0':0}, solved=null, activeStates={};
    for(let iter=0;iter<this.maxIterations;iter++){
      const linear=this.linear.map(x=>({...x}));activeStates={};
      for(const a of this.active){
        if(a.kind==='opamp'){
          linear.push({id:a.id,type:'vcvs',from:a.output,to:a.reference,controlFrom:a.noninverting,controlTo:a.inverting,gain:a.gain,offset:0});
          activeStates[a.id]={kind:a.kind,differential:V({nodeVoltages:guess},a.noninverting,a.inverting)};
        } else if(a.kind==='mosfet'){
          const vg=a.type==='p'?V({nodeVoltages:guess},a.source,a.gate):V({nodeVoltages:guess},a.gate,a.source);
          const on=vg>=a.threshold;linear.push({id:a.id,type:'resistor',from:a.drain,to:a.source,resistance:on?a.onResistance:a.offResistance});activeStates[a.id]={kind:a.kind,on,gateDrive:vg};
        } else if(a.kind==='bjt'){
          const polarity=a.type==='pnp'?-1:1;
          const vbe=polarity*V({nodeVoltages:guess},a.base,a.emitter);
          const on=vbe>a.vbeOn;
          const rb=on?a.baseResistance:1e12;
          const eq=on?(-a.vbeOn/rb)*polarity:0;
          linear.push({id:`${a.id}::be`,type:'resistor',from:a.base,to:a.emitter,resistance:rb});
          if(eq)linear.push({id:`${a.id}::be-eq`,type:'currentSource',from:a.base,to:a.emitter,current:eq});
          const ib=on?Math.max(0,(vbe-a.vbeOn)/a.baseResistance):0;
          const vce=polarity*V({nodeVoltages:guess},a.collector,a.emitter);
          const ic=Math.min(a.beta*ib,Math.max(0,vce)/a.saturationResistance);
          linear.push({id:`${a.id}::ro`,type:'resistor',from:a.collector,to:a.emitter,resistance:a.outputResistance});
          if(ic>0)linear.push({id:`${a.id}::controlled`,type:'currentSource',from:a.collector,to:a.emitter,current:polarity*ic});
          activeStates[a.id]={kind:a.kind,on,baseCurrent:ib,collectorCurrent:polarity*ic,vbe:polarity*vbe};
        } else if(a.kind==='relay-spdt'||a.kind==='relay-dpdt'){
          linear.push({id:`${a.id}::coil`,type:'resistor',from:a.coil1,to:a.coil2,resistance:a.coilResistance});
          const coilCurrent=Math.abs(V({nodeVoltages:guess},a.coil1,a.coil2)/a.coilResistance),energized=coilCurrent>=a.pickupCurrent;
          const poles=a.kind==='relay-spdt'?[{com:a.com,no:a.no,nc:a.nc}]:a.poles;
          poles.forEach((p,i)=>{linear.push({id:`${a.id}::${i}:no`,type:'resistor',from:p.com,to:p.no,resistance:energized?a.contactResistance:a.offResistance});linear.push({id:`${a.id}::${i}:nc`,type:'resistor',from:p.com,to:p.nc,resistance:energized?a.offResistance:a.contactResistance});});
          activeStates[a.id]={kind:a.kind,energized,coilCurrent};
        } else if(a.kind==='thyristor'){
          const gateOn=V({nodeVoltages:guess},a.gate,a.cathode)>=a.gateThreshold;
          if(gateOn)this.state.thyristors[a.id]=true;
          const latched=this.state.thyristors[a.id];
          linear.push({id:a.id,type:'resistor',from:a.anode,to:a.cathode,resistance:latched?a.onResistance:a.offResistance});
          activeStates[a.id]={kind:a.kind,latched,gateOn};
        }
      }
      solved=solveDCNetwork(linear);
      let delta=0;const keys=new Set([...Object.keys(guess),...Object.keys(solved.nodeVoltages)]);for(const k of keys)delta=Math.max(delta,Math.abs((guess[k]??0)-(solved.nodeVoltages[k]??0)));guess=solved.nodeVoltages;if(delta<this.tolerance)break;
    }
    const branchCurrents={...solved.branchCurrents};
    for(const a of this.active){
      const st=activeStates[a.id]??{};
      if(a.kind==='bjt')branchCurrents[a.id]=st.collectorCurrent??0;
      if(a.kind==='relay-spdt'||a.kind==='relay-dpdt')branchCurrents[a.id]=st.coilCurrent??0;
      if(a.kind==='thyristor'){
        branchCurrents[a.id]=solved.branchCurrents[a.id]??0;
        if(this.state.thyristors[a.id]&&!st.gateOn&&Math.abs(branchCurrents[a.id])<a.holdingCurrent)this.state.thyristors[a.id]=false;
        st.latched=this.state.thyristors[a.id];
      }
    }
    this.lastResult={...solved,branchCurrents,activeStates};return this.lastResult;
  }
}
