import { foldDepth, foldGeometry } from "./geometry.js";
/** A clip-path for a polygon in pixels. */
export function polygon(points) {
    if (points.length < 3)
        return "polygon(0 0, 0 0, 0 0)";
    return `polygon(${points
        .map((point) => `${point.x.toFixed(2)}px ${point.y.toFixed(2)}px`)
        .join(", ")})`;
}
/** Lays a shading band along a strip. */
export function placeBand(band, strip, gradient) {
    band.style.width = `${strip.span.toFixed(2)}px`;
    band.style.height = `${strip.length.toFixed(2)}px`;
    band.style.transform = `translate(${strip.x.toFixed(2)}px, ${strip.y.toFixed(2)}px) rotate(${strip.angle.toFixed(4)}rad)`;
    band.style.backgroundImage = gradient;
}
/**
 * The shadow a page falls into where it curves down into the binding.
 *
 * It is that, more than anything, that makes a flat rectangle read as a page
 * in a book rather than a panel. Shared with the book's static pages so that
 * a sheet and the page it lands as are shaded identically.
 */
export function gutterGradient(side, strength) {
    if (strength <= 0)
        return "none";
    const towards = side === "left" ? "to right" : "to left";
    return `linear-gradient(${towards}, rgba(0,0,0,${strength}), rgba(0,0,0,${(strength * 0.34).toFixed(3)}) 8%, rgba(0,0,0,0) 24%)`;
}
function layer(doc, className) {
    const el = doc.createElement("div");
    el.className = className;
    el.style.position = "absolute";
    el.style.left = "0";
    el.style.top = "0";
    el.style.width = "100%";
    el.style.height = "100%";
    return el;
}
function overlay(doc, className) {
    const el = doc.createElement("span");
    el.className = className;
    el.style.position = "absolute";
    el.style.left = "0";
    el.style.top = "0";
    el.style.pointerEvents = "none";
    return el;
}
export class FoldingSheet {
    constructor(doc, shading) {
        this.shading = shading;
        this.root = doc.createElement("div");
        this.root.className = "grabfold-sheet";
        this.root.setAttribute("aria-hidden", "true");
        Object.assign(this.root.style, {
            position: "absolute",
            top: "0",
            zIndex: "3",
            pointerEvents: "none",
            display: "none",
        });
        // Thrown by the standing fold across the page it has just uncovered, and
        // kept to that page so it stops where the paper stopped.
        this.cast = layer(doc, "grabfold-cast");
        this.cast.style.pointerEvents = "none";
        this.castBand = overlay(doc, "grabfold-band");
        this.castBand.style.transformOrigin = "0 0";
        this.cast.append(this.castBand);
        // Still flat on its own page, cut off where the crease has reached. It
        // has not moved, so it keeps its own page's gutter and no seam shows
        // where the clip cuts it away from the page beneath.
        this.leaf = layer(doc, "grabfold-leaf");
        this.leaf.style.background = "var(--grabfold-paper, #fbf8f1)";
        this.leaf.style.overflow = "hidden";
        this.restingSlot = layer(doc, "grabfold-slot");
        this.leafGutter = layer(doc, "grabfold-gutter");
        this.leafGutter.style.pointerEvents = "none";
        this.leaf.append(this.restingSlot, this.leafGutter);
        // Folded over: carried across the crease by a translate and a rotate about
        // its own top-left corner, and cut back to the crease.
        this.flap = layer(doc, "grabfold-flap");
        this.flap.style.transformOrigin = "0 0";
        this.flap.style.overflow = "hidden";
        this.flap.style.willChange = "transform, clip-path";
        this.turnedSlot = layer(doc, "grabfold-slot");
        this.flapGutter = layer(doc, "grabfold-gutter");
        this.flapGutter.style.pointerEvents = "none";
        this.rollBand = overlay(doc, "grabfold-band");
        this.rollBand.style.transformOrigin = "0 0";
        this.flap.append(this.turnedSlot, this.flapGutter, this.rollBand);
        this.root.append(this.cast, this.leaf, this.flap);
    }
    setShading(shading) {
        this.shading = shading;
    }
    // A folding leaf is always paper, never a cover's outside.
    setOutside() { }
    /** Puts the sheet over a cell: left offset and size in the book's pixels. */
    place(left, width, height) {
        this.root.style.left = `${left}px`;
        this.root.style.width = `${width}px`;
        this.root.style.height = `${height}px`;
    }
    show() {
        this.root.style.display = "block";
    }
    hide() {
        this.root.style.display = "none";
    }
    /** One frame of the fold. */
    draw(frame) {
        const fold = foldGeometry(frame);
        const depth = foldDepth(frame.progress);
        const dark = this.shading.shadow * depth;
        const { spine } = frame;
        this.cast.style.clipPath = polygon(fold.uncovered);
        placeBand(this.castBand, fold.cast, `linear-gradient(to right, rgba(0,0,0,${dark.toFixed(3)}), rgba(0,0,0,0))`);
        this.leaf.style.clipPath = polygon(fold.leaf);
        this.leafGutter.style.background = gutterGradient(spine, this.shading.gutter);
        // Off the table and towards the light, by as much as it is turned: nothing
        // at either end, where it lies as flat as every other page. Set here and
        // not in a stylesheet because it has to run out as the sheet lands, or the
        // page would change colour on the last frame when the real page takes over.
        this.flap.style.backgroundColor = `color-mix(in oklab, var(--grabfold-lift, #ffffff) ${(this.shading.lift * depth).toFixed(1)}%, var(--grabfold-paper, #fbf8f1))`;
        this.flap.style.clipPath = polygon(fold.flap);
        this.flap.style.transform = `translate(${fold.place.x.toFixed(2)}px, ${fold.place.y.toFixed(2)}px) rotate(${fold.place.angle.toFixed(4)}rad)`;
        // The gutter it is heading for, not the one it left: this face lands on
        // the facing page, whose binding is on the other side. Carried in the
        // face's own frame, it arrives already in register.
        this.flapGutter.style.background = gutterGradient(spine === "left" ? "right" : "left", this.shading.gutter);
        // The crease rolling over: dark on the turn, a glint along the top of the
        // roll, dark again in its own shadow.
        placeBand(this.rollBand, fold.roll, `linear-gradient(to right, rgba(0,0,0,${dark.toFixed(3)}) 0%, rgba(0,0,0,${(dark * 0.62).toFixed(3)}) 7%, rgba(255,255,255,${(0.2 * depth).toFixed(3)}) 18%, rgba(0,0,0,${(dark * 0.4).toFixed(3)}) 40%, rgba(0,0,0,0) 100%)`);
    }
}
