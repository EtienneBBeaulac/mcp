// @ts-nocheck
import path from 'path';
import { RpcClient } from '../helpers/rpc-client';
import { responseValidator } from '../../src/validation/response-validator';

jest.setTimeout(10000);

describe('MCP Server JSON-RPC contract', () => {
  const SERVER_PATH = path.resolve(__dirname, '../../src/index.ts');
  const SAMPLE_ID = 'simple-auth-implementation';

  let client: RpcClient;

  beforeAll(() => {
    client = new RpcClient(SERVER_PATH);
  });

  afterAll(async () => {
    await client.close();
  });

  it('responds to workflow_list', async () => {
    const res = await client.send('workflow_list');
    expect(res.jsonrpc).toBe('2.0');
    expect(res.result).toBeDefined();
    responseValidator.validate('workflow_list', res.result);
    expect(Array.isArray(res.result.workflows)).toBe(true);
  });

  it('returns a workflow with workflow_get', async () => {
    const res = await client.send('workflow_get', { id: SAMPLE_ID });
    expect(res.result.id).toBe(SAMPLE_ID);
    responseValidator.validate('workflow_get', res.result);
  });

  it('gives next step via workflow_next', async () => {
    const res = await client.send('workflow_next', { workflowId: SAMPLE_ID, completedSteps: [] });
    responseValidator.validate('workflow_next', res.result);
    expect(res.result.step).not.toBeNull();
    expect(res.result.isComplete).toBe(false);
  });

  it('returns METHOD_NOT_FOUND error for unknown method', async () => {
    const res = await client.send('unknown_method');
    expect(res.error).toBeDefined();
    expect(res.error.code).toBe(-32601);
  });

  it('returns INVALID_PARAMS for bad params', async () => {
    const res = await client.send('workflow_get', {});
    expect(res.error).toBeDefined();
    expect(res.error.code).toBe(-32602);
  });

  it('handles initialize handshake', async () => {
    const res = await client.send('initialize', { protocolVersion: '1.0', capabilities: {} });
    expect(res.result.serverInfo).toBeDefined();
    expect(res.result.serverInfo.name).toBeDefined();
  });

  it('shutdown returns null', async () => {
    const res = await client.send('shutdown', {});
    expect(res.result).toBeNull();
  });
}); 