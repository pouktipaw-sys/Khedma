/**
 * ───────────────────────────────────────────────────────────────────────────
 *  CANDIDATE CONFIGURATION — the single source of truth for all content.
 * ───────────────────────────────────────────────────────────────────────────
 *  Everything the site displays (terminal, virtual filesystem, recruiter mode)
 *  is generated from this file. Edit it; nothing else needs to change.
 *
 *  Rules baked into this project:
 *   • Nothing here is invented. Missing information is `null` and is simply
 *     not rendered (no fake links, no placeholder credentials).
 *   • Items marked `REVIEW:` are written conservatively from the brief —
 *     tighten them with specifics (what was solved, what was learned) before
 *     publishing.
 */

export interface Project {
  id: string;
  name: string;
  /** Short one-liner shown in lists. */
  tagline: string;
  /** Problem or objective. */
  objective: string;
  tech: string[];
  /** Investigation / implementation process, step by step. */
  process: string[];
  /** Results that can be verified (ideally by a recruiter, on request). */
  results: string[];
  lessons: string[];
  /** Public repository URL. `null` ⇒ nothing is rendered, never a fake link. */
  repoUrl: string | null;
  /** Public demo / write-up URL. `null` ⇒ nothing is rendered. */
  demoUrl: string | null;
  /** Which technical illustration to draw. */
  illustration: 'flags' | 'recon' | 'shell' | 'web' | 'os';
}

export interface Skill {
  group: string;
  /** Terminal-friendly slug used for the virtual filesystem file name. */
  slug: string;
  items: string[];
  note?: string;
}

