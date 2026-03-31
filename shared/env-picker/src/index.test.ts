import { afterEach, describe, expect, it, vi } from 'vitest';
import { EnvRequirementCollector } from './index.js';

describe('EnvRequirementCollector', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('read', () => {
    it('should return the value when env var exists', () => {
      vi.stubEnv('TEST_KEY', 'test_value');
      const collector = new EnvRequirementCollector();

      expect(collector.read('TEST_KEY')).toBe('test_value');
    });

    it('should return null when env var is missing', () => {
      delete process.env['MISSING_KEY'];
      const collector = new EnvRequirementCollector();

      expect(collector.read('MISSING_KEY')).toBeNull();
    });

    it('should return null when env var is empty string', () => {
      vi.stubEnv('EMPTY_KEY', '');
      const collector = new EnvRequirementCollector();

      expect(collector.read('EMPTY_KEY')).toBeNull();
    });
  });

  describe('require', () => {
    it('should return the value when env var exists', () => {
      vi.stubEnv('REQUIRED_KEY', 'required_value');
      const collector = new EnvRequirementCollector();

      expect(collector.require('REQUIRED_KEY')).toBe('required_value');
    });

    it('should return empty string and track missing key', () => {
      delete process.env['MISSING_REQUIRED'];
      const collector = new EnvRequirementCollector();

      expect(collector.require('MISSING_REQUIRED')).toBe('');
    });
  });

  describe('assertAllPresent', () => {
    it('should not throw when all required keys are present', () => {
      vi.stubEnv('PRESENT_KEY', 'value');
      const collector = new EnvRequirementCollector();
      collector.require('PRESENT_KEY');

      expect(() => collector.assertAllPresent()).not.toThrow();
    });

    it('should call process.exit(1) when keys are missing', () => {
      delete process.env['MISSING_A'];
      delete process.env['MISSING_B'];
      const exitSpy = vi
        .spyOn(process, 'exit')
        .mockImplementation(() => undefined as never);
      const errorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      const collector = new EnvRequirementCollector();
      collector.require('MISSING_A');
      collector.require('MISSING_B');

      expect(() => collector.assertAllPresent()).toThrow(
        'Missing required environment variables',
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('MISSING_A'),
      );
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('MISSING_B'),
      );
    });
  });
});
