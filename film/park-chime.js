/* A glass fūrin hung on the back of the hydrangea park's wooden sign. */
(function () {
  "use strict";

  function paintedTexture(T, width, height, paint) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    paint(canvas.getContext("2d"));
    const tex = new T.CanvasTexture(canvas);
    tex.encoding = T.sRGBEncoding;
    tex.anisotropy = 4;
    return tex;
  }

  function hydrangea(g, x, y, r, colors) {
    const dots = [[-.48,-.12,.63],[-.08,-.47,.62],[.42,-.29,.58],[.60,.14,.56],[.18,.34,.67],[-.31,.32,.66],[.04,-.02,.74]];
    dots.forEach(([xx, yy, s], i) => {
      const cx = x + xx*r, cy = y + yy*r;
      for (let petal=0; petal<4; petal++) {
        const a = petal*Math.PI/2 + i*.31;
        g.beginPath();
        g.ellipse(cx + Math.sin(a)*r*s*.23, cy + Math.cos(a)*r*s*.23, r*s*.19, r*s*.28, -a, 0, Math.PI*2);
        g.fillStyle = colors[(i+petal%2)%colors.length]; g.fill();
      }
      g.beginPath(); g.arc(cx,cy,r*.048,0,Math.PI*2); g.fillStyle="#e6d9ab";g.fill();
    });
  }

  function bellArt(T) {
    return paintedTexture(T,512,192,g=>{
      const colors=["#899cc8","#7890b5","#a298c5","#b3b7cd"];
      [[72,120,39],[247,111,34],[417,123,35]].forEach(([x,y,r],i)=>{
        g.save();g.translate(x,y);
        g.strokeStyle="#657f81";g.lineCap="round";g.lineWidth=2.2;
        g.beginPath();g.moveTo(-2,8);g.bezierCurveTo(-14,25,-28,29,-42,32);g.stroke();
        g.fillStyle="#7f9d91";g.beginPath();g.moveTo(-15,23);g.quadraticCurveTo(-37,27,-44,6);g.quadraticCurveTo(-24,5,-15,23);g.fill();
        hydrangea(g,i===1?4:0,0,r,colors);g.restore();
      });
      g.strokeStyle="#829eb28b";g.lineWidth=1.8;g.beginPath();
      for(let i=0;i<=512;i+=4){const y=165+2.1*Math.sin(i/20);if(i===0)g.moveTo(i,y);else g.lineTo(i,y);}g.stroke();
    });
  }

  function slipArt(T) {
    return paintedTexture(T,144,416,g=>{
      const bg=g.createLinearGradient(0,0,144,416);
      bg.addColorStop(0,"#eee6cb");bg.addColorStop(.47,"#e5dfc9");bg.addColorStop(1,"#c9cec2");
      g.fillStyle=bg;g.fillRect(0,0,144,416);
      let seed=107;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
      for(let i=0;i<3100;i++){g.fillStyle=i%2?"#697b7328":"#fff5db6b";g.fillRect(rand()*144,rand()*416,rand()*1.2+1,rand()*1.4+.4);}
      g.fillStyle="#98a9a4";g.fillRect(10,12,1.5,391);
      g.fillStyle="#567174";g.font='550 32px "Hiragino Mincho ProN","Yu Mincho",serif';g.textAlign="center";g.textBaseline="middle";
      ["雨","や","ど","り"].forEach((s,i)=>g.fillText(s,86-i*.6,76+i*43));
      g.strokeStyle="#799287";g.lineWidth=2.2;g.lineCap="round";
      g.beginPath();g.moveTo(15,404);g.bezierCurveTo(52,359,77,319,91,282);g.stroke();
      g.fillStyle="#96aa9a";g.beginPath();g.moveTo(53,350);g.quadraticCurveTo(22,347,22,317);g.quadraticCurveTo(48,320,53,350);g.fill();
      hydrangea(g,90,281,35,["#8b9bc5","#8d82af","#a4a9c5","#a4a1bd"]);
      g.strokeStyle="#ab776b";g.lineWidth=2;g.strokeRect(95,366,27,28);
      g.fillStyle="#aa7868";g.font='600 18px "Hiragino Mincho ProN",serif';g.fillText("雨",108,380);
      g.fillStyle="#b7b09d";g.beginPath();g.arc(72,17,6,0,Math.PI*2);g.fill();
      g.fillStyle="#4f6563";g.beginPath();g.arc(72,17,3,0,Math.PI*2);g.fill();
    });
  }

  function makeSound() {
    let audio=null,output=null,next=0,pending=null;
    function unlock() {
      const Audio=window.AudioContext||window.webkitAudioContext;
      if(!Audio)return;
      try {
        if(!audio){audio=new Audio();output=audio.createGain();output.gain.value=.64;output.connect(audio.destination);}
        if((audio.state==="suspended"||audio.state==="interrupted")&&!pending){
          pending=audio.resume().catch(()=>{}).finally(()=>{pending=null;});
        }
      } catch (_) {}
    }
    function chink(level,bend) {
      if(audio&&audio.state!=="running"&&pending){
        const requested=performance.now();pending.then(()=>{if(audio.state==="running"&&performance.now()-requested<240)chink(level,bend);});return;
      }
      if(!audio||audio.state!=="running"||!output)return;
      const now=audio.currentTime;
      if(now<next)return;
      next=now+.11;
      [[1648,.062,1.22],[2610,.026,.57],[4215,.013,.26],[690,.013,.045]].forEach(([hz,amp,decay])=>{
        const osc=audio.createOscillator(),gain=audio.createGain();
        osc.type="sine";
        osc.frequency.setValueAtTime(hz*(1+bend),now);
        osc.frequency.exponentialRampToValueAtTime(hz*(.998+bend),now+.10);
        gain.gain.setValueAtTime(.00008,now);
        gain.gain.exponentialRampToValueAtTime(Math.max(.00015,amp*level),now+.004);
        gain.gain.exponentialRampToValueAtTime(.00008,now+decay);
        osc.connect(gain);gain.connect(output);osc.start(now);osc.stop(now+decay+.02);
        osc.onended=()=>{osc.disconnect();gain.disconnect();};
      });
    }
    return {unlock,chink,state:()=>audio?audio.state:"idle"};
  }

  window.createParkChime=function createParkChime({THREE:T,scene,ripple,reduced}) {
    const v=(x,y,z)=>new T.Vector3(x,y,z);
    const root=new T.Group();root.name="park_ajisai_furin";root.userData.dyn=true;scene.add(root);
    function mesh(geo,mat,p,x,y,z) {
      const m=new T.Mesh(geo,mat);m.position.set(x||0,y||0,z||0);p.add(m);return m;
    }
    function standard(color,roughness,metalness) {
      return new T.MeshStandardMaterial({color,roughness,metalness:metalness||0});
    }
    function rod(p,a,b,r,mat) {
      const d=b.clone().sub(a);
      const out=mesh(new T.CylinderGeometry(r,r,d.length(),8),mat,p);
      out.position.copy(a).lerp(b,.5);out.quaternion.setFromUnitVectors(v(0,1,0),d.normalize());return out;
    }
    function tube(p,points,r,mat,segments) {
      const c=new T.CatmullRomCurve3(points);return mesh(new T.TubeGeometry(c,segments||12,r,6,false),mat,p);
    }
    const steel=standard(0x495864,.43,.38),brass=standard(0xac9366,.40,.35);
    const thread=standard(0x344d53,.83),brassDark=standard(0x6e776b,.52,.24);
    const post=v(7.67,0,.948),hook=v(7.39,1.334,.620);
    rod(root,v(post.x,.55,post.z),v(post.x,1.272,post.z),.013,steel);
    tube(root,[v(post.x,1.259,post.z),v(post.x,1.35,post.z),v(7.642,1.397,.916),v(7.59,1.398,.855),v(7.426,1.398,.661),v(hook.x,1.386,hook.z),hook],.012,steel,24);
    for(const y of [.586,.702]){
      const clip=mesh(new T.BoxGeometry(.072,.018,.045),brassDark,root,post.x,y,.966);
      mesh(new T.SphereGeometry(.005,6,4),brass,root,clip.position.x,y,.942);
    }
    const support=new T.Group();support.position.copy(hook);root.add(support);
    rod(support,v(0,0,0),v(0,-.106,0),.0025,thread);
    mesh(new T.SphereGeometry(.010,9,6),brass,support,0,-.106,0);
    const bell=new T.Group();bell.position.y=-.111;support.add(bell);bell.rotation.y=.18;
    const profile=[[.005,0],[.017,-.002],[.045,-.011],[.074,-.031],[.093,-.058],[.100,-.088],[.097,-.110],[.087,-.132],[.079,-.143],[.078,-.148],[.074,-.152]];
    const geo=new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)).reverse(),48);
    const glass=new T.MeshPhongMaterial({color:0xb8d8d6,specular:0xe5f1ea,shininess:85,transparent:true,opacity:.34,depthWrite:false,side:T.FrontSide,emissive:0x34565f,emissiveIntensity:.15});
    const body=mesh(geo,glass,bell);body.renderOrder=3;
    const art=new T.MeshBasicMaterial({map:bellArt(T),transparent:true,alphaTest:.16,side:T.FrontSide,depthWrite:false});
    const enamel=mesh(geo,art,bell);enamel.scale.setScalar(1.009);enamel.renderOrder=4;
    const rimMaterial=new T.MeshPhongMaterial({color:0x99bdc5,specular:0xe3f4ef,shininess:85,emissive:0x759dba,emissiveIntensity:.24});
    const rim=mesh(new T.TorusGeometry(.0765,.0029,7,44),rimMaterial,bell,0,-.150,0);rim.rotation.x=Math.PI/2;
    const shimmer=new T.MeshBasicMaterial({color:0xe1ebe5,transparent:true,opacity:.56,depthWrite:false});
    const highlight=tube(bell,[v(-.024,-.014,.045),v(-.044,-.035,.069),v(-.050,-.058,.079)],.0019,shimmer,9);
    highlight.renderOrder=5;
    const clapper=new T.Group();bell.add(clapper);
    rod(clapper,v(0,-.01,0),v(0,-.149,0),.0022,thread);
    const tongue=mesh(new T.SphereGeometry(.023,14,10),brass,clapper,0,-.139,0);tongue.scale.set(1,.59,1);
    rod(clapper,v(0,-.150,0),v(0,-.275,0),.0022,thread);
    const paperPivot=new T.Group();paperPivot.position.y=-.272;clapper.add(paperPivot);
    const verts=[],uvs=[],indices=[];
    for(let row=0;row<=8;row++){
      const k=row/8;
      for(let side=0;side<2;side++){
        verts.push((side-.5)*.081+.014*k*k,-.335*k,Math.sin(k*Math.PI)*.013+(side-.5)*k*.016);
        uvs.push(side,1-k);
      }
      if(row<8){const a=row*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
    }
    const sheet=new T.BufferGeometry();sheet.setAttribute("position",new T.Float32BufferAttribute(verts,3));
    sheet.setAttribute("uv",new T.Float32BufferAttribute(uvs,2));sheet.setIndex(indices);sheet.computeVertexNormals();
    const paperInk=slipArt(T);
    const paperMat=new T.MeshStandardMaterial({map:paperInk,roughness:.87,side:T.DoubleSide,color:0xf0f0db,emissiveMap:paperInk,emissive:0xf1ead3,emissiveIntensity:.43});
    const paper=mesh(sheet,paperMat,paperPivot);paper.castShadow=true;
    const anchor=v(7.15,.076,.48);

    // One outside sprig grows from the existing blue bush. Its wet leaf hangs over a shallow stone cup.
    const sprig=new T.Group();sprig.position.set(7.55,.335,.57);sprig.scale.y=1.25;root.add(sprig);
    const stem=standard(0x486e59,.83);
    tube(sprig,[v(0,0,0),v(-.04,.075,.010),v(-.105,.15,.043),v(-.157,.211,.048)],.0042,stem,12);
    const leafMat=standard(0x5a806c,.70);leafMat.side=T.DoubleSide;
    function leaf(x,y,z,ry,rz,length){
      const a=[0,0,0],ix=[];
      for(let j=0;j<=8;j++){
        const k=j/8,half=Math.sin(Math.PI*k)*length*.27*(j%2===0?.94:1);
        a.push(-half,k*length,.008*Math.sin(Math.PI*k),0,k*length,.016*Math.sin(Math.PI*k),half,k*length,.008*Math.sin(Math.PI*k));
        if(j<8){const n=1+j*3;ix.push(n,n+3,n+1,n+1,n+3,n+4,n+1,n+4,n+2,n+2,n+4,n+5);}
      }
      const geo=new T.BufferGeometry();geo.setAttribute("position",new T.Float32BufferAttribute(a,3));geo.setIndex(ix);geo.computeVertexNormals();
      const m=mesh(geo,leafMat,sprig,x,y,z);m.rotation.set(.5,ry,rz);
      return m;
    }
    leaf(-.107,.142,.044,-.25,.94,.09);
    leaf(-.076,.103,.032,.10,-.73,.085);
    const floret=new T.Group();floret.position.set(-.151,.216,.047);sprig.add(floret);
    const palette=[0x829fcb,0x98acdf,0xa8a5d2].map(c=>standard(c,.77));
    const petalGeo=new T.SphereGeometry(1,8,5);
    const offsets=[[-.021,.011,.010],[.005,.020,.008],[.024,.006,-.003],[.011,-.009,.013],[-.011,-.012,.012]];
    const petalData=offsets.flatMap(([x,y,z],i)=>Array.from({length:4},(_,j)=>{
      const a=j*Math.PI/2+.24*i;return {i,a,x:x+Math.cos(a)*.007,y:y+Math.sin(a)*.006,z};
    }));
    const temp=new T.Object3D();
    palette.forEach((mat,k)=>{
      const petals=petalData.filter(({i})=>i%3===k), m=new T.InstancedMesh(petalGeo,mat,petals.length);
      petals.forEach(({x,y,z,a},i)=>{
        temp.position.set(x,y,z);temp.rotation.set(-.34,.04,a);temp.scale.set(.009,.006,.0037);temp.updateMatrix();m.setMatrixAt(i,temp.matrix);
      });
      floret.add(m);
    });
    const dish=v(7.367,.093,.621);
    const basinMat=standard(0x687e80,.7);
    mesh(new T.LatheGeometry([[.104,0],[.116,.006],[.135,.033],[.134,.041],[.124,.043],[.112,.022],[.078,.014]].map(([x,y])=>new T.Vector2(x,y)),30),basinMat,root,dish.x,dish.y,dish.z);
    const waterY=dish.y+.033;
    const water=mesh(new T.CircleGeometry(.121,32),new T.MeshPhongMaterial({color:0x486879,specular:0xbed2cd,shininess:85,emissive:0x26364a,emissiveIntensity:.32}),root,dish.x,waterY,dish.z);
    water.rotation.x=-Math.PI/2;
    const dropMat=new T.MeshBasicMaterial({color:0xb4d5df,transparent:true,opacity:.83,depthWrite:false});
    const bead=mesh(new T.SphereGeometry(1,8,5),dropMat,root);bead.visible=false;bead.scale.set(.009,.017,.009);
    const proxy=mesh(new T.CapsuleGeometry(.123,.40,4,12),new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}),root,hook.x,.978,hook.z);
    [proxy,body,paper].forEach(m=>m.userData.streetTarget="chime");

    const sound=makeSound();
    let n=0,elapsed=0,last=-10,bx=0,bv=0,px=0,pv=0,leafAngle=0,leafSpeed=0,shine=0,dropAt=Infinity;
    let drops=0,fall=-1,releaseHeight=0,returnAt=Infinity,side=1,glints=0;
    const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
    function ring() {
      sound.unlock();
      if(elapsed-last<.34)return false;
      last=elapsed;n++;side=n%2?1:-1;
      const mul=reduced?.57:1;
      bv=clamp(bv*.45+side*1.47*mul,-2.05,2.05);
      pv=clamp(pv*.38+side*3.8*mul,-4.4,4.4);
      leafSpeed=clamp(leafSpeed+side*.69,-1.2,1.2);
      shine=1;glints++;dropAt=Math.min(dropAt,elapsed+.26);
      returnAt=elapsed+.40;
      sound.chink(.89,n%3*.0013);
      return true;
    }
    function update(dt,t) {
      if(!Number.isFinite(dt)||dt<=0)return;
      const step=Math.min(dt,.12);elapsed+=step;
      const sub=Math.ceil(step/.012),h=step/sub;
      for(let i=0;i<sub;i++){
        bv+=(-49*bx-2.65*bv)*h;bx+=bv*h;
        pv+=(-38*px-2.95*pv+bx*12)*h;px+=pv*h;
        leafSpeed+=(-93*leafAngle-5.4*leafSpeed)*h;leafAngle+=leafSpeed*h;
      }
      const wind=(reduced?.013:.030),time=Number.isFinite(t)?t:elapsed;
      bell.rotation.z=bx*.83+Math.sin(time*1.18)*wind*.20;
      bell.rotation.x=bx*.34;clapper.rotation.z=px*.38;
      paperPivot.rotation.set(.10+px*.43,2.38+Math.sin(time*1.31)*wind*1.8+px*.57,.05+px*.49);
      sprig.rotation.z=leafAngle;shine*=Math.exp(-step*4.5);
      glass.emissiveIntensity=.15+(reduced?.46:1.05)*shine;
      rimMaterial.emissiveIntensity=.24+.85*shine;shimmer.opacity=.55+.38*shine;
      if(elapsed>=returnAt){returnAt=Infinity;sound.chink(.25,.001);shine=Math.max(shine,.24);}
      if(elapsed>=dropAt&&fall<0){
        dropAt=Infinity;fall=0;floret.getWorldPosition(bead.position);
        bead.position.y-=.012;releaseHeight=bead.position.y;bead.visible=true;
      }
      if(fall>=0){
        fall+=step;bead.position.y=releaseHeight-4.1*fall*fall;
        if(bead.position.y<=waterY){
          bead.visible=false;fall=-1;drops++;
          if(typeof ripple==="function")ripple(bead.position.x,bead.position.z,.108,.55,waterY);
        }
      }
    }
    update(1/60,0);
    return {targets:[proxy,body,paper],anchor,armAudio:sound.unlock,ring,update,
      info:()=>({rings:n,drops,glints,ringing:elapsed-last<1.7,bellAngle:bx,paperAngle:px,leafAngle,phase:fall>=0?"drop":elapsed<dropAt&&Number.isFinite(dropAt)?"nodding":elapsed-last<1.7?"swing":"rest",audio:sound.state()})};
  };
})();
