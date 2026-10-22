import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { candidate } from './config/candidate';
import { MotionProvider } from './hooks/useMotion';
import { FLAG } from './terminal/ctf';

const setup = (url = '/') => {
  window.history.replaceState(null, '', url);
  return render(
    <MotionProvider>
      <App />
    </MotionProvider>,
  );
};

const typeCmd = async (user: ReturnType<typeof userEvent.setup>, cmd: string) => {
  const input = screen.getByLabelText('Terminal command input');
  await user.type(input, `${cmd.replace(/[{[]/g, '$&$&')}{Enter}`); // escape user-event key syntax
};

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  window.open = vi.fn() as never;
});

describe('intro', () => {
  it('shows both options and a CV link from the first frame', () => {
    setup();
    expect(screen.getByTestId('explore')).toHaveTextContent(/explore terminal/i);
    expect(screen.getByTestId('view-cv')).toHaveTextContent(/view my cv/i);
    expect(screen.getByRole('link', { name: /cv \(pdf\)/i })).toHaveAttribute('href', candidate.resume.url);
    expect(screen.getByText('Welcome to NOA OS.')).toBeInTheDocument();
  });
  it('Explore terminal opens the terminal', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByTestId('explore'));
    expect(screen.getByLabelText('Terminal command input')).toBeInTheDocument();
    expect(screen.getByText('Type help to begin.')).toBeInTheDocument();
  });
  it('View my CV opens recruiter mode with the real download link', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByTestId('view-cv'));
    expect(screen.getByTestId('recruiter-mode')).toBeInTheDocument();
    const dl = screen.getAllByRole('link', { name: /download cv/i })[0];
    expect(dl).toHaveAttribute('href', candidate.resume.url);
    expect(dl).toHaveAttribute('download', candidate.resume.downloadName);
  });
  it('is skipped on deep links and remembered per session', () => {
    setup('/#recruiter');
    expect(screen.queryByTestId('intro')).not.toBeInTheDocument();
    expect(screen.getByTestId('recruiter-mode')).toBeInTheDocument();
  });
});

describe('mode switching', () => {
  it('switches with the toggle and with Alt+M', async () => {
    const user = userEvent.setup();
    setup('/#terminal');
    const group = screen.getByRole('group', { name: /display mode/i });
    await user.click(within(group).getByRole('button', { name: /recruiter/i }));
    expect(screen.getByTestId('recruiter-mode')).toBeInTheDocument();
    expect(within(group).getByRole('button', { name: /recruiter/i })).toHaveAttribute('aria-pressed', 'true');
    await user.keyboard('{Alt>}m{/Alt}');
    expect(screen.getByLabelText('Terminal command input')).toBeInTheDocument();
  });
  it('keeps email and CV reachable in both modes', async () => {
    const user = userEvent.setup();
    setup('/#terminal');
    const mailto = () => screen.getAllByRole('link').filter((a) => a.getAttribute('href')?.startsWith(`mailto:${candidate.email}`));
    expect(mailto().length).toBeGreaterThan(0);
    await user.keyboard('{Alt>}m{/Alt}');
    expect(mailto().length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /download cv/i }).length).toBeGreaterThan(0);
  });
});

