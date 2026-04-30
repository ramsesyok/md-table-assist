import { describe, it, expect } from 'vitest';
import { alignToSeparator, separatorToAlign } from './pipeTableAlignment';

describe('alignToSeparator', () => {
  it('converts undefined to ---', () => {
    expect(alignToSeparator(undefined)).toBe('---');
  });

  it('converts left to :---', () => {
    expect(alignToSeparator('left')).toBe(':---');
  });

  it('converts center to :---:', () => {
    expect(alignToSeparator('center')).toBe(':---:');
  });

  it('converts right to ---:', () => {
    expect(alignToSeparator('right')).toBe('---:');
  });
});

describe('separatorToAlign', () => {
  it('converts --- to undefined', () => {
    expect(separatorToAlign('---')).toBeUndefined();
  });

  it('converts :--- to left', () => {
    expect(separatorToAlign(':---')).toBe('left');
  });

  it('converts :---: to center', () => {
    expect(separatorToAlign(':---:')).toBe('center');
  });

  it('converts ---: to right', () => {
    expect(separatorToAlign('---:')).toBe('right');
  });

  it('converts :- to left (minimal dashes)', () => {
    expect(separatorToAlign(':-')).toBe('left');
  });

  it('converts :-: to center (minimal dashes)', () => {
    expect(separatorToAlign(':-:')).toBe('center');
  });

  it('converts -: to right (minimal dashes)', () => {
    expect(separatorToAlign('-:')).toBe('right');
  });
});
