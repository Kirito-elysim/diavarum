// Validation du format produit par les nouveaux formulaires, sans serveur ni données patient.
import assert from 'node:assert/strict';
import { newBlock, move, validateCourse, blockLabel } from '../front/src/components/course-editor/model.ts';
const drag = newBlock('drag-drop');
const reorder = newBlock('reorder');
const course = { title: 'Test', estimatedDuration: 30, competencies: [], content: [{ id: 'page', title: 'Activités', blocks: [drag, reorder] }] };
assert.ok(validateCourse(course).length > 0);
drag.question = 'Associez les éléments';
drag.pairs.forEach((pair, i) => { pair.left = `Destination ${i}`; pair.right = `Réponse ${i}`; });
reorder.question = 'Ordonnez les étapes';
reorder.items.forEach((item, i) => { item.label = `Étape ${i}`; });
assert.deepEqual(validateCourse(course), []);
for (const estimatedDuration of [NaN, Infinity, 5.5, 0, 121]) {
  assert.ok(validateCourse({ ...course, estimatedDuration }).some(message => message.includes('durée')));
}
assert.ok(validateCourse({ ...course, competencies: Array(7).fill('Compétence') }).some(message => message.includes('6 compétences')));
assert.ok(validateCourse({ ...course, content: [...course.content, ...course.content] }).some(message => message.includes('en double')));
assert.equal(blockLabel(drag), 'Relier');
assert.equal(blockLabel(reorder), 'Remettre dans l’ordre');
const reordered = move(reorder.items, 0, 1);
assert.equal(reordered[1].id, reorder.items[0].id);
assert.notEqual(reordered[0].id, reorder.items[0].id);
drag.pairs[1].right = drag.pairs[0].right;
assert.ok(validateCourse(course).some(message => message.includes('textes différents')));
drag.pairs.pop();
reorder.items.pop();
const errors = validateCourse(course);
assert.ok(errors.some(message => message.includes('deux associations')));
assert.ok(errors.some(message => message.includes('deux éléments')));
console.log('Relier et remise en ordre : création, validation, doublons et ordre attendu OK');
