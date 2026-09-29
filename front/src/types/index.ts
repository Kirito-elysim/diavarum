/**
 * Format du contenu des cours (pages > blocs), lu par le lecteur de séance.
 * Les données métier (patients, parcours, séances…) sont typées dans src/api/types.ts.
 */

export type ContentBlockType =
  | 'text' | 'image' | 'info-card' | 'quiz' | 'timeline' | 'hotspot' | 'iframe'
  | 'reorder' | 'fill-blank' | 'true-false' | 'memory' | 'slider'
  | 'tap-sequence' | 'flip-cards' | 'categorize' | 'drawing' | 'scenario'
  | 'reveal-legends' | 'pull-timeline' | 'sort-bin'
  | 'connect-dots' | 'word-search' | 'yes-no-path' | 'carousel';

export interface TextBlock {
  type: 'text';
  id: string;
  content: string;
}

export interface ImageBlock {
  type: 'image';
  id: string;
  url: string;
  caption?: string;
  alt: string;
}

export interface InfoCardBlock {
  type: 'info-card';
  id: string;
  title: string;
  content: string;
  variant: 'info' | 'warning' | 'success' | 'tip';
}

export type QuestionType = 'qcu' | 'qcm' | 'drag-drop';

export interface QuizOption {
  id: string;
  label: string;
  isCorrect: boolean;
}

export interface DragDropPair {
  id: string;
  left: string;
  right: string;
}

export interface QuizBlock {
  type: 'quiz';
  id: string;
  questionType: QuestionType;
  /** false = question de réflexion sans score ni correction (ex. « Avez-vous désigné quelqu'un ? ») */
  graded?: boolean;
  question: string;
  options?: QuizOption[];
  pairs?: DragDropPair[];
  explanation?: string;
}

export type ContentBlock =
  | TextBlock | ImageBlock | InfoCardBlock | QuizBlock
  | TimelineBlock | HotspotBlock | IframeBlock
  | ReorderBlock | FillBlankBlock | TrueFalseBlock | MemoryBlock
  | SliderBlock | TapSequenceBlock | FlipCardsBlock | CategorizeBlock
  | DrawingBlock | ScenarioBlock
  | RevealLegendsBlock | PullTimelineBlock
  | SortBinBlock | ConnectDotsBlock | WordSearchBlock | YesNoPathBlock
  | CarouselBlock;

/* Carrousel : images défilantes accompagnées d'un texte (interactivité du cahier des charges) */
export interface CarouselSlide {
  id: string;
  imageUrl: string;
  alt: string;
  text: string;
}

export interface CarouselBlock {
  type: 'carousel';
  id: string;
  question?: string;
  slides: CarouselSlide[];
}

export interface IframeBlock {
  type: 'iframe';
  id: string;
  url: string;
  title: string;
  height?: number;
  caption?: string;
}

/* ─── New interaction blocks (tablet-native) ──────────────────────── */

export interface ReorderItem {
  id: string;
  label: string;
}

export interface ReorderBlock {
  type: 'reorder';
  id: string;
  question: string;
  items: ReorderItem[];          // given in correct order; rendered shuffled
  explanation?: string;
}

export interface FillBlankBlock {
  type: 'fill-blank';
  id: string;
  question: string;
  text: string;                  // use ___ as blank markers
  answers: string[];             // correct word for each blank, in order
  explanation?: string;
}

export interface TrueFalseStatement {
  id: string;
  statement: string;
  isTrue: boolean;
}

export interface TrueFalseBlock {
  type: 'true-false';
  id: string;
  question: string;
  statements: TrueFalseStatement[];
  explanation?: string;
}

export interface MemoryCard {
  id: string;
  pairId: string;                // two cards sharing the same pairId match
  content: string;
}

export interface MemoryBlock {
  type: 'memory';
  id: string;
  question: string;
  cards: MemoryCard[];
  explanation?: string;
}

export interface SliderBlock {
  type: 'slider';
  id: string;
  question: string;
  min: number;
  max: number;
  correctValue: number;
  unit: string;
  tolerance: number;             // ± tolerance to be considered correct
  minLabel?: string;
  maxLabel?: string;
  explanation?: string;
}

export interface TapSequenceStep {
  id: string;
  label: string;
  order: number;
}

export interface TapSequenceBlock {
  type: 'tap-sequence';
  id: string;
  question: string;
  steps: TapSequenceStep[];      // given in correct order; rendered shuffled
  explanation?: string;
}

