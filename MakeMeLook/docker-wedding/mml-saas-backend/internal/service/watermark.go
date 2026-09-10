package service

import (
	"bytes"
	"image"
	"image/color"
	"image/draw"
	"image/jpeg"
	"image/png"

	"mml-saas-backend/pkg/logger"

	_ "image/gif"
)

// watermarkLogo is the MakeMeLook "M" symbol rendered as a simple white shape.
// We draw it programmatically to avoid embedding binary assets.
// The logo is the characteristic "M" checkmark from the SVG path.

// applyWatermark overlays a semi-transparent MakeMeLook logo on the bottom-right
// corner of the try-on result image.
func applyWatermark(imgBytes []byte, ext string) ([]byte, string) {
	src, _, err := image.Decode(bytes.NewReader(imgBytes))
	if err != nil {
		logger.Warn("watermark", "decode failed, skipping watermark", "error", err)
		return imgBytes, ext
	}

	bounds := src.Bounds()
	w, h := bounds.Dx(), bounds.Dy()

	// Create output image
	dst := image.NewRGBA(bounds)
	draw.Draw(dst, bounds, src, bounds.Min, draw.Src)

	// Watermark text dimensions
	logoW := w * 12 / 100 // 12% of image width
	logoH := logoW * 45 / 62 // aspect ratio from SVG viewBox (61.775 x 44.9546)
	if logoW < 40 {
		logoW = 40
		logoH = 29
	}

	// Position: bottom-right with padding
	padding := w * 3 / 100
	if padding < 12 {
		padding = 12
	}
	x0 := w - logoW - padding
	y0 := h - logoH - padding

	// Draw a semi-transparent white "MML" text as watermark
	// Using the characteristic M-check path approximated as pixel art
	drawMMLLogo(dst, x0, y0, logoW, logoH)

	// Re-encode
	var buf bytes.Buffer
	if ext == ".jpg" || ext == ".jpeg" {
		if err := jpeg.Encode(&buf, dst, &jpeg.Options{Quality: 95}); err != nil {
			logger.Warn("watermark", "encode failed", "error", err)
			return imgBytes, ext
		}
	} else {
		if err := png.Encode(&buf, dst); err != nil {
			logger.Warn("watermark", "encode failed", "error", err)
			return imgBytes, ext
		}
	}

	return buf.Bytes(), ext
}

// drawMMLLogo draws the MakeMeLook "M✓" logo as a semi-transparent white overlay.
// The logo is rendered by filling the SVG path rasterized to the target dimensions.
func drawMMLLogo(dst *image.RGBA, x0, y0, w, h int) {
	// Semi-transparent white with shadow effect
	wmColor := color.RGBA{255, 255, 255, 90} // ~35% opacity white
	shadowColor := color.RGBA{0, 0, 0, 40}   // subtle shadow

	// The MML logo path from SVG, normalized to 0..1 coordinates.
	// We approximate it with key line segments of the "M" checkmark.
	// SVG viewBox: 0 0 61.775 44.955
	// Key points (normalized):
	// Right stroke: from (0.82, 0.01) going left-down to (0.29, 0.76) — the check part
	// Then back up-right from (0.24, 0.68) to (0.13, 0.57) — the V bottom
	// Left stroke up from (0.0, 0.78) to (0.0, 1.0)
	// Right end: (1.0, 0.14) to (1.0, 1.0)

	// Draw "MakeMeLook" text instead for cleaner watermark
	// Actually, let's draw the M-check as thick anti-aliased lines

	// Simplified: draw two thick diagonal lines forming the M✓ shape
	// Key path segments from SVG (normalized 0-1):
	// The "check" stroke: right side going down-left then the V
	checkPath := []point{
		{0.93, 0.10}, // top right (start of right stroke)
		{0.27, 0.77}, // bottom of V (middle)
		{0.13, 0.63}, // left side of V
	}

	// Right vertical bar
	rightBar := []point{
		{0.93, 0.10},
		{0.93, 1.00},
	}

	// Left vertical bar (short)
	leftBar := []point{
		{0.07, 0.78},
		{0.07, 1.00},
	}

	lineWidth := max(w/16, 2)

	// Draw shadow first (offset by 1px)
	drawThickLine(dst, checkPath, x0+1, y0+1, w, h, lineWidth, shadowColor)
	drawThickLine(dst, rightBar, x0+1, y0+1, w, h, lineWidth, shadowColor)
	drawThickLine(dst, leftBar, x0+1, y0+1, w, h, lineWidth, shadowColor)

	// Draw logo
	drawThickLine(dst, checkPath, x0, y0, w, h, lineWidth, wmColor)
	drawThickLine(dst, rightBar, x0, y0, w, h, lineWidth, wmColor)
	drawThickLine(dst, leftBar, x0, y0, w, h, lineWidth, wmColor)
}

func drawThickLine(dst *image.RGBA, points []point, x0, y0, w, h, thickness int, c color.RGBA) {
	for i := 0; i < len(points)-1; i++ {
		px1 := x0 + int(points[i].x*float64(w))
		py1 := y0 + int(points[i].y*float64(h))
		px2 := x0 + int(points[i+1].x*float64(w))
		py2 := y0 + int(points[i+1].y*float64(h))
		bresenhamThick(dst, px1, py1, px2, py2, thickness, c)
	}
}

type point struct{ x, y float64 }

func bresenhamThick(dst *image.RGBA, x1, y1, x2, y2, thickness int, c color.RGBA) {
	dx := abs(x2 - x1)
	dy := abs(y2 - y1)
	sx, sy := 1, 1
	if x1 > x2 {
		sx = -1
	}
	if y1 > y2 {
		sy = -1
	}
	err := dx - dy

	bounds := dst.Bounds()
	half := thickness / 2

	for {
		// Draw a filled circle at each point for thickness
		for ox := -half; ox <= half; ox++ {
			for oy := -half; oy <= half; oy++ {
				if ox*ox+oy*oy <= half*half {
					px, py := x1+ox, y1+oy
					if px >= bounds.Min.X && px < bounds.Max.X && py >= bounds.Min.Y && py < bounds.Max.Y {
						blendPixel(dst, px, py, c)
					}
				}
			}
		}

		if x1 == x2 && y1 == y2 {
			break
		}
		e2 := 2 * err
		if e2 > -dy {
			err -= dy
			x1 += sx
		}
		if e2 < dx {
			err += dx
			y1 += sy
		}
	}
}

func blendPixel(dst *image.RGBA, x, y int, c color.RGBA) {
	idx := dst.PixOffset(x, y)
	if idx < 0 || idx+3 >= len(dst.Pix) {
		return
	}

	// Alpha blending
	sa := uint32(c.A)
	da := uint32(255 - c.A)

	dst.Pix[idx+0] = uint8((uint32(dst.Pix[idx+0])*da + uint32(c.R)*sa) / 255)
	dst.Pix[idx+1] = uint8((uint32(dst.Pix[idx+1])*da + uint32(c.G)*sa) / 255)
	dst.Pix[idx+2] = uint8((uint32(dst.Pix[idx+2])*da + uint32(c.B)*sa) / 255)
	dst.Pix[idx+3] = 255
}

func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}
