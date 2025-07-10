import fs from 'fs';
import path from 'path';
import Ajv, { ValidateFunction } from 'ajv';
import { Workflow, WorkflowSummary } from '../types/mcp-types';

const WORKFLOW_DIR = path.resolve(__dirname, '../../spec/examples'); // TODO: Make configurable
const WORKFLOW_SCHEMA_PATH = path.resolve(__dirname, '../../spec/workflow.schema.json');

let validator: ValidateFunction | null = null;

function getValidator(): ValidateFunction {
  if (!validator) {
    const schema = JSON.parse(fs.readFileSync(WORKFLOW_SCHEMA_PATH, 'utf-8'));
    const ajv = new Ajv({ allErrors: true, strict: false });
    validator = ajv.compile(schema);
  }
  return validator;
}

export function loadAllWorkflows(): Workflow[] {
  const files = fs.readdirSync(WORKFLOW_DIR).filter(f => f.endsWith('.json'));
  const validator = getValidator();
  const workflows: Workflow[] = [];
  for (const file of files) {
    const filePath = path.join(WORKFLOW_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (validator(data)) {
      workflows.push(data as Workflow);
    } else {
      // TODO: Log or handle invalid workflow file
      // console.warn(`Invalid workflow: ${file}`);
    }
  }
  return workflows;
}

export function getWorkflowById(id: string): Workflow | null {
  const workflows = loadAllWorkflows();
  return workflows.find(wf => wf.id === id) || null;
}

export function listWorkflowSummaries(): WorkflowSummary[] {
  return loadAllWorkflows().map(wf => ({
    id: wf.id,
    name: wf.name,
    description: wf.description,
    category: 'default', // TODO: Use real category if present
    version: '1.0.0' // TODO: Use real version if present
  }));
} 