"""
CrewAI Orchestration for wa-transfer Remediation
Coordinates multiple agents to complete pending remediation items.
"""

from crewai import Agent, Task, Crew, Process
from pathlib import Path
import os

def load_yaml(file_path: str) -> dict:
    """Load YAML configuration file."""
    import yaml
    with open(file_path, 'r') as f:
        return yaml.safe_load(f)

def create_agents() -> dict:
    """Create agent instances from configuration."""
    agents_config = load_yaml('agents.yaml')['agents']
    agents = {}
    
    for agent_id, config in agents_config.items():
        agents[agent_id] = Agent(
            role=config['role'],
            goal=config['goal'],
            backstory=config['backstory'],
            verbose=config.get('verbose', True),
            allow_delegation=config.get('allow_delegation', False),
            max_iter=config.get('max_iter', 10)
        )
    
    return agents

def create_tasks(agents: dict) -> list:
    """Create task instances from configuration."""
    tasks_config = load_yaml('tasks.yaml')['tasks']
    tasks = {}
    
    for task_id, config in tasks_config.items():
        agent_id = config['agent']
        agent = agents.get(agent_id)
        
        if not agent:
            raise ValueError(f"Agent '{agent_id}' not found for task '{task_id}'")
        
        tasks[task_id] = Task(
            description=config['description'],
            agent=agent,
            expected_output=config['expected_output']
        )
    
    return tasks

def create_crew(agents: dict, tasks: dict, task_order: list) -> Crew:
    """
    Create crew with proper task sequencing.
    
    Task execution order:
    1. wire_jobscheduler (integration)
    2. add_circuit_breakers (parallel with 1)
    3. add_input_validation (parallel with 1, 2)
    4. add_instagram_circuit_breakers (parallel with 1, 2, 3)
    5. write_utility_tests (parallel with 1-4)
    6. write_integration_tests (parallel with 1-5)
    7. verify_typescript (depends on 1, 2, 3, 4)
    8. final_quality_review (depends on 5, 6, 7)
    """
    
    # Define execution order with dependencies
    sequential_tasks = [
        tasks['wire_jobscheduler'],
        tasks['add_circuit_breakers'],
        tasks['add_input_validation'],
        tasks['add_instagram_circuit_breakers'],
        tasks['write_utility_tests'],
        tasks['write_integration_tests'],
        tasks['verify_typescript'],
        tasks['final_quality_review']
    ]
    
    crew = Crew(
        agents=list(agents.values()),
        tasks=sequential_tasks,
        process=Process.sequential,
        verbose=True,
        memory=True,
        cache=True
    )
    
    return crew

def main():
    """Main entry point for crew execution."""
    print("=" * 60)
    print("WA-TRANSFER REMEDIATION CREW")
    print("=" * 60)
    
    # Create agents
    print("\n📋 Loading agents...")
    agents = create_agents()
    print(f"✅ Loaded {len(agents)} agents")
    for agent_id, agent in agents.items():
        print(f"   - {agent.role}")
    
    # Create tasks
    print("\n📋 Loading tasks...")
    tasks = create_tasks(agents)
    print(f"✅ Loaded {len(tasks)} tasks")
    for task_id, task in tasks.items():
        print(f"   - {task_id}")
    
    # Create crew
    print("\n🔧 Creating crew...")
    crew = create_crew(agents, tasks, list(tasks.keys()))
    print("✅ Crew created with sequential execution")
    
    # Execute
    print("\n🚀 Starting remediation...")
    print("=" * 60)
    
    try:
        result = crew.kickoff()
        
        print("\n" + "=" * 60)
        print("✅ REMEDIATION COMPLETE")
        print("=" * 60)
        print("\nFinal Output:")
        print(result)
        
        # Save results
        output_path = Path("crewai/output.md")
        output_path.parent.mkdir(exist_ok=True)
        with open(output_path, 'w') as f:
            f.write(f"# CrewAI Remediation Results\n\n{result}")
        print(f"\n📄 Results saved to: {output_path}")
        
        return result
        
    except Exception as e:
        print(f"\n❌ Crew execution failed: {e}")
        raise

if __name__ == "__main__":
    main()