import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../../pages/Login';

// Mock the auth hook
vi.mock('../../lib/auth', () => ({
  useAuth: () => ({
    login: vi.fn(),
    user: null,
    loading: false,
  }),
}));

describe('Login', () => {
  const renderLogin = () =>
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

  it('test_renders_login_form', () => {
    const { container } = renderLogin();
    const form = container.querySelector('form');
    expect(form).not.toBeNull();
  });

  it('test_shows_username_input', () => {
    renderLogin();
    const input = screen.getByPlaceholderText('admin');
    expect(input).toBeDefined();
    expect(input.getAttribute('type')).toBe('text');
  });

  it('test_shows_password_input', () => {
    renderLogin();
    const input = screen.getByPlaceholderText('••••••••');
    expect(input).toBeDefined();
    expect(input.getAttribute('type')).toBe('password');
  });

  it('test_shows_login_button', () => {
    renderLogin();
    const button = screen.getByRole('button', { name: /ورود/i });
    expect(button).toBeDefined();
    expect(button.getAttribute('type')).toBe('submit');
  });
});
