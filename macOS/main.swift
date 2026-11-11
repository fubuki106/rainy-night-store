import AppKit
import WebKit

let title="雨夜便利店·末班底片"

final class GameApp:NSObject,NSApplicationDelegate,WKNavigationDelegate,WKDownloadDelegate {
    let proof:Proof?
    let profile:UUID?
    var view:WKWebView!
    var window:NSWindow!
    var site:BundleSite!
    var started=false
    var watchdog:Timer?
    private var downloads=[ObjectIdentifier:(partial:URL,destination:URL)]()
    init(proof:Proof?,profile:UUID?) {self.proof=proof;self.profile=profile}

    func applicationDidFinishLaunching(_ notification:Notification) {
        guard let url=Bundle.main.resourceURL?.appendingPathComponent("Game"),
              FileManager.default.fileExists(atPath:url.appendingPathComponent("index.html").path) else {
            fail("找不到游戏入口 index.html");return
        }
        site=BundleSite(url)
        let config=WKWebViewConfiguration()
        config.setURLSchemeHandler(site,forURLScheme:BundleSite.scheme)
        if #available(macOS 14,*), let profile, proof != nil {
            config.websiteDataStore=WKWebsiteDataStore(forIdentifier:profile)
        } else {config.websiteDataStore=proof == nil ? .default():.nonPersistent()}
        config.mediaTypesRequiringUserActionForPlayback=[]
        config.allowsAirPlayForMediaPlayback=false
        config.preferences.javaScriptCanOpenWindowsAutomatically=false
        if let proof {
            config.userContentController.addScriptMessageHandler(proof,contentWorld:.page,name:"rainySnapshot")
            let errors=WKUserScript(source:"""
            window.__rainyProofIssues=[];
            window.addEventListener("error",e=>window.__rainyProofIssues.push({message:e.message,source:e.filename,line:e.lineno,stack:e.error?.stack}));
            window.addEventListener("unhandledrejection",e=>window.__rainyProofIssues.push({message:String(e.reason),stack:e.reason?.stack}));
            """,injectionTime:.atDocumentStart,forMainFrameOnly:true)
            config.userContentController.addUserScript(errors)
        }
        let visible=NSScreen.main?.visibleFrame ?? NSRect(x:0,y:0,width:1280,height:800)
        let frame=NSRect(x:0,y:0,width:min(1200,visible.width),height:min(760,max(500,visible.height-45)))
        view=WKWebView(frame:frame,configuration:config);view.navigationDelegate=self
        view.allowsBackForwardNavigationGestures=false
        window=NSWindow(contentRect:frame,styleMask:[.titled,.closable,.miniaturizable,.resizable],backing:.buffered,defer:false)
        window.title=title;window.contentView=view;window.minSize=NSSize(width:720,height:480)
        window.collectionBehavior=[.fullScreenPrimary];window.isReleasedWhenClosed=false
        window.center()
        if proof == nil {
            makeMenu()
            window.setFrameAutosaveName("RainyNightMain");window.makeKeyAndOrderFront(nil)
            NSApp.activate(ignoringOtherApps:true);window.makeFirstResponder(view)
        } else {
            window.orderBack(nil)
            watchdog=Timer.scheduledTimer(withTimeInterval:190,repeats:false){[weak self] _ in self?.fail("验收超时")}
        }
        view.load(URLRequest(url:BundleSite.home))
    }

    private func makeMenu() {
        let bar=NSMenu(), appItem=NSMenuItem();bar.addItem(appItem)
        let appMenu=NSMenu();appItem.submenu=appMenu
        appMenu.addItem(withTitle:"关于"+title,action:#selector(NSApplication.orderFrontStandardAboutPanel(_:)),keyEquivalent:"")
        appMenu.addItem(.separator());appMenu.addItem(withTitle:"退出"+title,action:#selector(NSApplication.terminate(_:)),keyEquivalent:"q")
        let edit=NSMenuItem();bar.addItem(edit);edit.submenu=NSMenu(title:"编辑")
        edit.submenu?.addItem(withTitle:"复制",action:#selector(NSText.copy(_:)),keyEquivalent:"c")
        edit.submenu?.addItem(withTitle:"粘贴",action:#selector(NSText.paste(_:)),keyEquivalent:"v")
        edit.submenu?.addItem(withTitle:"全选",action:#selector(NSText.selectAll(_:)),keyEquivalent:"a")
        let wi=NSMenuItem();bar.addItem(wi);wi.submenu=NSMenu(title:"窗口")
        wi.submenu?.addItem(withTitle:"关闭",action:#selector(NSWindow.performClose(_:)),keyEquivalent:"w")
        wi.submenu?.addItem(withTitle:"最小化",action:#selector(NSWindow.performMiniaturize(_:)),keyEquivalent:"m")
        let full=wi.submenu?.addItem(withTitle:"切换全屏",action:#selector(NSWindow.toggleFullScreen(_:)),keyEquivalent:"f")
        full?.keyEquivalentModifierMask=[.command,.control]
        NSApp.mainMenu=bar
    }

    func webView(_ w:WKWebView,didFinish n:WKNavigation!) {
        guard let proof,!started else{return};started=true
        proof.run(w,site:site){[weak self] status in self?.watchdog?.invalidate();fflush(stdout)
            if status==0 {NSApp.terminate(nil)} else {exit(status)}}
    }
    func webView(_ w:WKWebView,didFailProvisionalNavigation n:WKNavigation!,withError e:Error){fail(e.localizedDescription)}
    func webView(_ w:WKWebView,didFail n:WKNavigation!,withError e:Error){fail(e.localizedDescription)}
    func webViewWebContentProcessDidTerminate(_ w:WKWebView){
        if proof != nil {fail("WebKit 渲染进程中止")}
        else {w.reload()}
    }
    func webView(_ w:WKWebView,decidePolicyFor a:WKNavigationAction,decisionHandler done:@escaping(WKNavigationActionPolicy)->Void){
        if a.shouldPerformDownload {done(.download);return}
        let url=a.request.url
        done(url?.scheme==BundleSite.scheme && url?.host=="game" ? .allow:.cancel)
    }
    func webView(_ w:WKWebView,navigationAction:WKNavigationAction,didBecome download:WKDownload){download.delegate=self}
    func webView(_ w:WKWebView,navigationResponse:WKNavigationResponse,didBecome download:WKDownload){download.delegate=self}
    func download(_ download:WKDownload,decideDestinationUsing response:URLResponse,suggestedFilename:String,completionHandler:@escaping(URL?)->Void){
        let name=(suggestedFilename as NSString).lastPathComponent
        func save(_ destination:URL?) {
            guard let destination else {completionHandler(nil);return}
            let partial=destination.deletingLastPathComponent().appendingPathComponent(".rainy-"+UUID().uuidString+".partial")
            downloads[ObjectIdentifier(download)]=(partial,destination)
            completionHandler(partial)
        }
        if let proof {save(proof.directory.appendingPathComponent(name));return}
        let panel=NSSavePanel();panel.nameFieldStringValue=name;panel.canCreateDirectories=true
        panel.beginSheetModal(for:window){result in save(result == .OK ? panel.url:nil)}
    }
    func downloadDidFinish(_ download:WKDownload) {
        guard let paths=downloads.removeValue(forKey:ObjectIdentifier(download)) else{return}
        do {
            if FileManager.default.fileExists(atPath:paths.destination.path) {
                _=try FileManager.default.replaceItemAt(paths.destination,withItemAt:paths.partial)
            } else {try FileManager.default.moveItem(at:paths.partial,to:paths.destination)}
        } catch {try? FileManager.default.removeItem(at:paths.partial);reportDownload(error)}
    }
    func download(_ download:WKDownload,didFailWithError error:Error,resumeData:Data?){
        if let paths=downloads.removeValue(forKey:ObjectIdentifier(download)){try? FileManager.default.removeItem(at:paths.partial)}
        if (error as NSError).code != NSURLErrorCancelled{reportDownload(error)}
    }
    private func reportDownload(_ error:Error){
        if proof != nil {fputs("保存失败: \(error)\n",stderr);return}
        let alert=NSAlert(error:error);alert.messageText="印相未能保存";alert.beginSheetModal(for:window)
    }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender:NSApplication)->Bool{true}
    func applicationWillTerminate(_ notification:Notification){view?.stopLoading()}
    private func fail(_ text:String){
        if proof != nil{fputs("RainyNight: \(text)\n",stderr);exit(1)}
        let a=NSAlert();a.messageText="无法打开雨夜便利店";a.informativeText=text;a.runModal();NSApp.terminate(nil)
    }
}

let argv=Array(CommandLine.arguments.dropFirst())
var proof:Proof?
if let i=argv.firstIndex(of:"--verify"),argv.indices.contains(i+1){
    proof=Proof(URL(fileURLWithPath:argv[i+1]),code:nil)
} else if let i=argv.firstIndex(of:"--probe"),argv.indices.contains(i+2){
    proof=Proof(URL(fileURLWithPath:argv[i+2]),code:URL(fileURLWithPath:argv[i+1]))
} else if argv.contains("--probe") || argv.contains("--verify"){
    fputs("RainyNight --verify DIRECTORY | --probe SCRIPT.js DIRECTORY\n",stderr);exit(2)
}
var profile:UUID?
if let i=argv.firstIndex(of:"--profile"){
    guard proof != nil,argv.indices.contains(i+1),let id=UUID(uuidString:argv[i+1]),
          id.uuidString != "00000000-0000-0000-0000-000000000000" else {fputs("--profile requires a nonzero UUID and --probe or --verify.\n",stderr);exit(2)}
    if #available(macOS 14,*) {profile=id} else {fputs("--profile requires macOS 14+.\n",stderr);exit(2)}
}
let app=NSApplication.shared
app.setActivationPolicy(proof == nil ? .regular:.accessory)
let game=GameApp(proof:proof,profile:profile);app.delegate=game;app.run()
