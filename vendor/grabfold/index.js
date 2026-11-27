export { Grabfold } from "./book.js";
export { FoldingSheet, gutterGradient } from "./sheet.js";
export { ARRIVAL_SHARE, arrivalTime, easeOut, firstPosition, lastPosition, } from "./model.js";
/** How a hand moves a page, as numbers: flicks, peeks, stacks and blocks. */
export { blockCount, closedShift, FLICK_SPEED, peekProgress, releaseSpeed, releaseTarget, settleDuration, stackWidths, } from "./physics.js";
/**
 * The fold itself, for anyone drawing their own sheet — on a canvas, in WebGL,
 * anywhere. Pure functions: points in, points out.
 */
export { clipHalfPlane, foldDepth, foldGeometry, reflect } from "./geometry.js";
