import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectCard } from '@/components/projects/ProjectCard'
import type { ProjectCardProps, ProjectStatus } from '@/types'

const baseProps = (): ProjectCardProps => ({
  id: 'proj-1',
  title: 'Test Project',
  brand: 'Omnia Creative',
  status: 'Idea',
  desc: 'A test project description',
  skills: ['React', 'TypeScript'],
  owner: { id: 'user-1', name: 'Jane Doe', avatarColor: { bg: '#EEEDFE', fg: '#3C3489' } },
  voteCount: 5,
  hasVoted: false,
  hasJoined: false,
  hasRaisedHand: false,
  isRecruiting: false,
  onVote: vi.fn(),
  onJoin: vi.fn(),
  onClick: vi.fn(),
})

describe('rendering', () => {
  it('renders the project title', () => {
    render(<ProjectCard {...baseProps()} />)
    expect(screen.getByRole('heading', { name: 'Test Project' })).toBeInTheDocument()
  })

  it('renders the description', () => {
    render(<ProjectCard {...baseProps()} />)
    expect(screen.getByText('A test project description')).toBeInTheDocument()
  })

  it('renders the brand label', () => {
    render(<ProjectCard {...baseProps()} />)
    expect(screen.getByText('Omnia Creative')).toBeInTheDocument()
  })

  it('renders skill tags', () => {
    render(<ProjectCard {...baseProps()} />)
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
  })

  it('renders owner initials', () => {
    render(<ProjectCard {...baseProps()} />)
    expect(screen.getByText('JD')).toBeInTheDocument()
  })

  it('exposes owner name on avatar hover', () => {
    render(<ProjectCard {...baseProps()} />)
    expect(screen.getByLabelText('Jane Doe')).toBeInTheDocument()
  })

  it('renders the vote count', () => {
    render(<ProjectCard {...baseProps()} />)
    expect(screen.getByText('5')).toBeInTheDocument()
  })
})

describe('status badge', () => {
  const statuses: ProjectStatus[] = ['Idea', 'In Flight', 'On Hold', 'Complete']

  it.each(statuses)('renders status badge for "%s"', (status) => {
    render(<ProjectCard {...baseProps()} status={status} />)
    expect(screen.getByText(status)).toBeInTheDocument()
  })
})

describe('recruiting state', () => {
  it('shows "Recruiting" badge when isRecruiting is true', () => {
    render(<ProjectCard {...baseProps()} isRecruiting={true} />)
    expect(screen.getByText('Recruiting')).toBeInTheDocument()
  })

  it('does not show "Recruiting" badge when isRecruiting is false', () => {
    render(<ProjectCard {...baseProps()} isRecruiting={false} />)
    expect(screen.queryByText('Recruiting')).not.toBeInTheDocument()
  })
})

describe('vote button', () => {
  it('displays vote count', () => {
    render(<ProjectCard {...baseProps()} voteCount={42} />)
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('shows toggled style when hasVoted is true', () => {
    render(<ProjectCard {...baseProps()} hasVoted={true} />)
    const voteBtn = screen.getByRole('button', { name: 'Vote' })
    expect(voteBtn.className).toContain('text-blue-600')
  })

  it('calls onVote when clicked', async () => {
    const props = baseProps()
    const user = userEvent.setup()
    render(<ProjectCard {...props} />)
    await user.click(screen.getByRole('button', { name: 'Vote' }))
    expect(props.onVote).toHaveBeenCalledOnce()
  })

  it('does not call onClick when vote button is clicked', async () => {
    const props = baseProps()
    const user = userEvent.setup()
    render(<ProjectCard {...props} />)
    await user.click(screen.getByRole('button', { name: 'Vote' }))
    expect(props.onClick).not.toHaveBeenCalled()
  })
})

describe('join button', () => {
  it('shows "Request to join" when hasJoined is false', () => {
    render(<ProjectCard {...baseProps()} hasJoined={false} hasRaisedHand={false} />)
    expect(screen.getByRole('button', { name: 'Request to join' })).toBeInTheDocument()
  })

  it('shows "On team" when hasJoined is true', () => {
    render(<ProjectCard {...baseProps()} hasJoined={true} />)
    expect(screen.getByRole('button', { name: 'On team' })).toBeInTheDocument()
  })

  it('shows "Request to join" when project is recruiting and user has not joined', () => {
    render(<ProjectCard {...baseProps()} hasJoined={false} hasRaisedHand={false} isRecruiting={true} />)
    expect(screen.getByRole('button', { name: 'Request to join' })).toBeInTheDocument()
  })

  it('shows "Request sent" when the user already raised their hand', () => {
    render(<ProjectCard {...baseProps()} hasRaisedHand={true} />)
    expect(screen.getByRole('button', { name: 'Request sent' })).toBeInTheDocument()
  })

  it('shows "Submitting..." while join is pending', () => {
    render(<ProjectCard {...baseProps()} joinPending={true} />)
    expect(screen.getByRole('button', { name: 'Submitting...' })).toBeInTheDocument()
  })

  it('shows join error copy when provided', () => {
    render(<ProjectCard {...baseProps()} joinError="Cannot request your own project" />)
    expect(screen.getByText('Cannot request your own project')).toBeInTheDocument()
  })

  it('calls onJoin when clicked', async () => {
    const props = baseProps()
    const user = userEvent.setup()
    render(<ProjectCard {...props} />)
    await user.click(screen.getByRole('button', { name: 'Request to join' }))
    expect(props.onJoin).toHaveBeenCalledOnce()
  })

  it('does not call onClick when join button is clicked', async () => {
    const props = baseProps()
    const user = userEvent.setup()
    render(<ProjectCard {...props} />)
    await user.click(screen.getByRole('button', { name: 'Request to join' }))
    expect(props.onClick).not.toHaveBeenCalled()
  })
})

describe('card click', () => {
  it('calls onClick when the card is clicked', async () => {
    const props = baseProps()
    const user = userEvent.setup()
    render(<ProjectCard {...props} />)
    await user.click(screen.getByRole('article'))
    expect(props.onClick).toHaveBeenCalledOnce()
  })
})
