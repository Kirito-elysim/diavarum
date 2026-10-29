import { createServer as createHttpServer } from 'node:http';
import { createServer } from 'vite';
import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const vite = await createServer({ root, server: { middlewareMode: true, hmr: { server: createHttpServer() } }, appType: 'custom' });
try {
  const { courseTemplates, pageFromTemplate } = await vite.ssrLoadModule('/src/components/course-editor/templates.ts');
  const { validateCourse } = await vite.ssrLoadModule('/src/components/course-editor/model.ts');
  const categories = [
    ['objective', 'Objectif', 'Identifier ce que l’apprenant doit retenir de cet écran.'],
    ['definition', 'Définition', 'Expliquer un terme avec une phrase courte et accessible.'],
    ['important', 'Important', 'Mettre en évidence une information essentielle.'],
    ['funfact', 'Fun fact', 'Apporter une information complémentaire qui éveille la curiosité.'],
    ['warning', 'Alerte', 'Signaler un point de vigilance avec le picto dédié.'],
  ];
  const illustrations = [
    ['/courses/S1/confiance-majeure.png', 'Illustration d’une personne de confiance'],
    ['/courses/S1/anticipees-intro.png', 'Illustration de discussion et d’accompagnement'],
    ['/courses/S1/conclusion.png', 'Illustration de conclusion'],
  ];
  const box = (c) => ({id:'',type:'info-card',variant:c[0],title:c[1],content:c[2]});
  const text = (content, textStyle) => ({id:'',type:'text',content,...(textStyle ? {textStyle} : {})});
  const pages = [
    {id:'',title:'La charte graphique des cours',instruction:'Un cours de référence pour composer vos écrans.',blocks:[
      text('Ce cours rassemble les **35 compositions de la maquette Adobe XD** et les principaux repères de la charte. Les exemples sont modifiables et les activités peuvent être essayées dans l’aperçu.'),
      box(['objective','Comment utiliser cette référence','Parcourez les écrans puis retrouvez leur composition dans « Choisir un modèle XD » du constructeur.']),
      text('Les contenus sont des démonstrations de mise en page. Les illustrations proviennent des ressources déjà présentes dans le projet. Cette référence est réservée à la préparation des cours.'),
    ]},
    {id:'',title:'Couleurs et styles de texte',instruction:'Euclid Circular A · Regular et Bold · 40, 25 et 20 px.',blocks:[
      text('Titre de référence · 40 px', {size:40,weight:'bold',color:'#E86825'}),
      text('Texte courant · 25 px · vert #004138. Un passage peut être mis en **gras**.',{size:25,weight:'regular',color:'#004138'}),
      text('Texte dense ou légende · 20 px · vert #1C5335.',{size:20,weight:'regular',color:'#1C5335'}),
      text('Fond : #ECF5E9\nBandeau : #1C5335\nTitres et actions : #E86825\nFond des illustrations et consignes : #FFE0D0\nBoxes : #FAFAFA\nTexte : #004138',{size:20}),
      box(['important','Police de marque','Euclid Circular A est prévue par la charte. Sans les fichiers de police, le navigateur utilise la police de remplacement.']),
    ]},
    {id:'',title:'Les cinq encadrés de la charte',instruction:'Choisissez le picto en fonction du rôle du message.',blocks:categories.map(box)},
    ...courseTemplates.map((template,index) => {
      const page = pageFromTemplate(template);
      page.title = `${String(index+1).padStart(2,'0')} · ${template.name}`;
      let boxIndex = 0;
      page.blocks.forEach(b => {
        if (b.type==='text') b.content='**Texte libre au-dessus de l’activité.** Il introduit le sujet, donne du contexte ou prépare la lecture. Utilisez des phrases courtes et aérez le contenu.';
        if (b.type==='info-card') {
          const category = categories.find(c=>c[0]===b.variant) ?? categories[2];
          b.title=category[1]; b.content=boxIndex++===0 && template.composition==='both' ? 'Présenter l’objectif avant de découvrir l’activité.' : category[2];
          // Demonstrate all five supplied box pictograms across the reference.
          if (index===10) Object.assign(b,box(categories[4]));
        }
        if (b.type==='carousel') {b.question='Un visuel et son texte, étape par étape.';b.slides=illustrations.map(([imageUrl,alt],i)=>({id:'',imageUrl,alt,text:['Découvrir le sujet avec une première illustration.','Faire défiler pour explorer un second exemple.','Terminer par une idée à retenir.'][i]}));page.instruction='Faites défiler les images avec les textes associés.';}
        if (b.type==='image-text') {b.imageUrl=illustrations[0][0];b.alt=illustrations[0][1];b.content='**Associer une image et un texte.**\n\nL’image occupe la partie gauche de l’écran. Le texte développe une idée à droite, avec des paragraphes courts.\n\nCette composition convient à une introduction, une explication ou une synthèse. Les boxes peuvent être placées avant ou après ce contenu.';}
        if (b.type==='picto-grid') {b.question='Une idée par picto :';b.items.forEach((item,i)=>{const c=categories[i%5];item.imageUrl=`/pictos/${c[0]}.png`;item.alt=c[1];item.text=i===5?'Synthèse\nRassembler les idées à retenir.':`${c[1]}\n${c[2]}`;});page.instruction='Découvrez chaque repère et son rôle dans le cours.';}
        if (b.type==='hotspot') {b.imageUrl=illustrations[0][0];b.alt=illustrations[0][1];b.caption='Touchez un repère pour afficher une information.';b.hotspots=[{id:'',x:25,y:35,label:'Premier repère',description:'Une légende courte explique un élément de l’illustration.',icon:'info'},{id:'',x:70,y:55,label:'Second repère',description:'Chaque repère possède un titre, un texte et une position modifiables.',icon:'star'}];page.instruction='Touchez chaque point pour révéler sa légende.';}
        if (b.type==='flip-cards') {b.question='Quels sont les repères de la charte ?';b.cards.forEach((card,i)=>{const c=categories[i%5];card.front=i===5?'TEXTE':c[1].toLocaleUpperCase('fr');card.back=i===5?'Le texte courant utilise la taille 25 px. La taille 20 px convient aux contenus plus denses.':c[2];});page.instruction='Touchez une carte pour la retourner.';}
        if (b.type==='quiz') {const multi=index===17||index===27||index===33;b.questionType=multi?'qcm':'qcu';b.question=multi?'Quelles couleurs font partie de la charte ?':'Quelle couleur est utilisée pour les titres et les actions ?';const choices=multi?['Orange #E86825','Vert #004138','Rose #FF00AA','Bleu #0000FF','Vert clair #ECF5E9','Violet #6600CC']:['Orange #E86825','Bleu #0000FF','Violet #6600CC','Rose #FF00AA'];b.options.forEach((o,i)=>{o.label=choices[i];o.isCorrect=multi?[0,1,4].includes(i):i===0;});b.graded=false;b.showCorrection=true;b.explanation=multi?'L’orange #E86825, le vert #004138 et le vert clair #ECF5E9 appartiennent à la palette.':'Les titres et les actions utilisent l’orange #E86825.';page.instruction=multi?'Choisissez toutes les réponses exactes.':'Choisissez la réponse qui vous paraît exacte.';}
        if (b.type==='categorize') {b.question='Classez les éléments selon leur rôle.';b.categories=['CONTENU À LIRE','ACTION À EFFECTUER'];const items=['Lire une définition','Retourner une carte','Lire une explication','Faire défiler une image','Lire une légende','Valider une réponse','Lire une synthèse','Déplacer une étiquette'];b.items.forEach((item,i)=>{item.label=items[i];item.category=b.categories[i%2];});b.explanation='Les textes transmettent une information ; les actions demandent une manipulation.';page.instruction='Faites glisser chaque élément dans la bonne zone.';}
        if (b.type==='reorder') {b.question='Comment préparer un écran de cours ?';const labels=['Choisir un modèle','Rédiger les textes','Ajouter les images','Vérifier l’aperçu','Enregistrer le cours'];b.items.forEach((item,i)=>item.label=labels[i]);b.explanation='On choisit une composition, on la complète, puis on la vérifie avant de l’enregistrer.';page.instruction='Déplacez les étiquettes pour remettre les étapes dans l’ordre.';}
      });
      return page;
    }),
  ];
  // Stable, unique IDs make repeated exports and review deterministic.
  pages.forEach((p,i)=>{let n=0;const visit=o=>{if(!o||typeof o!=='object')return;if('id'in o)o.id=`s99-p${String(i+1).padStart(2,'0')}-${n++}`;Object.values(o).forEach(v=>Array.isArray(v)?v.forEach(visit):visit(v));};visit(p);});
  const course={code:'S99',title:'Référence — Charte graphique des cours',description:'Référence interne : 35 compositions Adobe XD du 27 octobre 2026 et 3 pages de repères (utilisation, couleurs et typographie, encadrés). Contenus de démonstration modifiables, réservés aux concepteurs.',estimatedDuration:30,published:false,competencies:[],content:pages};
  const errors=validateCourse(course);if(errors.length)throw new Error(errors.join('\n'));
  const urls=JSON.stringify(course).match(/\/(?:pictos|courses)\/[^"\\]+/g)??[];
  for(const url of urls)if(!existsSync(`${root}/public${url}`))throw new Error(`Média absent : ${url}`);
  writeFileSync(new URL('../../api/content/S99.json',import.meta.url),JSON.stringify(course,null,2)+'\n');
  console.log(`${pages.length} écrans validés, médias présents : api/content/S99.json`);
} finally {await vite.close();}
