import Foundation
import WebKit
import UniformTypeIdentifiers

/// All game requests share one origin across launches, including after the app
/// moves. Only bundled files are served. No sockets or child processes are used.
final class BundleSite: NSObject, WKURLSchemeHandler {
    static let scheme="rainy-store"
    static let home=URL(string:"rainy-store://game/")!
    let directory: URL
    private(set) var served=Set<String>()
    private(set) var missing=Set<String>()

    init(_ root:URL) { directory=root.standardizedFileURL.resolvingSymlinksInPath() }

    private func response(_ task:WKURLSchemeTask,_ status:Int,_ headers:[String:String],_ data:Data) {
        let url=task.request.url ?? Self.home
        let r=HTTPURLResponse(url:url,statusCode:status,httpVersion:"HTTP/1.1",headerFields:headers)!
        task.didReceive(r)
        if task.request.httpMethod != "HEAD" && !data.isEmpty {task.didReceive(data)}
        task.didFinish()
    }

    func webView(_ webView:WKWebView,start task:WKURLSchemeTask) {
        let req=task.request
        guard let url=req.url,url.scheme==Self.scheme,url.host=="game",
              ["GET","HEAD"].contains(req.httpMethod ?? "GET") else {
            response(task,403,[:],Data());return
        }
        let path=url.path.isEmpty || url.path=="/" ? "index.html":String(url.path.drop(while:{$0=="/"}))
        let file=directory.appendingPathComponent(path).standardizedFileURL.resolvingSymlinksInPath()
        guard file.path.hasPrefix(directory.path+"/"),!path.contains("\0") else {
            response(task,403,[:],Data());return
        }
        guard let data=try? Data(contentsOf:file,options:.mappedIfSafe) else {
            missing.insert(path);response(task,404,[:],Data());return
        }
        served.insert(path)
        let types=["js":"text/javascript; charset=utf-8","mjs":"text/javascript; charset=utf-8","html":"text/html; charset=utf-8",
                   "json":"application/json","css":"text/css; charset=utf-8","txt":"text/plain; charset=utf-8",
                   "glb":"model/gltf-binary","gltf":"model/gltf+json","webp":"image/webp","wasm":"application/wasm"]
        let ext=file.pathExtension.lowercased()
        var h=["Content-Type":types[ext] ?? UTType(filenameExtension:ext)?.preferredMIMEType ?? "application/octet-stream",
               "Content-Length":"\(data.count)","Accept-Ranges":"bytes","Access-Control-Allow-Origin":"*"]
        if let bytes=req.value(forHTTPHeaderField:"Range") {
            let fields=bytes.dropFirst("bytes=".count).split(separator:"-",maxSplits:1,omittingEmptySubsequences:false)
            let end=data.count-1
            var first=0,last=end
            if bytes.hasPrefix("bytes="),fields.count==2,!bytes.contains(",") {
                if fields[0].isEmpty,let tail=Int(fields[1]),tail>0 {first=max(0,data.count-tail)}
                else if let begin=Int(fields[0]) {
                    first=begin
                    if !fields[1].isEmpty { last=min(end,Int(fields[1]) ?? -1) }
                } else {first = -1}
            } else {first = -1}
            guard first>=0,first<=last,first<data.count else {
                h["Content-Range"]="bytes */\(data.count)";h["Content-Length"]="0";response(task,416,h,Data());return
            }
            h["Content-Range"]="bytes \(first)-\(last)/\(data.count)";h["Content-Length"]="\(last-first+1)"
            response(task,206,h,data.subdata(in:first..<(last+1)))
        } else {response(task,200,h,data)}
    }
    func webView(_ webView:WKWebView,stop task:WKURLSchemeTask) {}
}
