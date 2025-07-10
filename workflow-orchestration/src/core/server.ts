import { WorkflowLookupServer } from '../types/server';

export function createWorkflowLookupServer(): WorkflowLookupServer {
  // TODO: Implement actual server logic
  return {
    start: async () => {
      console.log('Server starting...');
    },
    stop: async () => {
      console.log('Server stopping...');
    }
  };
} 