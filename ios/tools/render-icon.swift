// Sunny v3 icon, rendered from original geometry. Opaque; iOS supplies the mask.
// Usage: swift ios/tools/render-icon.swift <output.png>
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

let output = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "ios/Xingya/Assets.xcassets/AppIcon.appiconset/icon-1024.png"
let space = CGColorSpaceCreateDeviceRGB()
let context = CGContext(data: nil, width: 1024, height: 1024, bitsPerComponent: 8, bytesPerRow: 0, space: space, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
func color(_ hex: UInt32) -> CGColor {
    CGColor(red: CGFloat((hex >> 16) & 255) / 255, green: CGFloat((hex >> 8) & 255) / 255, blue: CGFloat(hex & 255) / 255, alpha: 1)
}
context.setFillColor(color(0xFFF9EA)); context.fill(CGRect(x: 0, y: 0, width: 1024, height: 1024))
context.translateBy(x: 0, y: 1024); context.scaleBy(x: 10.24, y: -10.24)
context.setStrokeColor(color(0xE3B649)); context.setLineWidth(2); context.setLineCap(.round)
for i in 0..<8 {
    let a = Double(i) * .pi / 4
    context.move(to: CGPoint(x: 50 + cos(a) * 35, y: 54 + sin(a) * 35))
    context.addLine(to: CGPoint(x: 50 + cos(a) * 41, y: 54 + sin(a) * 41)); context.strokePath()
}
context.setFillColor(color(0xFFC53D)); context.fillEllipse(in: CGRect(x: 20, y: 24, width: 60, height: 60))
context.setFillColor(color(0xFFDF7C)); context.fillEllipse(in: CGRect(x: 30, y: 35, width: 14, height: 14))
context.setFillColor(color(0x594400))
for x in [42.0, 58.0] { context.fillEllipse(in: CGRect(x: x, y: 51, width: 4, height: 4)) }
context.setStrokeColor(color(0x594400)); context.setLineWidth(2)
context.move(to: CGPoint(x: 44, y: 62)); context.addQuadCurve(to: CGPoint(x: 58, y: 62), control: CGPoint(x: 51, y: 70)); context.strokePath()
context.setFillColor(color(0x36A46D)); context.move(to: CGPoint(x: 50, y: 25))
context.addQuadCurve(to: CGPoint(x: 69, y: 13), control: CGPoint(x: 50, y: 8))
context.addQuadCurve(to: CGPoint(x: 50, y: 25), control: CGPoint(x: 65, y: 27)); context.fillPath()
context.setFillColor(color(0x77C98C)); context.move(to: CGPoint(x: 48, y: 27))
context.addQuadCurve(to: CGPoint(x: 28, y: 22), control: CGPoint(x: 38, y: 14))
context.addQuadCurve(to: CGPoint(x: 48, y: 27), control: CGPoint(x: 36, y: 35)); context.fillPath()
let destination = CGImageDestinationCreateWithURL(URL(fileURLWithPath: output) as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(destination, context.makeImage()!, nil)
precondition(CGImageDestinationFinalize(destination))
