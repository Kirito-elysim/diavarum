import { useState } from 'react';
import type { CategorizeBlock, ContentBlock, HotspotBlock, HotspotPoint } from '../../types';
import { DEFAULT_INSTRUCTIONS, INFO_CARD_CATEGORIES, PICTOS, infoCardCategory } from '../../lib/courseVisuals';
import { HotspotMarker } from '../HotspotMarker';
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
    <Field label="Question de l’exercice « Relier »" multiline value={b.question} onChange={question => onChange({ ...b, question })} />
    <Field label="Consigne de l’encadré au doigt" value={b.instruction ?? DEFAULT_INSTRUCTIONS.connect} onChange={instruction => onChange({ ...b, instruction })} />
    <p className="rounded-xl bg-orange-50 p-4 text-sm">Chaque association relie une destination à un seul élément. Les éléments à déplacer seront mélangés pour l’apprenant. Utilisez des textes différents pour chacun. L’activité est notée et affiche une correction. Pour déposer plusieurs éléments dans une même zone, utilisez l’activité « Glisser-déposer ».</p>
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
  if (b.type === 'info-card') {
    const current = infoCardCategory(b.variant);
    return <>
      <label className="block space-y-2"><span className="text-sm font-medium">Catégorie d’encadré</span><select className="w-full rounded-lg border p-3" value={current.value} onChange={e => {
        const next = INFO_CARD_CATEGORIES.find(c => c.value === e.target.value) ?? current;
        // Le titre suit la catégorie tant qu'il n'a pas été personnalisé
        const title = !b.title.trim() || INFO_CARD_CATEGORIES.some(c => c.label === b.title) || b.title === 'Important' ? next.label : b.title;
        onChange({ ...b, variant: next.value, title });
      }}>{INFO_CARD_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
      <Field label="Titre de l’encadré" value={b.title} onChange={title => onChange({ ...b, title })} />
      <Field label="Texte de l’encadré" multiline value={b.content} onChange={content => onChange({ ...b, content })} />
    </>;
  }
  if (b.type === 'image-text') return <>
    <label className="block space-y-2"><span className="text-sm font-medium">Taille de l’image</span><select className="w-full rounded-lg border p-3" value={b.size} onChange={e => onChange({ ...b, size: e.target.value as typeof b.size })}><option value="picto">Picto — petite icône à gauche du texte</option><option value="image">Image — vignette à gauche du texte</option></select></label>
    <ImageField url={b.imageUrl} alt={b.alt} onChange={(imageUrl, alt) => onChange({ ...b, imageUrl, alt })} />
    <Field label="Texte affiché à droite" multiline value={b.content} onChange={content => onChange({ ...b, content })} />
  </>;
  if (b.type === 'categorize') return <CategorizeFields block={b} onChange={onChange} />;
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
    <Field label="Consigne de l’encadré au doigt" value={b.instruction ?? DEFAULT_INSTRUCTIONS.flipCards} onChange={instruction => onChange({ ...b, instruction })} />
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
        {b.hotspots.map((h, i) => <button key={h.id} aria-label={`Sélectionner le repère ${i + 1}`} onClick={e => { e.stopPropagation(); setSelected(h.id); }} className={`absolute h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full text-white font-bold border-2 border-white ${selected === h.id ? 'bg-orange-600' : 'bg-emerald-800'}`} style={{ left: `${h.x}%`, top: `${h.y}%` }}><span className="flex h-full w-full items-center justify-center"><HotspotMarker point={h} index={i} /></span></button>)}
      </div></>}
    {b.hotspots.map((h, index) => <section key={h.id} className={`rounded-xl border p-4 space-y-3 ${selected === h.id ? 'border-orange-500' : ''}`}>
      <Button variant="outline" onClick={() => setSelected(h.id)}>Positionner le repère {index + 1}</Button>
      <Field label={`Titre de la légende ${index + 1}`} value={h.label} onChange={label => onChange({ ...b, hotspots: b.hotspots.map(p => p.id === h.id ? { ...p, label } : p) })} />
      <Field label={`Texte de la légende ${index + 1}`} multiline value={h.description} onChange={description => onChange({ ...b, hotspots: b.hotspots.map(p => p.id === h.id ? { ...p, description } : p) })} />
      <MarkerFields point={h} index={index} onChange={point => onChange({ ...b, hotspots: b.hotspots.map(p => p.id === h.id ? point : p) })} />
      <ItemActions index={index} count={b.hotspots.length} onMove={direction => onChange({ ...b, hotspots: move(b.hotspots, index, direction) })} onRemove={() => onChange({ ...b, hotspots: b.hotspots.filter(p => p.id !== h.id) })} />
    </section>)}
    <Button variant="outline" onClick={() => { const point = { id: uid(), x: 50, y: 50, label: '', description: '' }; onChange({ ...b, hotspots: [...b.hotspots, point] }); setSelected(point.id); }}>Ajouter une légende</Button>
  </>;
}

