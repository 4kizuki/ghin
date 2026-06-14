export class IdentityUnknownError extends Error {
  readonly userName: string | null;
  readonly userEmail: string | null;
  constructor(userName: string | null, userEmail: string | null) {
    super('identity_unknown');
    this.userName = userName;
    this.userEmail = userEmail;
  }
}

export class RemoteAuthError extends Error {
  readonly detail: string;
  constructor(detail: string) {
    super('リモートの認証に失敗しました。認証情報を確認してください');
    this.name = 'RemoteAuthError';
    this.detail = detail;
  }
}
