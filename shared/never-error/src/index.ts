export class NeverError extends Error {
  public readonly context?: Record<string, unknown>;

  constructor(
    public readonly receivedValue: never,
    options: {
      message?: string;
      context?: Record<string, unknown>;
    } = {},
  ) {
    const defaultMessage = `Unexpected value received. This should never happen.`;
    const message = options.message || defaultMessage;

    super(message);

    this.name = 'NeverError';
    this.context = options.context;

    // eslint-disable-next-line @repo/typescript-convention/no-type-assertion -- V8's captureStackTrace is not in TS's type definitions
    const ErrorConstructor = Error as typeof Error & {
      captureStackTrace?: (
        targetObject: object,
        constructorOpt?: unknown,
      ) => void;
    };

    if (ErrorConstructor.captureStackTrace) {
      ErrorConstructor.captureStackTrace(this, NeverError);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      receivedValue: this.receivedValue,
      context: this.context,
    };
  }
}
