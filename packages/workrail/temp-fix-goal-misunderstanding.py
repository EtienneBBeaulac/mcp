#!/usr/bin/env python3
"""
Fix the critical goal misunderstanding in metaGuidance.
"""
import json

def fix_workflow(path):
    with open(path, 'r') as f:
        workflow = json.load(f)
    
    # Find and update specific metaGuidance entries
    updated = []
    for i, guidance in enumerate(workflow['metaGuidance']):
        # Fix step count: 27 → 23
        if 'execute all 27 workflow steps' in guidance:
            guidance = guidance.replace('all 27 workflow steps', 'all 23 workflow steps')
            print(f"✅ Fixed step count in entry {i}")
        
        # Fix step counter guidance
        if 'Step X of 26' in guidance:
            guidance = guidance.replace('Step X of 26', 'Step X of 23')
            print(f"✅ Fixed step counter reference in entry {i}")
        
        updated.append(guidance)
        
        # Insert new critical guidance after step counter
        if 'STEP COUNTER' in guidance and 'Step 23/23' in guidance:
            # Add the critical misunderstanding section
            updated.extend([
                "**🚨 CRITICAL MISUNDERSTANDING TO AVOID:**",
                "THE GOAL IS NOT \"FINDING\" THE BUG. THE GOAL IS \"PROVING\" THE BUG WITH EVIDENCE.",
                "\"I found the bug\" = YOU HAVE A GUESS. \"I proved the bug\" = YOU HAVE EVIDENCE FROM PHASES 3-5.",
                "FINDING ≠ DONE. PROVING = DONE. Only after completing instrumentation, evidence collection, and validation do you have proof.",
                "NEVER say \"I've identified the root cause\" and stop. That is a THEORY, not PROOF. Continue to evidence collection.",
                "DO NOT create \"summary documents\" or \"diagnostic writeups\" until Phase 6. That is SKIPPING THE WORKFLOW."
            ])
            print(f"✅ Added critical goal clarification after entry {i}")
    
    workflow['metaGuidance'] = updated
    
    # Update version
    workflow['version'] = '1.1.0-beta.18'
    
    with open(path, 'w') as f:
        json.dump(workflow, f, indent=2)
    
    print(f"\n✅ Updated workflow to v1.1.0-beta.18")
    print(f"✅ Total metaGuidance entries: {len(updated)}")

if __name__ == '__main__':
    fix_workflow('/Users/etienneb/git/personal/mcp/packages/workrail/workflows/systematic-bug-investigation-with-loops.json')

