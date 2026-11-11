import AppKit
import WebKit
import CryptoKit

enum ProofError:LocalizedError {case issue(String);var errorDescription:String? {if case let .issue(s)=self{return s};return nil}}

final class Proof:NSObject,WKScriptMessageHandlerWithReply {
    let directory:URL, code:URL?
    var requestedFrames=[String]()
    weak var view:WKWebView?
    init(_ directory:URL,code:URL?) {self.directory=directory;self.code=code}

    func userContentController(_ c:WKUserContentController,didReceive m:WKScriptMessage,replyHandler reply:@escaping (Any?,String?)->Void) {
        guard let name=m.body as? String, !name.isEmpty,name.count<=80,
              !name.hasPrefix("."),!name.contains("/"),!name.contains(":"),let view else {reply(nil,"Invalid proof image name");return}
        let config=WKSnapshotConfiguration()
        config.afterScreenUpdates=true
        view.takeSnapshot(with:config){ image,err in
            guard let image,let tiff=image.tiffRepresentation,let png=NSBitmapImageRep(data:tiff)?.representation(using:.png,properties:[:]) else {
                reply(nil,err?.localizedDescription ?? "Missing window pixels");return
            }
            do {
                let file=name+".png"
                try png.write(to:self.directory.appendingPathComponent(file),options:.atomic)
                self.requestedFrames.append(file);reply(file,nil)
            } catch {reply(nil,error.localizedDescription)}
        }
    }

    func run(_ view:WKWebView,site:BundleSite,done:@escaping(Int32)->Void) {
        self.view=view
        let body:String
        do {try FileManager.default.createDirectory(at:directory,withIntermediateDirectories:true)
            body=try code.map{try String(contentsOf:$0,encoding:.utf8)} ?? Self.standard
        } catch {fputs("Proof: \(error)\n",stderr);done(1);return}
        // callback APIs avoid duplicating browser JavaScript or driving a second renderer
        let before="""
        const delay=ms=>new Promise(r=>setTimeout(r,ms));
        const stopAt=performance.now()+65000;
        while (!window.__diorama?.girl?.ready || window.__diorama.npcs.length<2) {
          if(window.__rainyProofIssues?.length)throw Error(JSON.stringify(window.__rainyProofIssues));
          if(performance.now()>stopAt)throw Error("Original playable character/NPCs did not load: "+document.body.innerText);
          await delay(100);
        }
        """
        view.callAsyncJavaScript(before+"\n"+body,arguments:[:],in:nil,in:.page){ result in
            switch result {
            case let .failure(e):
                let err=e as NSError
                fputs("WebKit proof: \(err.domain) \(err.code) \(err.userInfo)\n",stderr);done(1)
            case let .success(report):
                do {
                    let data=try Data(contentsOf:site.directory.appendingPathComponent("girl.glb.txt"))
                    let hash=SHA256.hash(data:data).map{String(format:"%02x",$0)}.joined()
                    let out:[String:Any]=["origin":BundleSite.home.absoluteString,"runtime":"WKWebView",
                        "sourceModelSHA256":hash,"served":site.served.sorted(),"missing":site.missing.sorted(),
                        "screenshots":self.requestedFrames,"result":report]
                    let json=try JSONSerialization.data(withJSONObject:out,options:[.prettyPrinted,.sortedKeys,.withoutEscapingSlashes])
                    try json.write(to:self.directory.appendingPathComponent("report.json"),options:.atomic)
                    guard site.served.contains("girl.glb.txt") && site.served.contains("vendor/three/three.min.js") else {
                        throw ProofError.issue("Verification did not use bundled character and engine")
                    }
                    print("WebKit proof passed — \(self.directory.path)");done(0)
                } catch {fputs("WebKit proof: \(error)\n",stderr);done(1)}
            }
        }
    }

    static let standard="""
    const d=window.__diorama;
    const shot=async name=>{await delay(170);return await window.webkit.messageHandlers.rainySnapshot.postMessage(name)};
    d.setMode('close');d.finishTween();await delay(350);
    await shot('01-撑伞主角');
    const before=[d.st.x,d.st.z];d.keys.add('KeyW');await delay(520);d.keys.delete('KeyW');
    const walked=Math.hypot(d.st.x-before[0],d.st.z-before[1]);d.gesture('wave');
    const textures=new Set(),skinned=[];
    d.girl.root.traverse(o=>{if(o.isSkinnedMesh)skinned.push(o.name);
      const mats=Array.isArray(o.material)?o.material:[o.material];
      for(const m of mats)if(m?.map?.image?.width>0)textures.add(m.map.uuid)});
    const key='__rainy_shell_proof';localStorage.setItem(key,'ok');
    const storage=localStorage.getItem(key)==='ok';localStorage.removeItem(key);
    const readback=d.renderer.domElement.toDataURL('image/png').startsWith('data:image/png;base64,');
    d.setMode('back');d.finishTween();await delay(250);await shot('02-后门');
    const report={three:THREE.REVISION,webgl2:d.renderer.capabilities.isWebGL2,ready:d.girl.ready,walked,
      textures:textures.size,skinMeshes:skinned.length,npcs:d.npcs.length,cat:!!d.cat,umbrella:!!d.girl.U,
      mode:d.info().camMode,storage,readback,secureContext:window.isSecureContext,
      network:performance.getEntriesByType('resource').map(e=>e.name).filter(n=>/^https?:/i.test(n))};
    if(!report.webgl2||!report.ready||!report.umbrella||report.textures<4||report.skinMeshes<1||
       report.npcs!==2||!report.cat||!report.storage||!report.readback||walked<.001||report.network.length)
      throw Error('Original game unavailable: '+JSON.stringify(report));
    return report;
    """
}
