import { describe, expect, it } from 'vitest';
import { NeverError } from './index.js';

describe('NeverError', () => {
  it('should create an error with default message', () => {
    const error = new NeverError('unexpected' as never);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('NeverError');
    expect(error.message).toBe(
      'Unexpected value received. This should never happen.',
    );
    expect(error.receivedValue).toBe('unexpected');
    expect(error.context).toBeUndefined();
  });

  it('should create an error with custom message', () => {
    const error = new NeverError('unexpected' as never, {
      message: 'Custom error message',
    });

    expect(error.message).toBe('Custom error message');
  });

  it('should create an error with context', () => {
    const context = { key: 'value' };
    const error = new NeverError('unexpected' as never, { context });

    expect(error.context).toEqual({ key: 'value' });
  });

  it('should serialize to JSON', () => {
    const error = new NeverError('unexpected' as never, {
      message: 'test',
      context: { foo: 'bar' },
    });

    expect(error.toJSON()).toEqual({
      name: 'NeverError',
      message: 'test',
      receivedValue: 'unexpected',
      context: { foo: 'bar' },
    });
  });
});
