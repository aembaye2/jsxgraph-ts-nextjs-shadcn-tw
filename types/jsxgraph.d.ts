declare module 'jsxgraph' {
  export interface Board {
    create: (type: string, params: any[], attributes?: any) => any;
    on: (event: string, handler: (e: any) => void) => void;
    removeObject: (obj: any) => void;
    suspendUpdate: () => void;
    unsuspendUpdate: () => void;
    setAttribute: (attributes: any) => void;
  }

  export interface JSXGraphStatic {
    initBoard: (id: string, options: any) => Board;
  }

  const JSXGraph: JSXGraphStatic;
  export default JSXGraph;
}
