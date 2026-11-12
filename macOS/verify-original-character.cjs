/*
  node macOS/verify-original-character.cjs <output-dir> [original-git-ref]
  Requires Chromium, Playwright and pngjs. PLAYWRIGHT_PATH, PNGJS_PATH and
  CHROME_PATH optionally locate installed packages / a browser executable.
  The HTTP fixture extracts an exact git tree and modifies only a served copy of
  each index: replace the uncontrolled wall clock with the real updateGirl call.
*/
"use strict";
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const cp = require("node:child_process");
const fs = require("node:fs/promises");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const {createRequire} = require("node:module");
const runner = require.resolve(process.env.PLAYWRIGHT_PATH || "playwright");
const {chromium} = require(runner);
const {PNG} = createRequire(runner)(process.env.PNGJS_PATH || "pngjs");
const repo = path.resolve(__dirname, "..");
const resultDir = path.resolve(process.argv[2] || "original-character-proof");
const ref = process.argv[3] || "c1038211c736f71ae57a4cdbad740ac00de8c15c";
const git = (...args) => cp.execFileSync("git", ["-C", repo, ...args]);
const sha = data => crypto.createHash("sha256").update(data).digest("hex");
const seed = 0x0725cafe;
const mime = {".html":"text/html; charset=utf-8", ".js":"text/javascript", ".css":"text/css", ".webp":"image/webp", ".png":"image/png"};

function installFixture(html) {
  const entry = /^frame\(\);\s*$/gm;
  assert.equal([...html.matchAll(entry)].length, 1, "Cannot find unique display loop");
  return html.replace(entry, `// One synchronous initial update, like the original first frame before assets arrive.
updateGirl(0,0); scene.updateMatrixWorld(true);
window.__characterProofStep=updateGirl;`);
}

