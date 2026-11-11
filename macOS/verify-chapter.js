// Pass as the async JS body to RainyNight --probe, using a fresh QA profile.
const q=s=>document.querySelector(s);
const read=()=>JSON.parse(localStorage.getItem("rainy-night-store/last-frame/1") || "{}");
const mode=()=>q("#rain-film")?.dataset.mode;
const shot=async name=>{await delay(200);await window.webkit.messageHandlers.rainySnapshot.postMessage(name)};
async function waitFor(test,what,seconds=30) {
  const end=performance.now()+seconds*1000;
  while(!test()){if(performance.now()>end)throw Error(what+"；界面="+mode()+"；"+document.body.innerText.slice(-450)+" / "+JSON.stringify([window.__diorama?.st?.x,window.__diorama?.st?.z,window.__diorama?.film?.info?.()]));await delay(80)}
}
function press(selector) {
  const el=q(selector);
  if(!el||el.disabled||!el.getClientRects().length)throw Error("不可操作 "+selector);
  el.click();
}
const button=n=>'[data-f="'+n+'"]';
await waitFor(()=>q("#rain-film")&&!q("#rain-film").hidden,"等待街角交互");
if(read().sealed || read().loaded)throw Error("此验收需要全新存档");
const d=window.__diorama, before=[d.st.x,d.st.z];
await waitFor(()=>d.info().camMode==="close","原作自动近景");d.finishTween();await delay(750);
await shot("01-雨夜街角");
press(button("ticket"));await waitFor(()=>mode()==="finder","步行到公交亭",75);
const walked=Math.hypot(d.st.x-before[0],d.st.z-before[1]);
if(walked<1)throw Error("没有实际走到公交亭");
await delay(1100);await shot("02-原角色取景");
press(button("shoot"));await waitFor(()=>read().frames?.length===1,"拍下伞下主角");
press(button("next"));press(button("speed"));
await waitFor(()=>d.film.info().bus==="stopped"&&d.film.info().door>.7,"等待原场景中的巴士实际到站",40);
await shot("03-末班巴士");press(button("shoot"));await waitFor(()=>read().frames?.length===2,"拍下末班车慢门");
press(button("next"));press(button("next"));press(button("lens"));await delay(700);
press(button("shoot"));await waitFor(()=>read().frames?.length===3,"拍下三花猫");
const saved=read(),motifs=saved.frames.map(s=>s.motif);
if(motifs.join("/")!=="umbrella/bus/cat")throw Error("取景源对应错误");
const observed=[];
for(const f of saved.frames){
  const im=new Image();im.src=f.src;await im.decode();
  const c=document.createElement("canvas");c.width=32;c.height=24;const g=c.getContext("2d");
  g.drawImage(im,0,0,32,24);const pixels=g.getImageData(0,0,32,24).data;
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",pixels))).map(x=>x.toString(16).padStart(2,"0")).join("");
  let l=0,l2=0;
  for(let p=0;p<pixels.length;p+=4){const lum=.2126*pixels[p]+.7152*pixels[p+1]+.0722*pixels[p+2];l+=lum;l2+=lum*lum}
  const n=pixels.length/4,contrast=Math.sqrt(l2/n-(l/n)**2);
  if(contrast<5)throw Error("底片没有可辨图像："+f.motif);
  observed.push({motif:f.motif,width:im.width,height:im.height,sha256Pixels:hash,contrast});
}
if(new Set(observed.map(f=>f.sha256Pixels)).size!==3)throw Error("三格实际图像重复");
press(button("develop"));await waitFor(()=>q(".cp-room")&&!q(".cp-room").hidden,"冲印台");
const frames=document.querySelectorAll(".cp-frame");
frames[0].click();frames[1].click();press(".cp-swap");await shot("04-双联印相台");
press(".cp-action");await delay(1650);press(".cp-action");
await waitFor(()=>q(".cp-room")?.dataset.state==="ready","真实曝光计时");
press(".cp-action");await waitFor(()=>mode()==="exhibit"&&read().sealed,"将印相装入真实灯箱");
await delay(1100);await shot("05-候车亭灯箱");
press(button("ticket"));await waitFor(()=>mode()==="proof","翻看已装裱的印相");
await shot("06-成品双联");
press(button("save"));await delay(900);
const sheet=q('[data-f="sheet"] canvas'), result=read(), paperPixels=sheet?.getContext("2d").getImageData(0,0,1,1).data;
if(!sheet||!result.print?.startsWith('data:image/png')||result.title!=="末班巴士 / 伞下的人")throw Error("装裱没有使用所选底片顺序或未保留无损印相");
// Read the actual material attached to the 3D shelter. Compare the fitted area
// pixel-for-pixel against the very same paper that the player holds in the UI.
const maps=new Set();
let world=d.girl.root;while(world.parent)world=world.parent;
world.traverse(o=>{
  for(const m of Array.isArray(o.material)?o.material:[o.material]){
    const im=m?.map?.image;
    if(im instanceof HTMLCanvasElement && im.width===640 && im.height===958) maps.add(im);
  }
});
const expected=document.createElement('canvas');expected.width=640;expected.height=958;
const g=expected.getContext('2d'),fit=Math.min(562/sheet.width,614/sheet.height);
const dw=sheet.width*fit,dh=sheet.height*fit,x=(expected.width-dw)/2,y=168+(614-dh)/2;
g.drawImage(sheet,x,y,dw,dh);
const rect=[Math.ceil(x)+7,Math.ceil(y)+7,Math.floor(dw)-14,Math.floor(dh)-14];
const expectedPixels=g.getImageData(...rect).data;
let posterError=Infinity;
for(const map of maps){
  const actual=map.getContext('2d').getImageData(...rect).data;let mae=0,n=0;
  for(let j=0;j<actual.length;j+=4*17){for(let k=0;k<3;k++){mae+=Math.abs(actual[j+k]-expectedPixels[j+k]);n++}}
  posterError=Math.min(posterError,mae/n);
}
if(posterError>1)throw Error("灯箱材质与玩家纸样 RGB 不同: "+posterError);
let originalSkinMeshes=0;d.girl.root.traverse(o=>{if(o.isSkinnedMesh)originalSkinMeshes++});
return {walked,frames:observed,title:result.title,roll:result.roll,originalSkinMeshes,posterMeanRGBError:posterError,
  paper:[sheet.width,sheet.height],paperCorner:Array.from(paperPixels)};
