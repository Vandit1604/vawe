// framediff compares two directories of captured frames and says how they differ, so a claim about
// render determinism is a measurement instead of a guess.
//
// It answers three questions the mp4 cannot:
//
//	how many frames differ, and by how much (pixels above an epsilon, max channel delta)
//	WHERE they differ (a bounding box, and a written-out crop you can look at)
//	whether the difference tracks WHICH WORKER drew the frame (with -mapa/-mapb)
//
// Usage:
//
//	VAWE_KEEP_FRAMES=1 VAWE_FRAME_MAP=/tmp/mapA.txt ./bin/vawe films/scene/brew-launch.json
//	cp -R /tmp/frames_brew-launch /tmp/runA   # the render deletes nothing, but the next one overwrites
//	... repeat for run B ...
//	go run ./harness/dev/framediff -a /tmp/runA -b /tmp/runB -mapa /tmp/mapA.txt -mapb /tmp/mapB.txt -crops /tmp/crops
package main

import (
	"bufio"
	"bytes"
	"flag"
	"fmt"
	"image"
	"image/draw"
	_ "image/jpeg"
	"image/png"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
)

type frameResult struct {
	frame            int
	identicalBytes   bool
	diffPixels       int
	total            int
	maxDelta         int
	x0, y0, x1, y1   int // bounding box of differing pixels
	workerA, workerB int
}

func (r frameResult) ratio() float64 {
	if r.total == 0 {
		return 0
	}
	return float64(r.diffPixels) / float64(r.total)
}

func main() {
	a := flag.String("a", "", "first frames directory")
	b := flag.String("b", "", "second frames directory")
	mapa := flag.String("mapa", "", "VAWE_FRAME_MAP file for run A (frame rep worker)")
	mapb := flag.String("mapb", "", "VAWE_FRAME_MAP file for run B")
	eps := flag.Int("eps", 3, "per-channel 8-bit delta a pixel must exceed to count as different")
	csv := flag.String("csv", "", "write one row per frame: frame,diffPixels,ratio,maxDelta,x0,y0,x1,y1,workerA,workerB")
	crops := flag.String("crops", "", "directory to write side-by-side crops of the worst frames")
	nCrops := flag.Int("ncrops", 4, "how many worst frames to crop")
	flag.Parse()
	if *a == "" || *b == "" {
		fmt.Fprintln(os.Stderr, "need -a and -b")
		os.Exit(2)
	}

	names := frameNames(*a)
	if len(names) == 0 {
		fmt.Fprintf(os.Stderr, "no frames in %s\n", *a)
		os.Exit(1)
	}
	wa := readMap(*mapa)
	wb := readMap(*mapb)

	var results []frameResult
	for _, name := range names {
		n := frameNumber(name)
		ba, err1 := os.ReadFile(filepath.Join(*a, name))
		bb, err2 := os.ReadFile(filepath.Join(*b, name))
		if err1 != nil || err2 != nil {
			fmt.Fprintf(os.Stderr, "skip %s: missing in one run\n", name)
			continue
		}
		r := frameResult{frame: n, workerA: lookup(wa, n), workerB: lookup(wb, n)}
		if bytes.Equal(ba, bb) {
			r.identicalBytes = true
			results = append(results, r)
			continue
		}
		if err := compare(ba, bb, *eps, &r); err != nil {
			fmt.Fprintf(os.Stderr, "decode %s: %v\n", name, err)
			continue
		}
		results = append(results, r)
	}

	report(results, wa != nil && wb != nil)

	if *csv != "" {
		var sb strings.Builder
		sb.WriteString("frame,diffPixels,ratio,maxDelta,x0,y0,x1,y1,workerA,workerB\n")
		for _, r := range results {
			fmt.Fprintf(&sb, "%d,%d,%.8f,%d,%d,%d,%d,%d,%d,%d\n",
				r.frame, r.diffPixels, r.ratio(), r.maxDelta, r.x0, r.y0, r.x1, r.y1, r.workerA, r.workerB)
		}
		if err := os.WriteFile(*csv, []byte(sb.String()), 0644); err != nil {
			fmt.Fprintln(os.Stderr, err)
		}
	}

	if *crops != "" {
		differing := filterDiffering(results)
		sort.Slice(differing, func(i, j int) bool { return differing[i].diffPixels > differing[j].diffPixels })
		os.MkdirAll(*crops, 0755)
		for i := 0; i < *nCrops && i < len(differing); i++ {
			r := differing[i]
			name := fmt.Sprintf("%05d%s", r.frame, filepath.Ext(names[0]))
			out := filepath.Join(*crops, fmt.Sprintf("frame%05d.png", r.frame))
			if err := writeCrop(filepath.Join(*a, name), filepath.Join(*b, name), r, out); err != nil {
				fmt.Fprintf(os.Stderr, "crop %d: %v\n", r.frame, err)
				continue
			}
			fmt.Printf("  crop → %s  (box %d,%d..%d,%d)\n", out, r.x0, r.y0, r.x1, r.y1)
		}
	}
}

