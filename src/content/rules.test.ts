import { describe, it, expect } from 'vitest';
import { collectStrings, forbiddenCopy } from '@/content/rules';

describe('collectStrings', () => {
  it('walks nested objects and arrays', () => {
    expect(collectStrings({ a: 'x', b: ['y', { c: 'z', n: 3, u: null }] })).toEqual(['x', 'y', 'z']);
  });
});

describe('forbiddenCopy', () => {
  it('rejects em dashes', () => { expect(forbiddenCopy('a — b')).toMatch(/em dash/); });
  it('rejects leftover placeholders', () => {
    expect(forbiddenCopy('Live since <date>')).toMatch(/placeholder/);
    expect(forbiddenCopy('TODO fix')).toMatch(/placeholder/);
  });
  it('rejects pleading phrases', () => { expect(forbiddenCopy('I would love to join')).toMatch(/pleading/); });
  it('accepts normal copy', () => { expect(forbiddenCopy('I build software end to end, then I run it.')).toBeNull(); });
  it('does not flag ordinary words that merely contain a placeholder token', () => {
    expect(forbiddenCopy('Find me on Mastodon')).toBeNull();
    expect(forbiddenCopy('TODO: fix')).toMatch(/placeholder/);
    expect(forbiddenCopy('tbd')).toMatch(/placeholder/);
  });
});
