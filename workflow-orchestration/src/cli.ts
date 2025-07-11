#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { createWorkflowLookupServer } from './infrastructure/rpc/server';
import { DefaultWorkflowService } from './application/services/workflow-service';
import { createDefaultWorkflowStorage } from './infrastructure/storage';
import { validateWorkflow } from './application/validation';

const program = new Command();

program
  .name('workflow-lookup')
  .description('MCP server for workflow orchestration and guidance')
  .version('0.0.1');

program
  .command('start')
  .description('Start the workflow lookup server')
  .action(async () => {
    try {
      const workflowService = new DefaultWorkflowService(createDefaultWorkflowStorage());
      const server = createWorkflowLookupServer(workflowService);
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

program
  .command('validate')
  .description('Validate a workflow file against the schema')
  .argument('<file>', 'path to workflow JSON file')
  .action(async (file: string) => {
    await validateWorkflowFile(file);
  });

async function validateWorkflowFile(filePath: string): Promise<void> {
  try {
    // 1. Resolve and check file path
    const resolvedPath = path.resolve(filePath);
    
    if (!fs.existsSync(resolvedPath)) {
      console.error(chalk.red('❌ Error: File not found:'), filePath);
      console.error(chalk.yellow('\nPlease check the file path and try again.'));
      process.exit(1);
    }

    // 2. Read file content
    let content: string;
    try {
      content = fs.readFileSync(resolvedPath, 'utf-8');
    } catch (error: any) {
      if (error.code === 'EACCES') {
        console.error(chalk.red('❌ Error: Permission denied:'), filePath);
        console.error(chalk.yellow('\nPlease check file permissions and try again.'));
      } else {
        console.error(chalk.red('❌ Error reading file:'), filePath);
        console.error(chalk.yellow(`\n${error.message}`));
      }
      process.exit(1);
    }

    // 3. Parse JSON
    let workflow: any;
    try {
      workflow = JSON.parse(content);
    } catch (error: any) {
      console.error(chalk.red('❌ Error: Invalid JSON syntax in'), filePath);
      console.error(chalk.yellow(`\n${error.message}`));
      console.error(chalk.yellow('\nPlease check the JSON syntax and try again.'));
      process.exit(1);
    }

    // 4. Validate workflow
    const result = validateWorkflow(workflow);
    
    if (result.valid) {
      console.log(chalk.green('✅ Workflow is valid:'), filePath);
      process.exit(0);
    } else {
      console.error(chalk.red('❌ Workflow validation failed:'), filePath);
      console.error(chalk.yellow('\nValidation errors:'));
      result.errors.forEach(error => {
        console.error(chalk.red('  •'), error);
      });
      console.error(chalk.yellow(`\nFound ${result.errors.length} validation error${result.errors.length === 1 ? '' : 's'}.`));
      process.exit(1);
    }
    
  } catch (error: any) {
    console.error(chalk.red('❌ Unexpected error:'), error.message);
    process.exit(1);
  }
}

program.parse(); 