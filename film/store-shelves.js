/* Original counter artwork. Draw once into the two existing shop materials. */
(function () {
  "use strict";
  const JA = '"Hiragino Kaku Gothic ProN","Yu Gothic","Noto Sans CJK JP",sans-serif';
  const M = 'Menlo,Consolas,monospace';
  const TEA = [
    { ink: "#375c4e", paper: "#d5caa0", liquid: "#83824e", cap: "#d4ca9d", word: "茶", leaf: true },
    { ink: "#b76c47", paper: "#e3d4ab", liquid: "#ac7546", cap: "#b79975", word: "麦", leaf: true },
    { ink: "#668486", paper: "#c1d9d0", liquid: "#82abac", cap: "#557f89", word: "水", leaf: false },
    { ink: "#bd6b44", paper: "#e3c498", liquid: "#c59154", cap: "#b7744e", word: "柑", leaf: false }
  ];
  const CARTON = [
    { ink: "#477f76", paper: "#dbd4b2", word: "豆乳" },
    { ink: "#6b849b", paper: "#d5d6c0", word: "牛乳" },
    { ink: "#ad7564", paper: "#e2cbb0", word: "いちご" }
  ];
  const PACK = [
    { ink: "#aa765a", paper: "#dab98b", word: "せんべい" },
    { ink: "#738e73", paper: "#c4c5a0", word: "海苔" },
    { ink: "#a27e89", paper: "#d9bfb2", word: "あんぱん" },
    { ink: "#708383", paper: "#c7d3bd", word: "塩菓子" }
  ];
  function rect(g, x, y, w, h, fill) { g.fillStyle = fill; g.fillRect(x, y, w, h); }
  function poly(g, points, fill, stroke, lineWidth) {
    g.beginPath(); g.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) g.lineTo(points[i][0], points[i][1]);
    g.closePath(); g.fillStyle = fill; g.fill();
    if (stroke) { g.lineWidth = lineWidth || 1; g.strokeStyle = stroke; g.stroke(); }
  }
  function line(g, x, y, xx, yy, color, width) {
    g.beginPath(); g.moveTo(x, y); g.lineTo(xx, yy); g.strokeStyle = color; g.lineWidth = width; g.stroke();
  }
  function oval(g, x, y, rx, ry, color, rotation) {
    g.beginPath(); g.ellipse(x, y, rx, ry, rotation || 0, 0, Math.PI * 2); g.fillStyle = color; g.fill();
  }
  function lettering(g, value, x, y, size, color, align, mono) {
    g.fillStyle = color; g.font = "650 " + size + "px " + (mono ? M : JA);
    g.textAlign = align || "center"; g.textBaseline = "middle"; g.fillText(value, x, y);
  }
  function gradient(g, x, y, xx, yy, stops) {
    const grad = g.createLinearGradient(x, y, xx, yy);
    stops.forEach(([p, c]) => grad.addColorStop(p, c));
    return grad;
  }
  function seed(value) {
    return function () { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
  }
  function dust(g, rng, x, y, w, h, amount) {
    for (let i = 0; i < amount; i++) {
      g.fillStyle = i % 3 ? "rgba(250,239,208,.043)" : "rgba(31,48,46,.042)";
      g.fillRect(x + rng() * w, y + rng() * h, .6 + rng(), .7);
    }
  }
  function item(g, draw, variant, x, floor, w, h, lean) {
    g.save(); g.translate(x + w / 2, floor); g.rotate(lean || 0);
    g.scale(w / 50, h / 100); g.translate(-25, -100); draw(g, variant); g.restore();
  }

  // Product designs share print inks, while caps, shoulders, seams and silhouettes distinguish them.
  function bottle(g, v) {
    const p = TEA[v % TEA.length];
    g.beginPath(); g.moveTo(17, 10); g.lineTo(17, 17); g.bezierCurveTo(17, 22, 4, 24, 4, 35);
    g.lineTo(3, 88); g.quadraticCurveTo(3, 98, 9, 99); g.lineTo(41, 99);
    g.quadraticCurveTo(47, 98, 47, 90); g.lineTo(46, 34); g.bezierCurveTo(46, 27, 33, 22, 33, 17);
    g.lineTo(33, 10); g.closePath(); g.fillStyle = p.liquid; g.fill();
    g.lineWidth = 1.5; g.strokeStyle = "#526052"; g.stroke();
    g.save(); g.clip();
    rect(g, 3, 17, 45, 82, gradient(g, 3, 0, 48, 0, [[0,"#243d3c60"],[.19,"#f6ebb236"],[.54,"#ffffff00"],[.88,"#34504c38"],[1,"#1b353652"]]));
    rect(g, 3, 38, 45, 43, p.paper);
    rect(g, 3, 39, 45, 3, p.ink); rect(g, 3, 74, 45, 3, p.ink);
    if (p.leaf) {
      oval(g, 12, 68, 6.8, 2.7, p.ink, -.49);
      oval(g, 18, 67, 5.1, 2.2, p.ink, -.98);
      line(g, 7, 72, 20, 65, p.ink, .9);
    } else {
      oval(g, 37, 68, 5.6, 5.7, p.ink);
      oval(g, 37, 61, 3.1, 1.6, "#638367", -.4);
    }
    lettering(g, p.word, 25, 58, 20, p.ink);
    line(g, 9, 32, 13, 27, "#e8e9cd77", 2.3);
    for (let j = 0; j < 3; j++) line(g, 7, 84+j*4, 43, 84+j*4, "#d4d5ad59", 1);
    rect(g, 6, 42, 2, 30, "#eee3c74a"); g.restore();
    rect(g, 15, 3, 20, 10, p.cap);
    for (let j=16; j<34; j+=3) rect(g, j, 4, 1, 7, "#504f4348");
    rect(g, 15, 2, 20, 2.2, "#d4d5ba"); rect(g, 16, 13, 18, 1.4, "#536150");
  }
  function carton(g, v) {
    const p = CARTON[v % CARTON.length];
    poly(g, [[4,19],[11,5],[39,5],[47,19],[46,98],[4,98]], p.paper, "#716f5d", 1.1);
    poly(g, [[4,19],[11,5],[11,19]], p.ink);
    poly(g, [[11,5],[39,5],[46,18],[11,18]], "#ede1bb");
    poly(g, [[38,19],[46,17],[46,97],[38,98]], "#68766e55");
    rect(g, 10, 4, 30, 4, p.ink);
    rect(g, 4, 20, 34, 6, p.ink);
    oval(g, 20, 42, 8.5, 8.5, p.ink); oval(g, 23, 39, 6.3, 6.3, p.paper);
    lettering(g, p.word, 21, 62, p.word.length > 2 ? 10 : 13, p.ink);
    poly(g, [[4,83],[17,74],[32,84],[39,79],[39,97],[4,97]],p.ink);
    line(g,7,91,24,79,p.paper,1.1);
    line(g,19,96,34,84,p.paper,1.1);
    for(let j=0;j<4;j++) rect(g,39,53+j*4,4.5,1,"#495c5477");
  }
  function rice(g, v) {
    const seals=["#a66653","#678270","#947b55"];
    const hull=[[1,92],[2,80],[22,11],[27,8],[48,81],[49,96],[2,98]];
    poly(g,hull,"#bec6b2","#68796d",1.6);
    g.beginPath();g.moveTo(6,88);g.quadraticCurveTo(10,67,22,25);g.quadraticCurveTo(25,16,29,25);
    g.lineTo(45,85);g.quadraticCurveTo(41,92,32,91);g.lineTo(10,92);g.closePath();g.fillStyle="#ded8b9";g.fill();
    for(let j=0;j<25;j++){
      const yy=38+(j*11)%45,xx=25+(j%2?-1:1)*(j%7)*yy/48;
      oval(g,xx,yy,1.6,.8,"#abb59d",(j%4)*.4);
    }
    poly(g,[[6,86],[14,50],[29,62],[38,91],[9,93]],"#3b4d46");
    poly(g,[[13,73],[26,61],[33,90],[21,92]],"#4e6254");
    line(g,5,82,21,21,"#f3eacb9c",1.5); line(g,29,20,45,79,"#eef1db8c",1.2);
    rect(g,16,42,20,10,seals[v%3]);lettering(g,["鮭","梅","昆布"][v%3],26,47,7.5,"#eee4c6");
    rect(g,2,94,45,3,"#a5b1a2");line(g,24,8,25,17,"#c1784c",2.1);
  }
  function coffee(g, v) {
    const dark = v%2===0, base=dark?"#615849":"#bb9068", band=dark?"#a89c7e":"#64533f";
    rect(g, 4, 9, 42, 84, base);
    rect(g, 4, 12, 42, 79, gradient(g,3,0,46,0,[[0,"#243a3649"],[.21,"#f0e5bd3b"],[.67,"#ffffff00"],[1,"#2639356c"]]));
    oval(g,25,9,21,6,"#9da69a");oval(g,25,8,17,3.5,"#c2c7b2");oval(g,28,8,5,1.7,"#6a7268");
    rect(g,4,23,42,3,band);rect(g,4,69,42,2,band);
    oval(g,25,43,9,12,band,-.42);line(g,20,53,29,32,base,1.2);
    lettering(g,"珈 琲",25,61,8,dark?"#e1cfac":"#493f32");
    oval(g,25,93,21,4.3,"#9fa597");line(g,6,91,43,91,"#b4bdac",1.5);
  }
  function pouch(g,v) {
    const p=PACK[v%PACK.length];
    poly(g,[[3,6],[11,8],[35,6],[48,7],[44,25],[48,88],[45,98],[29,96],[4,99],[6,74],[4,33]],p.paper,"#796e5c",1);
    poly(g,[[38,8],[48,7],[44,25],[48,88],[43,97],[38,79]],"#636a5950");
    rect(g,4,10,42,4,p.ink);rect(g,6,89,37,3,p.ink);
    for(let j=7;j<45;j+=4){line(g,j,7,j-1,12,"#77756566",1);line(g,j,93,j-1,97,"#70685966",1);}
    const cx=24;
    if(v%4===1){
      for(let j=0;j<3;j++)poly(g,[[12+j*3,64+j*2],[28+j*3,60+j*2],[33+j*3,73+j*2],[15+j*3,77+j*2]],j%2?"#546758":"#354d45");
    }else{
      oval(g,cx-5,68,8,10,"#9e764f",-.5);oval(g,cx+6,72,9,7,"#c08f60",-.3);
      for(let j=0;j<7;j++)oval(g,15+(j*7)%19,65+(j*5)%12,1.6,1,"#715f43",.3);
    }
    lettering(g,p.word,cx,44,p.word.length>3?9.6:12,p.ink);
    line(g,9,21,14,26,"#fcf2d18c",1.4);line(g,35,82,40,78,"#716a5666",1.3);
  }
  function sandwich(g,v) {
    const p = ["#7c916e","#ba8469","#b3975e"][v%3];
    poly(g,[[3,94],[5,83],[34,13],[39,8],[47,15],[48,93],[45,97]],"#b9c7b2","#66796e",1.1);
    poly(g,[[9,85],[36,24],[39,83]],"#c6986c");
    poly(g,[[13,80],[35,30],[35,80]],"#e5d9b3");
    poly(g,[[14,82],[34,43],[34,49],[18,82]],p);
    poly(g,[[18,82],[33,57],[34,64],[24,82]],"#c88a68");
    poly(g,[[4,81],[22,66],[48,71],[47,94],[4,95]],"#d4cbb0");
    rect(g,5,88,41,5,p);lettering(g,"サンド",27,79,7.6,"#586455");
    line(g,8,78,32,24,"#eee8cc9e",1.5);
  }
  function bowl(g,v) {
    const p=["#a76a52","#718371","#a48f63"][v%3];
    poly(g,[[2,19],[48,19],[41,94],[10,94]],"#c9c0a1","#746e59",1.2);
    poly(g,[[5,41],[46,41],[44,70],[7,70]],p);
    lettering(g,["うどん","そば","みそ"][v%3],25,54,10,"#eee3c8");
    line(g,12,77,39,77,p,2);
    rect(g,1,16,48,8,"#b3ae91");oval(g,25,16,24,6,p);oval(g,24,14,20,3.5,"#c9bea1");
  }
  function plate(g,x,y,value) {
    rect(g,x,y,29,9,"#d9cfac");rect(g,x,y,3,9,"#bd865e");
    lettering(g,String(value),x+16,y+5,7,"#575d50","center",true);
  }

  window.paintRainyFridge = function (g,w,h) {
    g.save();g.scale(w/1024,h/512);g.lineJoin="round";g.lineCap="round";
    const rng=seed(713);
    rect(g,0,0,1024,512,"#697f7f");
    rect(g,4,4,1016,38,gradient(g,0,4,0,42,[[0,"#b2c2b6"],[.35,"#c8d5c5"],[1,"#90a59d"]]));
    for(let door=0;door<4;door++){
      const x=9+door*253,inside=x+8,bw=226;
      lettering(g,["お茶と水","牛乳・豆乳","果汁と珈琲","おにぎり"][door],x+18,22,15,"#536d66","left");
      for(let j=0;j<3;j++)rect(g,x+207+j*5,19,2.8,6,"#859d91");
      rect(g,x,42,247,436,"#4c6769");
      rect(g,inside,48,bw,423,gradient(g,0,48,0,470,[[0,"#aabdb0"],[.18,"#a1b7ab"],[.70,"#879e93"],[1,"#718e88"]]));
      rect(g,inside+1,47,bw-1,4,"#ceddcc");rect(g,inside+1,51,bw-1,2,"#9bbbb3");
      for(let j=0;j<23;j++){
        for(let k=0;k<4;k++)rect(g,inside+6+k*71,59+j*17,1.5,3,"#5e7e7559");
      }
      for(let row=0;row<3;row++){
        const floor=[171,309,449][row];
        const draw=[ [bottle,bottle,bottle], [carton,carton,coffee], [bottle,coffee,bottle], [rice,sandwich,rice] ][door][row];
        const count=door===3 ? 4 : row===2 ? 4 : 5;
        const usable=bw-12,slot=usable/count;
        const group=[ [0,1,2],[1,0,0],[3,1,1],[0,2,1] ][door][row];
        const byType=draw===bottle?109:draw===carton?103:draw===coffee?76:draw===rice?73:87;
        rect(g,inside,floor-17,bw,20,gradient(g,0,floor-17,0,floor+3,[[0,"#415e5800"],[1,"#365a54af"]]));
        g.save();g.globalAlpha=.48;
        for(let j=0;j<count;j++){
          const tx=inside+5+(j+.26)*slot;
          item(g,draw,group+(j>=Math.ceil(count*.60)?1:0),tx,floor-10,slot*.72,byType*(.82+rng()*.09),0);
        }
        g.restore();
        for(let j=0;j<count;j++){
          if ((door===0&&row===1&&j===4)||(door===3&&row===2&&j===2))continue;
          const variant=group+(j>=Math.ceil(count*.59)?1:0),fw=slot*(draw===rice?.93:.79+rng()*.07);
          const tx=inside+5+j*slot+(slot-fw)*.5;
          oval(g,tx+fw*.53,floor-1,fw*.55,3.5,"#415a5268");
          item(g,draw,variant,tx,floor,fw,byType*(.94+rng()*.06),(rng()-.5)*.035);
        }
        rect(g,inside,floor+1,bw,13,"#899e90");rect(g,inside,floor+1,bw,2,"#cccfb3");
        rect(g,inside,floor+11,bw,2,"#5b766b");
        plate(g,inside+21,floor+2,door===3?158:128);plate(g,inside+bw-70,floor+2,row===1?138:118);
      }
      g.save();g.beginPath();g.rect(inside,50,bw,418);g.clip();
      poly(g,[[inside+11,50],[inside+47,50],[inside+bw,299],[inside+bw,345]],"#e1f2e30c");
      poly(g,[[inside+105,50],[inside+112,50],[inside+bw,180],[inside+bw,187]],"#e1f2e310");
      line(g,inside+2,49,inside+2,467,"#d1dfd17a",2.6);g.restore();
      const handle=door%2===0?x+237:x+2;
      rect(g,handle,184,7,95,"#4b6464");rect(g,handle+1,188,3,83,"#a5b5aa");rect(g,handle,185,6,4,"#bdc9b9");
    }
    rect(g,0,478,1024,34,gradient(g,0,478,0,512,[[0,"#88998e"],[.20,"#a4afa0"],[1,"#74837b"]]));
    for(let x=15;x<947;x+=11){rect(g,x,490,6,7,"#526c64");rect(g,x+1,490,4,1,"#405b54");}
    rect(g,969,486,39,13,"#485e58");lettering(g,"4°",987,493,10,"#d8a477","center",true);
    dust(g,rng,0,0,1024,512,1900);g.restore();
  };

  window.paintRainyShelf = function (g,w,h) {
    g.save();g.scale(w/768,h/384);g.lineJoin="round";g.lineCap="round";
    const rng=seed(1547);
    rect(g,0,0,768,384,gradient(g,0,0,0,384,[[0,"#b9b9a1"],[.5,"#a9ae97"],[1,"#9ba38d"]]));
    const rows=[
      {floor:113,items:[[rice,0,10,72,78],[rice,0,80,68,78],[rice,1,149,71,74],[rice,2,220,70,74],[sandwich,0,319,78,90],[sandwich,0,390,78,90],[sandwich,1,467,75,86],[carton,1,588,41,84],[carton,1,630,41,84],[carton,0,683,41,82]]},
      {floor:232,items:[[pouch,0,8,63,91],[pouch,0,69,65,94],[pouch,3,155,58,86],[pouch,3,212,58,87],[pouch,1,284,63,88],[pouch,1,349,60,88],[bowl,0,438,84,57],[bowl,0,519,80,58],[bowl,1,612,65,66],[bowl,1,680,65,68]]},
      {floor:350,items:[[carton,0,12,47,93],[carton,0,56,48,91],[carton,2,106,48,93],[coffee,1,195,48,76],[coffee,1,244,48,76],[coffee,0,301,48,75],[pouch,2,382,78,78],[pouch,2,460,74,78],[pouch,0,577,75,89],[pouch,0,657,72,91]]}
    ];
    rows.forEach(({floor,items},row)=>{
      const top=row?rows[row-1].floor+17:5;
      rect(g,5,top,758,24,gradient(g,0,top,0,top+24,[[0,"#65756870"],[1,"#a5ab9000"]]));
      for(let xx=12;xx<763;xx+=24)for(let yy=top+8;yy<floor;yy+=17)rect(g,xx,yy,1.6,2.2,"#79877550");
      rect(g,4,floor-16,760,20,gradient(g,0,floor-16,0,floor+4,[[0,"#314b3f00"],[1,"#5067528c"]]));
      g.save();g.globalAlpha=.55;
      items.forEach(([draw,v,x,pw,ph],i)=>{if(i%4!==3)item(g,draw,v,x+pw*.21,floor-7,pw*.85,ph*.94,.016);});
      g.restore();
      items.forEach(([draw,v,x,pw,ph])=>{
        oval(g,x+pw*.55,floor,pw*.51,2.4,"#55614c70");
        item(g,draw,v,x,floor,pw,ph,(rng()-.5)*.045);
      });
      rect(g,2,floor+1,764,15,"#a4ad97");rect(g,3,floor+1,762,3,"#ced0b5");
      rect(g,4,floor+11,760,3,"#848f7a");
      [22,166,323,483,645].forEach((x,i)=>plate(g,x,floor+3,[158,138,120,178,128][(i+row)%5]));
      if(row===1){rect(g,588,floor+2,33,10,"#b78767");lettering(g,"新入荷",604,floor+7,6.8,"#eee1c3");}
    });
    rect(g,1,367,766,17,"#889b89");rect(g,2,368,764,3,"#b2b8a1");
    [1,761].forEach(x=>{rect(g,x,2,5,364,"#879c8c");rect(g,x+1,2,1.2,364,"#c3c8b1");});
    dust(g,rng,0,0,768,384,1250);g.restore();
  };
})();
