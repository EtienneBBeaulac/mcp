#!/usr/bin/env python3
"""
Add anti-rationalization warnings to prevent agents from thinking they're "special cases."
"""
import json

def add_anti_rationalization(path):
    with open(path, 'r') as f:
        workflow = json.load(f)
    
    # Add to metaGuidance
    meta = workflow['metaGuidance']
    
    # Find the FINDING ≠ PROVING section and add anti-rationalization after it
    for i, guidance in enumerate(meta):
        if 'NEVER say "I\'ve identified the root cause"' in guidance:
            # Insert anti-rationalization section after this
            meta.insert(i + 1, "**🚨 NO RATIONALIZATION. NO EXCEPTIONS. NO \"BUT IN MY CASE...\":**")
            meta.insert(i + 2, "DO NOT say \"However, given that I have...\" or \"Let me do a targeted Phase X...\" or \"Based on my high confidence...\"")
            meta.insert(i + 3, "YOUR SITUATION IS NOT SPECIAL. YOU ARE NOT THE EXCEPTION. Complete ALL 23 steps. Complete ALL 5 analysis iterations.")
            meta.insert(i + 4, "\"I found the bug early\" = ALL THE MORE REASON to validate it properly through ALL phases. Quick conclusions are WRONG 90% of the time.")
            print("✅ Added anti-rationalization warnings to metaGuidance")
            break
    
    # Add to Phase 1 loop body steps
    for step in workflow['steps']:
        if step.get('type') == 'loop' and step.get('id') == 'phase-1-iterative-analysis':
            # Find the loop configuration
            if 'maxIterations' in step:
                # Add warning to loop-level guidance
                if 'guidance' not in step:
                    step['guidance'] = []
                
                step['guidance'].insert(0, "🚨 CRITICAL: This loop MUST complete ALL 5 iterations. Do NOT exit early even if you think you found the bug.")
                step['guidance'].insert(1, "DO NOT rationalize: 'I have high confidence so I can do a targeted Phase 2.' NO. Complete all 5 iterations FIRST.")
                step['guidance'].insert(2, "Agents who skip analysis iterations are wrong ~95% of the time. The later iterations catch edge cases.")
                print("✅ Added loop enforcement warnings to Phase 1 loop")
    
    # Update version
    workflow['version'] = '1.1.0-beta.19'
    
    with open(path, 'w') as f:
        json.dump(workflow, f, indent=2)
    
    print(f"\n✅ Updated workflow to v1.1.0-beta.19")

if __name__ == '__main__':
    add_anti_rationalization('/Users/etienneb/git/personal/mcp/packages/workrail/workflows/systematic-bug-investigation-with-loops.json')

