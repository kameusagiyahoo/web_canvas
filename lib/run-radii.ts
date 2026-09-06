import { lerp, type Axis, type Radii } from "./tokens";

/** Corner geometry for a connected run while a dragged placeholder opens a gap. */
export function interpolatedRunRadii(
  axis: Axis,
  first: boolean,
  last: boolean,
  previousPlaceholder: boolean,
  nextPlaceholder: boolean,
  pull: number,
  outer: number,
  inner: number,
): Radii {
  const soft = lerp(outer, inner, pull);
  const start = first ? outer : previousPlaceholder ? soft : inner;
  const end = last ? outer : nextPlaceholder ? soft : inner;
  return axis === "x"
    ? { tl: start, bl: start, tr: end, br: end }
    : { tl: start, tr: start, bl: end, br: end };
}