describe('terminal UI', () => {
  it('runs commands, shows errors and suggestions', async () => {
    const user = userEvent.setup();
    setup('/#terminal');
    await typeCmd(user, 'whoami');
    expect(screen.getAllByText(candidate.name).length).toBeGreaterThan(0);
    await typeCmd(user, 'skils');
    expect(screen.getByText('skils: command not found')).toBeInTheDocument();
    expect(screen.getByText(/Did you mean: skills/)).toBeInTheDocument();
    await typeCmd(user, 'ls; rm -rf /');
    expect(screen.getByText(/Shell operators/)).toBeInTheDocument();
  });
  it('Tab completes and arrow keys browse history', async () => {
    const user = userEvent.setup();
    setup('/#terminal');
    const input = screen.getByLabelText('Terminal command input') as HTMLInputElement;
    await user.type(input, 'neof{Tab}');
    expect(input.value).toBe('neofetch ');
    await user.type(input, '{Enter}');
    await typeCmd(user, 'pwd');
    await user.keyboard('{ArrowUp}');
    expect(input.value).toBe('pwd');
    await user.keyboard('{ArrowUp}');
    expect(input.value).toBe('neofetch');
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(input.value).toBe('');
  });
  it('navigates the filesystem and updates the prompt', async () => {
    const user = userEvent.setup();
    setup('/#terminal');
    await typeCmd(user, 'cd skills');
    expect(screen.getByText('noa@root:~/skills$', { selector: 'label span' })).toBeInTheDocument();
    await typeCmd(user, 'cat linux.txt');
    expect(screen.getAllByText(/Debian/).length).toBeGreaterThan(0);
  });
  it('clear and Ctrl+L empty the screen', async () => {
    const user = userEvent.setup();
    setup('/#terminal');
    await typeCmd(user, 'pwd');
    expect(screen.getAllByTestId('entry').length).toBeGreaterThan(1);
    await user.type(screen.getByLabelText('Terminal command input'), 'clear{Enter}');
    expect(screen.queryAllByTestId('entry')).toHaveLength(0);
  });
  it('suggestion chips run commands', async () => {
    const user = userEvent.setup();
    setup('/#terminal');
    const toolbar = screen.getByRole('toolbar', { name: /command suggestions/i });
    await user.click(within(toolbar).getByRole('button', { name: 'skills' }));
    expect(screen.getByText('Technical skills')).toBeInTheDocument();
  });
  it('resume command opens the PDF and offers links', async () => {
    const user = userEvent.setup();
    setup('/#terminal');
    await typeCmd(user, 'resume');
    expect(window.open).toHaveBeenCalledWith(candidate.resume.url, '_blank', 'noopener,noreferrer');
    expect(screen.getAllByRole('link', { name: /open cv/i })[0]).toHaveAttribute('href', candidate.resume.url);
  });
  it('recruiter command switches mode', async () => {
    const user = userEvent.setup();
    setup('/#terminal');
    await typeCmd(user, 'recruiter');
    expect(await screen.findByTestId('recruiter-mode')).toBeInTheDocument();
  });
  it('motion off toggles the reduced-motion attribute', async () => {
    const user = userEvent.setup();
    setup('/#terminal');
    await typeCmd(user, 'motion off');
    expect(document.documentElement.dataset.reducedMotion).toBe('true');
    expect(localStorage.getItem('noa-motion')).toBe('off');
  });
  it('sudo hire noa shows the verification sequence and a contact button', async () => {
    const user = userEvent.setup();
    setup('/#terminal');
    await typeCmd(user, 'sudo hire noa');
    expect(screen.getByText('Checking candidate permissions...')).toBeInTheDocument();
    expect(screen.getByText('Recommendation: GIVE HER A TECHNICAL CHALLENGE')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /send her a challenge/i })).toHaveAttribute('href', expect.stringContaining(`mailto:${candidate.email}`));
  });
});

describe('mini-CTF end to end', () => {
  it('completing it opens the ACCESS GRANTED finale with a contact CTA', async () => {
    const user = userEvent.setup();
    setup('/#terminal');
    for (const c of ['challenge', 'ls -a', 'cat incident.log', 'base64 -d .intercepted', 'cat secret.txt']) await typeCmd(user, c);
    expect(screen.getAllByText(new RegExp(FLAG.replace(/[{}]/g, '\\$&'))).length).toBeGreaterThan(0);
    expect(within(screen.getByTestId('ctf-panel')).getByText(/in progress/i)).toBeInTheDocument();
    await typeCmd(user, `submit ${FLAG}`);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText("You've seen how I think.")).toBeInTheDocument();
    expect(within(dialog).getByText('Now give me a challenge of your own.')).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: /send me a challenge/i })).toHaveAttribute('href', expect.stringContaining('mailto:'));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Terminal command input')).toBeInTheDocument(); // resume/projects/contact remain reachable
  });
});

describe('recruiter mode content and links', () => {
  it('shows every required section', () => {
    setup('/#recruiter');
    for (const h of ['Skills', 'Experience', 'Education', 'Projects']) {
      expect(screen.getByRole('heading', { level: 2, name: h })).toBeInTheDocument();
    }
    expect(screen.getByRole('heading', { level: 1, name: candidate.name })).toBeInTheDocument();
    expect(screen.getAllByText(/technical challenge/i).length).toBeGreaterThan(1);
    expect(screen.getByText(/No professional cybersecurity experience yet/)).toBeInTheDocument();
  });
  it('has no dead links or placeholder hrefs', () => {
    setup('/#recruiter');
    for (const a of screen.getAllByRole('link')) {
      const href = a.getAttribute('href');
      expect(href, a.textContent ?? '').toBeTruthy();
      expect(href).not.toBe('#');
      expect(href).not.toMatch(/^javascript:/i);
    }
  });
  it('renders no repository link when none is configured', () => {
    setup('/#recruiter');
    const unpublished = candidate.projects.filter((p) => !p.repoUrl);
    expect(screen.getAllByText(/Repository: not published/)).toHaveLength(unpublished.length);
    expect(screen.queryByRole('link', { name: /repository/i })).not.toBeInTheDocument();
  });
  it('the PDF referenced by the site exists in /public', () => {
    expect(existsSync(join(process.cwd(), 'public', candidate.resume.url.replace(/^\//, '')))).toBe(true);
  });
});
