import type { Project } from '../config/candidate';
import { ExternalLink, GitBranch } from 'lucide-react';
import { Illustration } from './Illustrations';

interface Props {
  project: Project;
  index?: number;
  /** `terminal` is compact and embedded in command output; `editorial` is the large recruiter-mode card. */
  variant?: 'terminal' | 'editorial';
}

const Label = ({ children }: { children: string }) => <h4 className="eyebrow mb-2">{children}</h4>;

/** Repository / demo links. A missing URL renders plain muted text, never a fake link. */
export function ProjectLinks({ project }: { project: Project }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-xs">
      {project.repoUrl ? (
        <a
          href={project.repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-accent underline-offset-4 hover:underline"
        >
          <GitBranch size={14} aria-hidden /> Repository
        </a>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-muted">
          <GitBranch size={14} aria-hidden /> Repository: not published
        </span>
      )}
      {project.demoUrl && (
        <a
          href={project.demoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-accent underline-offset-4 hover:underline"
        >
          <ExternalLink size={14} aria-hidden /> Demo / write-up
        </a>
      )}
    </div>
  );
}

export function ProjectCard({ project: p, index, variant = 'terminal' }: Props) {
  const big = variant === 'editorial';
  return (
    <article
      className={`glass overflow-hidden ${big ? 'rounded-3xl' : 'rounded-xl'} text-ink`}
      aria-labelledby={`proj-${p.id}`}
      data-testid={`project-${p.id}`}
    >
      <div className={`grid ${big ? 'lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]' : 'sm:grid-cols-[minmax(0,1fr)_200px]'}`}>
        <div className={big ? 'p-6 sm:p-10' : 'p-4 sm:p-5'}>
          <p className="eyebrow mb-3 text-accent">
            {index !== undefined ? `Project ${String(index + 1).padStart(2, '0')}` : 'Project'}
          </p>
          <h3
            id={`proj-${p.id}`}
            className={`font-bold tracking-tight ${big ? 'text-3xl sm:text-5xl leading-[0.95]' : 'text-xl'}`}
          >
            {p.name}
          </h3>
          <p className={`mt-3 text-muted ${big ? 'text-lg' : 'text-sm'}`}>{p.tagline}</p>
        </div>
        <div className={`border-t sm:border-t-0 sm:border-l hairline bg-black/20 flex items-center justify-center ${big ? 'p-6' : 'p-3'}`}>
          <Illustration kind={p.illustration} className="w-full max-w-[340px]" />
        </div>
      </div>

      <div className={`grid gap-6 border-t hairline ${big ? 'p-6 sm:p-10 md:grid-cols-2' : 'p-4 sm:p-5 sm:grid-cols-2'} text-sm leading-relaxed`}>
        <section className="sm:col-span-2">
          <Label>Objective</Label>
          <p className={big ? 'text-base sm:text-lg' : ''}>{p.objective}</p>
        </section>
        <section>
          <Label>Technologies</Label>
          <ul className="flex flex-wrap gap-2" aria-label="Technologies">
            {p.tech.map((t) => (
              <li key={t} className="rounded-md border border-white/12 px-2 py-1 font-mono text-xs text-ink/90">
                {t}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <Label>Verifiable results</Label>
          <ul className="space-y-1.5">
            {p.results.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="text-accent" aria-hidden>✓</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <Label>Process</Label>
          <ol className="space-y-1.5">
            {p.process.map((s, i) => (
              <li key={s} className="flex gap-3">
                <span className="font-mono text-xs text-accent pt-0.5" aria-hidden>{String(i + 1).padStart(2, '0')}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </section>
        <section>
          <Label>Lessons learned</Label>
          <ul className="space-y-1.5">
            {p.lessons.map((l) => (
              <li key={l} className="flex gap-2">
                <span className="text-muted" aria-hidden>→</span>
                <span>{l}</span>
              </li>
            ))}
          </ul>
        </section>
        <div className="sm:col-span-2 border-t hairline pt-4">
          <ProjectLinks project={p} />
        </div>
      </div>
    </article>
  );
}
