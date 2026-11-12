/*
  Run with Node + Playwright Chromium. External simulations are intercepts in a
  disposable browser context. The shipped page has no failure flags or test data.
  PLAYWRIGHT_PATH and CHROME_PATH can point at a locally provisioned installation.
*/
"use strict";
const fs=require("node:fs/promises"),http=require("node:http"),path=require("node:path");
const {pathToFileURL}=require("node:url");
const {chromium}=require(process.env.PLAYWRIGHT_PATH || "playwright");
const assert=require("node:assert/strict");
const root=path.resolve(__dirname,".."),dest=path.resolve(process.argv[2]||"character-proof");
const original=fs.readFile(path.join(root,"index.html"),"utf8");
const types={".html":"text/html; charset=utf-8",".js":"text/javascript",".css":"text/css",".webp":"image/webp",".png":"image/png"};
const httpServer=http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,"http://localhost"),name=decodeURIComponent(url.pathname);
    const file=path.resolve(root,"."+ (name==="/"?"/index.html":name));
    if(!file.startsWith(root+path.sep))throw Error("outside");
    const data=await fs.readFile(file);
    res.writeHead(200,{"Content-Type":types[path.extname(file)]||"application/octet-stream"});res.end(data);
  } catch {res.writeHead(404);res.end()}
});
async function ready(page) {
  await page.waitForFunction(()=>{
    const d=window.__diorama;
    if(!d?.girl.ready||d.npcs.length!==2)return false;
    return d.npcs.every(n=>{
      let ready=0;const loaded=new Set();
      n.b.model.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:[o.material]){
        if(m?.map?.image?.width && m.map.image.src?.startsWith("data:image/webp"))loaded.add(m.map.uuid);
      }});ready=loaded.size;return ready>=4;
    });
  },undefined,{timeout:35000});
  return page.evaluate(()=>{
    const d=window.__diorama,g=d.girl;const visibleSource=new Set();
    g.src.scene.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:[o.material]){
      if(m?.map?.image?.width)visibleSource.add(m.name)
    }});
    return {ready:g.ready,sourceMaterials:visibleSource.size,animations:Object.keys(g.A).sort(),
      npcs:d.npcs.map(n=>n.kind).sort(),umbrella:!!g.U?.umb,
      actorCopies:g.root.children.filter(o=>o.getObjectByName("J_Bip_C_Head")).length,
      stage:d.characterLoad.phase,attempt:d.characterLoad.attempt,via:d.characterLoad.transport,
      warnings:[...d.characterLoad.warnings]};
  });
}
(async()=>{
  await fs.mkdir(dest,{recursive:true});await new Promise(ok=>httpServer.listen(0,"127.0.0.1",ok));
  const base="http://127.0.0.1:"+httpServer.address().port+"/";
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,
    args:["--ignore-gpu-blocklist","--enable-webgl",...(process.platform==="darwin"?["--use-gl=angle","--use-angle=metal"]:[])]});
  const cases={};
  async function scenario(label,url,setup,after) {
    const context=await browser.newContext({viewport:{width:900,height:650}}),page=await context.newPage();
    try{
      const pageErrors=[],remote=[];page.on("pageerror",e=>pageErrors.push(e.message));
      page.on("request",r=>{if(/^https?:/.test(r.url()) && !r.url().startsWith(base))remote.push(r.url())});
      if(setup)await setup(page);
      await page.goto(url,{waitUntil:"domcontentloaded"});if(after)await after(page);
      const result=await ready(page);
      assert.equal(result.sourceMaterials,13);assert.equal(result.animations.length,18);
      assert.deepEqual(result.npcs,["clerk","courier"]);assert.equal(result.umbrella,true);
      assert.equal(result.actorCopies,1);assert.equal(result.stage,"ready");assert.deepEqual(pageErrors,[]);assert.deepEqual(remote,[]);
      cases[label]=result;
      if(label==="direct-file"){
        await page.evaluate(()=>{window.__diorama.setMode("close");window.__diorama.finishTween()});
        await page.waitForTimeout(650);await page.screenshot({path:path.join(dest,"direct-file.png")})
      }
    }catch(e){
      const details=await page.evaluate(()=>({hint:document.querySelector("#hint")?.textContent,
        state:window.__diorama?.characterLoad,npcs:window.__diorama?.npcs.length})).catch(()=>null);
      console.error(label,details);throw e;
    }finally{await context.close()}
  }
  try{
    await scenario("direct-file",pathToFileURL(path.join(root,"index.html")).href);
    assert.equal(cases["direct-file"].via,"script");
    await scenario("http",base);assert.equal(cases.http.via,"fetch");
    let first=true;
    await scenario("HTTP-503-fallback",base,p=>p.route("**/film/character-pack.js*",r=>{
      if(first){first=false;return r.fulfill({status:503,body:"unavailable"})}return r.continue()
    }));assert.equal(cases["HTTP-503-fallback"].via,"script");
    for(const file of ["vendor/three/GLTFLoader.js","film/character-loader.js"]){
      let cold=true;
      await scenario("initial-script-recovery-"+file.split("/").pop(),base,p=>p.route("**/"+file+"*",r=>{
        if(cold){cold=false;return r.abort("failed")}return r.continue()
      }));
    }
    let damaged=true;
    await scenario("truncated-GLB-recovered",base,p=>p.route("**/film/character-pack.js*",async r=>{
      if(!damaged)return r.continue();damaged=false;
      const raw=await fs.readFile(path.join(root,"film","character-pack.js"),"utf8");
      return r.fulfill({contentType:"text/javascript",body:raw.replace(/"model":"[^"]+"/,'"model":"eA=="')});
    }));assert.equal(cases["truncated-GLB-recovered"].attempt,2);
    let denied=true,failedRequests=0;
    await scenario("manual-retry",base,p=>p.route("**/film/character-pack.js*",r=>{
      if(denied){failedRequests++;return r.abort("failed")}return r.continue()
    }),async p=>{
      await p.locator("#character-retry").waitFor({state:"visible"});
      assert.match(await p.locator("#hint").textContent(),/人物资源/);assert.equal(failedRequests,4);
      assert.equal(await p.evaluate(()=>window.__diorama.girl.root.children.length),0);
      await p.screenshot({path:path.join(dest,"retry-in-place.png")});denied=false;
      await p.evaluate(()=>{localStorage.setItem("test-retry-mark","here");
        const b=document.querySelector("#character-retry");b.click();b.click()});
      await p.waitForFunction(()=>window.__diorama.girl.ready);
      assert.equal(await p.evaluate(()=>localStorage.getItem("test-retry-mark")),"here");
    });
    await scenario("late-assembly-retry",base,p=>p.route(base,async r=>{
      const html=(await original).replace('stage("umbrella");','stage("umbrella");if(!window._once){window._once=true;throw Error("injected late prop error");}');
      await r.fulfill({contentType:"text/html",body:html});
    }));assert.equal(cases["late-assembly-retry"].attempt,2);
    await scenario("optional-accessories",base,async p=>{
      await p.route(base,async r=>r.fulfill({contentType:"text/html",body:(await original).replace("function makeJewellery(model, env){",'function makeJewellery(model, env){throw Error("injected accessory error");')}));
      await p.route("**/film/rain-details.js",r=>r.fulfill({contentType:"text/javascript",body:'window.createRainDetails=()=>{throw Error("injected cat detail error")};'}))
    });assert(cases["optional-accessories"].warnings.includes("穿戴首饰"));assert(cases["optional-accessories"].warnings.includes("三花听声"));
    await fs.writeFile(path.join(dest,"report.json"),JSON.stringify(cases,null,2));
    console.log("Original character and NPCs loaded in all "+Object.keys(cases).length+" scenarios.");
  }finally{await browser.close();await new Promise(ok=>httpServer.close(ok))}
})().catch(e=>{console.error(e);process.exit(1)});