func filterDiffering(rs []frameResult) []frameResult {
	var out []frameResult
	for _, r := range rs {
		if !r.identicalBytes && r.diffPixels > 0 {
			out = append(out, r)
		}
	}
	return out
}

func compare(ba, bb []byte, eps int, r *frameResult) error {
	ia, _, err := image.Decode(bytes.NewReader(ba))
	if err != nil {
		return err
	}
	ib, _, err := image.Decode(bytes.NewReader(bb))
	if err != nil {
		return err
	}
	ra, rb := ia.Bounds(), ib.Bounds()
	if ra != rb {
		return fmt.Errorf("dimensions differ: %v vs %v", ra, rb)
	}
	r.total = ra.Dx() * ra.Dy()
	r.x0, r.y0 = ra.Max.X, ra.Max.Y
	r.x1, r.y1 = ra.Min.X, ra.Min.Y
	e := uint32(eps) << 8
	for y := ra.Min.Y; y < ra.Max.Y; y++ {
		for x := ra.Min.X; x < ra.Max.X; x++ {
			r1, g1, b1, _ := ia.At(x, y).RGBA()
			r2, g2, b2, _ := ib.At(x, y).RGBA()
			d := max3(absd(r1, r2), absd(g1, g2), absd(b1, b2))
			if int(d>>8) > r.maxDelta {
				r.maxDelta = int(d >> 8)
			}
			if d > e {
				r.diffPixels++
				if x < r.x0 {
					r.x0 = x
				}
				if y < r.y0 {
					r.y0 = y
				}
				if x > r.x1 {
					r.x1 = x
				}
				if y > r.y1 {
					r.y1 = y
				}
			}
		}
	}
	return nil
}

func report(rs []frameResult, haveMaps bool) {
	differing := filterDiffering(rs)
	byteDiff := 0
	for _, r := range rs {
		if !r.identicalBytes {
			byteDiff++
		}
	}
	fmt.Printf("frames compared      %d\n", len(rs))
	fmt.Printf("byte-different       %d\n", byteDiff)
	fmt.Printf("pixel-different      %d  (above the epsilon)\n", len(differing))
	if len(differing) == 0 {
		return
	}
	ratios := make([]float64, 0, len(differing))
	deltas := make([]int, 0, len(differing))
	worst := differing[0]
	for _, r := range differing {
		ratios = append(ratios, r.ratio())
		deltas = append(deltas, r.maxDelta)
		if r.diffPixels > worst.diffPixels {
			worst = r
		}
	}
	sort.Float64s(ratios)
	sort.Ints(deltas)
	fmt.Printf("diff ratio           min %.5f%%  median %.5f%%  max %.5f%%\n",
		ratios[0]*100, ratios[len(ratios)/2]*100, ratios[len(ratios)-1]*100)
	fmt.Printf("max channel delta    min %d  median %d  max %d\n",
		deltas[0], deltas[len(deltas)/2], deltas[len(deltas)-1])
	fmt.Printf("worst frame          %d: %d px (%.5f%%), max delta %d, box %d,%d..%d,%d\n",
		worst.frame, worst.diffPixels, worst.ratio()*100, worst.maxDelta, worst.x0, worst.y0, worst.x1, worst.y1)

	if !haveMaps {
		return
	}
	// Does the difference track WHICH worker drew the frame?
	var sameW, sameWDiff, diffW, diffWDiff int
	for _, r := range rs {
		if r.workerA < 0 || r.workerB < 0 {
			continue
		}
		bad := !r.identicalBytes && r.diffPixels > 0
		if r.workerA == r.workerB {
			sameW++
			if bad {
				sameWDiff++
			}
		} else {
			diffW++
			if bad {
				diffWDiff++
			}
		}
	}
	fmt.Println()
	fmt.Println("worker attribution")
	fmt.Printf("  same worker  in both runs   %5d frames · %5d differ (%.1f%%)\n",
		sameW, sameWDiff, pct(sameWDiff, sameW))
	fmt.Printf("  different worker            %5d frames · %5d differ (%.1f%%)\n",
		diffW, diffWDiff, pct(diffWDiff, diffW))
}