/** Repère d'une légende : numéro (par défaut), picto de la bibliothèque ou image importée */
function MarkerFields({ point, index, onChange }: { point: HotspotPoint; index: number; onChange: (point: HotspotPoint) => void }) {
  const kind = point.iconUrl ? 'image' : point.icon ? 'picto' : 'number';
  return <div className="space-y-3 rounded-xl bg-gray-50 p-3">
    <label className="block space-y-2"><span className="text-sm font-medium">Repère affiché sur l’image</span><select className="w-full rounded-lg border bg-white p-3" value={kind} onChange={e => {
      const next = e.target.value;
      onChange({ ...point, icon: next === 'picto' ? (point.icon ?? Object.keys(PICTOS)[0]) : undefined, iconUrl: next === 'image' ? (point.iconUrl ?? '') : undefined });
    }}><option value="number">Numéro ({index + 1})</option><option value="picto">Picto de la bibliothèque</option><option value="image">Picto importé (image)</option></select></label>
    {kind === 'picto' && <div role="radiogroup" aria-label="Choix du picto" className="grid grid-cols-6 gap-2 sm:grid-cols-9">
      {Object.entries(PICTOS).map(([key, { label, icon: Icon }]) => <button key={key} type="button" role="radio" aria-checked={point.icon === key} aria-label={label} title={label} onClick={() => onChange({ ...point, icon: key, iconUrl: undefined })}
        className={`flex h-11 items-center justify-center rounded-lg border ${point.icon === key ? 'border-orange-500 bg-orange-50 text-orange-700' : 'bg-white text-emerald-900'}`}><Icon className="h-5 w-5" /></button>)}
    </div>}
    {kind === 'image' && <ImageField url={point.iconUrl ?? ''} alt="" onChange={iconUrl => onChange({ ...point, iconUrl, icon: undefined })} />}
  </div>;
}

/** Glisser-déposer : une ou plusieurs zones, chacune pouvant recevoir plusieurs éléments */
function CategorizeFields({ block: b, onChange }: { block: CategorizeBlock; onChange: (block: CategorizeBlock) => void }) {
  const renameZone = (index: number, name: string) => {
    const previous = b.categories[index];
    onChange({ ...b, categories: b.categories.map((c, i) => i === index ? name : c), items: b.items.map(item => item.category === previous ? { ...item, category: name } : item) });
  };
  const removeZone = (index: number) => {
    const removed = b.categories[index];
    const categories = b.categories.filter((_, i) => i !== index);
    onChange({ ...b, categories, items: b.items.map(item => item.category === removed ? { ...item, category: categories[0] ?? '' } : item) });
  };
  return <>
    <Field label="Question du glisser-déposer" multiline value={b.question} onChange={question => onChange({ ...b, question })} />
    <Field label="Consigne de l’encadré au doigt" value={b.instruction ?? DEFAULT_INSTRUCTIONS.categorize} onChange={instruction => onChange({ ...b, instruction })} />
    <p className="rounded-xl bg-orange-50 p-4 text-sm">Créez une ou plusieurs zones de destination, puis les éléments à déplacer en indiquant la zone attendue pour chacun. Une même zone peut recevoir plusieurs éléments. Les éléments seront mélangés pour l’apprenant. L’activité est notée et affiche une correction.</p>
    <h4 className="font-semibold">Zones de destination</h4>
    {b.categories.map((zone, index) => <div key={index} className="flex items-end gap-2">
      <div className="flex-1"><Field label={`Zone ${index + 1}`} value={zone} onChange={name => renameZone(index, name)} /></div>
      <Button variant="ghost" disabled={b.categories.length <= 1} onClick={() => removeZone(index)}>Retirer</Button>
    </div>)}
    <Button variant="outline" onClick={() => onChange({ ...b, categories: [...b.categories, `Zone ${b.categories.length + 1}`] })}>Ajouter une zone</Button>
    <h4 className="pt-2 font-semibold">Éléments à déplacer</h4>
    {b.items.map((item, index) => <section key={item.id} className="rounded-xl border p-4 space-y-3">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={`Élément ${index + 1}`} multiline value={item.label} onChange={label => onChange({ ...b, items: b.items.map(i => i.id === item.id ? { ...i, label } : i) })} />
        <label className="block space-y-2"><span className="text-sm font-medium">Zone attendue</span><select className="w-full rounded-lg border p-3" value={item.category} onChange={e => onChange({ ...b, items: b.items.map(i => i.id === item.id ? { ...i, category: e.target.value } : i) })}>
          {!b.categories.includes(item.category) && <option value={item.category}>Choisir une zone</option>}
          {b.categories.map((zone, i) => <option key={i} value={zone}>{zone || `Zone ${i + 1}`}</option>)}
        </select></label>
      </div>
      <ItemActions index={index} count={b.items.length} onMove={direction => onChange({ ...b, items: move(b.items, index, direction) })} onRemove={() => onChange({ ...b, items: b.items.filter(i => i.id !== item.id) })} />
    </section>)}
    <Button variant="outline" onClick={() => onChange({ ...b, items: [...b.items, { id: uid(), label: '', category: b.categories[0] ?? '' }] })}>Ajouter un élément à déplacer</Button>
    <Field label="Explication de la correction" multiline value={b.explanation} onChange={explanation => onChange({ ...b, explanation })} />
  </>;
}
