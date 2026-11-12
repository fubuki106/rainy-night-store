import AppKit
import WebKit

// Compile beside BundleSite.swift with swiftc -parse-as-library. The handler
// below is used only by this separate executable; the game has no failure switch.
final class OfflineProof:NSObject,WKNavigationDelegate,WKURLSchemeHandler {
    let site:BundleSite
    let output:URL
    var refused=0, retryStarted=false, busy=false, elapsed=0
    var window:NSWindow!, view:WKWebView!, timer:Timer!
    init(source:URL,output:URL){site=BundleSite(source);self.output=output}
    func start() {
        let app=NSApplication.shared;app.setActivationPolicy(.accessory)
        let config=WKWebViewConfiguration()
        config.websiteDataStore = .nonPersistent();config.setURLSchemeHandler(self,forURLScheme:BundleSite.scheme)
        let frame=NSRect(x:0,y:0,width:870,height:590)
        view=WKWebView(frame:frame,configuration:config);view.navigationDelegate=self
        window=NSWindow(contentRect:frame,styleMask:.borderless,backing:.buffered,defer:false)
        window.contentView=view;window.orderBack(nil)
        view.load(URLRequest(url:BundleSite.home))
        timer=Timer.scheduledTimer(withTimeInterval:0.2,repeats:true){[weak self] _ in self?.tick()}
    }
    func webView(_ w:WKWebView,start task:WKURLSchemeTask) {
        let request=task.request
        if request.url?.path=="/film/character-pack.js" && !retryStarted {
            refused+=1
            task.didReceive(HTTPURLResponse(url:request.url!,statusCode:503,httpVersion:"HTTP/1.1",
                                            headerFields:["Content-Type":"text/javascript","Cache-Control":"no-store"])!)
            task.didFinish();return
        }
        site.webView(w,start:task)
    }
    func webView(_ w:WKWebView,stop task:WKURLSchemeTask){site.webView(w,stop:task)}
    private func fail(_ reason:String) -> Never {fputs("WK loader test: "+reason+"\n",stderr);exit(1)}
    private func tick() {
        elapsed+=1
        if elapsed>250{fail("Timed out after \(refused) failures")}
        guard !busy else{return};busy=true
        view.evaluateJavaScript("""
        (()=>{const d=window.__diorama,b=document.querySelector("#character-retry");
          if(!d||!b)return null;
          return {ready:d.girl.ready,button:!b.hidden,roots:d.girl.root.children.length,
             npcs:d.npcs.length,transport:d.characterLoad.transport,stage:d.characterLoad.phase,
             umbrella:!!d.girl.U,animations:d.girl.A?Object.keys(d.girl.A).length:0};
        })()
        """){[weak self] result,_ in
            guard let self else{return};self.busy=false
            guard let s=result as? [String:Any] else{return}
            if !self.retryStarted,s["button"] as? Bool==true {
                guard self.refused==4,s["roots"] as? Int==0,s["stage"] as? String=="asset" else{self.fail("Unexpected failed state: \(s)")}
                self.retryStarted=true
                self.view.evaluateJavaScript("const retry=document.querySelector('#character-retry');retry.click();retry.click();",completionHandler:nil)
            } else if self.retryStarted,s["ready"] as? Bool==true,s["npcs"] as? Int==2 {
                guard s["roots"] as? Int==1,s["animations"] as? Int==18,s["umbrella"] as? Bool==true,
                      s["button"] as? Bool==false else {self.fail("Incomplete recovered character: \(s)")}
                self.timer.invalidate()
                do{
                    var report=s;report["injectedRequests"]=self.refused;report["served"]=self.site.served.sorted()
                    let json=try JSONSerialization.data(withJSONObject:report,options:[.prettyPrinted,.sortedKeys])
                    try json.write(to:self.output,options:.atomic)
                    print("WKWebView recovered after four intercepted requests, with one original actor and two NPCs.")
                    NSApp.terminate(nil)
                }catch{self.fail(error.localizedDescription)}
            }
        }
    }
}

@main enum RunOfflineProof {
    static func main(){
        let a=CommandLine.arguments
        guard a.count==3 else{fputs("usage: character-webkit REPOSITORY REPORT.json\n",stderr);exit(2)}
        let proof=OfflineProof(source:URL(fileURLWithPath:a[1]),output:URL(fileURLWithPath:a[2]))
        proof.start();withExtendedLifetime(proof){NSApp.run()}
    }
}
