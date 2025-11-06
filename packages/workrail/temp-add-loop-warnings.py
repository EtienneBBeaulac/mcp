#!/usr/bin/env python3
import json

def add_loop_warnings(path):
    with open(path, 'r') as f:
        workflow = json.load(f)
    
    for step in workflow['steps']:
        if step.get('id') == 'phase-1-iterative-analysis' and step.get('type') == 'loop':
            if 'guidance' not in step:
                step['guidance'] = []
            
            # Prepend critical warnings
            warnings = [
                "🚨 CRITICAL: This loop MUST complete ALL 5 iterations. Do NOT exit early even if you think you found the bug.",
                "DO NOT rationalize: 'I have high confidence so I can do a targeted Phase 2.' NO. Complete all 5 iterations FIRST.",
                "Agents who skip analysis iterations are wrong ~95% of the time. The later iterations catch edge cases and alternative explanations.",
                "Iteration 2/5 is NOT enough. Iteration 3/5 is NOT enough. Complete 5/5."
            ]
            
            # Add warnings at the beginning
            for warning in reversed(warnings):
                step['guidance'].insert(0, warning)
            
            print(f"✅ Added {len(warnings)} loop enforcement warnings")
            print(f"✅ Loop now has {len(step['guidance'])} guidance entries")
            break
    
    with open(path, 'w') as f:
        json.dump(workflow, f, indent=2)

if __name__ == '__main__':
    add_loop_warnings('/Users/etienneb/git/personal/mcp/packages/workrail/workflows/systematic-bug-investigation-with-loops.json')

