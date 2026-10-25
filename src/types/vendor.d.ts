declare module 'express' {
  export interface Request { [key: string]: any; }
  export interface Response { status(code: number): Response; json(body: any): void; send(body?: any): void; }
}
declare module 'zustand' {
  export function create<T>(stateCreator: any): any;
}
