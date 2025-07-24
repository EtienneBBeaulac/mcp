#!/usr/bin/env node

import { createAppContainer } from './container';

async function main() {
  try {
    const { server } = createAppContainer();
    await server.start();
    console.log('Workflow Lookup MCP Server started successfully');

    // Graceful shutdown on SIGINT/SIGTERM
    const shutdown = async (signal: string) => {
      console.log(`Received ${signal}, shutting down...`);
      await server.stop();
      process.exit(0);
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { createWorkflowLookupServer } from './infrastructure/rpc/server'; 