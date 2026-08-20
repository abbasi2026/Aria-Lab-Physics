const idOf = part => String(part?.partId ?? '').toLowerCase();
const finite = v => Number.isFinite(Number(v)) ? Number(v) : 0;

export function executableCapability(partId='') {
  const id=String(partId).toLowerCase();
  if(id.startsWith('optics.')){
    if(/raybox|torch|\.lamp$|nearaxisobject|faraxisobject/.test(id))return {supported:true,kind:'light-source',labelFa:'منبع/جسم نوری'};
    if(/convexlens|concavelens/.test(id))return {supported:true,kind:'lens',labelFa:'عدسی'};
    if(/mirror/.test(id))return {supported:true,kind:'mirror',labelFa:'آینه'};
    if(/projection/.test(id))return {supported:true,kind:'screen',labelFa:'پرده'};
    if(/adjustableslit/.test(id))return {supported:true,kind:'aperture',labelFa:'شکاف'};
    if(/transparentblock|prism|semicircularblock/.test(id))return {supported:true,kind:'transparent',labelFa:'جسم شفاف'};
    if(/opaqueball|opaqueblock|opaquetriangle/.test(id))return {supported:true,kind:'opaque',labelFa:'جسم کدر'};
    if(/eye/.test(id))return {supported:true,kind:'eye',labelFa:'چشم'};
    if(/opticalspace2/.test(id))return {supported:true,kind:'optical-medium',labelFa:'محیط اپتیکی'};
    return {supported:false,kind:'optics',labelFa:'اپتیک — در حال توسعه'};
  }
  if(id.startsWith('circuits.')){
    if(/battery|current$/.test(id))return {supported:true,kind:'source',labelFa:'منبع الکتریکی'};
    if(/resistor/.test(id))return {supported:true,kind:'resistor',labelFa:'مقاومت'};
    if(/spst|spdt|dpst|dpdt|pushmake|pushbreak|floatswitch|switch/.test(id))return {supported:true,kind:'switch',labelFa:'کلید'};
    if(/lamp/.test(id))return {supported:true,kind:'lamp',labelFa:'لامپ'};
    if(/ammeter/.test(id))return {supported:true,kind:'ammeter',labelFa:'آمپرمتر'};
    if(/voltmeter/.test(id))return {supported:true,kind:'voltmeter',labelFa:'ولت‌متر'};
    if(/capacitor|inductor|diode/.test(id))return {supported:true,kind:'dynamic-circuit',labelFa:'قطعه مدار گذرا'};
    return {supported:false,kind:'circuit',labelFa:'مدار — در حال توسعه'};
  }
  if(id.startsWith('mechanics.')){
    if(/ball/.test(id))return {supported:true,kind:'ball',labelFa:'جسم کروی'};
    if(/block|ground/.test(id))return {supported:true,kind:'rigid-body',labelFa:'جسم صلب'};
    if(/spring/.test(id))return {supported:true,kind:'spring',labelFa:'فنر'};
    return {supported:false,kind:'mechanics',labelFa:'مکانیک — در حال توسعه'};
  }
  if(id.startsWith('waves.')){
    if(/source/.test(id))return {supported:true,kind:'wave-source',labelFa:'منبع موج'};
    if(/space|propagation|interference|reflection|penetration|pinned|plucking/.test(id))return {supported:true,kind:'wave-medium',labelFa:'محیط موج'};
    if(/obstacle|slit|reflector/.test(id))return {supported:true,kind:'wave-boundary',labelFa:'مانع/مرز موج'};
    return {supported:false,kind:'waves',labelFa:'موج — در حال توسعه'};
  }
  return {supported:false,kind:'unknown',labelFa:'در حال توسعه'};
}

export function buildExecutionFrame(scene, runtimeSnapshot){
  const state=runtimeSnapshot?.state??{}; const domain=runtimeSnapshot?.domain??scene?.domain;
  const frame={domain,time:finite(runtimeSnapshot?.time),parts:{},overlays:{rays:[],focus:null,wave:null},warnings:[]};
  for(const part of scene?.parts??[]){
    const capability=executableCapability(part.partId); frame.parts[part.instanceId]={...capability,active:false,value:null};
  }
  if(domain==='optics'){
    frame.overlays.rays=(state.rays??(state.path?[{path:state.path}]:[])).map(r=>({path:(r.path??[]).map(p=>({x:finite(p.point?.x),y:finite(p.point?.y),event:p.event??''}))}));
    if(state.focus&&Number.isFinite(state.focus.x)&&Number.isFinite(state.focus.y))frame.overlays.focus={x:state.focus.x,y:state.focus.y};
    for(const part of scene.parts??[]) frame.parts[part.instanceId].active=frame.parts[part.instanceId].supported;
  } else if(domain==='circuits'){
    for(const part of scene.parts??[]){
      const id=idOf(part), current=state.branchCurrents?.[part.instanceId];
      if(Number.isFinite(current)){frame.parts[part.instanceId].value=current;frame.parts[part.instanceId].active=Math.abs(current)>1e-6;}
      if(/lamp/.test(id)){const nominal=finite(part.properties?.nominalCurrent)||0.2;frame.parts[part.instanceId].intensity=Math.max(0,Math.min(1,Math.abs(finite(current))/nominal));}
      if(/spst|spdt|dpst|dpdt|pushmake|pushbreak|switch/.test(id))frame.parts[part.instanceId].closed=Boolean(part.properties?.closed??part.properties?.on??!id.includes('pushbreak'));
    }
    if(state.error)frame.warnings.push(state.error);
  } else if(domain==='mechanics'){
    for(const body of state.bodies??[]){if(frame.parts[body.id]){frame.parts[body.id].active=true;frame.parts[body.id].position=body.position;frame.parts[body.id].velocity=body.velocity;frame.parts[body.id].angle=body.angle;}}
  } else if(domain==='waves'){
    frame.overlays.wave=state.width&&state.height?{width:state.width,height:state.height,values:state.values??[],energy:finite(state.energy)}:null;
    for(const part of scene.parts??[])frame.parts[part.instanceId].active=frame.parts[part.instanceId].supported;
  }
  return frame;
}

export function isInteractiveSwitch(partId=''){
  return /(?:spst|spdt|dpst|dpdt|pushmake|pushbreak|floatswitch|switch)/i.test(String(partId));
}
