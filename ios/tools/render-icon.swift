// 生成 App 图标 1024×1024 PNG（CoreGraphics）。星芽主题：星 + 火箭 + 嫩芽。
// App Store 图标必须不透明、无 alpha、无圆角（系统自动裁角）。
// 用法：swift tools/render-icon.swift <输出路径>

import AppKit
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

let size = 1024
let outPath = CommandLine.arguments.count > 1
    ? CommandLine.arguments[1]
    : "Xingya/Assets.xcassets/AppIcon.appiconset/icon-1024.png"

let colorSpace = CGColorSpaceCreateDeviceRGB()
guard let ctx = CGContext(
    data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: 0,
    space: colorSpace, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
) else { fatalError("无法创建位图上下文") }

let s = CGFloat(size)

// 背景：蓝→紫斜向渐变
let bgColors = [
    CGColor(red: 0.26, green: 0.40, blue: 0.93, alpha: 1),
    CGColor(red: 0.44, green: 0.30, blue: 0.90, alpha: 1),
] as CFArray
if let grad = CGGradient(colorsSpace: colorSpace, colors: bgColors, locations: [0, 1]) {
    ctx.drawLinearGradient(grad, start: CGPoint(x: 0, y: s), end: CGPoint(x: s, y: 0), options: [])
}

// 点缀星星
func star(_ cx: CGFloat, _ cy: CGFloat, _ r: CGFloat, alpha: CGFloat) {
    let path = CGMutablePath()
    for i in 0..<10 {
        let angle = CGFloat(i) * .pi / 5 - .pi / 2
        let radius = i % 2 == 0 ? r : r * 0.42
        let p = CGPoint(x: cx + cos(angle) * radius, y: cy + sin(angle) * radius)
        if i == 0 { path.move(to: p) } else { path.addLine(to: p) }
    }
    path.closeSubpath()
    ctx.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: alpha))
    ctx.addPath(path)
    ctx.fillPath()
}
star(s * 0.24, s * 0.74, s * 0.05, alpha: 0.9)
star(s * 0.78, s * 0.78, s * 0.035, alpha: 0.7)
star(s * 0.80, s * 0.34, s * 0.028, alpha: 0.55)

// 火箭：机身（圆头长圆）+ 舷窗 + 尾翼 + 火焰
let cx = s * 0.5
ctx.saveGState()

// 火焰
let flame = CGMutablePath()
flame.move(to: CGPoint(x: cx - s * 0.06, y: s * 0.30))
flame.addQuadCurve(to: CGPoint(x: cx, y: s * 0.14), control: CGPoint(x: cx - s * 0.02, y: s * 0.22))
flame.addQuadCurve(to: CGPoint(x: cx + s * 0.06, y: s * 0.30), control: CGPoint(x: cx + s * 0.02, y: s * 0.22))
flame.closeSubpath()
ctx.setFillColor(CGColor(red: 1.0, green: 0.72, blue: 0.30, alpha: 1))
ctx.addPath(flame)
ctx.fillPath()

// 机身
let body = CGMutablePath()
let bw = s * 0.16
let topY = s * 0.82
let botY = s * 0.36
body.move(to: CGPoint(x: cx, y: topY))
body.addQuadCurve(to: CGPoint(x: cx + bw, y: s * 0.58), control: CGPoint(x: cx + bw, y: s * 0.74))
body.addLine(to: CGPoint(x: cx + bw, y: s * 0.44))
body.addQuadCurve(to: CGPoint(x: cx, y: botY), control: CGPoint(x: cx + bw, y: botY))
body.addQuadCurve(to: CGPoint(x: cx - bw, y: s * 0.44), control: CGPoint(x: cx - bw, y: botY))
body.addLine(to: CGPoint(x: cx - bw, y: s * 0.58))
body.addQuadCurve(to: CGPoint(x: cx, y: topY), control: CGPoint(x: cx - bw, y: s * 0.74))
body.closeSubpath()
ctx.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
ctx.addPath(body)
ctx.fillPath()

// 尾翼
ctx.setFillColor(CGColor(red: 0.80, green: 0.86, blue: 1.0, alpha: 1))
let finL = CGMutablePath()
finL.move(to: CGPoint(x: cx - bw * 0.9, y: s * 0.52))
finL.addLine(to: CGPoint(x: cx - bw * 1.7, y: s * 0.40))
finL.addLine(to: CGPoint(x: cx - bw * 0.9, y: s * 0.44))
finL.closeSubpath()
ctx.addPath(finL)
ctx.fillPath()
let finR = CGMutablePath()
finR.move(to: CGPoint(x: cx + bw * 0.9, y: s * 0.52))
finR.addLine(to: CGPoint(x: cx + bw * 1.7, y: s * 0.40))
finR.addLine(to: CGPoint(x: cx + bw * 0.9, y: s * 0.44))
finR.closeSubpath()
ctx.addPath(finR)
ctx.fillPath()

// 舷窗
ctx.setFillColor(CGColor(red: 0.26, green: 0.40, blue: 0.93, alpha: 1))
ctx.fillEllipse(in: CGRect(x: cx - s * 0.06, y: s * 0.585, width: s * 0.12, height: s * 0.12))
ctx.restoreGState()

guard let image = ctx.makeImage() else { fatalError("无法生成图像") }
let url = URL(fileURLWithPath: outPath)
guard let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil) else {
    fatalError("无法创建 PNG 目标")
}
CGImageDestinationAddImage(dest, image, nil)
if CGImageDestinationFinalize(dest) {
    print("✅ 图标已生成：\(outPath)")
} else {
    fatalError("PNG 写入失败")
}
