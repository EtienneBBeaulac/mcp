#!/usr/bin/env python3
import json

def fix_type_field(path):
    with open(path, 'r') as f:
        workflow = json.load(f)
    
    # Remove 'type' field from non-loop steps
    for i, step in enumerate(workflow['steps']):
        if 'type' in step and step.get('type') != 'loop':
            del step['type']
            print(f"✅ Removed invalid 'type' field from step {i} ({step.get('id', 'unknown')})")
    
    with open(path, 'w') as f:
        json.dump(workflow, f, indent=2)

if __name__ == '__main__':
    fix_type_field('/Users/etienneb/git/personal/mcp/packages/workrail/workflows/systematic-bug-investigation-with-loops.json')

