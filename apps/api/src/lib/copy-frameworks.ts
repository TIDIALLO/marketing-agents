// ─── Copy Frameworks for Content Generation ────────────────────

export interface CopyFramework {
  id: string;
  name: string;
  description: string;
  structure: string[];
  instructions: string;
  bestFor: string[];
}

export const COPY_FRAMEWORKS: CopyFramework[] = [
  {
    id: 'pas',
    name: 'PAS (Problem–Agitate–Solve)',
    description: 'Identify a pain, amplify the urgency, then present the solution.',
    structure: ['Problem', 'Agitate', 'Solve'],
    instructions: `1. PROBLEM: Start by naming a specific pain point your audience faces. Be concrete.
2. AGITATE: Expand on the consequences of not solving this problem. Create urgency.
3. SOLVE: Present the solution (product/approach) as the clear answer. End with CTA.`,
    bestFor: ['linkedin', 'facebook'],
  },
  {
    id: 'aida',
    name: 'AIDA (Attention–Interest–Desire–Action)',
    description: 'Grab attention, build interest, create desire, prompt action.',
    structure: ['Attention', 'Interest', 'Desire', 'Action'],
    instructions: `1. ATTENTION: Start with a bold hook — a surprising stat, provocative question, or contrarian statement.
2. INTEREST: Provide context, insights or a brief story that deepens engagement.
3. DESIRE: Show specific benefits, results, or proof that creates wanting.
4. ACTION: Clear, specific CTA telling the reader exactly what to do next.`,
    bestFor: ['linkedin', 'facebook', 'instagram'],
  },
  {
    id: 'storytelling',
    name: 'Storytelling',
    description: 'Tell a narrative with setup, conflict, and resolution.',
    structure: ['Setup', 'Conflict', 'Resolution', 'Lesson'],
    instructions: `1. SETUP: Introduce the character or situation (can be you, a client, or a scenario).
2. CONFLICT: Describe the challenge or obstacle faced. Make it relatable.
3. RESOLUTION: Show how the challenge was overcome with specific actions/decisions.
4. LESSON: Extract the insight or takeaway. Connect it to the reader's situation.
Keep it personal, authentic, and conversational. Use "I" or "we" naturally.`,
    bestFor: ['linkedin', 'instagram'],
  },
  {
    id: 'hook-based',
    name: 'Hook-Based',
    description: 'Lead with an irresistible hook, then deliver value.',
    structure: ['Hook', 'Value', 'Proof', 'CTA'],
    instructions: `1. HOOK: First line must stop the scroll. Use one of:
   - Contrarian take: "Unpopular opinion: X is dead"
   - Number hook: "I did X for 90 days. Here's what happened."
   - Question hook: "Why do 80% of Y fail at Z?"
2. VALUE: Deliver the promised insight in digestible chunks (bullet points or numbered list).
3. PROOF: Back up claims with data, experience, or examples.
4. CTA: End with engagement prompt or direct call-to-action.`,
    bestFor: ['linkedin', 'twitter'],
  },
  {
    id: 'listicle',
    name: 'Listicle',
    description: 'Numbered list of tips, tools, or insights.',
    structure: ['Title/Hook', 'List Items (3-7)', 'Conclusion/CTA'],
    instructions: `1. TITLE/HOOK: Start with "X things/tips/tools/lessons about Y" format.
2. LIST ITEMS: Each item should be:
   - Numbered clearly
   - Have a bold headline
   - Include 1-2 sentences of explanation
   - Be actionable and specific
3. CONCLUSION: Wrap up with a summary thought or engagement question.
Ideal count: 5-7 items for LinkedIn, 3-5 for Twitter threads.`,
    bestFor: ['linkedin', 'twitter', 'instagram'],
  },
  {
    id: 'contrarian',
    name: 'Contrarian Take',
    description: 'Challenge conventional wisdom to spark engagement.',
    structure: ['Bold Claim', 'Evidence', 'Nuance', 'New Perspective'],
    instructions: `1. BOLD CLAIM: Open with a statement that challenges the status quo.
   Example: "Stop [common practice]. It's killing your [metric]."
2. EVIDENCE: Back up your claim with data, experience, or logical reasoning.
3. NUANCE: Acknowledge the counterargument fairly, then refute it.
4. NEW PERSPECTIVE: Offer your alternative approach. Be specific and actionable.
Warning: Be authentic — only use if you genuinely hold this view. Forced contrarianism backfires.`,
    bestFor: ['linkedin', 'twitter'],
  },
];

export function getFramework(id: string): CopyFramework | undefined {
  return COPY_FRAMEWORKS.find((f) => f.id === id);
}

export function getFrameworksForPlatform(platform: string): CopyFramework[] {
  return COPY_FRAMEWORKS.filter((f) => f.bestFor.includes(platform));
}

export function buildFrameworkPrompt(framework: CopyFramework): string {
  return `Use the "${framework.name}" copywriting framework.
Structure: ${framework.structure.join(' → ')}

Instructions:
${framework.instructions}`;
}