function prepareStudio() {
  const d = window.__diorama, T = window.THREE, g = d.girl;
  const scene = new T.Scene();
  scene.background = new T.Color(0x35415a);
  scene.add(new T.HemisphereLight(0xb9c9ed,0x868399,1.25));
  const key = new T.DirectionalLight(0xffeee2,0.55);
  key.position.set(-2,3,4);scene.add(key);
  scene.add(g.root);
  d.renderer.setPixelRatio(1);
  d.renderer.setSize(600,720,false);
  d.renderer.shadowMap.enabled=false;
  d.camera.position.set(2.51,0.839,3.13);
  d.camera.lookAt(1.6,0.63,1.25);
  d.camera.updateMatrixWorld(true);
  const views={body:[2.70,0.89,3.47,1.60,0.67,1.25,32],
               face:[2.10,0.97,2.29,1.60,0.88,1.25,22]};
  const cameras={};
  for(const [k,v] of Object.entries(views)){
    const cam=new T.PerspectiveCamera(v[6],600/720,0.04,140);
    cam.position.fromArray(v);cam.lookAt(v[3],v[4],v[5]);cam.layers.enable(1);cam.updateMatrixWorld(true);
    cameras[k]=cam;
  }
  // Three uses allocation ids (including material ids) to batch opaque draws.
  // Texture decoding order can change those ids even between two loads of main.
  // Record both the native draw order and a reproducible equivalent tie-break
  // so a coplanar clothing-edge pixel can be separated from actual asset drift.
  function materialKey(m){
    return [m.name,m.type,m.color?.getHexString(),m.roughness,m.metalness,m.side].join("/");
  }
  function stableOpaque(a,b){
    return a.groupOrder-b.groupOrder || a.renderOrder-b.renderOrder ||
      materialKey(a.material).localeCompare(materialKey(b.material)) || a.z-b.z ||
      a.object.name.localeCompare(b.object.name) || a.id-b.id;
  }
  function stableTransparent(a,b){
    return a.groupOrder-b.groupOrder || a.renderOrder-b.renderOrder || b.z-a.z ||
      materialKey(a.material).localeCompare(materialKey(b.material)) || a.object.name.localeCompare(b.object.name) || a.id-b.id;
  }
  function render(view,visibility="all",controlled=true){
    const hair=g.hair.mesh,original=hair.visible;
    const others=[];
    if(visibility==="nonHair")hair.visible=false;
    if(visibility==="hairOnly")g.root.traverse(o=>{if(o.isMesh && o!==hair){others.push([o,o.visible]);o.visible=false}});
    d.renderer.setOpaqueSort(controlled?stableOpaque:null);
    d.renderer.setTransparentSort(controlled?stableTransparent:null);
    d.renderer.setRenderTarget(null);
    d.renderer.render(scene,cameras[view]);
    const data=d.renderer.domElement.toDataURL("image/png");
    hair.visible=original;
    for(const [m,v] of others)m.visible=v;
    return data;
  }
  function pose(){
    const bones=[],morphs=[];g.root.updateMatrixWorld(true);
    g.root.traverse(o=>{
      if(o.isBone)bones.push([o.name,...o.matrixWorld.elements]);
      if(o.morphTargetInfluences?.length)morphs.push([o.name,...o.morphTargetInfluences]);
    });
    bones.sort((a,b)=>a[0].localeCompare(b[0]));morphs.sort((a,b)=>a[0].localeCompare(b[0]));
    return {bones,morphs,umbrella:g.U.spin.matrixWorld.toArray(),root:g.root.matrixWorld.toArray()};
  }
  async function geometry(){
    const rows=[],materials=new Map(),images=new Map(),geometries=new Map();
    async function digest(v){
      const hash=await crypto.subtle.digest("SHA-256",v);
      return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,"0")).join("");
    }
    async function texture(map){
      if(!map?.image)return null;
      if(!images.has(map.image)){
        const im=map.image;
        if(!im.width || !im.height || !(im instanceof HTMLImageElement || im instanceof HTMLCanvasElement))return null;
        const c=document.createElement("canvas");c.width=im.width;c.height=im.height;
        const x=c.getContext("2d");x.drawImage(im,0,0);
        images.set(im,await digest(x.getImageData(0,0,c.width,c.height).data));
      }
      return images.get(map.image);
    }
    async function material(m){
      if(!materials.has(m)){
        const code={name:m.name,type:m.type};
        for(const k of ["color","emissive","roughness","metalness","opacity","alphaTest","side","transparent","depthWrite","alphaToCoverage"]){
          if(m[k]!==undefined)code[k]=m[k]?.isColor ? m[k].toArray() : m[k];
        }
        code.map=await texture(m.map);code.emissiveMap=await texture(m.emissiveMap);
        materials.set(m,code);
      }
      return materials.get(m);
    }
    async function meshGeometry(geo){
      if(!geometries.has(geo)){
        const parts={};
        for(const [k,a] of Object.entries({...geo.attributes,index:geo.index}).sort()){
          if(!a)continue;
          const arr=a.array||a.data.array;
          parts[k]=await digest(new Uint8Array(arr.buffer,arr.byteOffset,arr.byteLength));
        }
        for(const [key,targets] of Object.entries(geo.morphAttributes)){
          parts["morph-"+key]=[];
          for(const attr of targets){
            const a=attr.array||attr.data.array;
            parts["morph-"+key].push(await digest(new Uint8Array(a.buffer,a.byteOffset,a.byteLength)));
          }
        }
        geometries.set(geo,parts);
      }
      return geometries.get(geo);
    }
    const meshes=[];g.root.traverse(o=>{if(o.isMesh)meshes.push(o)});
    for(const obj of meshes){
      const matArray=Array.isArray(obj.material)?obj.material:[obj.material], mats=[];
      for(const m of matArray)mats.push(await material(m));
      rows.push({name:obj.name,parent:obj.parent.name,visible:obj.visible,skinned:!!obj.isSkinnedMesh,
        materials:mats,geometry:await meshGeometry(obj.geometry)});
    }
    // Asynchronous GLTF texture decoding can resolve primitives in a different
    // sibling order. Compare the complete entries as a multiset; never discard
    // a mesh, its owner, index buffer, material, or a duplicated draw.
    return rows.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  async function motions(){
    const output={};
    for(const [key,action] of Object.entries(g.A).sort()){
      const clip=action.getClip(), tracks=[];
      for(const track of clip.tracks){
        const arrays=[];
        for(const data of [track.times,track.values]){
          const bytes=new Uint8Array(data.buffer,data.byteOffset,data.byteLength);
          const sum=await crypto.subtle.digest("SHA-256",bytes);
          arrays.push(Array.from(new Uint8Array(sum),v=>v.toString(16).padStart(2,"0")).join(""));
        }
        tracks.push([track.name,track.ValueTypeName,track.getInterpolation(),...arrays]);
      }
      output[key]={duration:clip.duration,tracks};
    }
    return output;
  }
  let frame=0;
  window.__setCharacterSeed(0x0725cafe);
  window.__actorStudio={views,render,pose,geometry,motions,step(n){
    for(let i=0;i<n;i++)window.__characterProofStep(1/60,++frame/60);
  }};
}

