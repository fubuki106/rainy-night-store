window.createStreetWalk = function (host) {
  "use strict";
  const {THREE:T,scene,camera,controls,canvas,player,cat,chime,notice,bus}=host;
  const storage="rainy-night-store/cat-notice/1";
  let seen=false,following=false;
  try{seen=localStorage.getItem(storage)==="seen";}catch(_){}
  notice.print(seen);
  let walk=null, view=null, focusKind="", action="",lastInteraction="",statusTime=0, pace=0, searchTime=0, lastReplies=0;
  const v=(x,y,z)=>new T.Vector3(x,y,z),dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  const catAim=v(0,0,0);
  const container=document.createElement("div");container.id="rain-walk";container.hidden=true;
  container.innerHTML='<button type="button" class="rw-action" hidden><kbd>E</kbd><span></span></button><output aria-live="polite" hidden></output>';
  document.body.append(container);
  const button=container.querySelector("button"),label=button.querySelector("span"),status=container.querySelector("output");
  const words={front:"看窗上的寻猫启事",side:"看寻猫启事",cat:"和三花打招呼",chime:"轻拨风铃",wait:"等一会儿 07 路"};
  const stop=v(5.53,.06,1.49);
  // A narrow enamel timetable fits on the original round bus-stop post.
  const times=document.createElement("canvas");times.width=160;times.height=250;
  const tg=times.getContext("2d");tg.fillStyle="#e3dfca";tg.fillRect(0,0,160,250);
  tg.fillStyle="#3c6668";tg.fillRect(0,0,160,51);tg.fillStyle="#f4ead3";tg.font="bold 32px sans-serif";tg.fillText("07",12,37);
  tg.fillStyle="#374543";tg.font='600 15px "Hiragino Sans",sans-serif';tg.fillText("あじさい公園",10,81);
  tg.strokeStyle="#a3a18e";tg.font="19px Menlo,monospace";
  ["22:35","23:10","23:47"].forEach((time,i)=>{const y=117+43*i;tg.fillStyle=i===2?"#a54e33":"#3e504f";tg.fillText(time,30,y);tg.beginPath();tg.moveTo(12,y+8);tg.lineTo(148,y+8);tg.stroke();});
  tg.fillStyle="#465952";tg.font='13px "Hiragino Sans",sans-serif';tg.fillText("最終バス",14,238);
  const scheduleMap=new T.CanvasTexture(times);scheduleMap.encoding=T.sRGBEncoding;
  const timetable=new T.Mesh(new T.BoxGeometry(.19,.29,.025),new T.MeshBasicMaterial({map:scheduleMap,color:0xfff4e3}));
  timetable.name="07 路末班时刻表";timetable.position.set(6.05,1.07,1.447);scene.add(timetable);
  const touchables=notice.targets.concat(chime.targets,[timetable]);
  function say(s,t=3.8){status.textContent=s;status.hidden=!s;statusTime=t;}
  function nearestNotice(){return dist(player,notice.anchors[0])<dist(player,notice.anchors[1])?"front":"side";}
  function available(){
    if(walk)return "walk";
    if(dist(player,cat)<1.2||host.getMode()==="back")return "cat";
    if(focusKind==="chime"||dist(player,chime.anchor)<1.27)return "chime";
    if(dist(player,stop)<.85)return "wait";
    if(following)return "cat";
    const which=nearestNotice();
    if(focusKind==="front"||focusKind==="side")return focusKind;
    return dist(player,notice.anchors[which==="front"?0:1])<(which==="front"?2.05:1.25)?which:"";
  }
  function refresh(){
    const allowed=host.ready()&&host.street();container.hidden=!allowed;
    if(!allowed)return;
    const next=available();
    const text=next==="walk"?"停下":next==="cat"&&dist(player,cat)>1.2?(following?"沿脚印找三花":"去后巷找三花"):words[next]||"";
    if(next!==action||label.textContent!==text){action=next;label.textContent=text;button.hidden=!text;button.dataset.place=next;}
  }
  function endView(){
    if(view){controls.target.copy(view.homeTarget);camera.position.copy(view.homeEye);camera.fov=view.homeFov;camera.updateProjectionMatrix();controls.update();}
    view=null;focusKind="";
  }
  function cancel(stop=true){
    if(walk&&stop){player.target=null;player.path=null;}
    walk=null;endView();refresh();
  }
  function bookView(key,target,eye,duration,fov=camera.fov){
    const homeTarget=view?view.homeTarget:controls.target.clone(),homeEye=view?view.homeEye:camera.position.clone();
    const homeFov=view?view.homeFov:camera.fov;
    host.takeCamera();
    view={from:controls.target.clone(),eye:camera.position.clone(),homeTarget,homeEye,homeFov,fromFov:camera.fov,fov,target,goal:eye,time:0,
      settle:host.reduced?.035:.58,duration,leaving:false};
    focusKind=key;
  }
  function easeView(dt){
    if(!view)return;
    const s=view;s.time+=dt;
    if(!s.leaving&&s.time>s.duration){
      s.from.copy(controls.target);s.eye.copy(camera.position);s.target=s.homeTarget;s.goal=s.homeEye;
      s.time=0;s.leaving=true;s.fromFov=camera.fov;s.fov=s.homeFov;s.settle=host.reduced?.035:.62;
    }
    const q=Math.min(1,s.time/s.settle),w=q*q*(3-2*q);
    if(q<1||s.time< s.settle+dt*1.1){
      controls.target.lerpVectors(s.from,s.target,w);camera.position.lerpVectors(s.eye,s.goal,w);
      camera.fov=s.fromFov+(s.fov-s.fromFov)*w;camera.updateProjectionMatrix();
    }
    if(q===1&&s.leaving){view=null;focusKind="";}
  }
  function catPlace(){
    const d=Math.max(.01,dist(player,cat)),fx=(player.x-cat.x)/d,fz=(player.z-cat.z)/d;
    const candidates=[[fx,fz],[.98,-.20],[-.95,-.31],[.54,-.84],[-.51,-.86],[0,1]];
    for(const [x,z] of candidates){
      const dest=v(cat.x+x*.445,0,cat.z+z*.445);if(host.clear(dest,.16))return dest;
    }
    return v(cat.x,0,cat.z-.50);
  }
  function destination(key){return key==="cat"?catPlace():key==="wait"?stop:key==="chime"?chime.anchor:notice.anchors[key==="front"?0:1];}
  function close(key){if(key==="wait")return player.z<1.59&&dist(player,stop)<.09;
    return key==="cat"?dist(player,cat)<.585:dist(player,destination(key))<(key==="chime"?.46:.52);}
  function perform(key){
    walk=null;host.keys.clear();player.target=null;player.path=null;player.vx=0;player.vz=0;
    lastInteraction=key;
    if(key==="cat"){
      // Keep her own camera, face and original wave. The cat decides whether to answer.
      endView();
      if(cat.state==="eat"||cat.state==="toDish")say("三花在吃饭。",2.1);
      else {host.greet();say("");}
    }else if(key==="wait"){
      endView();bus.start();say("07 路末班　23:47",2.6);
    }else if(key==="chime"){
      if(chime.ring()){
        const target=v(7.39,.935,.62);bookView(key,target,v(8.12,1.05,-.24),3.8,39);say("");
      }
    }else{
      const isFront=key==="front",target=isFront?v(.10,.86,-.40):v(-.75,.93,-1.85);
      const eye=isFront?v(-.30,.85,.32):v(-1.63,.92,-1.68);
      bookView(key,target,eye,3.3,37);following=true;notice.follow();
      say(seen?"夜班店员已经盖了章。三花还在后巷。":"纸上写着「下雨的时候，在店后面。」",3.1);
    }
    refresh();
  }
  function start(key){
    if(!key||!host.ready()||!host.street())return false;
    if(key==="walk"){cancel();say("");return true;}
    if(key==="chime")chime.armAudio();
    host.interact();statusTime=0;status.hidden=true;
    if(close(key)){perform(key);return true;}
    endView();
    const goal=destination(key);
    if(!host.route(goal,key==="wait")){say("沿着人行道，再走近一点。");return false;}
    walk={key,goal,retries:0};pace=0;searchTime=0;refresh();return true;
  }
  function update(dt,t){
    chime.update(dt,t);notice.update(dt);
    const count=host.replies();
    if(count>lastReplies){
      lastReplies=count;following=false;
      if(!seen){seen=true;notice.print(true);try{localStorage.setItem(storage,"seen");}catch(_){}}
    }
    if(statusTime>0){statusTime-=dt;if(statusTime<=0)status.hidden=true;}
    if(!host.street()){
      // A new film action has already claimed the camera and walking target.
      walk=null;view=null;focusKind="";refresh();return;
    }
    if(walk){
      pace+=dt;searchTime+=dt;
      if(close(walk.key))perform(walk.key);
      else if(!player.target||(walk.key==="cat"&&searchTime>1.3&&dist(walk.goal,cat)>1.20)||pace>18){
        const goal=destination(walk.key);searchTime=0;pace=0;
        if(++walk.retries>5||!host.route(goal,walk.key==="wait")){cancel();say("再走近一点，就在前面。");}
        else walk.goal=goal;
      }
    }
    easeView(dt);refresh();
  }
  function hit(ray){
    if(!host.street()||!host.ready())return false;
    const matches=ray.intersectObjects(touchables,false);
    if(matches.length){
      const h=matches[0],i=notice.targets.indexOf(h.object);
      // Refuse hits on a sign on the far side of the store.
      if(host.clearView(camera.position,h.point,.12))return start(h.object===timetable?"wait":i===-1?"chime":i===0?"front":"side");
    }
    catAim.set(cat.x,cat.root.position.y+.115,cat.z);
    if(ray.ray.distanceSqToPoint(catAim)<.16*.16&&host.clearView(camera.position,catAim,.28))return start("cat");
    return false;
  }
  button.onclick=()=>{start(action);canvas.focus({preventScroll:true});};
  window.addEventListener("keydown",e=>{
    if(e.metaKey||e.ctrlKey||e.altKey||e.repeat||!host.street()||!host.ready())return;
    if(e.code==="KeyE"&&available()){
      e.preventDefault();e.stopImmediatePropagation();start(available());
    }else if(e.code==="Escape"&&(walk||view)){e.preventDefault();e.stopImmediatePropagation();cancel();}
    else if(["KeyW","KeyA","KeyS","KeyD","ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.code)&&(walk||view))cancel();
  },true);
  controls.addEventListener("start",()=>{
    if(!view)return;
    const scale=Math.tan(camera.fov*Math.PI/360)/Math.tan(view.homeFov*Math.PI/360);
    camera.position.sub(controls.target).multiplyScalar(scale).add(controls.target);
    camera.fov=view.homeFov;camera.updateProjectionMatrix();view=null;focusKind="";
  });
  return {update,hit,cancel,get framesView(){return !!view;},
    info:()=>({near:action,last:lastInteraction,catHeard:host.catHeard(),walking:walk?.key||"",view:focusKind,following,seen,replies:lastReplies,chime:chime.info()})};
};