func pct(n, d int) float64 {
	if d == 0 {
		return 0
	}
	return float64(n) / float64(d) * 100
}

// writeCrop stacks the two runs' versions of the differing region one above the other, so the
// difference can be LOOKED AT rather than reasoned about.
func writeCrop(pa, pb string, r frameResult, out string) error {
	ia, err := load(pa)
	if err != nil {
		return err
	}
	ib, err := load(pb)
	if err != nil {
		return err
	}
	const pad = 24
	box := image.Rect(r.x0-pad, r.y0-pad, r.x1+pad+1, r.y1+pad+1).Intersect(ia.Bounds())
	// Keep the crop readable rather than the whole frame when the box is huge.
	w, h := box.Dx(), box.Dy()
	dst := image.NewRGBA(image.Rect(0, 0, w, h*2+8))
	draw.Draw(dst, image.Rect(0, 0, w, h), ia, box.Min, draw.Src)
	draw.Draw(dst, image.Rect(0, h+8, w, h*2+8), ib, box.Min, draw.Src)
	f, err := os.Create(out)
	if err != nil {
		return err
	}
	defer f.Close()
	return png.Encode(f, dst)
}

func load(p string) (image.Image, error) {
	b, err := os.ReadFile(p)
	if err != nil {
		return nil, err
	}
	img, _, err := image.Decode(bytes.NewReader(b))
	return img, err
}

func frameNames(dir string) []string {
	ents, err := os.ReadDir(dir)
	if err != nil {
		return nil
	}
	var out []string
	for _, e := range ents {
		n := e.Name()
		if strings.HasSuffix(n, ".jpg") || strings.HasSuffix(n, ".png") {
			out = append(out, n)
		}
	}
	sort.Strings(out)
	return out
}

func frameNumber(name string) int {
	n, _ := strconv.Atoi(strings.TrimSuffix(name, filepath.Ext(name)))
	return n
}

// readMap parses "frame rep worker" lines into frame → worker.
func readMap(p string) map[int]int {
	if p == "" {
		return nil
	}
	f, err := os.Open(p)
	if err != nil {
		return nil
	}
	defer f.Close()
	m := map[int]int{}
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		fs := strings.Fields(sc.Text())
		if len(fs) < 3 {
			continue
		}
		fr, _ := strconv.Atoi(fs[0])
		w, _ := strconv.Atoi(fs[2])
		m[fr] = w
	}
	return m
}

func lookup(m map[int]int, n int) int {
	if m == nil {
		return -1
	}
	if v, ok := m[n]; ok {
		return v
	}
	return -1
}

func absd(a, b uint32) uint32 {
	if a > b {
		return a - b
	}
	return b - a
}

func max3(a, b, c uint32) uint32 {
	if b > a {
		a = b
	}
	if c > a {
		a = c
	}
	return a
}
