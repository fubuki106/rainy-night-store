/* The 35 mm printer and the two original illuminated bus-shelter poster faces. */
(function () {
  "use strict";
  const FONT = '"Hiragino Sans","Yu Gothic","PingFang SC",sans-serif';
  const MONO = '"SFMono-Regular","Menlo",monospace';

  function canvas(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }

  function text(g, value, x, y, size, family, weight, color) {
    g.fillStyle = color;
    g.font = weight + " " + size + "px " + family;
    g.fillText(value, x, y);
  }

  function poster(c, image) {
    const g = c.getContext("2d"), w = c.width, h = c.height;
    g.clearRect(0, 0, w, h);
    g.fillStyle = "#eee7d4"; g.fillRect(0, 0, w, h);
    const ink = "#29373c", vermilion = "#ac4635", grey = "#aaae9d";
    text(g, "市営バス", 40, 66, 28, FONT, 800, ink);
    text(g, "AJISAI  /  06", 358, 65, 24, MONO, 600, ink);
    g.fillStyle = ink; g.fillRect(38, 83, w - 76, 3);
    if (image) {
      const iw = image.naturalWidth || image.videoWidth || image.width;
      const ih = image.naturalHeight || image.videoHeight || image.height;
      const field = {x: 39, y: 168, w: 562, h: 614};
      const k = Math.min(field.w / iw, field.h / ih);
      const pw = iw * k, ph = ih * k, px = (w - pw) * .5, py = field.y + (field.h - ph) * .5;
      text(g, "夜間写真室", 40, 144, 41, FONT, 900, ink);
      text(g, "NO. 047", 455, 137, 22, MONO, 700, vermilion);
      // Leave the portrait mount empty around one intact landscape print.
      g.fillStyle = "#c8bfaa"; g.fillRect(px-2,py+2,pw+8,ph+8);
      g.fillStyle = "#fcf4df"; g.fillRect(px - 5, py - 5, pw + 10, ph + 10);
      g.drawImage(image, px, py, pw, ph);
      g.strokeStyle="#8b8c7a";g.lineWidth=2;
      for(const x of [px,px+pw])for(const y of [py,py+ph]){
        const sx=x===px?-1:1,sy=y===py?-1:1;
        g.beginPath();g.moveTo(x+sx*11,y);g.lineTo(x+sx*11,y+sy*11);g.lineTo(x,y+sy*11);g.stroke();
      }
      g.fillStyle = vermilion; g.fillRect(40, 818, 16, 16);
      text(g, "今夜の記録", 71, 838, 30, FONT, 700, ink);
      text(g, "35 MM  /  NIGHT PRINT", 40, 900, 23, MONO, 600, ink);
    } else {
      text(g, "終バスの", 35, 191, 79, FONT, 900, ink);
      text(g, "まえに。", 36, 282, 84, FONT, 900, ink);
      g.save(); g.beginPath(); g.rect(38, 317, w-76, 428); g.clip();
      g.fillStyle = "#c6cec1"; g.fillRect(38,317,w-76,428);
      g.fillStyle = vermilion; g.beginPath(); g.arc(435,460,99,0,Math.PI*2); g.fill();
      // Three offset hill cuts, then a narrow bank of rain against the setting sun.
      [[grey,540,385,530],["#677d73",621,478,568],[ink,692,570,609]].forEach(([col,ya,yb,yc])=>{
        g.fillStyle=col;g.beginPath();g.moveTo(-15,ya);
        g.bezierCurveTo(149,ya-77,213,yb+11,353,yb);
        g.bezierCurveTo(492,yb+6,542,yc-35,680,yc);
        g.lineTo(680,812);g.lineTo(-15,812);g.fill();
      });
      g.strokeStyle = "rgba(230,228,202,.68)"; g.lineWidth = 2;
      for(let i=0;i<19;i++){const x=61+i*34;g.beginPath();g.moveTo(x,324+(i%5)*13);g.lineTo(x-16,385+(i%5)*13);g.stroke();}
      g.restore();
      text(g, "あじさい公園前", 40, 808, 41, FONT, 800, ink);
      text(g, "LAST SERVICE", 41, 880, 24, MONO, 650, ink);
      text(g, "23:47", 393, 888, 45, MONO, 700, vermilion);
    }
    g.fillStyle=ink;g.fillRect(39,923,w-78,2);
  }

  function createFilmStreetProps({THREE:T, scene}) {
    const root = new T.Group();
    root.name = "雨夜写真室 / あじさい公園前";
    scene.add(root);
    const materials = new Set(), textures = new Set(), geometries = new Set();
    const targets = [], replaced = [];
    const isReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clamp = n => Math.max(0, Math.min(1, Number(n)||0));
    function basic(color, opts={}) {
      const m = new T.MeshBasicMaterial(Object.assign({color},opts)); materials.add(m); return m;
    }
    function enamel(color) {
      const m = new T.MeshStandardMaterial({color,roughness:.73,metalness:.16}); materials.add(m); return m;
    }
    function canvasTex(c) {
      const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;t.anisotropy=4;
      t.wrapS=t.wrapT=T.ClampToEdgeWrapping;textures.add(t);return t;
    }
    function mesh(parent,name,geometry,material,x,y,z) {
      const obj=new T.Mesh(geometry,material);obj.name=name;obj.position.set(x,y,z);
      parent.add(obj);geometries.add(geometry);return obj;
    }
    function box(parent,name,x,y,z,w,h,d,mat) {
      return mesh(parent,name,new T.BoxGeometry(w,h,d),mat,x,y,z);
    }
    function face(parent,name,x,y,z,w,h,mat) {
      return mesh(parent,name,new T.PlaneGeometry(w,h),mat,x,y,z);
    }
    function cylinder(parent,name,x,y,z,r,len,mat,axis="z") {
      const obj=mesh(parent,name,new T.CylinderGeometry(r,r,len,16),mat,x,y,z);
      if(axis==="z")obj.rotation.x=Math.PI/2;
      if(axis==="x")obj.rotation.z=Math.PI/2;
      return obj;
    }
    function panelBox(parent,name,x,y,z,w,h,d,r,mat) {
      const p=new T.Shape(),l=-w/2,b=-h/2;
      p.moveTo(l+r,b);p.lineTo(l+w-r,b);p.quadraticCurveTo(l+w,b,l+w,b+r);
      p.lineTo(l+w,b+h-r);p.quadraticCurveTo(l+w,b+h,l+w-r,b+h);
      p.lineTo(l+r,b+h);p.quadraticCurveTo(l,b+h,l,b+h-r);
      p.lineTo(l,b+r);p.quadraticCurveTo(l,b,l+r,b);
      const geo=new T.ExtrudeGeometry(p,{depth:d,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.003,bevelThickness:.003,curveSegments:5});
      return mesh(parent,name,geo,mat,x,y,z-d/2);
    }
    function button(target, kind) { target.userData.filmTarget=kind; targets.push(target); return target; }

    const shell=enamel(0x783f31), rim=enamel(0x4c332f), ivory=enamel(0xe1d6b9), black=enamel(0x222c30);
    const aluminium=enamel(0xaeb2a0), chrome=enamel(0xcfbea0), darkRed=enamel(0x813129);
    const indicator=basic(0xe76747);
    const dimRed=basic(0x9f392e);
    const machine = new T.Group();machine.name="しずく / 35 mm 街角冲印机";
    machine.position.set(5.76,.06,1.07);root.add(machine);
    // A mounting chair straddles the existing right-hand shelter post; floor and bench stay clear.
    for(const y of [.64,1.02]){
      box(machine,"不锈钢安装抱箍",0,y,-.088,.133,.034,.061,aluminium);
      box(machine,"折弯托架",0,y,-.044,.14,.021,.104,rim);
    }
    panelBox(machine,"搪漆后壳",0,.837,.035,.388,.605,.16,.024,shell);
    panelBox(machine,"前门黑胶垫",0,.837,.118,.354,.565,.020,.019,black);
    panelBox(machine,"暖灰检修面板",0,.837,.134,.343,.556,.018,.015,ivory);
    const facePrint=canvas(512,808),fg=facePrint.getContext("2d");
    fg.fillStyle="#e7dcc0";fg.fillRect(0,0,512,808);
    fg.fillStyle="#854738";fg.fillRect(28,33,15,54);
    text(fg,"雨夜写真室",58,78,50,FONT,900,"#343c39");
    text(fg,"SHIZUKU  /  35",30,126,28,MONO,750,"#543e32");
    fg.fillStyle="#6e6b58";fg.fillRect(30,151,452,4);
    text(fg,"現像  /  PRINT",27,233,24,MONO,650,"#42443c");
    text(fg,"受付",48,489,22,FONT,700,"#42443c");
    text(fg,"進行",194,489,22,FONT,700,"#42443c");
    text(fg,"仕上",334,489,22,FONT,700,"#42443c");
    text(fg,"写真取出口",33,552,31,FONT,800,"#41433c");
    text(fg,"NO.  047   •   6 × 9",34,754,21,MONO,600,"#5b5e52");
    face(machine,"焼付け銘板",0,.839,.1480,.318,.523,basic(0xffffff,{map:canvasTex(facePrint)}));
    const sx=.151;
    for(const x of [-sx,sx])for(const y of [.588,1.083]){
      cylinder(machine,"マイナスねじ",x,y,.151,.0073,.0032,chrome);
      const slit=box(machine,"ねじ溝",x,y,.153,.0075,.00145,.0015,black);slit.rotation.z=.51;
    }
    // Red fluted safelight and a collar sit on the lid below the shelter's rain hood.
    cylinder(machine,"灯座",-.106,1.150,.037,.044,.021,black,"y");
    cylinder(machine,"暗室灯",-.106,1.177,.037,.033,.045,dimRed,"y");
    for(let k=0;k<4;k++)cylinder(machine,"灯罩凸棱",-.106,1.158+k*.012,.037,.035,.0037,indicator,"y");
    cylinder(machine,"灯罩上盖",-.106,1.204,.037,.032,.008,darkRed,"y");
    const display=canvas(320,128),dg=display.getContext("2d"),dt=canvasTex(display);
    panelBox(machine,"计数窗深茶胶圈",-.034,.892,.151,.196,.070,.014,.013,black);
    face(machine,"机械计数窗",-.034,.892,.163,.173,.048,basic(0xffffff,{map:dt}));
    cylinder(machine,"滚花曝光拨轮",.112,.890,.162,.031,.029,black);
    cylinder(machine,"乳白树脂轮面",.112,.890,.179,.023,.006,chrome);
    const notch=box(machine,"拨轮红标",.112,.890,.183,.0035,.028,.0025,darkRed);
    for(let k=0;k<9;k++){
      const a=(k/8*1.52+.74)*Math.PI;
      const tick=box(machine,"曝光分度",.112+Math.sin(a)*.04,.890+Math.cos(a)*.04,.148,.0016,k%2===0?.008:.005,.002,black);
      tick.rotation.z=-a;
    }
    const ledColors=[0xc9d3ae,0xf3bc74,0xf07154],leds=[];
    for(let i=0;i<3;i++){
      const x=-.105+i*.091;
      cylinder(machine,"灯孔",x,.825,.151,.010,.006,black);
      const lamp=basic(0x5c6252);
      cylinder(machine,"进程指示灯",x,.825,.156,.0066,.004,lamp);leds.push(lamp);
    }
    panelBox(machine,"出片槽黑胶口",0,.705,.157,.290,.051,.017,.009,black);
    box(machine,"出片缝",0,.704,.169,.255,.016,.004,basic(0x161d23));
    const proof=canvas(384,256), pg=proof.getContext("2d");
    pg.fillStyle="#f0e9d8";pg.fillRect(0,0,384,256);
    const proofTex=canvasTex(proof), printed=basic(0xffffff,{map:proofTex});
    const paperMat=basic(0xf0e9d8);
    const paper=box(machine,"退纸",0,.695,.180,.218,.008,.009,[paperMat,paperMat,printed,paperMat,paperMat,paperMat]);
    paper.rotation.x=.24;paper.visible=false;
    box(machine,"接纸下唇",0,.675,.172,.284,.012,.047,shell);
    for(const x of [-.139,.139])box(machine,"挡片侧唇",x,.684,.175,.008,.018,.051,rim);
    for(let k=0;k<5;k++)box(machine,"侧壁散热槽",.196,.704+k*.030,.024,.004,.010,.073,black);
    const hitMat=basic(0xffffff,{transparent:true,opacity:0,depthWrite:false,colorWrite:false});
    button(box(machine,"印相机 / 可点击区域",0,.856,.079,.416,.717,.240,hitMat),"printer");

    const sheet=canvas(640,958); poster(sheet,null);
    const posterTex=canvasTex(sheet), posterMat=basic(0xffffff,{map:posterTex});
    const panelAnchor=new T.Vector3(4.52,.81,1.22);
    // Address either representation. A late install sees two separate,
    // already batched material meshes. The source box has two independent faces.
    scene.updateMatrixWorld(true);
    const candidates=[];
    scene.traverse(o=>{
      if(!o.isMesh || !o.geometry || !o.material)return;
      const list=Array.isArray(o.material)?o.material:[o.material];
      if(!list.some(m=>m.map && m.map.image && m.map.image.width===256 && m.map.image.height===384))return;
      const bb=new T.Box3().setFromObject(o), c=bb.getCenter(new T.Vector3());
      if(Math.abs(c.x-panelAnchor.x)<.04 && Math.abs(c.y-panelAnchor.y)<.04 && Math.abs(c.z-panelAnchor.z)<.04)candidates.push(o);
    });
    for(const o of candidates){
      const original=o.material, oldDyn=o.userData.dyn;
      const replace=m=>m.map && m.map.image && m.map.image.width===256 && m.map.image.height===384?posterMat:m;
      o.material=Array.isArray(original)?original.map(replace):replace(original);
      o.userData.dyn=true;replaced.push({o,original,oldDyn});
    }
    // In minimal previews the original shelter may be absent.
    if(!candidates.length){
      for(const side of [-1,1]){
        const ad=face(root,"灯箱印样",4.52+side*.026,.81,1.22,.57,.89,posterMat);
        ad.rotation.y=side*Math.PI/2;
      }
    }
    for(const side of [-1,1]){
      const frame=new T.Group();root.add(frame);
      frame.position.set(4.52+side*.0255,.81,1.22);frame.rotation.y=side*Math.PI/2;
      for(const yy of [-.444,.444])box(frame,"灯箱铜压条",0,yy,.002,.575,.012,.010,rim);
      for(const xx of [-.281,.281])box(frame,"灯箱铜压条",xx,0,.002,.010,.898,.010,rim);
      const clamps=[-.211,.213];
      for(const x of clamps)box(frame,"画框搭扣",x,.448,.007,.034,.012,.012,aluminium);
    }
    button(box(root,"候车亭双面灯箱 / 可点击区域",4.52,.81,1.22,.065,.912,.586,hitMat),"lightbox");
    const anchor=new T.Vector3(5.74,.06,1.40);
    const machineAnchor=new T.Vector3(5.76,.930,1.232);
    let picture=null, knownCode="",closed=false;
    function showPhoto(image) {
      if(closed || !image)return false;
      const w=image.naturalWidth||image.videoWidth||image.width,h=image.naturalHeight||image.videoHeight||image.height;
      if(!(w>0 && h>0))return false;
      poster(sheet,image);posterTex.needsUpdate=true;
      const scale=Math.min(354/w,220/h), pw=w*scale, ph=h*scale;
      pg.fillStyle="#f0e9d8";pg.fillRect(0,0,384,256);
      pg.drawImage(image,(384-pw)*.5,(256-ph)*.5,pw,ph);proofTex.needsUpdate=true;
      picture=image;return true;
    }
    function update(state={},time=0) {
      if(closed)return;
      const phase=String((typeof state==="string"?state:state.phase||state.stage)||"idle");
      const p=clamp(state && (state.progress==null?state.development:state.progress));
      const developing=/develop|print|process|expos|timing|rinse|wash|fix|bath/i.test(phase) && !/ready|complete|finish|done/i.test(phase);
      const ready=!!picture || /ready|complete|finish|done|display|mounted|revealed/i.test(phase);
      const timeSec=Number(time)||0;
      const code=ready?"06":developing?String(Math.round(p*35)).padStart(2,"0"):"35";
      if(code!==knownCode){
        dg.fillStyle="#26383b";dg.fillRect(0,0,320,128);
        text(dg,"F",19,85,55,MONO,600,"#97a889");
        text(dg,code,113,99,96,MONO,700,"#e0cf9f");
        dg.fillStyle="rgba(36,40,35,.29)";dg.fillRect(0,62,320,4);dt.needsUpdate=true;knownCode=code;
      }
      const blink=isReduced?1:.78+.22*Math.cos(timeSec*(developing?4.3:1.8));
      leds.forEach((m,i)=>m.color.setHex((i===0||i===1&&developing||i===2&&ready)?ledColors[i]:0x586052));
      indicator.color.setHex(developing?0xff6f53:0xc46446).multiplyScalar(blink);
      dimRed.color.setHex(developing?0xe75540:0x914039);
      notch.rotation.z=-.63+(ready?1:p)*1.03;
      const amount=ready?1:developing?clamp((p-.64)/.36):0;
      paper.visible=amount>.002;
      paper.scale.z=1+amount*11.8;
      paper.position.z=.176+.051*amount;
      paper.position.y=.696-.011*amount;
    }
    function reset() {
      if(closed)return;
      picture=null;poster(sheet,null);posterTex.needsUpdate=true;
      pg.fillStyle="#f0e9d8";pg.fillRect(0,0,384,256);proofTex.needsUpdate=true;update("idle",0);
    }
    function dispose() {
      if(closed)return;closed=true;
      replaced.forEach(({o,original,oldDyn})=>{o.material=original;if(oldDyn===undefined)delete o.userData.dyn;else o.userData.dyn=oldDyn;});
      root.removeFromParent();
      materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());geometries.forEach(g=>g.dispose());
      picture=null;
    }
    update("idle",0);
    return {root,targets,anchor,machineAnchor,panelAnchor,update,showPhoto,reset,dispose};
  }

  window.createFilmStreetProps=createFilmStreetProps;
})();
