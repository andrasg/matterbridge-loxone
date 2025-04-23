declare module 'node-lox-ws-api' {
  export = LoxoneApi;

  // eslint-disable-next-line @typescript-eslint/no-extraneous-class
  declare class LoxoneApi {
    constructor(host: string, user: string, password: string, secure: boolean, hash: string): void;
  }
}
