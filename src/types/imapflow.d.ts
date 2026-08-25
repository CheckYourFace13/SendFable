declare module "imapflow" {
  export class ImapFlow {
    constructor(options: Record<string, unknown>);
    connect(): Promise<void>;
    logout(): Promise<void>;
    getMailboxLock(path: string): Promise<{ release: () => void }>;
    fetch(
      query: Record<string, unknown>,
      options: Record<string, unknown>
    ): AsyncIterable<{
      uid: number;
      envelope?: {
        subject?: string;
        from?: Array<{ address?: string }>;
        replyTo?: Array<{ address?: string }>;
      };
      source?: Buffer;
    }>;
    messageFlagsAdd(query: { uid: number }, flags: string[]): Promise<void>;
  }
}