function comparePixels(a,b) {
  const A=PNG.sync.read(a), B=PNG.sync.read(b);
  assert.equal(A.width,B.width);assert.equal(A.height,B.height);
  let changedPixels=0, maxChannel=0, absolute=0;
  for(let i=0;i<A.data.length;i+=4){
    let changed=false;
    for(let k=0;k<4;k++){
      const diff=Math.abs(A.data[i+k]-B.data[i+k]);
      if(diff){changed=true;maxChannel=Math.max(maxChannel,diff);absolute+=diff}
    }
    if(changed)changedPixels++;
  }
  return {pixels:A.width*A.height,changedPixels,maxChannel,meanAbsRGBA:absolute/A.data.length};
}

async function exercise(browser,url,label,verifyHair) {
  const context=await browser.newContext({viewport:{width:600,height:720},deviceScaleFactor:1});
  const page=await context.newPage();
  await page.addInitScript(initial=>{
    let s=initial;
    window.__setCharacterSeed=n=>{s=n>>>0};
    Math.random=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296};
  },seed);
  page.on("pageerror",e=>console.error(label,e.message));
  try{
    await page.goto(url,{waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>window.__diorama?.girl.ready && window.__diorama.npcs.length===2,
      undefined,{polling:100,timeout:45000});
    await page.evaluate(prepareStudio);
    const inputMeshes=await page.evaluate(()=>window.__actorStudio.geometry());
    const clips=await page.evaluate(()=>window.__actorStudio.motions());
    const checks={},pictures={};
    async function picture(name,view,visibility,controlled=true){
      const encoded=await page.evaluate(([v,mask,fixed])=>window.__actorStudio.render(v,mask,fixed),[view,visibility,controlled]);
      const bytes=Buffer.from(encoded.split(",")[1],"base64");
      pictures[name]=bytes;
      await fs.writeFile(path.join(resultDir,label+"-"+name+".png"),bytes);
    }
    async function tick(name,frames,action,views=[]){
      const pose=await page.evaluate(([n,act])=>{
        const d=window.__diorama,s=window.__actorStudio;
        if(act==="walk")d.keys.add("KeyD");
        else if(act==="stop")d.keys.delete("KeyD");
        else if(act)d.gesture(act);
        s.step(n);return s.pose();
      },[frames,action]);
      checks[name]=pose;
      for(const view of views){
        await picture(name+"-"+view,view,"all");
        await picture("native-"+name+"-"+view,view,"all",false);
      }
    }
    await tick("idle",60,null,["body","face"]);
    const hairChecks={};
    if(verifyHair){
      const defaultMode=await page.evaluate(()=>window.__diorama.hairFinish?.mode);
      assert.equal(defaultMode,"original","Fresh profile must use main's original hair");
      await picture("idle-nonhair","face","nonHair");
      await picture("idle-haironly","face","hairOnly");
      const after=await page.evaluate(()=>{
        const d=window.__diorama, before=[];
        d.girl.root.traverse(o=>{if(o.isMesh)before.push({mesh:o,material:o.material,version:o.material.version,geometry:o.geometry})});
        d.hairFinish.set("soft",false);
        const changed=before.filter(r=>r.mesh.geometry!==r.geometry || r.mesh.material!==r.material || r.mesh.material.version!==r.version);
        return {mode:d.hairFinish.mode,pose:window.__actorStudio.pose(),changedMeshes:changed.map(r=>r.mesh.name)};
      });
      assert.deepEqual(after.changedMeshes,["ProcHair"],"mode switch must only invalidate the original procedural hair material");
      hairChecks.changedMeshes=after.changedMeshes;
      assert.equal(after.mode,"soft");assert.deepEqual(after.pose,checks.idle,"hair switch moved original rig");
      await picture("soft-face","face","all");
      await picture("soft-nonhair","face","nonHair");
      await picture("soft-haironly","face","hairOnly");
      hairChecks.full=comparePixels(pictures["idle-face"],pictures["soft-face"]);
      hairChecks.nonHair=comparePixels(pictures["idle-nonhair"],pictures["soft-nonhair"]);
      hairChecks.onlyHair=comparePixels(pictures["idle-haironly"],pictures["soft-haironly"]);
      const state=await page.evaluate(()=>{window.__diorama.hairFinish.set("original",false);return window.__diorama.hairFinish.mode});
      assert.equal(state,"original");
      await picture("restored-face","face","all");
      hairChecks.restored=comparePixels(pictures["idle-face"],pictures["restored-face"]);
      assert(hairChecks.onlyHair.changedPixels>0 && hairChecks.full.changedPixels>0,"hair control has no visible effect");
      assert.equal(hairChecks.nonHair.changedPixels,0,"soft mode modified visible non-hair geometry");
      assert.equal(hairChecks.restored.changedPixels,0,"switching back must restore original frame");
    }
    await tick("blink",86,null,["face"]);
    await tick("wink",23,"wink",["face"]);
    await tick("wave",31,"wave",["body"]);
    await tick("twirl",36,"twirl",["body"]);
    await tick("walk",16,"walk",["body"]);
    await tick("stop",100,"stop");
    await tick("touchHair",37,"touchHair",["face"]);
    await tick("lookAround",73,"lookAround",["face"]);
    const views=await page.evaluate(()=>window.__actorStudio.views);
    return {inputMeshes,checks,pictures,hairChecks,clips,views};
  } finally {await context.close()}
}

