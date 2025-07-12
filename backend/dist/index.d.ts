declare class YieldRailsServer {
    private app;
    private server;
    constructor();
    private setupMiddleware;
    private setupRoutes;
    private setupErrorHandling;
    start(): Promise<void>;
    private shutdown;
}
export { YieldRailsServer };
//# sourceMappingURL=index.d.ts.map