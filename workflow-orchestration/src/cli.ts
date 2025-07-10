#!/usr/bin/env node

import { Command } from 'commander';
import { createWorkflowLookupServer } from './core/server';

const program = new Command();

program
  .name('workflow-lookup')
  .description('MCP server for workflow orchestration and guidance')
  .version('1.0.0');

program
  .command('start')
  .description('Start the workflow lookup server')
  .action(async () => {
    try {
      const server = createWorkflowLookupServer();
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
  });

program.parse(); 