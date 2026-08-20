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
    if(/logic-input|push-button-logic-input/.test(id))return {supported:true,kind:'logic-input',labelFa:'ورودی منطقی'};
    if(/logic-output/.test(id))return {supported:true,kind:'logic-output',labelFa:'خروجی منطقی'};
    if(/(?:7400|7402|7404|7408|7410|7414|7420|7432|7486)$/.test(id))return {supported:true,kind:'logic-gate',labelFa:'گیت منطقی'};
    if(/seven-segment-display/.test(id))return {supported:true,kind:'seven-segment',labelFa:'نمایشگر هفت‌قسمتی'};
    if(/7474/.test(id))return {supported:true,kind:'d-flipflop',labelFa:'فلیپ‌فلاپ D'};
    if(/7473|4027/.test(id))return {supported:true,kind:'jk-flipflop',labelFa:'فلیپ‌فلاپ JK'};
    if(/4043/.test(id))return {supported:true,kind:'rs-latch',labelFa:'لچ RS'};
    if(/4017/.test(id))return {supported:true,kind:'decade-counter',labelFa:'شمارنده ده‌دهی'};
    if(/4518/.test(id))return {supported:true,kind:'bcd-counter',labelFa:'شمارنده BCD'};
    if(/4026/.test(id))return {supported:true,kind:'counter-seven-segment',labelFa:'شمارنده/هفت‌قسمتی'};
    if(/4511/.test(id))return {supported:true,kind:'bcd-seven-segment',labelFa:'دیکودر BCD به هفت‌قسمتی'};
    if(/4028/.test(id))return {supported:true,kind:'bcd-decimal',labelFa:'دیکودر BCD به ده‌دهی'};
    if(/\.clock$/.test(id))return {supported:true,kind:'logic-clock',labelFa:'کلاک منطقی'};
    if(/battery|current$/.test(id))return {supported:true,kind:'source',labelFa:'منبع الکتریکی'};
    if(/vresistor|potentiometer/.test(id))return {supported:true,kind:'variable-resistor',labelFa:'مقاومت متغیر'};
    if(/ldr|thermistor/.test(id))return {supported:true,kind:'sensor-resistor',labelFa:'حسگر مقاومتی'};
    if(/resistor/.test(id))return {supported:true,kind:'resistor',labelFa:'مقاومت'};
    if(/spst|spdt|dpst|dpdt|pushmake|pushbreak|floatswitch|switch/.test(id))return {supported:true,kind:'switch',labelFa:'کلید'};
    if(/led/.test(id))return {supported:true,kind:'led',labelFa:'دیود نورافشان'};
    if(/lamp/.test(id))return {supported:true,kind:'lamp',labelFa:'لامپ'};
    if(/motor/.test(id))return {supported:true,kind:'motor',labelFa:'موتور'};
    if(/buzzer|loudspeaker/.test(id))return {supported:true,kind:'sound-output',labelFa:'خروجی صوتی'};
    if(/fuse/.test(id))return {supported:true,kind:'fuse',labelFa:'فیوز'};
    if(/ammeter/.test(id))return {supported:true,kind:'ammeter',labelFa:'آمپرمتر'};
    if(/voltmeter/.test(id))return {supported:true,kind:'voltmeter',labelFa:'ولت‌متر'};
    if(/(?:^|\.)npn$|(?:^|\.)pnp$/.test(id))return {supported:true,kind:'bjt',labelFa:'ترانزیستور دوقطبی'};
    if(/mosfetn|mosfetp/.test(id))return {supported:true,kind:'mosfet',labelFa:'ماسفت'};
    if(/opamp-741|opamp-324/.test(id))return {supported:true,kind:'opamp',labelFa:'تقویت‌کننده عملیاتی'};
    if(/spdt-relay|dpdt-relay/.test(id))return {supported:true,kind:'relay',labelFa:'رله'};
    if(/thyristor/.test(id))return {supported:true,kind:'thyristor',labelFa:'تریستور'};
    if(/capacitor|inductor|diode|zener/.test(id))return {supported:true,kind:'dynamic-circuit',labelFa:'قطعه مدار گذرا'};
    if(/vslide|vpulse|\.clock$/.test(id))return {supported:true,kind:'source',labelFa:'منبع سیگنال/ولتاژ'};
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
  } else if(domain==='circuits' && scene?.simulation?.circuitMode==='digital'){
    for(const part of scene.parts??[]){
      const digital=state.parts?.[part.instanceId]??{}, target=frame.parts[part.instanceId];
      if(!target)continue;
      const value=digital.value??digital.output;
      if(typeof value==='boolean'){target.active=value;target.value=value?1:0;target.logic=value;target.display=value?'۱':'۰';}
      if(digital.kind==='gate'){target.inputs=digital.inputs;target.logic=digital.output;target.active=Boolean(digital.output);target.display=digital.output?'۱':'۰';}
      if(digital.kind==='seven-segment'||digital.kind==='bcd-seven-segment'||digital.kind==='counter-seven-segment'){target.segments=digital.segments;target.digit=digital.digit;target.active=Number.isInteger(digital.digit)?true:Object.values(digital.segments??{}).some(Boolean);target.display=Number.isInteger(digital.digit)?String(digital.digit):'—';}
      if(['d-flipflop','jk-flipflop','rs-latch'].includes(digital.kind)){target.logic=Boolean(digital.q);target.active=Boolean(digital.q);target.value=digital.q?1:0;target.display=digital.q?'Q=۱':'Q=۰';}
      if(['decade-counter','bcd-counter','bcd-decimal'].includes(digital.kind)){target.count=digital.count??digital.digit;target.digit=digital.digit;target.active=true;target.display=Number.isInteger(digital.count)?String(digital.count):(Number.isInteger(digital.digit)?String(digital.digit):'—');}
    }
    for(const conflict of state.conflicts??[])frame.warnings.push(`تعارض منطقی روی ${conflict.net}`);
  } else if(domain==='circuits'){
    for(const part of scene.parts??[]){
      const id=idOf(part), current=state.branchCurrents?.[part.instanceId];
      if(Number.isFinite(current)){frame.parts[part.instanceId].value=current;frame.parts[part.instanceId].active=Math.abs(current)>1e-6;}
      if(/lamp/.test(id)){const nominal=finite(part.properties?.nominalCurrent)||0.2;frame.parts[part.instanceId].intensity=Math.max(0,Math.min(1,Math.abs(finite(current))/nominal));}
      if(/led/.test(id)){const nominal=finite(part.properties?.nominalCurrent)||0.02;frame.parts[part.instanceId].intensity=Math.max(0,Math.min(1,Math.abs(finite(current))/nominal));frame.parts[part.instanceId].display=`${(Math.abs(finite(current))*1000).toFixed(1)} mA`;}
      if(/motor/.test(id)){const nominal=finite(part.properties?.nominalCurrent)||0.2;frame.parts[part.instanceId].speed=Math.max(0,Math.min(1,Math.abs(finite(current))/nominal));frame.parts[part.instanceId].display=`${Math.abs(finite(current)).toFixed(3)} A`;}
      if(/buzzer|loudspeaker/.test(id)){frame.parts[part.instanceId].soundLevel=Math.max(0,Math.min(1,Math.abs(finite(current))/(finite(part.properties?.nominalCurrent)||0.1)));}
      if(/fuse/.test(id))frame.parts[part.instanceId].blown=(state.blownFuses??[]).includes(part.instanceId);
      if(/ammeter/.test(id))frame.parts[part.instanceId].display=`${Math.abs(finite(current)).toFixed(3)} A`;
      if(/voltmeter/.test(id)){const nodes=state.partNodes?.[part.instanceId],v=nodes?(finite(state.nodeVoltages?.[nodes.a])-finite(state.nodeVoltages?.[nodes.b])):0;frame.parts[part.instanceId].display=`${v.toFixed(3)} V`;frame.parts[part.instanceId].value=v;}
      const active=state.activeStates?.[part.instanceId];
      if(active?.kind==='bjt'){frame.parts[part.instanceId].active=Boolean(active.on);frame.parts[part.instanceId].value=active.collectorCurrent;frame.parts[part.instanceId].display=`Ic=${(Math.abs(finite(active.collectorCurrent))*1000).toFixed(1)} mA`;frame.parts[part.instanceId].baseCurrent=active.baseCurrent;}
      if(active?.kind==='mosfet'){frame.parts[part.instanceId].active=Boolean(active.on);frame.parts[part.instanceId].display=`Vg=${finite(active.gateDrive).toFixed(2)} V`;}
      if(active?.kind==='opamp'){const out=state.partPortNodes?.[part.instanceId]?.output,v=out?finite(state.nodeVoltages?.[out]):0;frame.parts[part.instanceId].active=true;frame.parts[part.instanceId].value=v;frame.parts[part.instanceId].display=`Vo=${v.toFixed(3)} V`;}
      if(active?.kind==='relay-spdt'||active?.kind==='relay-dpdt'){frame.parts[part.instanceId].active=Boolean(active.energized);frame.parts[part.instanceId].display=active.energized?'رله وصل':'رله آزاد';frame.parts[part.instanceId].coilCurrent=active.coilCurrent;}
      if(active?.kind==='thyristor'){frame.parts[part.instanceId].active=Boolean(active.latched);frame.parts[part.instanceId].display=active.latched?'Latch روشن':'خاموش';}
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

export function isInteractiveLogicInput(partId=''){return /logic-input|push-button-logic-input/i.test(String(partId));}

export function isInteractiveSwitch(partId=''){
  return /(?:spst|spdt|dpst|dpdt|pushmake|pushbreak|floatswitch|switch)/i.test(String(partId));
}
