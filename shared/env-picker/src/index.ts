const readEnv = (key: string): string | undefined => {
  // eslint-disable-next-line @repo/typescript-convention/no-process-env -- this IS the env-picker implementation
  const value = process.env[key];

  if (typeof value !== 'string' || value.length === 0) {
    return undefined;
  }

  return value;
};

export class EnvRequirementCollector {
  private readonly missingKeys = new Set<string>();

  read(key: string): string | null {
    const value = readEnv(key);

    if (value !== undefined) {
      return value;
    }

    return null;
  }

  require(key: string): string {
    const value = readEnv(key);

    if (value !== undefined) {
      return value;
    }

    this.missingKeys.add(key);
    return '';
  }

  assertAllPresent(): void {
    if (this.missingKeys.size === 0) {
      return;
    }

    const missingList = Array.from(this.missingKeys).sort();
    const messageLines = [
      'Missing required environment variables:',
      ...missingList.map((missingKey) => `- ${missingKey}`),
    ].join('\n');

    console.error(messageLines);
    process.exit(1);
    throw new Error(messageLines);
  }
}
