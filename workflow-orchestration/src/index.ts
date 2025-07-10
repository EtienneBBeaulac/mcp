#!/usr/bin/env node

import { createWorkflowLookupServer } from './core/server';

async function main() {
  try {
    const server = createWorkflowLookupServer();
    await server.start();
    console.log('Workflow Lookup MCP Server started successfully');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { createWorkflowLookupServer }; 