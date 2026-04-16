export class IdentityUnknownError extends Error {
  readonly userName: string | null;
  readonly userEmail: string | null;
  constructor(userName: string | null, userEmail: string | null) {
    super('identity_unknown');
    this.userName = userName;
    this.userEmail = userEmail;
  }
}
