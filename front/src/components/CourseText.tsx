import { Fragment } from 'react';

/** Texte de cours avec emphase et retrait des lignes à puces, sans HTML injecté. */
export function CourseText({ text }: { text: string }) {
  return <>{text.split('\n').map((line, index) => {
    const content = line.split(/(\*\*[^*]+\*\*)/g).map((part, partIndex) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={partIndex}>{part.slice(2, -2)}</strong>
        : part,
    );
    return <Fragment key={index}>
      {index > 0 && '\n'}
      {/^\s*[•▪■□◦●‣⁃–—-]\s+/.test(line)
        ? <span className="inline-block w-full box-border pl-[10px]" data-course-bullet>{content}</span>
        : content}
    </Fragment>;
  })}</>;
}
