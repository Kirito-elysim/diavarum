import type { CSSProperties } from 'react';
import type { CourseTextStyle } from '../types';

export function courseTextStyle(style?: CourseTextStyle): CSSProperties {
  return { fontSize: style?.size, color: style?.color, fontWeight: style?.weight ? (style.weight === 'bold' ? 700 : 400) : undefined, textAlign: style?.align };
}
