import type {
  BuilderStep,
  PromptHealthIssue,
  PromptTag,
  StepCompletion,
  StepMeta,
} from './types';

export interface StepSelectionSummary {
  step: BuilderStep;
  count: number;
  completion: StepCompletion;
  tags: PromptTag[];
  explicitCount: number;
}

export interface SuggestedTagSet {
  title: string;
  description: string;
  tags: PromptTag[];
}

const STRONG_THRESHOLDS: Record<BuilderStep, number> = {
  subject: 2,
  appearance: 4,
  action: 2,
  setting: 2,
  style: 2,
  atmosphere: 2,
  quality: 1,
};

function uniqueTags(tags: PromptTag[]): PromptTag[] {
  const seen = new Set<string>();
  return tags.filter((tag) => {
    if (seen.has(tag.id)) {
      return false;
    }
    seen.add(tag.id);
    return true;
  });
}

function prioritizeTags(tags: PromptTag[], preferredGroups: string[], selectedTagIds: Set<string>, limit = 6): PromptTag[] {
  return uniqueTags(
    tags
      .filter((tag) => !selectedTagIds.has(tag.id))
      .sort((left, right) => {
        const leftRank = preferredGroups.findIndex((group) => group === (left.majorGroup ?? ''));
        const rightRank = preferredGroups.findIndex((group) => group === (right.majorGroup ?? ''));
        const resolvedLeft = leftRank === -1 ? 99 : leftRank;
        const resolvedRight = rightRank === -1 ? 99 : rightRank;
        if (resolvedLeft !== resolvedRight) {
          return resolvedLeft - resolvedRight;
        }
        if ((left.groupOrder ?? 999) !== (right.groupOrder ?? 999)) {
          return (left.groupOrder ?? 999) - (right.groupOrder ?? 999);
        }
        return left.text.localeCompare(right.text);
      })
  ).slice(0, limit);
}

export function getStepCompletion(step: BuilderStep, count: number): StepCompletion {
  if (count === 0) {
    return 'empty';
  }
  return count >= STRONG_THRESHOLDS[step] ? 'strong' : 'started';
}

export function buildStepSummaries(steps: StepMeta[], allTags: PromptTag[], selectedTagIds: Set<string>): Record<BuilderStep, StepSelectionSummary> {
  const summaries = {} as Record<BuilderStep, StepSelectionSummary>;
  for (const meta of steps) {
    const stepTags = allTags.filter((tag) => tag.step === meta.step && selectedTagIds.has(tag.id));
    summaries[meta.step] = {
      step: meta.step,
      count: stepTags.length,
      completion: getStepCompletion(meta.step, stepTags.length),
      tags: stepTags.slice(0, 5),
      explicitCount: stepTags.filter((tag) => tag.subcategory === 'Explicit' || tag.majorGroup?.includes('Explicit')).length,
    };
  }
  return summaries;
}

export function findNextIncompleteStep(steps: StepMeta[], summaries: Record<BuilderStep, StepSelectionSummary>, activeStep: BuilderStep): BuilderStep | null {
  const activeIndex = steps.findIndex((step) => step.step === activeStep);
  const ordered = [...steps.slice(activeIndex + 1), ...steps.slice(0, activeIndex)];
  return ordered.find((step) => summaries[step.step].completion !== 'strong')?.step ?? null;
}

export function buildPromptHealth(selectedTags: PromptTag[], manualNegativeTexts: string[]): PromptHealthIssue[] {
  if (selectedTags.length === 0) {
    return [];
  }

  const issues: PromptHealthIssue[] = [];
  const byStep = new Map<BuilderStep, PromptTag[]>();
  for (const tag of selectedTags) {
    const bucket = byStep.get(tag.step) ?? [];
    bucket.push(tag);
    byStep.set(tag.step, bucket);
  }

  if ((byStep.get('style')?.length ?? 0) > 0 && (byStep.get('subject')?.length ?? 0) === 0) {
    issues.push({
      id: 'style-without-subject',
      title: 'Style without subject',
      detail: 'The prompt has style direction but no clear subject yet.',
      tone: 'warning',
    });
  }

  if ((byStep.get('subject')?.length ?? 0) > 0 && ((byStep.get('appearance')?.length ?? 0) === 0 || (byStep.get('action')?.length ?? 0) === 0)) {
    issues.push({
      id: 'subject-needs-detail',
      title: 'Subject needs more support',
      detail: 'Add appearance or action tags so the subject reads more specifically.',
      tone: 'info',
    });
  }

  const groupedCounts = new Map<string, number>();
  for (const tag of selectedTags) {
    const key = `${tag.step}:${tag.majorGroup ?? 'general'}:${tag.minorGroup ?? 'general'}`;
    groupedCounts.set(key, (groupedCounts.get(key) ?? 0) + 1);
  }
  if ([...groupedCounts.values()].some((count) => count >= 6)) {
    issues.push({
      id: 'dense-single-family',
      title: 'One tag family is very dense',
      detail: 'A single group has a lot of selected tags. Consider trimming overlaps for a cleaner prompt.',
      tone: 'warning',
    });
  }

  const explicitCount = selectedTags.filter((tag) => tag.subcategory === 'Explicit' || tag.majorGroup?.includes('Explicit')).length;
  const contextualCount = (byStep.get('atmosphere')?.length ?? 0) + (byStep.get('action')?.length ?? 0);
  if (explicitCount > 0 && contextualCount < 2) {
    issues.push({
      id: 'explicit-needs-context',
      title: 'Explicit content lacks context',
      detail: 'Add atmosphere or action detail so explicit tags feel more intentionally framed.',
      tone: 'warning',
    });
  }

  const negativeSet = new Set(manualNegativeTexts.map((text) => text.toLowerCase()));
  const conflicting = selectedTags.filter((tag) => negativeSet.has(tag.text.toLowerCase()));
  if (conflicting.length > 0) {
    issues.push({
      id: 'positive-negative-conflict',
      title: 'Positive and negative conflict',
      detail: `Some selected tags also appear in the negative list: ${conflicting.slice(0, 3).map((tag) => tag.text).join(', ')}${conflicting.length > 3 ? '...' : ''}.`,
      tone: 'danger',
    });
  }

  return issues;
}