export const candidate = {
  name: 'Noa Rezzik',
  handle: 'noa',
  email: 'rezziknoa@gmail.com',
  location: 'France',
  tagline: 'Junior cybersecurity talent. Real curiosity. Zero shortcuts.',
  /** Appears in the recruiter-mode hero. */
  summary:
    'Computer science student at Université Lumière Lyon 2 (France), aiming for a first role in offensive security, security analysis or Linux systems. I learn by investigating: scanning authorized labs, reading packets, breaking CTFs, and scripting what I understand.',
  /** Honest 30-second pitch lines for the recruiter-mode "at a glance" strip. */
  glance: [
    { label: 'Looking for', value: 'Junior security / Linux / support roles' },
    { label: 'Based in', value: 'France' },
    { label: 'Studying', value: 'BSc Computer Science · Lyon 2 · 2023–2026' },
    { label: 'Strongest in', value: 'Linux, networking fundamentals, recon' },
  ],

  targetRoles: [
    'Junior Penetration Tester',
    'Junior Security Researcher',
    'Junior Cybersecurity Analyst',
    'Junior Linux / Systems Engineer',
    'Junior Technical Support Engineer',
  ],

  /** Real PDF served from /public. Replace the file to update the CV. */
  resume: {
    url: '/Noa-Rezzik-CV.pdf',
    downloadName: 'Noa-Rezzik-CV.pdf',
  },

  /** Optional public profiles. Leave `null` until real URLs exist. */
  links: {
    github: null as string | null,
    linkedin: null as string | null,
    hackTheBox: null as string | null,
    tryHackMe: null as string | null,
  },

  education: [
    {
      degree: "Bachelor's Degree in Computer Science",
      school: 'Université Lumière Lyon 2',
      period: '2023–2026',
      location: 'Lyon, France',
    },
  ],

  /**
   * Professional experience. Intentionally empty: this candidate has no
   * professional cybersecurity experience yet and the site says so plainly.
   */
  experience: [] as { role: string; org: string; period: string; points: string[] }[],

  /** Honest "what I do while building experience" list. */
  practice: [
    'Hack The Box and TryHackMe exercises',
    'CTF challenges, including a recruitment challenge (4 flags solved)',
    'Network reconnaissance in authorized lab environments',
    'Linux command-line troubleshooting and Bash / Python scripting',
    'Web development and scripting projects',
  ],

  skills: [
    {
      group: 'Linux & Shells',
      slug: 'linux',
      items: ['Linux', 'Debian', 'Bash', 'PowerShell', 'SSH', 'Git'],
    },
    {
      group: 'Programming',
      slug: 'programming',
      items: ['Python', 'JavaScript', 'C / C++', 'Web development & scripting'],
    },
    {
      group: 'Networking',
      slug: 'networking',
      items: ['TCP/IP', 'DNS', 'HTTP', 'Networking fundamentals', 'curl'],
    },
    {
      group: 'Security tooling',
      slug: 'security',
      items: ['Nmap', 'Wireshark', 'tcpdump', 'Burp Suite', 'OWASP ZAP'],
      note: 'Used in authorized lab and training environments only.',
    },
    {
      group: 'Practice',
      slug: 'practice',
      items: ['Hack The Box', 'TryHackMe', 'CTF exercises'],
    },
  ] as Skill[],

  projects: [
    {
      id: 'ctf-investigations',
      name: 'Cybersecurity CTF Investigations',
      tagline: 'Four flags solved during a recruitment challenge.',
      objective:
        'Solve capture-the-flag style investigations by reasoning from evidence instead of guessing.',
      tech: ['Linux', 'Bash', 'Python', 'Wireshark', 'curl'],
      // REVIEW: add the real techniques used if you are allowed to share them.
      process: [
        'Read the brief, list what is known and what is not.',
        'Enumerate the target step by step and keep notes of every finding.',
        'Form a hypothesis, test it, discard it or build on it.',
        'Submit the flag only once the evidence supports it.',
      ],
      results: ['Four flags solved during a recruitment challenge.'],
      lessons: [
        'Careful notes beat clever shortcuts.',
        'Every dead end narrows the search space.',
      ],
      repoUrl: null,
      demoUrl: null,
      illustration: 'flags',
    },
    {
      id: 'network-recon',
      name: 'Network Reconnaissance & Service Analysis',
      tagline: 'Mapping hosts and services in authorized lab environments.',
      objective:
        'Understand what a network exposes: which hosts answer, which services run, and what that means.',
      tech: ['Nmap', 'Wireshark', 'tcpdump', 'TCP/IP', 'DNS'],
      // REVIEW: describe a specific lab (e.g. a TryHackMe room) if you want it named.
      process: [
        'Define the scope: only authorized lab environments.',
        'Discover hosts and open services with Nmap.',
        'Capture traffic with tcpdump / Wireshark to confirm what the scan suggested.',
        'Document services, versions and observations.',
      ],
      results: ['Reconnaissance and service analysis practised in authorized labs.'],
      lessons: [
        'A scan result is a clue, not a conclusion — confirm it on the wire.',
        'Scope and authorization come before any tool is launched.',
      ],
      repoUrl: null,
      demoUrl: null,
      illustration: 'recon',
    },
    {
      id: 'linux-scripting',
      name: 'Linux Troubleshooting & Scripting',
      tagline: 'Command-line debugging and automation on Debian.',
      objective:
        'Diagnose problems from the command line and automate repetitive checks with scripts.',
      tech: ['Debian', 'Bash', 'Python', 'SSH', 'Git'],
      // REVIEW: add a concrete script or incident you can show.
      process: [
        'Reproduce the problem and read logs before changing anything.',
        'Narrow it down with standard command-line tools.',
        'Script the repeatable parts in Bash or Python.',
        'Keep scripts in Git so changes are traceable.',
      ],
      results: ['Day-to-day Linux administration and scripting on Debian.'],
      lessons: [
        'Read the logs first, theorize second.',
        'If you do it twice, script it.',
      ],
      repoUrl: null,
      demoUrl: null,
      illustration: 'shell',
    },
    {
      id: 'web-development',
      name: 'Web Development Projects',
      tagline: 'Front-end and scripting work that shows how the web is built.',
      objective:
        'Build web projects to understand how HTTP, browsers and servers fit together — the foundation of web security testing.',
      tech: ['JavaScript', 'HTTP', 'Git', 'Burp Suite', 'OWASP ZAP'],
      // REVIEW: link a real project and say what it does.
      process: [
        'Build features with JavaScript and standard web technologies.',
        'Inspect requests and responses to understand the traffic.',
        'Use Burp Suite / OWASP ZAP in training environments to see the app as an attacker would.',
      ],
      results: ['Web projects built during the Computer Science degree.'],
      lessons: [
        'Knowing how to build it makes it easier to see how it breaks.',
      ],
      repoUrl: null,
      demoUrl: null,
      illustration: 'web',
    },
    {
      id: 'noa-os',
      name: 'NOA OS — this portfolio',
      tagline: 'A sandboxed terminal that is also a CV.',
      objective:
        'Present a junior profile as something to explore: a virtual filesystem, a mini-CTF, and a plain recruiter mode.',
      tech: ['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'GSAP'],
      process: [
        'Commands are parsed and run by a typed command registry — no real shell, nothing is executed.',
        'A virtual filesystem resolves absolute, relative, . and .. paths.',
        'The mini-CTF is a small state machine with hints.',
        'Unit and UI tests cover parsing, navigation, CTF progression and history.',
      ],
      results: [
        'You are using it: every command in the terminal is implemented.',
        'The test suite and production build run from the repository.',
      ],
      lessons: ['A sandbox is only safe when it never reaches for the real system.'],
      repoUrl: null,
      demoUrl: null,
      illustration: 'os',
    },
  ] as Project[],
};

export type Candidate = typeof candidate;

export const mailto = (subject?: string, body?: string): string => {
  const params = new URLSearchParams();
  if (subject) params.set('subject', subject);
  if (body) params.set('body', body);
  const q = params.toString().replace(/\+/g, '%20');
  return `mailto:${candidate.email}${q ? `?${q}` : ''}`;
};

export const CHALLENGE_MAILTO = mailto(
  'A technical challenge for Noa',
  'Hi Noa,\n\nI would like to give you a technical challenge.\n\n',
);