(async()=>{
  const commit=git("rev-parse","--verify",ref+"^{commit}").toString().trim();
  const tmp=await fs.mkdtemp(path.join(os.tmpdir(),"rainy-original-"));
  const baseline=path.join(tmp,"original");await fs.mkdir(baseline);await fs.mkdir(resultDir,{recursive:true});
  const archive=path.join(tmp,"source.tar");git("archive","--output",archive,commit);
  cp.execFileSync("tar",["-xf",archive,"-C",baseline]);
  const variants={baseline,candidate:repo};
  const server=http.createServer(async(req,res)=>{
    try{
      const parts=new URL(req.url,"http://localhost").pathname.split("/").filter(Boolean).map(decodeURIComponent);
      const root=variants[parts.shift()];if(!root)throw Error("project");
      const file=path.resolve(root,parts.join("/")||"index.html");
      if(!file.startsWith(root+path.sep))throw Error("path");
      let body=await fs.readFile(file);
      if(path.basename(file)==="index.html")body=installFixture(body.toString());
      res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream"});res.end(body);
    } catch(e){res.writeHead(404);res.end(e.message)}
  });
  let browser;
  try{
    await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
    const base="http://127.0.0.1:"+server.address().port+"/";
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,args:[
      "--ignore-gpu-blocklist","--enable-webgl",...(process.platform==="darwin"?["--use-gl=angle","--use-angle=metal"]:[])]});
    const a=await exercise(browser,base+"baseline/#hq","github-main",false);
    const b=await exercise(browser,base+"candidate/#hq","candidate",true);
    for(const [name,data] of [["github-main",a],["candidate",b]]){
      await fs.writeFile(path.join(resultDir,name+"-mesh-materials.json"),JSON.stringify(data.inputMeshes,null,2)+"\n");
    }
    const summary={ref,commit,chromium:browser.version(),seed,stepSeconds:1/60,
      meshCount:a.inputMeshes.length,skinned:a.inputMeshes.filter(m=>m.skinned).length,
      cameraXYZTargetXYZFov:a.views,animationCount:Object.keys(a.clips).length,
      originalClipTrackSignatures:[sha(JSON.stringify(a.clips)),sha(JSON.stringify(b.clips))],
      defaultMeshSignatures:[sha(JSON.stringify(a.inputMeshes)),sha(JSON.stringify(b.inputMeshes))],
      defaultCharacter:{},hair:b.hairChecks};
    for(const k of Object.keys(a.checks)){
      const orig=a.checks[k],now=b.checks[k];
      const componentDiff={};
      for(const name of Object.keys(orig)){
        const namesSame=orig[name].length===now[name].length;
        const diffs=namesSame?orig[name].filter((v,i)=>JSON.stringify(v)!==JSON.stringify(now[name][i])):[];
        componentDiff[name]={exact:namesSame&&!diffs.length,entries:orig[name].length,changed:namesSame?diffs.length:null};
        if(diffs.length)componentDiff[name].firstDifferent=Array.isArray(diffs[0])?diffs[0][0]:diffs[0];
      }
      const pixels={};
      for(const shot of Object.keys(a.pictures).filter(n=>n.startsWith(k+"-")))pixels[shot]=comparePixels(a.pictures[shot],b.pictures[shot]);
      const nativeOrderPixels={};
      for(const shot of Object.keys(a.pictures).filter(n=>n.startsWith("native-"+k+"-")))
        nativeOrderPixels[shot]=comparePixels(a.pictures[shot],b.pictures[shot]);
      summary.defaultCharacter[k]={components:componentDiff,pixels,nativeOrderPixels};
    }
    await fs.writeFile(path.join(resultDir,"report.json"),JSON.stringify(summary,null,2)+"\n");
    assert.equal(summary.defaultMeshSignatures[0],summary.defaultMeshSignatures[1],"Mesh/texture/material inventory diverges (see report)");
    assert.equal(summary.originalClipTrackSignatures[0],summary.originalClipTrackSignatures[1],"Playable motion clips, interpolation, timestamps or track samples differ");
    for(const [state,record] of Object.entries(summary.defaultCharacter)){
      for(const [key,c] of Object.entries(record.components))assert(c.exact,state+" "+key+" diverged: "+JSON.stringify(c));
      for(const [shot,p] of Object.entries(record.pixels))assert.equal(p.changedPixels,0,shot+" controlled comparison differs");
      for(const [shot,p] of Object.entries(record.nativeOrderPixels))
        assert(p.changedPixels<=Math.floor(p.pixels/100000),shot+" native draw order diverged beyond isolated coincident depth edges");
    }
    const sheet=await browser.newPage();
    const encoded=await sheet.evaluate(async inputs=>{
      const cvs=document.createElement("canvas");cvs.width=1352;cvs.height=660;
      const c=cvs.getContext("2d");c.fillStyle="#efeee8";c.fillRect(0,0,cvs.width,cvs.height);
      c.fillStyle="#21283a";c.font="600 30px sans-serif";c.fillText("雨夜便利店   /   原角色对照",36,54);
      const titles=["GitHub main","游戏默认","可选 · 发丝柔光"];
      for(let i=0;i<3;i++){
        const im=new Image();im.src=inputs[i];await im.decode();
        const x=36+i*435;c.drawImage(im,49,150,502,546,x,87,413,450);
        c.fillStyle="#21283a";c.font="500 25px sans-serif";c.fillText(titles[i],x,580);
      }
      c.fillStyle="#626774";c.font="18px sans-serif";c.fillText("同一机位与灯光  /  第 60 帧  /  1⁄60 秒动画步长",36,626);
      return cvs.toDataURL("image/png").split(",")[1];
    },[a.pictures["idle-face"],b.pictures["idle-face"],b.pictures["soft-face"]].map(buf=>"data:image/png;base64,"+buf.toString("base64")));
    await sheet.close();
    await fs.writeFile(path.join(resultDir,"原角色同机位对照.png"),Buffer.from(encoded,"base64"));
    console.log("Original meshes, textures, rigs, facial weights and controlled rendered checkpoints match exactly. "+path.join(resultDir,"report.json"));
  } finally{
    if(browser)await browser.close();
    await new Promise(ok=>server.close(ok));
    await fs.rm(tmp,{recursive:true,force:true});
  }
})().catch(e=>{console.error(e);process.exitCode=1});
