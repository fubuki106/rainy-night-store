/* The original side bulletin and a paper copy on the shop window share one drawing. */
window.createCatNotice = function (T,scene,groundY) {
  "use strict";
  const page=document.createElement("canvas");page.width=384;page.height=514;
  const ink=page.getContext("2d"),map=new T.CanvasTexture(page);
  map.encoding=T.sRGBEncoding;map.anisotropy=4;
  const group=new T.Group();group.name="星空マート / 三毛の貼り紙";scene.add(group);
  const background="#ede1bd",dark="#42433b",ginger="#bf794c",coal="#515354";
  function inkCat(){
    const g=ink;g.save();g.translate(175,280);g.lineCap="round";g.lineJoin="round";g.lineWidth=4;
    // The upturned, dark-tipped tail and the two different ears also appear on the cat in the yard.
    g.strokeStyle=dark;g.lineWidth=28;g.beginPath();g.moveTo(47,83);g.bezierCurveTo(113,101,111,41,91,32);g.stroke();
    g.strokeStyle=ginger;g.lineWidth=21;g.stroke();g.strokeStyle=coal;g.beginPath();g.moveTo(100,49);g.quadraticCurveTo(98,34,91,32);g.stroke();
    g.lineWidth=4;g.fillStyle="#f5edd7";g.strokeStyle=dark;
    g.beginPath();g.moveTo(-31,6);g.bezierCurveTo(-49,32,-60,70,-49,87);
    g.bezierCurveTo(-33,102,34,101,58,86);g.bezierCurveTo(64,60,51,22,29,4);g.closePath();g.fill();g.stroke();
    g.fillStyle=ginger;g.beginPath();g.ellipse(34,49,17,27,-.5,0,Math.PI*2);g.fill();
    g.fillStyle="#f7efd9";g.beginPath();g.moveTo(-43,-30);g.lineTo(-46,-70);
    g.quadraticCurveTo(-45,-78,-16,-56);g.quadraticCurveTo(2,-63,22,-54);g.lineTo(47,-75);
    g.quadraticCurveTo(53,-72,45,-34);g.bezierCurveTo(57,3,26,20,1,18);
    g.bezierCurveTo(-23,20,-55,5,-43,-30);g.fill();g.stroke();
    g.fillStyle=ginger;g.beginPath();g.moveTo(-42,-69);g.quadraticCurveTo(-49,-26,-34,-17);g.quadraticCurveTo(-19,-11,-12,-54);g.fill();
    g.fillStyle=coal;g.beginPath();g.moveTo(45,-70);g.lineTo(22,-50);g.quadraticCurveTo(15,-30,34,-23);g.quadraticCurveTo(48,-18,45,-70);g.fill();
    g.strokeStyle=dark;g.lineWidth=3;
    for(const side of [-1,1]){
      const x=side*18;g.beginPath();g.moveTo(x-6,-13);g.quadraticCurveTo(x,-17,x+6,-14);g.stroke();
      for(let i=0;i<2;i++){g.beginPath();g.moveTo(side*31,-5+i*5);g.lineTo(side*57,-11+i*12);g.stroke();}
      g.beginPath();g.moveTo(side*15,77);g.lineTo(side*15,92);g.stroke();
    }
    g.fillStyle="#b07b71";g.beginPath();g.moveTo(-4,-7);g.lineTo(5,-7);g.lineTo(0,-2);g.fill();g.restore();
  }
  function print(seen){
    const g=ink;g.fillStyle=background;g.fillRect(0,0,page.width,page.height);
    g.strokeStyle="#9b957c";g.lineWidth=1;g.strokeRect(12,12,360,490);
    g.textAlign="left";g.fillStyle="#6d765f";g.font='600 15px Menlo,monospace';g.fillText("HOSHIZORA MART",25,43);
    g.fillStyle="#a9543c";g.fillRect(25,61,334,5);
    g.fillStyle=dark;g.font='800 45px "Hiragino Sans","PingFang SC",sans-serif';g.fillText("この三毛、",24,120);g.fillText("見かけましたか",24,174);
    inkCat();
    g.fillStyle=dark;g.font='550 22px "Hiragino Sans","PingFang SC",sans-serif';g.fillText("雨の日は、店の裏へ。",25,421);
    g.strokeStyle="#a6a388";g.beginPath();g.moveTo(24,440);g.lineTo(359,440);g.stroke();
    g.fillStyle="#66765f";g.font='500 15px "Hiragino Sans","PingFang SC",sans-serif';g.fillText("ほしぞらマート　夜番",25,476);
    if(seen){
      g.save();g.translate(289,348);g.rotate(-.13);g.strokeStyle=g.fillStyle="#ac533e";g.lineWidth=3;g.strokeRect(-62,-18,124,37);
      g.textAlign="center";g.font='750 18px "Hiragino Sans","PingFang SC",sans-serif';g.fillText("今夜も元気",0,7);g.restore();
    }
    map.needsUpdate=true;
  }
  const paper=new T.MeshBasicMaterial({map,color:0xf6f0dc,side:T.DoubleSide});
  function hang(x,y,z,yaw,w,h,roll){
    const pivot=new T.Group();pivot.position.set(x,y,z);pivot.rotation.y=yaw;group.add(pivot);
    const sheet=new T.Mesh(new T.PlaneGeometry(w,h),paper);sheet.rotation.z=roll;sheet.name="三花猫的寻猫启事";pivot.add(sheet);
    const tape=new T.MeshBasicMaterial({color:0xc3b995,transparent:true,opacity:.82,depthWrite:false});
    for(const side of [-1,1]){
      const piece=new T.Mesh(new T.PlaneGeometry(w*.24,h*.059),tape);piece.position.set(side*w*.37,h*.46,.002);piece.rotation.z=.15*side;sheet.add(piece);
    }
    return sheet;
  }
  const front=hang(.10,.87,-.40,0,.30,.402,-.025), side=hang(-.753,.936,-1.85,-Math.PI/2,.226,.338,.014);
  print(false);
  const targets=[front,side], anchors=[new T.Vector3(.10,.06,.04),new T.Vector3(-1.06,.06,-1.84)];

  const paw=document.createElement("canvas");paw.width=paw.height=64;const p=paw.getContext("2d");
  p.fillStyle="#d5d5c6";p.beginPath();p.ellipse(32,39,12,10,.03,0,Math.PI*2);p.fill();
  for(const [x,y,a] of [[13,30,-.38],[24,17,-.18],[37,16,.14],[49,27,.42]]){
    p.beginPath();p.ellipse(x,y,5,7,a,0,Math.PI*2);p.fill();
  }
  const pawMap=new T.CanvasTexture(paw);pawMap.encoding=T.sRGBEncoding;
  const pawMat=new T.MeshBasicMaterial({map:pawMap,color:0xa4bacc,transparent:true,opacity:.55,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
  const trailPath=new T.CurvePath(),points=[[.02,.30],[-.80,.24],[-1.13,-.26],[-1.13,-2.96],[-1.13,-3.36],[-.54,-3.85],[.47,-4.05]];
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i];trailPath.add(new T.LineCurve3(new T.Vector3(a[0],0,a[1]),new T.Vector3(b[0],0,b[1])));
  }
  const count=25, pawGeo=new T.PlaneGeometry(.074,.079);pawGeo.rotateX(-Math.PI/2);
  const tracks=new T.InstancedMesh(pawGeo,pawMat,count),transform=new T.Object3D();tracks.name="雨水里的猫脚印";tracks.renderOrder=2;group.add(tracks);
  for(let i=0;i<count;i++){
    const u=i/(count-1),pos=trailPath.getPointAt(u),dir=trailPath.getTangentAt(u);
    const wiggle=(i%2===0?.028:-.026);pos.x+=dir.z*wiggle;pos.z-=dir.x*wiggle;
    transform.position.set(pos.x,groundY(pos.x,pos.z)+.015,pos.z);transform.rotation.y=Math.atan2(dir.x,dir.z)+Math.PI+(i%2===0?.08:-.085);
    transform.updateMatrix();tracks.setMatrixAt(i,transform.matrix);
  }
  tracks.instanceMatrix.needsUpdate=true;tracks.count=0;tracks.visible=false;
  let age=Infinity;
  function follow(){age=0;tracks.visible=true;}
  function update(dt){
    if(!Number.isFinite(age))return;age+=dt;
    tracks.count=Math.min(count,Math.floor(age*5)+1);
    pawMat.opacity=.57*Math.min(1,Math.max(0,(55-age)/9));
    if(age>55){age=Infinity;tracks.visible=false;tracks.count=0;}
  }
  return {targets,anchors,print,follow,update};
};