export interface FlipCard {
  id: string;
  front: string;
  back: string;
}

export interface FlipCardsBlock {
  type: 'flip-cards';
  id: string;
  question: string;
  cards: FlipCard[];
}

export interface CategorizeItem {
  id: string;
  label: string;
  category: string;
}

export interface CategorizeBlock {
  type: 'categorize';
  id: string;
  question: string;
  categories: string[];
  items: CategorizeItem[];
  explanation?: string;
}

export interface DrawingBlock {
  type: 'drawing';
  id: string;
  question: string;
  prompt: string;                // what to draw / trace
  brushColor: string;
}

export interface ScenarioChoice {
  id: string;
  label: string;
  isCorrect: boolean;
  feedback: string;
}

export interface ScenarioStep {
  id: string;
  situation: string;
  question: string;
  choices: ScenarioChoice[];
}

export interface ScenarioBlock {
  type: 'scenario';
  id: string;
  question: string;
  steps: ScenarioStep[];
}

/* ─── Senior-friendly interaction blocks ──────────────────────────── */

/* 1. Reveal legends — tap to progressively uncover labels on an image */
export interface RevealLegendPoint {
  id: string;
  x: number;                  // percentage 0-100
  y: number;                  // percentage 0-100
  label: string;
  description: string;
}

export interface RevealLegendsBlock {
  type: 'reveal-legends';
  id: string;
  question: string;
  imageUrl: string;
  alt: string;
  caption?: string;
  points: RevealLegendPoint[];
  explanation?: string;
}

/* 2. Pull timeline — drag a handle along a timeline to reveal dates */
export interface PullTimelineEvent {
  id: string;
  date: string;
  title: string;
  content: string;
  position: number;           // percentage 0-100 along the timeline
}

export interface PullTimelineBlock {
  type: 'pull-timeline';
  id: string;
  question: string;
  events: PullTimelineEvent[];
  explanation?: string;
}

/* 4. Sort bin — tap items to send them into "keep" or "discard" bins */
export interface SortBinItem {
  id: string;
  label: string;
  keep: boolean;              // true = should keep, false = should discard
}

export interface SortBinBlock {
  type: 'sort-bin';
  id: string;
  question: string;
  keepLabel: string;
  discardLabel: string;
  items: SortBinItem[];
  explanation?: string;
}

/* 5. Connect the dots — tap dots in order to trace a path, revealing info */
export interface ConnectDot {
  id: string;
  x: number;                  // percentage 0-100
  y: number;                  // percentage 0-100
  order: number;
  label: string;
  info: string;
}

export interface ConnectDotsBlock {
  type: 'connect-dots';
  id: string;
  question: string;
  imageUrl: string;
  alt: string;
  caption?: string;
  dots: ConnectDot[];
  explanation?: string;
}

/* 6. Word search — find and tap words hidden in a grid */
export interface WordSearchWord {
  id: string;
  word: string;
  clue: string;
}

export interface WordSearchBlock {
  type: 'word-search';
  id: string;
  question: string;
  gridSize: number;           // e.g. 8 for an 8x8 grid
  letters: string;            // row-major, length = gridSize * gridSize
  words: WordSearchWord[];
  explanation?: string;
}

/* 7. Yes/No path — a gentle decision tree with large yes/no buttons */
export interface YesNoPathStep {
  id: string;
  question: string;
  yesStepId?: string;
  noStepId?: string;
  yesFeedback?: string;
  noFeedback?: string;
  result?: string;            // shown when this is a leaf node
  isCorrectEnd?: boolean;     // marks the desired end point
}

export interface YesNoPathBlock {
  type: 'yes-no-path';
  id: string;
  question: string;
  startStepId: string;
  steps: YesNoPathStep[];
}

export interface TimelineItem {
  id: string;
  step: number;
  title: string;
  content: string;
  imageUrl?: string;
  tag?: string;
}

export interface TimelineBlock {
  type: 'timeline';
  id: string;
  title?: string;
  items: TimelineItem[];
}

export interface HotspotPoint {
  id: string;
  x: number;
  y: number;
  label: string;
  description: string;
}

export interface HotspotBlock {
  type: 'hotspot';
  id: string;
  imageUrl: string;
  alt: string;
  caption?: string;
  hotspots: HotspotPoint[];
}

export interface ModulePage {
  id: string;
  title: string;
  blocks: ContentBlock[];
}
