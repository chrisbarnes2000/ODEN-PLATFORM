import { NodeType } from './types';

export const COLORS: Record<NodeType, string> = {
  case: '#ff4444', // Bright Red
  event: '#ff8800', // Orange-Red
  actor: '#c8923f', // Gold
  institution: '#7a9e7e', // Sage
  gap: '#5a8fc4', // Blue
  location: '#b07e85', // Dusty Rose
  media: '#c49a6c', // Tan
  document: '#7ab8b0', // Teal
  concept: '#a87ab8', // Purple
  object: '#7a9e6a', // Olive
  relation: '#c47a8a', // Pink
  financial: '#a8c44a', // Lime
  witness: '#7aaed4', // Sky Blue
  suspect: '#c46a4a', // Terracotta
  law: '#6a8ab8', // Steel Blue
  science: '#7ac4b8', // Mint
  family: '#c4606a', // Coral
  network: '#4ab8a8', // Turquoise
  period: '#c4a882', // Sand
  alias: '#c4907a', // Peach
  rumor: '#b87a9a', // Magenta
  pattern: '#6a8aaa', // Slate
};

export function getNodeColor(type: string): string {
  if (!type) return '#888888';
  
  const t = type.toLowerCase();
  
  // Handle blueprint ID mapping and common synonyms
  if (t.includes('event') || t.includes('incident')) return COLORS.event;
  if (t.includes('gap') || t.includes('missing') || t.includes('silence')) return COLORS.gap;
  if (t.includes('actor') || t.includes('person') || t.includes('individual') || t.includes('suspect')) return COLORS.actor;
  if (t.includes('institution') || t.includes('org') || t.includes('agency') || t.includes('company')) return COLORS.institution;
  if (t.includes('location') || t.includes('place') || t.includes('site') || t.includes('address')) return COLORS.location;
  if (t.includes('document') || t.includes('record') || t.includes('anchor') || t.includes('file') || t.includes('evidence')) return COLORS.document;
  if (t.includes('claim') || t.includes('concept') || t.includes('theory') || t.includes('idea')) return COLORS.concept;
  if (t.includes('media') || t.includes('narrative') || t.includes('photo') || t.includes('video')) return COLORS.media;
  if (t.includes('financial') || t.includes('money') || t.includes('transaction') || t.includes('bank')) return COLORS.financial;
  if (t.includes('object') || t.includes('item') || t.includes('artifact')) return COLORS.object;
  if (t.includes('pattern') || t.includes('trend')) return COLORS.pattern;
  if (t.includes('period') || t.includes('time') || t.includes('era')) return COLORS.period;
  if (t.includes('witness')) return COLORS.witness;
  if (t.includes('law') || t.includes('legal') || t.includes('statute')) return COLORS.law;
  if (t.includes('science') || t.includes('forensic') || t.includes('data')) return COLORS.science;
  if (t.includes('family') || t.includes('relative')) return COLORS.family;
  if (t.includes('network') || t.includes('group') || t.includes('cell')) return COLORS.network;
  if (t.includes('alias') || t.includes('name')) return COLORS.alias;
  if (t.includes('rumor') || t.includes('hearsay')) return COLORS.rumor;
  if (t.includes('relation') || t.includes('connection')) return COLORS.relation;

  return (COLORS as any)[t] || '#888888';
}

export const EDGE_COLORS: Record<string, string> = {
  financial: '#a8c44a', // Lime
  personal: '#c4606a', // Coral
  professional: '#6a8ab8', // Steel Blue
  conflict: '#ff4444', // Bright Red
  evidence: '#7ab8b0', // Teal
  temporal: '#c4a882', // Sand
  spatial: '#b07e85', // Dusty Rose
  import: '#444444',   // Dark Gray
  other: '#888888',    // Gray
};

