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
