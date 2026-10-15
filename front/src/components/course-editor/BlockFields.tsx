import { useState } from 'react';
import type { ContentBlock, HotspotBlock } from '../../types';
import { Button } from '../ui/button';
import { Field, ImageField, ItemActions, Toggle } from './Fields';
import { move, uid } from './model';

export function BlockFields({ block: b, onChange }: { block: ContentBlock; onChange: (block: ContentBlock) => void }) {
  if (b.type === 'reorder') return <>
    <Field label="Consigne de remise en ordre" multiline value={b.question} onChange={question => onChange({ ...b, question })} />
    <p className="rounded-xl bg-orange-50 p-4 text-sm">Saisissez les éléments dans le bon ordre. Utilisez les flèches pour modifier cet ordre. Ils seront mélangés pour l’apprenant. L’activité est notée et affiche une correction.</p>
    {b.items.map((item, index) => <section key={item.id} className="rounded-xl border p-4 space-y-3">
      <Field label={`Élément ${index + 1} dans le bon ordre`} multiline value={item.label} onChange={label => onChange({ ...b, items: b.items.map(i => i.id === item.id ? { ...i, label } : i) })} />
      <ItemActions index={index} count={b.items.length} onMove={direction => onChange({ ...b, items: move(b.items, index, direction) })} onRemove={() => onChange({ ...b, items: b.items.filter(i => i.id !== item.id) })} />
    </section>)}
    <Button variant="outline" onClick={() => onChange({ ...b, items: [...b.items, { id: uid(), label: '' }] })}>Ajouter un élément à ordonner</Button>
    <Field label="Explication de l’ordre attendu" multiline value={b.explanation} onChange={explanation => onChange({ ...b, explanation })} />
  </>;
  if (b.type === 'quiz' && b.questionType === 'drag-drop') return <>
    <Field label="Consigne du glisser-déposer" multiline value={b.question} onChange={question => onChange({ ...b, question })} />
    <p className="rounded-xl bg-orange-50 p-4 text-sm">Chaque association relie une destination à son bon élément. Les éléments à déplacer seront mélangés pour l’apprenant. Utilisez des textes différents pour chacun. L’activité est notée et affiche une correction.</p>
    {(b.pairs ?? []).map((pair, index) => <section key={pair.id} className="rounded-xl border p-4 space-y-3">
      <h4 className="font-semibold">Association {index + 1}</h4>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={`Destination ${index + 1}`} multiline value={pair.left} onChange={left => onChange({ ...b, pairs: b.pairs?.map(p => p.id === pair.id ? { ...p, left } : p) })} />
        <Field label={`Élément à déplacer ${index + 1}`} multiline value={pair.right} onChange={right => onChange({ ...b, pairs: b.pairs?.map(p => p.id === pair.id ? { ...p, right } : p) })} />
      </div>
      <ItemActions index={index} count={b.pairs?.length ?? 0} onMove={direction => onChange({ ...b, pairs: move(b.pairs ?? [], index, direction) })} onRemove={() => onChange({ ...b, pairs: b.pairs?.filter(p => p.id !== pair.id) })} />
    </section>)}
    <Button variant="outline" onClick={() => onChange({ ...b, pairs: [...(b.pairs ?? []), { id: uid(), left: '', right: '' }] })}>Ajouter une association</Button>
    <Field label="Explication des associations" multiline value={b.explanation} onChange={explanation => onChange({ ...b, explanation })} />
  </>;
  if (b.type === 'text') return <Field label="Texte" multiline value={b.content} onChange={content => onChange({ ...b, content })} />;
  if (b.type === 'image') return <><ImageField url={b.url} alt={b.alt} onChange={(url, alt) => onChange({ ...b, url, alt })} /><Field label="Légende sous l’image" value={b.caption} onChange={caption => onChange({ ...b, caption })} /></>;
  if (b.type === 'info-card') return <>
    <Field label="Titre de l’encadré" value={b.title} onChange={title => onChange({ ...b, title })} />
    <Field label="Texte de l’encadré" multiline value={b.content} onChange={content => onChange({ ...b, content })} />
    <label className="block space-y-2"><span className="text-sm font-medium">Présentation</span><select className="w-full rounded-lg border p-3" value={b.variant} onChange={e => onChange({ ...b, variant: e.target.value as typeof b.variant })}><option value="info">Information</option><option value="warning">Important</option><option value="tip">Le saviez-vous ?</option><option value="success">À retenir</option></select></label>
  </>;
  if (b.type === 'carousel') return <>
    <Field label="Introduction du carrousel" multiline value={b.question} onChange={question => onChange({ ...b, question })} />
    {b.slides.map((slide, index) => <section key={slide.id} className="rounded-xl border p-4 space-y-4"><h4 className="font-semibold">Image {index + 1}</h4>
      <ImageField url={slide.imageUrl} alt={slide.alt} onChange={(imageUrl, alt) => onChange({ ...b, slides: b.slides.map(s => s.id === slide.id ? { ...s, imageUrl, alt } : s) })} />
      <Field label="Texte associé à l’image" multiline value={slide.text} onChange={text => onChange({ ...b, slides: b.slides.map(s => s.id === slide.id ? { ...s, text } : s) })} />
      <ItemActions index={index} count={b.slides.length} onMove={direction => onChange({ ...b, slides: move(b.slides, index, direction) })} onRemove={() => onChange({ ...b, slides: b.slides.filter(s => s.id !== slide.id) })} />
    </section>)}
    <Button variant="outline" onClick={() => onChange({ ...b, slides: [...b.slides, { id: uid(), imageUrl: '', alt: '', text: '' }] })}>Ajouter une image au carrousel</Button>
  </>;
  if (b.type === 'flip-cards') return <>
    <Field label="Introduction des cartes" multiline value={b.question} onChange={question => onChange({ ...b, question })} />
    {b.cards.map((card, index) => <section key={card.id} className="rounded-xl border p-4 space-y-4"><h4 className="font-semibold">Carte {index + 1}</h4>
      <div className="grid gap-4 md:grid-cols-2"><Field label="Recto" multiline value={card.front} onChange={front => onChange({ ...b, cards: b.cards.map(c => c.id === card.id ? { ...c, front } : c) })} /><Field label="Verso" multiline value={card.back} onChange={back => onChange({ ...b, cards: b.cards.map(c => c.id === card.id ? { ...c, back } : c) })} /></div>
      <ItemActions index={index} count={b.cards.length} onMove={direction => onChange({ ...b, cards: move(b.cards, index, direction) })} onRemove={() => onChange({ ...b, cards: b.cards.filter(c => c.id !== card.id) })} />
    </section>)}
    <Button variant="outline" onClick={() => onChange({ ...b, cards: [...b.cards, { id: uid(), front: '', back: '' }] })}>Ajouter une carte</Button>
  </>;
  if (b.type === 'hotspot') return <HotspotFields block={b} onChange={onChange} />;
  if (b.type === 'quiz' && b.questionType !== 'drag-drop') {
    const needsCorrection = b.graded !== false || (b.showCorrection ?? b.graded !== false);
    return <>
      <label className="block space-y-2"><span className="text-sm font-medium">Type de question</span><select className="w-full rounded-lg border p-3" value={b.questionType} onChange={e => {
        const questionType = e.target.value as 'qcu' | 'qcm';
        const first = b.options?.find(o => o.isCorrect)?.id;
        onChange({ ...b, questionType, options: b.options?.map(o => ({ ...o, isCorrect: questionType === 'qcu' ? o.id === first : o.isCorrect })) });
      }}><option value="qcu">QCU — une seule réponse</option><option value="qcm">QCM — plusieurs réponses possibles</option></select></label>
      <Field label="Question" multiline value={b.question} onChange={question => onChange({ ...b, question })} />
      <div className="rounded-xl bg-orange-50 p-4"><Toggle label="Compter cette question dans le score" checked={b.graded !== false} onChange={graded => onChange({ ...b, graded })} /><Toggle label="Afficher la correction après la réponse" checked={b.showCorrection ?? b.graded !== false} onChange={showCorrection => onChange({ ...b, showCorrection })} /></div>
      {b.options?.map((option, index) => <section key={option.id} className="rounded-xl border p-4 space-y-3">
        <Field label={`Proposition ${index + 1}`} multiline value={option.label} onChange={label => onChange({ ...b, options: b.options?.map(o => o.id === option.id ? { ...o, label } : o) })} />
        {needsCorrection && <Toggle label={`Bonne réponse — proposition ${index + 1}`} checked={option.isCorrect} onChange={isCorrect => onChange({ ...b, options: b.options?.map(o => o.id === option.id ? { ...o, isCorrect } : b.questionType === 'qcu' && isCorrect ? { ...o, isCorrect: false } : o) })} />}
        <ItemActions index={index} count={b.options?.length ?? 0} onMove={direction => onChange({ ...b, options: move(b.options ?? [], index, direction) })} onRemove={() => onChange({ ...b, options: b.options?.filter(o => o.id !== option.id) })} />
      </section>)}
      <Button variant="outline" onClick={() => onChange({ ...b, options: [...(b.options ?? []), { id: uid(), label: '', isCorrect: false }] })}>Ajouter une proposition</Button>
      <Field label="Explication de la correction" multiline value={b.explanation} onChange={explanation => onChange({ ...b, explanation })} />
    </>;
  }
  return <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Cette activité complémentaire est conservée. Son formulaire d’édition n’est pas encore disponible ; vous pouvez la déplacer ou la retirer.</p>;
}

