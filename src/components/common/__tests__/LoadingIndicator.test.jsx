import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoadingIndicator from '../LoadingIndicator';

describe('LoadingIndicator', () => {
  it('應該正確渲染並顯示進度條', () => {
    render(<LoadingIndicator />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
}); 