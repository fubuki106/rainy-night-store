import AppKit

func color(_ h:Int)->NSColor {
    NSColor(srgbRed:CGFloat(h>>16&255)/255,green:CGFloat(h>>8&255)/255,blue:CGFloat(h&255)/255,alpha:1)
}
func point(_ a:CGFloat,_ b:CGFloat)->NSPoint { NSPoint(x:a,y:b) }
func rectangle(_ x:CGFloat,_ y:CGFloat,_ w:CGFloat,_ h:CGFloat,_ c:Int,_ r:CGFloat=0){
    color(c).setFill();NSBezierPath(roundedRect:NSRect(x:x,y:y,width:w,height:h),xRadius:r,yRadius:r).fill()
}
func line(_ points:[NSPoint],_ width:CGFloat,_ c:Int) {
    let p=NSBezierPath();p.move(to:points[0]);for q in points.dropFirst(){p.line(to:q)}
    p.lineWidth=width;p.lineCapStyle = .round;color(c).setStroke();p.stroke()
}
func draw(){
    let tile=NSBezierPath(roundedRect:NSRect(x:58,y:54,width:908,height:908),xRadius:200,yRadius:200)
    NSGradient(colors:[color(0x121B34),color(0x253651),color(0x394768)])!.draw(in:tile,angle:68)
    NSGraphicsContext.saveGraphicsState();tile.addClip()
    // Lit shopfront, its striped fascia, and the reflection in the pavement.
    rectangle(151,330,723,354,0x151F37,13)
    rectangle(177,343,622,218,0xEACFA3,3)
    let shop=NSBezierPath(rect:NSRect(x:197,y:365,width:579,height:156))
    NSGradient(starting:color(0xE2A782),ending:color(0xFFE4B1))!.draw(in:shop,angle:75)
    for x in [207,355,505,648] { rectangle(CGFloat(x),359,9,180,0x59616A) }
    rectangle(198,405,580,8,0xA99180)
    rectangle(170,548,644,96,0xDFEDE0,4)
    rectangle(170,606,644,27,0x59C1AC)
    rectangle(170,558,644,14,0xDE8279)
    line([point(173,290),point(464,290)],13,0x75AAAB)
    line([point(253,263),point(525,263)],7,0x798698)
    line([point(608,309),point(816,309)],8,0xD79F8E)
    line([point(397,236),point(693,236)],6,0x79778B)
    // A single umbrella in silhouette in front of the illuminated window.
    let shade=NSBezierPath();shade.move(to:point(471,439))
    shade.curve(to:point(644,553),controlPoint1:point(508,506),controlPoint2:point(566,546))
    shade.curve(to:point(824,439),controlPoint1:point(725,550),controlPoint2:point(794,506))
    for (a,b) in [(824,738),(738,648),(648,558),(558,471)] {
        let x=CGFloat(a),end=CGFloat(b)
        shade.curve(to:point(end,439),controlPoint1:point(x-24,459),controlPoint2:point(end+22,456))
    }
    shade.close();color(0x22263B).setFill();shade.fill()
    let rib=NSBezierPath();rib.move(to:point(644,552));rib.curve(to:point(558,446),controlPoint1:point(614,546),controlPoint2:point(572,499))
    rib.lineWidth=4;color(0x697687).setStroke();rib.stroke()
    line([point(645,553),point(643,566)],7,0x252A40)
    line([point(643,444),point(637,343)],7,0x252A40)
    for (x,y) in [(230,744),(355,806),(498,761),(741,785),(811,708)] {
        line([point(CGFloat(x),CGFloat(y)),point(CGFloat(x)-13,CGFloat(y)-33)],5,0x73829B)
    }
    NSGraphicsContext.restoreGraphicsState()
}
let dir=URL(fileURLWithPath:CommandLine.arguments[1])
try FileManager.default.createDirectory(at:dir,withIntermediateDirectories:true)
for size in [16,32,128,256,512] {
    for scale in [1,2] {
        let n=size*scale, format=NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:n,pixelsHigh:n,bitsPerSample:8,
            samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bitmapFormat:[],bytesPerRow:0,bitsPerPixel:0)!
        NSGraphicsContext.saveGraphicsState();let context=NSGraphicsContext(bitmapImageRep:format)!;NSGraphicsContext.current=context
        context.cgContext.scaleBy(x:CGFloat(n)/1024,y:CGFloat(n)/1024)
        draw();NSGraphicsContext.restoreGraphicsState()
        let filename="icon_\(size)x\(size)"+(scale==2 ? "@2x":"")+".png"
        try format.representation(using:.png,properties:[:])!.write(to:dir.appendingPathComponent(filename))
    }
}
