/* Short performances laid over the original idle, grip, face shapes and springs. */
window.createCharacterActing=function({THREE:T,girl,player:p,cat,bus,details,reduced}){
  const V=()=>new T.Vector3(), Q=()=>new T.Quaternion();
  const clamp=(x,lo=0,hi=1)=>Math.max(lo,Math.min(hi,x));
  const damp=(x,to,rate,dt)=>x+(to-x)*(1-Math.exp(-rate*dt));
  const smooth=(lo,hi,x)=>{const y=clamp((x-lo)/(hi-lo));return y*y*(3-2*y);};
  const pulse=(a,b,c,d,t)=>smooth(a,b,t)*(1-smooth(c,d,t));
  const angle=a=>Math.atan2(Math.sin(a),Math.cos(a));
  const small=reduced?.60:1;
  let rig,undo=[],dirty=false,age=-1,waitAge=0,wait=0,catWeight=0,bend=0,hand=0;
  let smiled=0,blink=0,reply=false,asked=false,invited=false,answeredFor=0,counted=false,replies=0,observe=false,phase="idle",look=0,pivot=0;
  let onPlatform=false,platformCue="",platformAim=false,platformTime=0;
  let prevBus="",arrival=9,depart=9,shift=0,idleGlance=5,side=1,visit=0,busLook=0,pointX=0,pointY=0,pointZ=0;
  let headYaw=0,headPitch=0,eyeYaw=0,eyePitch=0,wristBeat=0;
  const forward=V(),sideAxis=V(),palmAxis=V(),up=new T.Vector3(0,1,0),bpos=V(),goal=V(),delta=V();
  const base=V(),joint=V(),tip=V(),dir=V(),pole=V(),desired=V(),from=V(),to=V();
  const rw=Q(),rq=Q(),parentQ=Q(),adj=Q(),restL=V(),restR=V(),footL=Q(),footR=Q(),handPos=V();
  const rawHead=Q(),rawNeck=Q();let hasRawGaze=false;
  function setup(){
    const get=n=>girl.model.getObjectByName("J_Bip_"+n);
    const limb=(s,upper,lower,end)=>[get(s+"_"+upper),get(s+"_"+lower),get(s+"_"+end)];
    rig={hips:get("C_Hips"),spine:get("C_Spine"),arm:limb("R","UpperArm","LowerArm","Hand"),
      left:limb("L","UpperLeg","LowerLeg","Foot"),right:limb("R","UpperLeg","LowerLeg","Foot")};
    rig.fingers=["Index","Middle","Ring","Little"].map(name=>[get("R_"+name+"1"),get("R_"+name+"2")]);
    undo=[rig.hips,rig.spine,...rig.left,...rig.right,...rig.arm,...rig.fingers.flat()].map(n=>({n,p:V(),q:Q()}));
  }
  function restore(){
    if(hasRawGaze){girl.bones.neck.quaternion.copy(rawNeck);girl.bones.head.quaternion.copy(rawHead);}
    if(!dirty)return;
    for(const b of undo){b.n.position.copy(b.p);b.n.quaternion.copy(b.q);}
    dirty=false;
  }
  function rememberGaze(){rawNeck.copy(girl.bones.neck.quaternion);rawHead.copy(girl.bones.head.quaternion);hasRawGaze=true;}
  function greet(){
    if(!girl.ready||Math.hypot(p.x-cat.x,p.z-cat.z)>1.06)return false;
    if(age>=0||catWeight>.08)return true;
    age=0;asked=invited=reply=counted=false;answeredFor=0;observe=cat.state==="eat"||cat.state==="toDish";
    return true;
  }
  function turn(dt,speed){
    let step=0;
    const waiting=age<0&&bus.active&&!p.target&&speed<.09&&p.x>4.20&&p.x<6.22&&p.z>.82&&p.z<1.86;
    if(waiting){
      if(!onPlatform||(bus.phase==="arriving"&&platformCue!=="arriving")){
        // Once per arrival, someone who came from the park finds the headlights.
        // People already angled towards the east keep their own stance.
        platformAim=Math.abs(angle(2.05-p.yaw))>.94;platformTime=0;
      }
      platformTime+=dt;
      if(platformAim){
        const diff=angle(2.05-p.yaw);
        step=clamp(diff*.8,-2.16*dt,2.16*dt)*smooth(.04,.43,Math.abs(diff))*smooth(.01,.27,platformTime);
        if(Math.abs(diff)<.09)platformAim=false;
      }
    }else platformAim=false;
    onPlatform=waiting;platformCue=bus.phase;
    if(age>=0&&!p.target&&speed<.09){
      const diff=angle(Math.atan2(cat.x-p.x,cat.z-p.z)-p.yaw);
      step=clamp(diff*.92,-2.1*dt,2.1*dt)*smooth(.12,.47,Math.abs(diff));
    }
    p.yaw+=step;
    pivot=damp(pivot,Math.min(.52,.27*Math.abs(step)/Math.max(.001,dt)),7,dt);
  }
  function update(dt,speed){
    if(!rig)setup();
    const busy=speed>.09||!!p.target,feeding=cat.state==="eat"||cat.state==="toDish";
    if(age>=0){
      age+=dt;
      if(age<.51&&Math.abs(angle(Math.atan2(cat.x-p.x,cat.z-p.z)-p.yaw))>1.2)age=Math.min(age,.26);
      const dist=Math.hypot(p.x-cat.x,p.z-cat.z);
      if(busy||dist>1.19||age>3.95)age=-1;
      else{
        if(feeding){observe=true;reply=false;}
        if(!asked&&age>=.44){asked=true;if(!observe)invited=!!details?.greet();}
        if(invited&&!observe&&details.responded)reply=true;
        if(reply)answeredFor+=dt;
        if(reply&&!counted&&answeredFor>=.43&&details.listening&&dist<=1.06){counted=true;replies++;}
      }
    }
    const still=age>=0,off=still?1-smooth(2.85,3.8,age):0;
    catWeight=damp(catWeight,off,still?6:9,dt);
    bend=damp(bend,still?pulse(.16,1.00,2.35,3.45,age)*(observe?.35:1):0,8,dt);
    hand=damp(hand,still&&!observe?pulse(.27,1.07,1.70,2.68,age):0,10,dt);
    wristBeat=still?pulse(.63,.90,1.45,1.75,age)*Math.sin((age-.68)*8.7):0;
    const platform=p.x>4.20&&p.x<6.22&&p.z>.82&&p.z<1.86&&!busy&&!still;
    wait=damp(wait,platform?1:0,platform?2.4:7,dt);
    if(platform){
      if(waitAge===0){visit++;side=visit%2?1:-1;idleGlance=5.3+(visit%3)*1.23;arrival=9;depart=9;}
      waitAge+=dt;arrival+=dt;depart+=dt;
      if(bus.phase==="stopped"&&prevBus!=="stopped")arrival=0;
      if(bus.phase==="leaving"&&prevBus!=="leaving")depart=0;
      if(waitAge>idleGlance+4){idleGlance=waitAge+5.8+(visit++%3)*1.07;side*=-1;}
    }else waitAge=0;
    prevBus=bus.phase;
    const spotting=bus.active&&bus.phase==="arriving";
    const approach=spotting?(1-smooth(1.1,3.0,waitAge))*.55+.45:0;
    const watching=Math.max(approach,pulse(0,.26,.88,2.7,arrival)*.83,
      pulse(.04,.35,.75,1.74,depart)*.65,pulse(idleGlance,idleGlance+.50,idleGlance+1.1,idleGlance+2.05,waitAge)*.54);
    busLook=damp(busLook,wait*(.16+.84*watching),4,dt);
    shift=damp(shift,wait*side*(.24+.76*pulse(idleGlance-.90,idleGlance+.50,idleGlance+1.25,idleGlance+3.4,waitAge)),2,dt);
    const response=still&&reply?pulse(.33,.86,1.40,2.24,answeredFor)*off*.92:0;
    smiled=damp(smiled,Math.max(response,wait*pulse(.42,.95,1.40,2.8,arrival)*.45),5,dt);
    blink=still&&reply?pulse(.68,.84,.92,1.14,answeredFor)*off*.87:0;
    look=Math.max(catWeight,busLook);
    if(still||catWeight>.015){pointX=cat.x;pointY=cat.root.position.y+.13;pointZ=cat.z;}
    else{
      // First catch the lamps at the east end, then the front doorway as it stops.
      pointX=bus.active&&bus.root.visible?Math.max(5.9,bus.root.position.x-.78):8.7;
      pointY=p.y+.79;pointZ=bus.root.position.z||2.30;
    }
    phase=catWeight>.018?(observe?"watch-meal":age<0?"return":age<.33?"notice":age<.81?"offer":reply&&age<2.82?"answer":age<2.82?"listen":"return")
      :wait>.05?(arrival<2.8?"door-opens":spotting?"headlights":depart<1.8?"bus-leaves":watching>.28?"look-down-street":"waiting"):"idle";
  }

  function setWorld(n,q){n.parent.getWorldQuaternion(parentQ).invert();n.quaternion.copy(parentQ).multiply(q);n.updateWorldMatrix(false,false);}
  function rotate(n,axis,rad){n.getWorldQuaternion(rq);adj.setFromAxisAngle(axis,rad);rq.premultiply(adj);setWorld(n,rq);}
  function rotateToward(n,oldPt,wantPt,origin){
    from.subVectors(oldPt,origin).normalize();to.subVectors(wantPt,origin).normalize();
    n.getWorldQuaternion(rq);adj.setFromUnitVectors(from,to);rq.premultiply(adj);setWorld(n,rq);
  }
  function solve(chain,end,poleDirection){
    const [a,b,c]=chain;a.getWorldPosition(base);b.getWorldPosition(joint);c.getWorldPosition(tip);
    const u=base.distanceTo(joint),v=joint.distanceTo(tip);dir.subVectors(end,base).normalize();
    const d=clamp(base.distanceTo(end),Math.abs(u-v)+.00001,u+v-.00001);
    const x=(u*u+d*d-v*v)/(2*d),h=Math.sqrt(Math.max(0,u*u-x*x));
    pole.copy(poleDirection).addScaledVector(dir,-dir.dot(poleDirection)).normalize();
    desired.copy(base).addScaledVector(dir,x).addScaledVector(pole,h);
    rotateToward(a,joint,desired,base);b.getWorldPosition(joint);c.getWorldPosition(tip);rotateToward(b,tip,end,joint);
  }
  function pose(){
    if(Math.max(bend,hand,Math.abs(shift))<.001)return;
    for(const b of undo){b.p.copy(b.n.position);b.q.copy(b.n.quaternion);}dirty=true;
    girl.root.getWorldQuaternion(rw);forward.set(0,0,1).applyQuaternion(rw);sideAxis.set(1,0,0).applyQuaternion(rw);
    const [l,r]=[rig.left[2],rig.right[2]];
    l.getWorldPosition(restL);r.getWorldPosition(restR);l.getWorldQuaternion(footL);r.getWorldQuaternion(footR);
    rig.hips.getWorldPosition(goal);goal.addScaledVector(up,-.060*bend*small-.0018*Math.abs(shift))
      .addScaledVector(forward,-.021*bend*small).addScaledVector(sideAxis,.009*shift+.008*bend);
    rig.hips.parent.worldToLocal(goal);rig.hips.position.copy(goal);rig.hips.updateWorldMatrix(false,false);
    solve(rig.left,restL,forward);solve(rig.right,restR,forward);setWorld(l,footL);setWorld(r,footR);
    rotate(rig.spine,sideAxis,.145*bend*(1-.38*smiled)*small);rotate(rig.spine,forward,.019*shift);
    if(hand>.001){
      rig.arm[2].getWorldPosition(handPos);handPos.addScaledVector(forward,.144*hand*small)
        .addScaledVector(sideAxis,-(.044+.011*wristBeat)*hand).addScaledVector(up,.044*hand);
      delta.copy(sideAxis).multiplyScalar(-.65).addScaledVector(forward,-.75);solve(rig.arm,handPos,delta);
      rotate(rig.arm[2],forward,hand*(.34+.30*wristBeat)*small);
      rig.fingers[0][0].getWorldPosition(palmAxis);rig.fingers[3][0].getWorldPosition(delta);
      palmAxis.sub(delta).normalize();
      rig.fingers.forEach(([first,second],i)=>{
        const curl=hand*(.09+i*.042+(i<2?.13*Math.max(0,wristBeat):0));
        rotate(first,palmAxis,curl);rotate(second,palmAxis,curl*1.35);
      });
    }
  }
  function aim(dt){
    const h=girl.bones.head;h.getWorldPosition(bpos);h.getWorldQuaternion(rq);
    forward.copy(girl.headFwd).applyQuaternion(rq).normalize();
    const dx=pointX-bpos.x,dz=pointZ-bpos.z;
    const dyaw=angle(Math.atan2(dx,dz)-Math.atan2(forward.x,forward.z));
    const pitch=Math.atan2(pointY-bpos.y,Math.max(.01,Math.hypot(dx,dz)))-Math.asin(clamp(forward.y,-1,1));
    eyeYaw=damp(eyeYaw,clamp(dyaw,-.28,.28)*look,13,dt);
    eyePitch=damp(eyePitch,clamp(pitch,-.20,.14)*look,13,dt);
    headYaw=damp(headYaw,clamp(dyaw,-.57,.57)*look,3.1,dt);
    // When the cat looks up, she lifts her chin enough for her smile to be seen
    // under the cap; the pupils can continue to follow the animal.
    const low=catWeight>.015?-.26+.43*smiled:-.20;
    headPitch=damp(headPitch,clamp(pitch,low,.17)*look,3.3,dt);
    if(Math.abs(headYaw)+Math.abs(headPitch)+Math.abs(eyeYaw)+Math.abs(eyePitch)<.001)return;
    sideAxis.crossVectors(up,forward).normalize();
    for(const [n,f] of [[girl.bones.neck,.42],[h,.58]]){
      rotate(n,up,headYaw*f);rotate(n,sideAxis,-headPitch*f);
    }
    for(const eye of [girl.bones.eyeL,girl.bones.eyeR]){
      rotate(eye,up,eyeYaw);rotate(eye,sideAxis,-eyePitch);
    }
  }
  const info=()=>Object.freeze({situation:catWeight>.018?"cat":wait>.05?"bus":"idle",phase,seconds:age>=0?age:waitAge,
    gaze:look,headYaw,headPitch,eyeYaw,eyePitch,crouch:bend,hand,smile:smiled,blink,reply:age>=0&&reply,weightShift:shift});
  return {restore,rememberGaze,greet,turn,update,pose,aim,info,get replies(){return replies;},get pivot(){return pivot;},get busy(){return age>=0||wait>.12;},get gaze(){return Math.max(catWeight,wait*.9);},
    get catWeight(){return catWeight;},get smile(){return smiled;},get blink(){return blink;}};
};
