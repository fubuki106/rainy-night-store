/* The short-wheelbase municipal bus uses the scale and kerb already in the diorama. */
window.createNightBus = function (host) {
  "use strict";
  const {THREE: T, scene, renderer}=host;
  const root = new T.Group(), wheels = [], doors = [];
  root.name = "07 · あじさい公園";
  scene.add(root);
  const lane = 2.30, stop = 5.55, length = 2.48, width = 0.74;
  // At either end of the miniature the street is physically cut away.
  renderer.localClippingEnabled = true;
  const cut = [new T.Plane(new T.Vector3(1,0,0),4.01), new T.Plane(new T.Vector3(-1,0,0),9.02)];
  const material = (color, values={}) => new T.MeshStandardMaterial(
    Object.assign({color, roughness:0.58, metalness:0.08, clippingPlanes:cut, clipShadows:true}, values));
  const ivory = material(0xe9dfbe), petrol = material(0x284e52), trim = material(0x8b9a94);
  const rubber = material(0x202633), hubs = material(0x939b90), amber = material(0xf1b569,{emissive:0xcb7b30,emissiveIntensity:0.75});
  const lamp = material(0xffe4a4,{emissive:0xffdba0,emissiveIntensity:1.55});
  const red = material(0xb74130,{emissive:0xbb3021,emissiveIntensity:0.9});
  function mesh(geometry,mat,x,y,z,parent=root) {
    const m = new T.Mesh(geometry,mat); m.position.set(x,y,z); parent.add(m); return m;
  }
  function box(w,h,d,mat,x,y,z,parent) { return mesh(new T.BoxGeometry(w,h,d),mat,x,y,z,parent); }
  function hull(w,h,d,r,mat,cy) {
    const x=-w/2, y=-h/2, s=new T.Shape();
    s.moveTo(x+r,y); s.lineTo(-x-r,y); s.quadraticCurveTo(-x,y,-x,y+r);
    s.lineTo(-x,-y-r); s.quadraticCurveTo(-x,-y,-x-r,-y); s.lineTo(x+r,-y);
    s.quadraticCurveTo(x,-y,x,-y-r); s.lineTo(x,y+r); s.quadraticCurveTo(x,y,x+r,y);
    const g=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelThickness:0.018,bevelSize:0.018,bevelSegments:2,curveSegments:4});
    g.translate(0,0,-d/2); const m=mesh(g,mat,0,cy,0); m.castShadow=true;
  }
  function painted(w,h,draw) {
    const c=document.createElement("canvas"); c.width=w; c.height=h; const g=c.getContext("2d");
    draw(g,w,h); const tx=new T.CanvasTexture(c); tx.encoding=T.sRGBEncoding; tx.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
    return new T.MeshBasicMaterial({map:tx,clippingPlanes:cut});
  }
  function decal(w,h,mat,x,y,z,yaw) {
    const m=mesh(new T.PlaneGeometry(w,h),mat,x,y,z); m.rotation.y=yaw; return m;
  }
  const windows=painted(1024,208,(g,w,h)=>{
    g.fillStyle="#36494d"; g.fillRect(0,0,w,h);
    for(let i=0;i<6;i++){
      const x=8+i*168, light=i===2||i===4, sky=g.createLinearGradient(0,0,45,h);
      sky.addColorStop(0,light?"#f0c382":"#b6b59f"); sky.addColorStop(.45,light?"#aa9874":"#748b8b"); sky.addColorStop(1,"#3c535b");
      g.fillStyle=sky; g.fillRect(x,9,157,183);
      g.fillStyle="#e6d0a4"; g.fillRect(x+7,17,142,3); g.fillStyle="#5a6562"; g.fillRect(x+111,11,3,173);
      for(let j=0;j<2;j++){
        const sx=x+22+j*65; g.fillStyle="#4d6368"; g.beginPath(); g.roundRect(sx,133+j%2*7,33,64,8); g.fill();
        g.strokeStyle="#d3c3a4"; g.lineWidth=2; g.beginPath(); g.moveTo(sx+14,17); g.lineTo(sx+14,38); g.lineTo(sx+8,50); g.lineTo(sx+20,50); g.lineTo(sx+14,38); g.stroke();
      }
      g.fillStyle="rgba(229,247,241,.14)"; g.beginPath(); g.moveTo(x+12,11); g.lineTo(x+42,11); g.lineTo(x+126,191); g.lineTo(x+115,191); g.fill();
    }
  });
  const destination=painted(384,82,(g,w,h)=>{
    g.fillStyle="#152423"; g.fillRect(0,0,w,h); g.fillStyle="#ffce70"; g.textAlign="center"; g.textBaseline="middle";
    g.font='bold 48px "Hiragino Sans","PingFang SC",sans-serif'; g.fillText("07  終バス",w/2,h/2+3);
    g.fillStyle="rgba(20,30,22,.24)"; for(let x=2;x<w;x+=4)g.fillRect(x,0,1,h); for(let y=2;y<h;y+=4)g.fillRect(0,y,w,1);
  });
  const stripes=painted(1000,104,(g,w,h)=>{
    g.fillStyle="#285859"; g.fillRect(0,0,w,h); g.fillStyle="#dc8860"; g.fillRect(0,9,w,7);
    g.fillStyle="#ece2bb"; g.font='bold 36px "Hiragino Sans",sans-serif'; g.fillText("市営バス",370,73);
    g.font="27px Menlo,monospace"; g.fillText("07",900,72);
  });
  const frontGlass=painted(430,200,(g,w,h)=>{
    const sky=g.createLinearGradient(0,0,0,h); sky.addColorStop(0,"#c2bba2"); sky.addColorStop(.33,"#748c8c"); sky.addColorStop(1,"#344a56");
    g.fillStyle=sky; g.fillRect(0,0,w,h);
    // Seen through wet laminated glass: a dashboard, a seat and the steering wheel.
    g.fillStyle="#52686d";g.beginPath();g.roundRect(61,89,74,88,15);g.fill();
    g.fillStyle="#46595d";g.beginPath();g.moveTo(52,171);g.quadraticCurveTo(68,124,90,125);
    g.quadraticCurveTo(111,119,141,159);g.lineTo(154,181);g.fill();
    g.beginPath();g.ellipse(97,110,14,18,-.1,0,Math.PI*2);g.fill();
    g.fillStyle="#384d53";g.fillRect(82,96,32,5);g.fillRect(78,99,39,3);
    g.strokeStyle="#34484e";g.lineWidth=6;g.beginPath();g.ellipse(102,163,33,14,.15,Math.PI,Math.PI*2);g.stroke();
    g.fillStyle="rgba(224,242,228,.15)";g.beginPath();g.moveTo(0,13);g.lineTo(40,0);g.lineTo(155,200);g.lineTo(137,200);g.fill();
    g.fillStyle="#40565c";g.fillRect(0,179,w,21);g.fillRect(246,18,44,9);g.fillRect(268,8,3,14);
    g.strokeStyle="#344850"; g.lineWidth=5;
    for(let i=0;i<2;i++){g.beginPath();g.moveTo(70+i*180,h);g.lineTo(116+i*180,131);g.lineTo(65+i*180,148);g.stroke();}
    g.fillStyle="#40545a";g.fillRect(w/2-3,0,6,h);
  });
  hull(length,.81,width,.075,ivory,.60);
  hull(2.36,.075,.66,.03,trim,1.045);
  box(1.10,.055,.35,ivory,.1,1.11,0);
  for(const side of [-1,1]){
    const yaw=side<0?Math.PI:0, z=side*(width/2+.02);
    decal(2.22,.34,windows,0,.745,z,yaw);
    decal(2.38,.15,stripes,0,.435,z+.002*side,yaw);
    box(2.29,.022,.013,trim,0,.55,z+.003*side);
    for(const x of [-.78,.78]){
      const w=mesh(new T.CylinderGeometry(.196,.196,.079,20),rubber,x,.202,z-.023*side);
      w.rotation.x=Math.PI/2;
      const hub=mesh(new T.CylinderGeometry(.106,.106,.083,16),hubs,x,.202,z-.018*side);
      hub.rotation.x=Math.PI/2;
      const spoke=box(.105,.018,.009,petrol,0,0,0);
      const spin=new T.Group(); root.add(spin); spin.position.set(x,.202,z+.03*side); spin.add(spoke); wheels.push(spin);
    }
    box(.056,.032,.025,amber,.97,.48,z);
  }
  for(const x of [-1,1]){
    const yaw=x*Math.PI/2, face=x*(length/2+.022);
    decal(.606,.296,frontGlass,face,.72,0,yaw);
    decal(x===-1?.55:.31,x===-1?.116:.086,destination,face,.929,0,yaw);
    box(.065,.065,.65,trim,face,.27,0);
    for(const z of [-.25,.25]) box(.025,.063,.109,x===-1?lamp:red,face+x*.006,.418,z);
    if(x===-1){
      box(.015,.049,.145,petrol,face-.007,.325,0);
      box(.012,.016,.115,ivory,face-.016,.326,0);
    }
  }
  // Double sliding doors are on the shelter side. Each leaf is animated independently.
  for(const side of [-1,1]){
    const p=new T.Group(); p.position.set(-.64+side*.093,.575,-.398); root.add(p);
    box(.18,.675,.019,petrol,0,0,0,p); box(.135,.40,.012,trim,0,.055,-.016,p);
    box(.118,.374,.007,material(0x7a9995,{emissive:0x223f40}),0,.055,-.024,p);
    doors.push({p,x:p.position.x,side});
  }
  const wash=painted(160,120,(g,w,h)=>{
    const gradient=g.createRadialGradient(w*.5,h*.50,1,w*.5,h*.5,w*.48);
    gradient.addColorStop(0,"rgba(255,208,133,.34)"); gradient.addColorStop(.52,"rgba(253,187,98,.11)"); gradient.addColorStop(1,"rgba(209,166,117,0)");
    g.fillStyle=gradient;g.fillRect(0,0,w,h);
  });
  wash.transparent=true;wash.depthWrite=false;wash.blending=T.AdditiveBlending;
  const beam=mesh(new T.PlaneGeometry(1.32,.83),wash,-1.74,.014,0);beam.rotation.x=-Math.PI/2;
  root.position.set(11,0,lane); root.visible=false;
  let elapsed=0, started=false, phase="away", speed=0, door=0;
  const smooth=n=>n*n*(3-2*n);
  function start(newService=false){if(!started||newService){elapsed=0;started=true;}}
  function update(dt,player) {
    if(!started)return;
    const previous=root.position.x;
    const crossing=root.visible&&player.z>lane-.48&&player.z<lane+.48&&previous-player.x>1.2&&previous-player.x<2.1;
    if(!crossing)elapsed=(elapsed+dt)%35;
    let x=11, targetDoor=0; phase="away";
    if(elapsed<6.5){phase="arriving";x=stop+(11-stop)*(1-smooth(elapsed/6.5));}
    else if(elapsed<18){phase="stopped";x=stop;targetDoor=Math.min(1,(elapsed-6.5)*1.8,(18-elapsed)*1.8);}
    else if(elapsed<30){phase="leaving";x=stop-(stop+5.65)*smooth((elapsed-18)/12);}
    root.visible=phase!=="away";root.position.x=x;
    speed=Math.abs(x-previous)/Math.max(dt,.001);
    root.position.y=Math.min(.005,speed*.003)*Math.sin(elapsed*11);
    wheels.forEach(w=>w.rotation.z=-(x-stop)/.196);
    door=targetDoor;doors.forEach(d=>d.p.position.x=d.x+d.side*targetDoor*.116);
  }
  function collide(p,r) {
    if(!root.visible)return;
    const dx=p.x-root.position.x,dz=p.z-lane, hx=length/2+r, hz=width/2+r;
    if(Math.abs(dx)>=hx||Math.abs(dz)>=hz)return;
    if(hx-Math.abs(dx)<hz-Math.abs(dz))p.x=root.position.x+(dx<0?-hx:hx);
    else p.z=lane+(dz<0?-hz:hz);
  }
  function footprint(x=root.position.x){
    return {x0:x-length/2-.01,x1:x+length/2+.01,z0:lane-width/2-.01,z1:lane+width/2+.01};
  }
  return {root,start,update,collide,footprint,stop,get active(){return started;},get phase(){return phase;},get door(){return door;},get speed(){return speed;}};
};
