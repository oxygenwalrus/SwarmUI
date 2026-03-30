import promptTags from '../src/data/promptTags.json' with { type: 'json' };
import { normalizePromptTags } from '../src/features/promptWizard/normalizeTags.ts';

const normalized = normalizePromptTags(promptTags);

function printSection(title, rows) {
  console.log(`\n## ${title}`);
  if (rows.length === 0) {
    console.log('None');
    return;
  }
  for (const row of rows) {
    console.log(row);
  }
}

const duplicateTexts = Object.entries(
  normalized.reduce((acc, tag) => {
    const key = tag.text.toLowerCase();
    acc[key] = acc[key] ?? [];
    acc[key].push(tag);
    return acc;
  }, {})
)
  .filter(([, tags]) => tags.length > 1)
  .map(([text, tags]) => `${text}: ${tags.length} entries`);

const ungrouped = normalized
  .filter((tag) => !tag.subcategory || !tag.majorGroup || !tag.minorGroup)
  .map((tag) => `${tag.text} => ${tag.step} | ${tag.subcategory ?? 'missing subcategory'} | ${tag.majorGroup ?? 'missing major group'} | ${tag.minorGroup ?? 'missing minor group'}`);

const explicitWithoutNotes = normalized
  .filter((tag) => (tag.subcategory === 'Explicit' || tag.majorGroup?.includes('Explicit')) && !tag.curationNote)
  .map((tag) => `${tag.text} => ${tag.step} | ${tag.majorGroup} | ${tag.minorGroup}`);

printSection('Duplicate Text Report', duplicateTexts);
printSection('Ungrouped Tag Report', ungrouped);
printSection('Explicit Tags Missing Curation Notes', explicitWithoutNotes);
