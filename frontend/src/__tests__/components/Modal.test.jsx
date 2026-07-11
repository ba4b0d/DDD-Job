import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from '../../components/Modal';

describe('Modal', () => {
  it('test_renders_when_open', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test Modal">
        <p>Modal body</p>
      </Modal>
    );
    expect(screen.getByText('Test Modal')).toBeDefined();
    expect(screen.getByText('Modal body')).toBeDefined();
  });

  it('test_does_not_render_when_closed', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()} title="Test Modal">
        <p>Modal body</p>
      </Modal>
    );
    expect(screen.queryByText('Test Modal')).toBeNull();
    expect(screen.queryByText('Modal body')).toBeNull();
  });

  it('test_close_on_escape', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <p>Modal body</p>
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('test_close_on_backdrop_click', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <p>Modal body</p>
      </Modal>
    );

    // Click the backdrop (the first div inside the portal, which is the overlay)
    const backdrop = document.querySelector('[style*="position: absolute"]');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('test_has_aria_attributes', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test Modal">
        <p>Modal body</p>
      </Modal>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('modal-title');
  });
});
