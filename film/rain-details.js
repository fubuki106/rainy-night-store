/* The calico notices an ordinary wave. This module owns only parts of the cat. */
(function () {
  "use strict";
  function catParts(cat, T) {
    if(!cat || !cat.head || !cat.tail || cat.tail.length<5)return null;
    const ears=[], eyes=[];
    for(const o of cat.head.children){
      if(!o.geometry)continue;
      if(o.geometry.type==="ConeGeometry")ears.push({object:o,angle:o.rotation.y});
      if(o.geometry.type==="SphereGeometry" && o.position.z>.043 && o.position.y>.013 &&
         o.position.y<.025 && Math.abs(o.position.x)>.011)
        eyes.push({object:o,height:o.scale.y});
    }
    const tip=cat.tail[4];
    // An extra zeroed transform lets the tip finish its own little flick while
    // all seven pre-existing tail joints continue to use the game's gait.
    const parent=tip.parent, swivel=new T.Group();swivel.name="三花 / 尾尖回应";
    swivel.position.copy(tip.position);parent.add(swivel);
    const rest=tip.position.clone();tip.position.set(0,0,0);swivel.add(tip);
    const turn=new T.Group();turn.name="三花 / 听见她";
    for(const child of cat.head.children.slice())turn.add(child);
    cat.head.add(turn);
    return {ears,eyes,swivel,turn,headZ:cat.head.rotation.z,dispose(){
      parent.add(tip);tip.position.copy(rest);swivel.removeFromParent();
      for(const child of turn.children.slice())cat.head.add(child);
      turn.removeFromParent();
      ears.forEach(v=>v.object.rotation.y=v.angle);eyes.forEach(v=>v.object.scale.y=v.height);
      cat.head.rotation.z=this.headZ;
    }};
  }

  function createRainDetails({THREE:T,girl,player,cat}) {
    const reduced=!!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
    let f=null, age=9, cooldown=0, listenTime=0, responded=false, counted=false, replies=0, disposed=false;
    const bound=(v,m)=>Math.max(-m,Math.min(m,v));
    const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
    const bump=(a,b,c,d,v)=>smooth(a,b,v)*(1-smooth(c,d,v));

    function greet() {
      if(disposed || !cat || !girl || !girl.ready || cooldown>0)return false;
      if(cat.state==="eat" || cat.state==="toDish")return false;
      if(Math.hypot(player.x-cat.x,player.z-cat.z)>1.06)return false;
      age=9;listenTime=2.55;responded=false;counted=false;cooldown=3.25;return true;
    }
    function update(dt) {
      if(disposed)return;
      dt=Math.min(.05,Math.max(0,Number(dt)||0));
      cooldown=Math.max(0,cooldown-dt);age+=dt;
      if(listenTime>0){
        listenTime=Math.max(0,listenTime-dt);
        const dx=player.x-cat.x,dz=player.z-cat.z,dist=Math.hypot(dx,dz);
        const toward=Math.atan2(Math.sin(Math.atan2(dx,dz)-cat.yaw),Math.cos(Math.atan2(dx,dz)-cat.yaw));
        if(cat.state==="eat"||cat.state==="toDish"||dist>1.13||Math.hypot(player.vx,player.vz)>.09||player.target){
          listenTime=0;age=9;responded=false;
        }else if(!responded&&listenTime<2.24&&dist<=1.06&&Math.abs(toward)<.54){
          responded=true;age=0;
        }
      }
      if(responded && !counted && listenTime>0 && age>=.43){ replies++; counted=true; }
      if(!f && cat && cat.head)f=catParts(cat,T);
      if(!f)return;
      if(cat.state==="eat" || cat.state==="toDish")age=9;
      const hear=bump(.02,.25,.71,1.43,age)*(reduced?.55:1);
      const blink=bump(.36,.50,.68,.97,age);
      const dx=player.x-cat.x,dz=player.z-cat.z;
      const bearing=Math.atan2(Math.sin(Math.atan2(dx,dz)-cat.yaw),Math.cos(Math.atan2(dx,dz)-cat.yaw));
      const side=bearing>=0?1:-1;
      const attention=bump(.12,.52,.88,1.52,age)*(reduced?.55:1);
      f.turn.rotation.y=bound(bearing-cat.head.rotation.y,.31)*attention;
      f.turn.rotation.x=-.16*attention+.045*blink;
      f.ears.forEach(({object,angle})=>{
        const near=Math.sign(object.position.x)===side;
        object.rotation.y=angle+(near?.47:-.15)*side*hear;
      });
      f.eyes.forEach(({object,height})=>{object.scale.y=height*(1-.89*blink);});
      cat.head.rotation.z=f.headZ-side*.082*hear;
      const tipFlick=bump(.18,.36,.83,1.34,age)*(reduced?.35:1);
      f.swivel.rotation.y=side*tipFlick*(.25*Math.sin((age-.18)*8.4)+.09);
      f.swivel.rotation.x=-.10*tipFlick;
    }
    function dispose(){
      if(disposed)return;disposed=true;if(f)f.dispose();
    }
    return {update,greet,dispose,get replies(){return replies;},get listening(){return listenTime>0;},get responded(){return responded&&listenTime>0;}};
  }
  window.createRainDetails=createRainDetails;
})();
