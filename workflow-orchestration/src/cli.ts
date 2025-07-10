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
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  });

program.parse(); 