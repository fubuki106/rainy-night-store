/* One optional reflection on the original player's hair cards.
   No new geometry, textures, lights, expression weights or animation tracks. */
window.createRainHairFinish=function(){
  "use strict";
  const key="rainy-night-store/hair-reflection/1";
  let mode="original",material=null,label=null,timer;
  try{if(localStorage.getItem(key)==="soft")mode="soft";}catch(_){}
  // vHS is distance below the cap in model space. Keep a quiet, broken
  // reflection along the curve of the locks; it should never outline the hat.
  const fragment=`#ifdef PROC_HAIR
    {
      vec3 tangent=normalize(vHT), eye=normalize(vViewPosition);
      vec3 lamp=normalize((viewMatrix*vec4(uKeyDir,0.0)).xyz);
      vec3 n=normalize(normal), halfDir=normalize(lamp+eye);
      float facing=abs(dot(n,eye)), light=smoothstep(-.22,.70,dot(n,lamp));
      float th=dot(tangent,halfDir);
      float lengthwise=sqrt(max(0.0,1.0-th*th));
      float across=fract(vUv.x*4.0);
      float fibre=.68+.32*cos(6.283*(across-.37)+.48*sin(2.0*vHR));
      float height=.052+.016*sin(1.7*vHR+.23)+.004*(across-.5);
      float crown=1.0-smoothstep(.004,.045,abs(vHS-height));
      float turn=smoothstep(.08,.78,facing)*(.20+.80*light);
      float tip=1.0-.45*smoothstep(.64,.99,vUv.y);
      float body=(.018*pow(lengthwise,4.0)+.066*pow(lengthwise,18.0)*fibre)*tip;
      float gloss=(.116*crown*fibre*turn+body*(.30+.70*light))*smoothstep(.005,.065,vUv.y);
      reflectedLight.directDiffuse+=uHairHi*vec3(.97,.95,.88)*gloss;
      reflectedLight.directDiffuse+=uHairRim*pow(1.0-clamp(facing,0.0,1.0),3.0)*.81;
    }
#endif
`;
  function announce(){
    if(!label){label=document.createElement("output");label.id="hair-finish-label";label.setAttribute("aria-live","polite");document.body.append(label);}
    label.textContent=mode==="soft"?"发丝 · 柔光":"发丝 · 原版";label.hidden=false;
    clearTimeout(timer);timer=setTimeout(()=>{label.hidden=true;},1400);
  }
  function set(value,feedback=true){
    if(value!=="soft"&&value!=="original")return mode;
    if(value!==mode){
      mode=value;if(material)material.needsUpdate=true;
      try{mode==="soft"?localStorage.setItem(key,"soft"):localStorage.removeItem(key);}catch(_){}
    }
    if(feedback)announce();return mode;
  }
  const toggle=()=>set(mode==="original"?"soft":"original");
  window.addEventListener("keydown",e=>{
    if(e.code!=="KeyH"||e.repeat||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||e.defaultPrevented||
      e.target?.closest?.('input, textarea, select, [contenteditable="true"]'))return;
    e.preventDefault();toggle();
  });
  return {fragment,get mode(){return mode;},bind:m=>{material=m;},set,toggle};
};