export const PHASES = [
  {
    id: 'ph1',
    num: 'PHASE 01',
    title: 'Define the Investigation',
    subtitle: 'Establish your baseline',
    desc: 'Before you can find what\'s missing, you must define exactly what should be there. A clear claim, a specific date range, and a precise location are the anchors of your investigation. This isn\'t just for events — it\'s for people, cold cases, and institutional actions too.',
    examples: [
      { label: 'Event/Person', text: '1909 Grand Canyon cave story / disappearance of Jane Doe / my grandfather\'s immigration records' },
      { label: 'Time/Place', text: '1906–1922, Arizona Territory / June 1987, rural Ohio / early 1900s, Eastern Europe' }
    ],
    fields: [
      { id: 'bp-event', label: 'What specific event, claim, or question are you investigating?', placeholder: 'e.g. The disappearance of...' },
      { id: 'bp-period', label: 'When and where did it happen?', placeholder: 'e.g. 1906–1922, Arizona Territory' },
      { id: 'bp-claim', label: 'What is the core claim you are testing?', placeholder: 'e.g. A Smithsonian-funded expedition discovered a cave...' },
    ]
  },
  {
    id: 'ph2',
    num: 'PHASE 02',
    title: 'Identify Controllers',
    subtitle: 'Map the power landscape',
    desc: 'This is about understanding who had the power to create records, control access, shape the narrative, or make things disappear. These people and organizations become your first nodes on the map. Think about: Who owned the land? Who ran the press? Who held political power?',
    examples: [
      { label: 'Physical Control', text: 'Santa Fe Railway (controlled access), Ralph Cameron (mining claims).' },
      { label: 'Narrative Control', text: 'William Randolph Hearst (owned the newspaper), Smithsonian Institution (credentials).' }
    ],
    fields: [
      { id: 'bp-physical', label: 'Who controlled physical access to the place or people involved?', placeholder: 'Who owned the land? Who controlled entry?' },
      { id: 'bp-narrative', label: 'Who controlled the public narrative or information flow?', placeholder: 'Who reported on this? Who had the power to shape what the public knew?' },
    ]
  },
  {
    id: 'ph3',
    num: 'PHASE 03',
    title: 'Expected Records',
    subtitle: 'The Paper Trail',
    desc: 'If this event really happened, what paperwork would it have generated? This isn\'t a wishlist — it\'s a deduction. Organizations in any era follow routines: people file travel vouchers, scientists keep field logs, agencies record permits. Work out what should exist based on how things actually worked at the time.',
    examples: [
      { label: 'Expected Records', text: 'Travel Vouchers | USDA | NARA; Flight Logs | NAS Fort Lauderdale | Naval Archives' }
    ],
    fields: [
      { id: 'bp-records', label: 'What records should exist if the event happened?', placeholder: 'e.g. Travel Vouchers | USDA | NARA' },
      { id: 'bp-adjacent', label: 'Do similar records exist for nearby dates or cases?', placeholder: 'e.g. If records exist for April 4th and 8th, but 5-7 is missing...' },
    ]
  },
  {
    id: 'ph4',
    num: 'PHASE 04',
    title: 'Log Your Requests',
    subtitle: 'Track your archival trail',
    desc: 'Document every contact you make. Tracking who you contacted and what they returned is how you prove you looked. A \'No Record Found\' response is just as important as a stack of documents — it\'s the evidence of the gap.',
    examples: [
      { label: 'Request Log', text: '2024-03-01 | NARA | FOIA for Kincaid travel records | Denied - No records found' }
    ],
    fields: [
      { id: 'bp-requests', label: 'Archive request log', placeholder: 'e.g. 2024-03-01 | NARA | FOIA...' },
      { id: 'bp-denials', label: 'Denials and referrals', placeholder: 'e.g. Referred to Smithsonian; Smithsonian claims records were destroyed...' },
    ]
  },
  {
    id: 'ph5',
    num: 'PHASE 05',
    title: 'Gap Analysis',
    subtitle: 'Finding the Missing Links',
    desc: 'Identify where your evidence is thin. What connections are missing? What claims haven\'t been anchored to a document yet? A gap is only structural if it exists where a record is expected. Map the hole, not just the lack of information.',
    examples: [
      { label: 'Documented Gaps', text: 'Smithsonian Archives | Expedition Ledger | 1909 | Missing' }
    ],
    fields: [
      { id: 'bp-gaps', label: 'Documented Gaps', placeholder: 'e.g. Smithsonian Archives | Expedition Ledger | 1909 | Missing' },
      { id: 'bp-patterns', label: 'Patterns of absence', placeholder: 'e.g. Every request related to "Kincaid" returns "No Record"...' },
    ]
  },
  {
    id: 'ph6',
    num: 'PHASE 06',
    title: 'Anchor Your Claims',
    subtitle: 'Final structural review',
    desc: 'Final review. Every key conclusion in your investigation must link back to a document or source you have actually stored. If a claim isn\'t anchored to a source, it\'s just a hunch. This ensures your research is structurally sound.',
    examples: [
      { label: 'Anchored Claims', text: 'Conclusion: The expedition was private | Anchor: Gazette Article | Node: Arizona Gazette' }
    ],
    fields: [
      { id: 'bp-anchors', label: 'Key conclusions and their anchors', placeholder: 'e.g. Conclusion: The expedition was private | Anchor: Gazette Article' },
      { id: 'bp-final', label: 'Final structural notes', placeholder: 'e.g. The map shows a closed system where information was centralized...' },
    ]
  }
];
