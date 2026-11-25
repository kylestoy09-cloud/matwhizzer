// Kyle 2026-11-18: read the text of page images with macOS Vision (no install) — for championship files whose PDF has
// no usable text (scans; NAIA 2022). Prints one line per text box: x y w h <tab> text  (page coordinates 0–1, y from
// the top), boxes in reading order (top to bottom, left to right).
//   swift scripts/transcribe/ocr.swift page.png [page2.png …]
import Foundation
import Vision
import AppKit

for path in CommandLine.arguments.dropFirst() {
    guard let img = NSImage(contentsOfFile: path), let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
        FileHandle.standardError.write("cannot read \(path)\n".data(using: .utf8)!); continue
    }
    let req = VNRecognizeTextRequest()
    req.recognitionLevel = .accurate
    req.usesLanguageCorrection = false
    try? VNImageRequestHandler(cgImage: cg, options: [:]).perform([req])
    print("=== \(path)")
    let obs = (req.results ?? []).compactMap { o -> (CGRect, String)? in
        guard let t = o.topCandidates(1).first?.string else { return nil }
        let b = o.boundingBox
        return (CGRect(x: b.minX, y: 1 - b.maxY, width: b.width, height: b.height), t)
    }.sorted { abs($0.0.minY - $1.0.minY) > 0.004 ? $0.0.minY < $1.0.minY : $0.0.minX < $1.0.minX }
    for (b, t) in obs { print(String(format: "%.4f %.4f %.4f %.4f\t", b.minX, b.minY, b.width, b.height) + t) }
}