function HotspotFields({ block: b, onChange }: { block: HotspotBlock; onChange: (block: HotspotBlock) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const selectedPoint = b.hotspots.find(h => h.id === selected);
  return <>
    <ImageField url={b.imageUrl} alt={b.alt} onChange={(imageUrl, alt) => onChange({ ...b, imageUrl, alt })} />
    <Field label="Légende sous l’image" value={b.caption} onChange={caption => onChange({ ...b, caption })} />
    {b.imageUrl && <><p className="text-sm text-gray-600">{selectedPoint ? 'Touchez l’image pour déplacer le repère sélectionné.' : 'Touchez l’image pour ajouter un repère.'}</p>
      <div className="relative w-fit max-w-full cursor-crosshair" onClick={e => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, Math.round((e.clientX - rect.left) / rect.width * 100)));
        const y = Math.max(0, Math.min(100, Math.round((e.clientY - rect.top) / rect.height * 100)));
        if (selectedPoint) onChange({ ...b, hotspots: b.hotspots.map(h => h.id === selected ? { ...h, x, y } : h) });
        else { const point = { id: uid(), x, y, label: '', description: '' }; onChange({ ...b, hotspots: [...b.hotspots, point] }); setSelected(point.id); }
      }}>
        <img src={b.imageUrl} alt={b.alt} className="block max-h-96 max-w-full rounded-xl" draggable={false} />
        {b.hotspots.map((h, i) => <button key={h.id} aria-label={`Sélectionner le repère ${i + 1}`} onClick={e => { e.stopPropagation(); setSelected(h.id); }} className={`absolute h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full text-white font-bold border-2 border-white ${selected === h.id ? 'bg-orange-600' : 'bg-emerald-800'}`} style={{ left: `${h.x}%`, top: `${h.y}%` }}>{i + 1}</button>)}
      </div></>}
    {b.hotspots.map((h, index) => <section key={h.id} className={`rounded-xl border p-4 space-y-3 ${selected === h.id ? 'border-orange-500' : ''}`}>
      <Button variant="outline" onClick={() => setSelected(h.id)}>Positionner le repère {index + 1}</Button>
      <Field label={`Titre de la légende ${index + 1}`} value={h.label} onChange={label => onChange({ ...b, hotspots: b.hotspots.map(p => p.id === h.id ? { ...p, label } : p) })} />
      <Field label={`Texte de la légende ${index + 1}`} multiline value={h.description} onChange={description => onChange({ ...b, hotspots: b.hotspots.map(p => p.id === h.id ? { ...p, description } : p) })} />
      <ItemActions index={index} count={b.hotspots.length} onMove={direction => onChange({ ...b, hotspots: move(b.hotspots, index, direction) })} onRemove={() => onChange({ ...b, hotspots: b.hotspots.filter(p => p.id !== h.id) })} />
    </section>)}
    <Button variant="outline" onClick={() => { const point = { id: uid(), x: 50, y: 50, label: '', description: '' }; onChange({ ...b, hotspots: [...b.hotspots, point] }); setSelected(point.id); }}>Ajouter une légende</Button>
  </>;
}