export function buildStepGuidance(
  stepMeta: StepMeta,
  allTags: PromptTag[],
  visibleTags: PromptTag[],
  selectedTags: PromptTag[],
  selectedTagIds: Set<string>
): SuggestedTagSet[] {
  const currentStepSelected = selectedTags.filter((tag) => tag.step === stepMeta.step);
  const visibleById = new Map(visibleTags.map((tag) => [tag.id, tag]));
  const currentStepUnselected = visibleTags.filter((tag) => tag.step === stepMeta.step && !selectedTagIds.has(tag.id));
  const startSimple = prioritizeTags(currentStepUnselected, [
    'People & Roles',
    'Body & Silhouette',
    'Pose & Stance',
    'Architecture & Urban',
    'Medium & Rendering',
    'Lighting',
    'Positive Quality',
  ], selectedTagIds);

  const specificityPool = currentStepUnselected.filter((tag) =>
    currentStepSelected.some((selectedTag) =>
      selectedTag.majorGroup === tag.majorGroup || selectedTag.subcategory === tag.subcategory
    )
  );
  const addSpecificity = prioritizeTags(
    specificityPool.length > 0 ? specificityPool : currentStepUnselected,
    ['Explicit Content', 'Accessories & Finish', 'Interaction & Expression', 'Fantasy & Specialty', 'Artists & References', 'Scene Effects'],
    selectedTagIds
  );

  const companionSteps: BuilderStep[] = stepMeta.step === 'style' || stepMeta.step === 'atmosphere'
    ? ['subject', 'appearance']
    : ['style', 'atmosphere'];
  const companionPool = allTags.filter((tag) =>
    companionSteps.includes(tag.step) &&
    !selectedTagIds.has(tag.id)
  );
  const addAtmosphereStyle = prioritizeTags(companionPool, [
    'Mood & Emotion',
    'Scene Effects',
    'Aesthetic & Genre',
    'Surface & Finish',
    'People & Roles',
    'Body & Silhouette',
  ], selectedTagIds);

  const relatedPool = uniqueTags(
    currentStepSelected.flatMap((tag) =>
      (tag.relatedTagIds ?? [])
        .map((id) => visibleById.get(id) ?? allTags.find((candidate) => candidate.id === id))
        .filter(Boolean) as PromptTag[]
    )
  ).filter((tag) => !selectedTagIds.has(tag.id));

  const pairedTags = prioritizeTags(relatedPool, [], selectedTagIds);

  return [
    { title: 'Start simple', description: 'Anchor this step with a few high-signal choices.', tags: startSimple },
    { title: 'Add specificity', description: 'Layer detail around the groups you already started.', tags: addSpecificity },
    { title: 'Add atmosphere/style', description: 'Round out the prompt with nearby complementary cues.', tags: addAtmosphereStyle },
    { title: 'Commonly paired tags', description: 'Curated combinations that often work well together.', tags: pairedTags },
  ].filter((set) => set.tags.length > 0);
}

export function buildRecommendedGroups(stepTags: PromptTag[], selectedTagIds: Set<string>): string[] {
  const selectedGroups = new Set(stepTags.filter((tag) => selectedTagIds.has(tag.id)).map((tag) => tag.majorGroup).filter(Boolean));
  return uniqueTags(stepTags)
    .map((tag) => tag.majorGroup)
    .filter((groupName): groupName is string => Boolean(groupName))
    .filter((groupName, index, arr) => arr.indexOf(groupName) === index)
    .filter((groupName) => !selectedGroups.has(groupName))
    .slice(0, 4);
}

export function buildNegativePairCandidates(selectedTags: PromptTag[], manualNegativeTexts: string[]): PromptTag[] {
  const manualSet = new Set(manualNegativeTexts.map((text) => text.toLowerCase()));
  return selectedTags.filter((tag) => tag.negativeText && !manualSet.has(tag.negativeText.toLowerCase()));
}
