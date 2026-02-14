import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../card';

describe('Card', () => {
  it('should render Card with children', () => {
    render(<Card data-testid="card">Content</Card>);
    expect(screen.getByTestId('card')).toHaveTextContent('Content');
  });

  it('should apply custom className', () => {
    render(<Card data-testid="card" className="custom-class">X</Card>);
    expect(screen.getByTestId('card')).toHaveClass('custom-class');
  });

  it('should render full card composition', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>Body</CardContent>
      </Card>,
    );

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('should render CardTitle as h3', () => {
    render(<CardTitle>Heading</CardTitle>);
    const el = screen.getByText('Heading');
    expect(el.tagName).toBe('H3');
  });

  it('should render CardDescription as p', () => {
    render(<CardDescription>Desc</CardDescription>);
    const el = screen.getByText('Desc');
    expect(el.tagName).toBe('P');
  });
});
