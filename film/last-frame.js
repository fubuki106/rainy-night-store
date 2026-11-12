window.createRainFilm = function (host) {
  "use strict";
  const {THREE:T,canvas,camera,controls,player,cat,props,bus,keys}=host;
  const lensMM=[28,40,65], fields=[47,35,23], labels=["伞下的人","末班巴士","便利店的灯","店后的三花"];
  const motifs=["umbrella","bus","store","cat"], storageKey="rainy-night-store/last-frame/1";
  let mode="street", intent="", roll=1, loaded=false, shots=[], mounted=null, mountedSrc="", mountedTitle="", sealed=false;
  let subject=0,lens=1,slow=false,exposure=null,cameraMove=null,cameraHome=null,follow=null;
  let routeTime=0,routeAttempts=0,flashTime=0,messageTimer=0,unlocked=false,lastBell="";
  const hud=document.createElement("div");
  hud.id="rain-film"; hud.hidden=true;
  hud.innerHTML=`
  <div class="rf-ticketbar">
    <button class="rf-ticket" data-f="ticket" type="button"><span class="rf-route">07</span><span><small>あじさい公園行き</small><b data-f="action">去公交亭领胶卷</b></span><kbd>F</kbd></button>
    <button class="rf-alt" data-f="alt" type="button" hidden></button>
  </div>
  <div class="rf-finder" data-f="finder" hidden>
    <div class="rf-gate" data-f="gate"><i></i><i></i><i></i><i></i><span class="rf-reticle"></span>
      <span class="rf-frame-id" data-f="id"></span><span class="rf-filmtype">COLOR NEG. 400</span></div>
    <div class="rf-film-head"><span class="rf-count" data-f="count"></span><button data-f="exit" type="button">收起相机 <kbd>F</kbd></button></div>
    <div class="rf-dials">
      <div class="rf-compose"><button data-f="prev" aria-label="上一个取景点" type="button">‹</button><span data-f="subject"></span><button data-f="next" aria-label="下一个取景点" type="button">›</button></div>
      <button class="rf-shutter" data-f="shoot" type="button" aria-label="拍摄当前画面"><i></i><span>快门 <kbd>Space</kbd></span></button>
      <div class="rf-settings"><button data-f="lens" type="button"></button><button data-f="speed" type="button"></button></div>
    </div>
    <button class="rf-develop" data-f="develop" type="button" hidden>回站台冲印 ↗</button>
  </div>
  <div class="rf-proof" data-f="proof" hidden><figure><div data-f="sheet"></div><figcaption><span data-f="printTitle"></span><span><button data-f="save" type="button">保存相纸</button> <button data-f="fold" type="button">收好相纸 <kbd>Esc</kbd></button></span></figcaption></figure></div>
  <output class="rf-msg" data-f="msg" aria-live="polite" hidden></output>`;
  document.body.append(hud);
  const ui={};hud.querySelectorAll("[data-f]").forEach(el=>ui[el.dataset.f]=el);
  const anchor=props.anchor;
  // The shelter is behind the guardrail. Reaching across it from the bus lane
  // would strand the photographer in front of the approaching bus.
  const near=()=>player.z<1.59&&Math.hypot(player.x-anchor.x,player.z-anchor.z)<.24;
  const movingKeys=new Set(["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"]);
  function message(value,ms=2400){
    clearTimeout(messageTimer);ui.msg.textContent=value;ui.msg.hidden=!value;
    if(value)messageTimer=setTimeout(()=>{ui.msg.hidden=true;},ms);
  }
  let audio=null;
  function enableSound(){
    if(!audio){const Audio=window.AudioContext||window.webkitAudioContext;if(Audio)try{audio=new Audio();}catch(_){}}
    if(audio&&audio.state==="suspended")audio.resume().catch(()=>{});
  }
  function sound(name){
    if(!audio||audio.state!=="running")return;
    const notes=name==="bus"?[[783,.20,0],[587,.32,.16]]:name==="print"?[[196,.10,0],[293,.19,.10]]:[[1800,.018,0],[510,.037,.024]];
    notes.forEach(([hz,len,gap])=>{
      const osc=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+gap;
      osc.type=name==="click"?"triangle":"sine";osc.frequency.setValueAtTime(hz,t);
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(name==="bus"?.034:.044,t+.005);
      g.gain.exponentialRampToValueAtTime(.0001,t+len);osc.connect(g);g.connect(audio.destination);osc.start(t);osc.stop(t+len+.01);
      osc.onended=()=>{osc.disconnect();g.disconnect();};
    });
  }
  function persist(){
    try{
      const frames=shots.map(s=>({src:s.src,title:s.title,time:s.time,motif:s.motif}));
      localStorage.setItem(storageKey,JSON.stringify({roll,loaded,sealed,frames,print:mountedSrc,title:mountedTitle}));
    }catch(_){message("这次的底片会保留到关窗为止");}
  }
  function decode(data){
    return new Promise((resolve,reject)=>{
      if(typeof data!=="string"||!/^data:image\/(?:jpeg|png);base64,/.test(data)||data.length>4500000){reject();return;}
      const im=new Image();im.onload=()=>{const c=document.createElement("canvas");c.width=im.width;c.height=im.height;c.getContext("2d").drawImage(im,0,0);resolve(c);};
      im.onerror=reject;im.src=data;
    });
  }
  async function restore(){
    try{
      const item=JSON.parse(localStorage.getItem(storageKey));if(!item)return;
      roll=Math.max(1,parseInt(item.roll)||1);loaded=!!item.loaded;
      for(const s of (Array.isArray(item.frames)?item.frames.slice(0,3):[])){
        try{const image=await decode(s.src);shots.push({image,src:s.src,title:String(s.title),time:String(s.time),motif:String(s.motif)});}catch(_){}
      }
      if(item.print){try{mounted=await decode(item.print);mountedSrc=item.print;mountedTitle=String(item.title||"雨夜双联");props.showPhoto(mounted);}catch(_){}}
      sealed=!!(item.sealed&&mounted);
      if(loaded)bus.start();
    }catch(_){}finally{unlocked=true;refresh();}
  }
  function refresh(){
    hud.dataset.mode=mode;document.body.classList.toggle("rf-busy",["finder","lab","exhibit","proof"].includes(mode));
    ui.finder.hidden=mode!=="finder";ui.proof.hidden=mode!=="proof";
    ui.ticket.closest(".rf-ticketbar").hidden=!["street","approach","exhibit"].includes(mode);
    ui.action.textContent= mode==="approach"?"正在走向公交亭":mode==="exhibit"?"细看这张相纸":sealed?"看站牌上的上一卷":loaded?(shots.length===3?"回站台冲印":"举起相机"):"去公交亭领胶卷";
    let extra="";
    if(mode==="approach")extra="取消";
    else if(mode==="exhibit")extra="回街上散步";
    else if(mode==="street"&&sealed)extra="领取新胶卷";
    else if(mode==="street"&&shots.length>=2)extra="回站台冲印";
    else if(mode==="street"&&mounted)extra="看上卷";
    ui.alt.textContent=extra;ui.alt.hidden=!extra;
    ui.subject.textContent=labels[subject];ui.lens.textContent=lensMM[lens]+" mm";ui.speed.textContent=slow?"1/4 s":"1/250 s";
    ui.lens.title="切换焦段 · L";ui.speed.title="切换快门速度 · T";
    ui.count.textContent="第 "+String(roll).padStart(2,"0")+" 卷　·　"+shots.length+" / 3";
    ui.id.textContent=String(roll).padStart(2,"0")+" — "+String(Math.min(3,shots.length+1)).padStart(2,"0");
    ui.shoot.disabled=!!exposure||shots.length>=3;ui.develop.hidden=shots.length<2;
    ui.shoot.querySelector("span").innerHTML=shots.length>=3?"胶卷已满":"快门 <kbd>Space</kbd>";
  }
  function suspendWalk(){keys.clear();player.path=null;player.target=null;player.vx=0;player.vz=0;}
  function holdCamera(){
    host.takeControl();
    if(!cameraHome)cameraHome={position:camera.position.clone(),target:controls.target.clone(),fov:camera.fov,mode:host.getMode()};
    cameraMove=null;follow=null;
  }
  function restoreCamera(){
    if(!cameraHome)return;
    const h=cameraHome;cameraHome=null;cameraMove=null;follow=null;camera.fov=h.fov;camera.updateProjectionMatrix();
    if(h.mode==="close"){host.setMode("close");}
    else {controls.target.copy(h.target);camera.position.copy(h.position);controls.update();}
  }
  const v=(x,y,z)=>new T.Vector3(x,y,z);
  function moveCamera(target,position,fov,time=.44){
    host.takeControl();cameraMove={from:controls.target.clone(),eye:camera.position.clone(),before:camera.fov,target,position,fov,elapsed:0,time:host.reduced?.01:time};
  }
  function compose(){
    let target,offset;follow=null;
    if(subject===0){
      // At the stop the lens looks through the gap between the round signpost
      // and the print cabinet, from the pavement side of the passing bus.
      const atStop=Math.hypot(player.x-anchor.x,player.z-anchor.z)<.36&&player.z<1.65;
      // The same 3:2 negative occupies a smaller part of a vertical screen.
      const gateHeight=ui.gate.getBoundingClientRect().height||parseFloat(getComputedStyle(ui.gate).width)*2/3||innerHeight*.67;
      const framing=Math.max(1,.67*innerHeight/gateHeight);
      const narrow=Math.min(1,(framing-1)/1.3);
      const a=atStop&&Math.sin(player.yaw)>.45?2.195-.09*narrow:player.yaw-.30;
      const dx=Math.sin(a),dz=Math.cos(a);
      target=v(player.x-dz*.05,player.y+.712-.014*narrow,player.z+dx*.05);
      const distance=.97*framing;
      let eyeX=player.x+dx*distance,eyeZ=player.z+dz*distance;
      if(atStop&&eyeZ>1.65){
        eyeZ=1.65;
        eyeX=player.x+(dx<0?-1:1)*Math.sqrt(Math.max(0,distance*distance-(eyeZ-player.z)**2));
      }
      offset=v(eyeX-target.x,.12,eyeZ-target.z);
      follow={kind:"player",x:player.x,z:player.z};
    }else if(subject===1){
      target=v(5.50,.51,2.04);offset=v(-3.12,1.08,3.32);
    }else if(subject===2){
      target=v(.62,.92,-.34);offset=v(-2.14,.32,4.25);
    }else{
      target=v(cat.x,.16,cat.z);let dx=cat.x-1.05,dz=cat.z+3.05;
      const len=Math.max(.6,Math.hypot(dx,dz));dx/=len;dz/=len;
      offset=v(dx*.66-.22,.48,Math.min(-.49,dz*.7));follow={kind:"cat",x:cat.x,z:cat.z};
    }
    moveCamera(target,target.clone().add(offset),fields[lens]);
  }
  function changeSubject(d){if(exposure)return;subject=(subject+d+labels.length)%labels.length;compose();refresh();}
  function changeLens(){if(exposure)return;lens=(lens+1)%fields.length;camera.fov=fields[lens];camera.updateProjectionMatrix();if(cameraMove)cameraMove.fov=camera.fov;refresh();}
  function finder(){
    if(!host.ready())return;bus.start();holdCamera();suspendWalk();mode="finder";compose();refresh();
    canvas.focus({preventScroll:true});
    if(!shots.length)message("拖动取景　·　‹ › 换机位　·　空格拍摄",3400);
  }
  function toStreet(){
    if(mode==="lab")printer.close();
    exposure=null;mode="street";restoreCamera();refresh();canvas.focus({preventScroll:true});
  }
  function examine(){
    if(!mounted)return;
    holdCamera();suspendWalk();mode="exhibit";
    const target=v(4.52,.81,1.22);moveCamera(target,v(3.30,1.00,.92),46,.65);refresh();
  }
  function proof(){
    if(!mounted)return;
    mode="proof";ui.sheet.replaceChildren(mounted);ui.printTitle.textContent=mountedTitle;refresh();ui.fold.focus({preventScroll:true});
  }
  function arrive(){
    const action=intent;intent="";suspendWalk();
    if(action==="print"){if(shots.length<2){toStreet();return;}mode="lab";holdCamera();refresh();printer.open(shots);return;}
    if(action==="show"){examine();return;}
    if(action==="new"){roll++;shots=[];sealed=false;}
    if(!loaded||action==="new"){loaded=true;persist();}
    bus.start(action==="new");lastBell="";finder();
  }
  function go(action){
    if(!host.ready()||!unlocked)return;
    enableSound();if(mode==="finder"&&exposure)return;
    intent=action;holdCamera();
    if(near()){arrive();return;}
    const ok=host.routeToStop(anchor);
    if(!ok){intent="";toStreet();message("沿人行道走到公交亭就能取件");return;}
    mode="approach";routeAttempts=0;routeTime=0;
    const tx=(player.x+anchor.x)/2,tz=(player.z+anchor.z)/2;
    let target=v(tx,.52,tz);moveCamera(target,target.clone().add(v(-.7,3.0,5.45)),39,.65);refresh();
    message("可以边走边看四周，方向键会接回控制",2500);
  }
  function mainAction(){
    if(!unlocked||!host.ready())return;
    enableSound();
    if(mode==="approach")return;
    if(mode==="exhibit"){proof();return;}
    if(mode==="finder"){toStreet();return;}
    if(mode!=="street")return;
    if(sealed)go("show");else if(!loaded)go("load");else if(shots.length===3)go("print");else finder();
  }
  function altAction(){
    if(mode==="approach"){cancelTravel();return;}
    if(mode==="exhibit"){toStreet();return;}
    if(sealed)go("new");else if(shots.length>=2)go("print");else if(mounted)go("show");
  }
  function cancelTravel(){if(mode==="approach"){intent="";suspendWalk();toStreet();}}
  function shoot(){
    if(mode!=="finder"||exposure||shots.length>=3)return;
    if(cameraMove){ // A quick shutter still uses the composition selected by the player.
      const m=cameraMove;camera.position.copy(m.position);controls.target.copy(m.target);camera.fov=m.fov;camera.updateProjectionMatrix();controls.update();cameraMove=null;
    }
    enableSound();sound("click");const im=document.createElement("canvas");im.width=864;im.height=576;
    exposure={image:im,ctx:im.getContext("2d"),samples:0,start:0,slow,subject,lens};refresh();
  }
  function afterRender(){
    if(!exposure||mode!=="finder")return;
    const exp=exposure, now=performance.now();if(!exp.samples)exp.start=now;
    const a=ui.gate.getBoundingClientRect(),b=canvas.getBoundingClientRect();if(!a.width||!b.width){exposure=null;refresh();return;}
    const sx=canvas.width/b.width,sy=canvas.height/b.height,g=exp.ctx;
    g.globalAlpha=1/(exp.samples+1);g.drawImage(canvas,(a.left-b.left)*sx,(a.top-b.top)*sy,a.width*sx,a.height*sy,0,0,exp.image.width,exp.image.height);
    g.globalAlpha=1;exp.samples++;
    if(exp.slow&&now-exp.start<245)return;
    exposure=null;
    const n=shots.length+1,title=labels[exp.subject], time=lensMM[exp.lens]+" mm · "+(exp.slow?"1/4":"1/250")+" s";
    shots.push({image:exp.image,src:exp.image.toDataURL("image/jpeg",.86),motif:motifs[exp.subject],title,time});
    persist();flashTime=.12;hud.classList.add("rf-flash");refresh();
    message(n===3?"胶卷已满，可以回站台冲印了":"已收进第 "+n+" 格底片",1950);
  }
  const printer=window.createContactPrinter({onClose:()=>{toStreet();message("底片还在相机里");},onPrint:({canvas:sheet,title})=>{
    mounted=sheet;mountedSrc=sheet.toDataURL("image/png");mountedTitle=title;sealed=true;props.showPhoto(sheet);persist();sound("print");
    examine();message("这两格已经亮在公交亭里了",3200);
  }});
  function tick(dt,t){
    if(hud.hidden&&unlocked&&host.ready())hud.hidden=false;
    if(flashTime>0){flashTime-=dt;if(flashTime<=0)hud.classList.remove("rf-flash");}
    bus.update(dt,player);
    if(bus.phase!==lastBell){if(bus.phase==="stopped"&&mode!=="lab")sound("bus");lastBell=bus.phase;}
    props.update({phase:mode==="lab"?"developing":sealed?"mounted":loaded?"loaded":"idle"},t);
    if(mode==="approach"){
      routeTime+=dt;
      if(near()){arrive();}
      else if(!player.target||routeTime>17){
        if(++routeAttempts>2||!host.routeToStop(anchor)){cancelTravel();message("到了站牌旁，可以按 F 取件");}routeTime=0;
      }
    }
    if(cameraMove){
      const m=cameraMove;m.elapsed+=dt;const q=Math.min(1,m.elapsed/m.time), k=q*q*(3-2*q);
      controls.target.lerpVectors(m.from,m.target,k);camera.position.lerpVectors(m.eye,m.position,k);
      camera.fov=m.before+(m.fov-m.before)*k;camera.updateProjectionMatrix();if(q===1)cameraMove=null;
    }else if(mode==="finder"&&follow){
      const obj=follow.kind==="cat"?cat:player,dx=obj.x-follow.x,dz=obj.z-follow.z;
      controls.target.x+=dx;controls.target.z+=dz;camera.position.x+=dx;camera.position.z+=dz;
      follow.x=obj.x;follow.z=obj.z;
    }
  }
  function hit(ray){
    if(mode==="finder"||mode==="exhibit")return true;
    if(mode!=="street")return false;
    const h=ray.intersectObjects(props.targets,false)[0];if(!h)return false;
    const action=h.object.userData.filmTarget==="lightbox"&&mounted?"show":sealed?"show":shots.length>=2?"print":loaded?"shoot":"load";
    go(action);return true;
  }
  ui.ticket.onclick=mainAction;ui.alt.onclick=altAction;ui.exit.onclick=toStreet;
  ui.prev.onclick=()=>changeSubject(-1);ui.next.onclick=()=>changeSubject(1);ui.shoot.onclick=shoot;
  ui.lens.onclick=changeLens;ui.speed.onclick=()=>{if(!exposure){slow=!slow;refresh();}};ui.develop.onclick=()=>go("print");
  ui.save.onclick=()=>{if(mounted)mounted.toBlob(blob=>{
    if(!blob)return;
    const url=URL.createObjectURL(blob),link=document.createElement("a");
    link.href=url;link.download="雨夜双联-"+String(roll).padStart(2,"0")+".png";document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  },"image/png");};
  ui.fold.onclick=()=>{mode="exhibit";refresh();canvas.focus({preventScroll:true});};
  controls.addEventListener("start",()=>{if(mode==="finder"||mode==="exhibit")cameraMove=null;});
  window.addEventListener("keydown",e=>{
    if(e.metaKey||e.ctrlKey||e.altKey||mode==="lab"||!unlocked||hud.hidden)return;
    if(mode==="approach"&&movingKeys.has(e.code)){cancelTravel();return;}
    let action=null;
    if(e.code==="Escape"&&mode!=="street")action=mode==="proof"?ui.fold.onclick:mode==="approach"?cancelTravel:toStreet;
    else if(mode==="proof")return;
    else if(e.code==="KeyF")action=mainAction;
    else if(mode==="finder"){
      if(e.code==="Space")action=shoot;
      if(e.code==="BracketLeft"||e.code==="ArrowLeft")action=()=>changeSubject(-1);
      if(e.code==="BracketRight"||e.code==="ArrowRight")action=()=>changeSubject(1);
      if(e.code==="KeyL")action=changeLens;if(e.code==="KeyT")action=ui.speed.onclick;
      if(e.code==="KeyE"&&shots.length>=2)action=()=>go("print");
    }
    if(action){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)action();}
  },true);
  refresh();restore();
  return {tick,afterRender,hit,cancelTravel,get controlsCamera(){return mode!=="street";},
    get locksWalk(){return ["lab","proof","exhibit"].includes(mode);},
    info:()=>({mode,loaded,roll,sealed,count:shots.length,subject,lens:lensMM[lens],slow,bus:bus.phase,door:bus.door,hasPrint:!!mounted})};
};
