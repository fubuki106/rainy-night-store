/* A pocket-sized calico in enamel, and the real calico's response to a wave. */
(function () {
  "use strict";

  function facePaint(T) {
    const c=document.createElement("canvas"); c.width=256; c.height=224;
    const g=c.getContext("2d");
    g.fillStyle="#ffe5b5";g.fillRect(0,0,256,224);
    g.fillStyle="#d08949";g.beginPath();g.moveTo(0,0);g.lineTo(116,0);
    g.bezierCurveTo(111,24,99,64,73,77);g.bezierCurveTo(50,89,29,75,19,97);
    g.lineTo(0,112);g.fill();
    g.fillStyle="#4b4949";g.beginPath();g.moveTo(146,0);g.lineTo(256,0);g.lineTo(256,96);
    g.bezierCurveTo(225,96,202,84,195,68);g.bezierCurveTo(180,57,156,51,146,0);g.fill();
    g.fillStyle="#d49a87";
    for(const x of [45,208]){g.beginPath();g.moveTo(x,32);g.lineTo(x-13,64);g.lineTo(x+16,53);g.fill();}
    g.strokeStyle="#473c3b";g.lineWidth=6;g.lineCap="round";
    for(const x of [79,174]){g.beginPath();g.moveTo(x-10,130);g.quadraticCurveTo(x,118,x+12,130);g.stroke();}
    g.fillStyle="#a76354";g.beginPath();g.moveTo(117,143);g.quadraticCurveTo(128,137,140,143);g.lineTo(129,153);g.closePath();g.fill();
    g.lineWidth=3;g.beginPath();g.moveTo(128,152);g.quadraticCurveTo(123,159,116,156);g.moveTo(128,152);g.quadraticCurveTo(133,159,140,156);g.stroke();
    g.strokeStyle="#9a7967";g.lineWidth=3;
    for(const side of [-1,1]){
      g.beginPath();g.moveTo(128+side*76,148);g.lineTo(128+side*99,143);
      g.moveTo(128+side*76,155);g.lineTo(128+side*95,158);g.stroke();
    }
    const map=new T.CanvasTexture(c);map.encoding=T.sRGBEncoding;map.anisotropy=4;
    return map;
  }

  function ornament(T, umbrella) {
    // The original umbrella is authored in centimetres, with its grip at the origin.
    const anchor=new T.Group(), swing=new T.Group();
    anchor.name="弯柄 / 三花伞扣系点";
    anchor.position.set(-4.75,-12.68,.18);
    umbrella.add(anchor);anchor.add(swing);
    const cordMat=new T.MeshStandardMaterial({color:0x795848,roughness:.92});
    const brass=new T.MeshStandardMaterial({color:0xb9956a,metalness:.42,roughness:.46});
    const map=facePaint(T);
    const glaze=new T.MeshStandardMaterial({map,color:0xffffff,roughness:.65,metalness:.025,emissive:0xffefda,emissiveMap:map,emissiveIntensity:.43});
    const eye=new T.CatmullRomCurve3([[-.26,.60,0],[-.52,-.14,.18],[-.61,-1.25,.12],
      [-.43,-2.06,.06],[0,-2.34,0],[.37,-2.04,-.04],[.33,-.94,-.12],[.16,.34,-.14]].map(p=>new T.Vector3(...p)));
    const cord=new T.Mesh(new T.TubeGeometry(eye,20,.084,5,false),cordMat);
    const ring=new T.Mesh(new T.TorusGeometry(.37,.108,6,18),brass);
    ring.position.set(0,-2.45,0);
    const p=new T.Shape();
    p.moveTo(-1.78,.22);p.quadraticCurveTo(-2.05,1.02,-1.88,1.9);
    p.quadraticCurveTo(-1.80,2.12,-1.64,1.97);p.lineTo(-.97,1.42);
    p.quadraticCurveTo(-.15,1.64,.66,1.44);p.lineTo(1.62,2.02);
    p.quadraticCurveTo(1.87,2.15,1.89,1.88);p.lineTo(1.82,.40);
    p.bezierCurveTo(2.38,-.33,2.18,-1.11,1.58,-1.53);
    p.bezierCurveTo(.91,-2.00,-.83,-2.05,-1.58,-1.56);
    p.bezierCurveTo(-2.18,-1.18,-2.29,-.34,-1.78,.22);
    const uv={
      generateTopUV(_geo,v,a,b,c){return [a,b,c].map(i=>new T.Vector2((v[3*i]+2.22)/4.44,(v[3*i+1]+1.97)/4.04));},
      generateSideWallUV(){return [new T.Vector2(),new T.Vector2(1,0),new T.Vector2(1,1),new T.Vector2(0,1)];}
    };
    const geo=new T.ExtrudeGeometry(p,{depth:.32,bevelEnabled:true,bevelThickness:.062,bevelSize:.075,bevelSegments:2,curveSegments:8,UVGenerator:uv});
    const fob=new T.Mesh(geo,[glaze,brass]);fob.name="雨宿り三毛 / 双面搪瓷";
    fob.position.set(0,-4.32,-.16);
    swing.add(cord,ring,fob);
    return {anchor,swing,fob,dispose(){
      anchor.removeFromParent();
      [cord.geometry,ring.geometry,geo,cordMat,brass,glaze,map].forEach(v=>v.dispose());
    }};
  }

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
    let charm=null, f=null, age=9, cooldown=0, listenTime=0, responded=false, disposed=false, first=true;
    let tiltX=0,tiltZ=0,velX=0,velZ=0;
    const prev=new T.Vector3(), at=new T.Vector3(), speed=new T.Vector3(), velocity=new T.Vector3();
    const q=new T.Quaternion(), desired=new T.Quaternion(), e=new T.Euler(0,0,0,"YXZ");
    const bound=(v,m)=>Math.max(-m,Math.min(m,v));
    const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
    const bump=(a,b,c,d,v)=>smooth(a,b,v)*(1-smooth(c,d,v));

    function greet() {
      if(disposed || !cat || !girl || !girl.ready || cooldown>0)return false;
      if(cat.state==="eat" || cat.state==="toDish")return false;
      if(Math.hypot(player.x-cat.x,player.z-cat.z)>1.06)return false;
      age=9;listenTime=2.55;responded=false;cooldown=3.25;return true;
    }
    function update(dt,t) {
      if(disposed)return;
      dt=Math.min(.05,Math.max(0,Number(dt)||0));t=Number(t)||0;
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
      if(!charm && girl && girl.U && girl.U.umb)charm=ornament(T,girl.U.umb);
      if(charm){
        const a=charm.anchor;a.getWorldPosition(at);
        const reset=first || prev.distanceToSquared(at)>.20;
        if(reset || dt<.0001){velocity.set(0,0,0);speed.set(0,0,0);}
        else speed.copy(at).sub(prev).multiplyScalar(1/dt);
        prev.copy(at);first=false;
        const walking=Number(player.mvS)||0;
        const accelX=(speed.x-velocity.x)/Math.max(.01,dt), accelZ=(speed.z-velocity.z)/Math.max(.01,dt);
        velocity.lerp(speed,1-Math.exp(-dt*11));
        const small=reduced?.2:1;
        const tx=small*(bound(-accelZ*.024,.19)+.014*Math.sin(t*2.2)+walking*.10*Math.sin(t*7));
        const tz=small*(bound(accelX*.024,.19)+.021*Math.sin(t*1.72+.8)+walking*.075*Math.cos(t*7));
        velX+=(46*(tx-tiltX)-8*velX)*dt;velZ+=(46*(tz-tiltZ)-8*velZ)*dt;
        tiltX+=velX*dt;tiltZ+=velZ*dt;
        // A pendant hangs vertically as the shaft tilts. Its front follows the wearer.
        a.getWorldQuaternion(q).invert();
        desired.setFromEuler(e.set(tiltX,player.yaw+.11+small*.052*Math.sin(1.2*t),tiltZ,"YXZ"));
        charm.swing.quaternion.copy(q).multiply(desired);
      }
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
      if(disposed)return;disposed=true;if(charm)charm.dispose();if(f)f.dispose();
    }
    return {update,greet,dispose,get listening(){return listenTime>0;},get responded(){return responded&&listenTime>0;}};
  }
  window.createRainDetails=createRainDetails;
})();
