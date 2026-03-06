import boto3
import json
import time

def simulate_ecs_task_termination(cluster_name, service_name):
    print(f"🌪️ Initiating Chaos Experiment: Terminating random tasks in {service_name}")
    ecs = boto3.client('ecs', region_name='us-east-1')
    
    # Get running tasks
    tasks = ecs.list_tasks(cluster=cluster_name, serviceName=service_name)['taskArns']
    if not tasks:
        print("No tasks found. Ensure service is running.")
        return
        
    print(f"Found {len(tasks)} tasks running. Terminating 1 to simulate node failure...")
    
    target_task = tasks[0]
    # Stop the task abruptly
    ecs.stop_task(
        cluster=cluster_name,
        task=target_task,
        reason='Chaos Engineering - Simulated Failure'
    )
    
    print(f"Task {target_task} terminated.")
    print("Monitoring ECS Service for Auto-Recovery...")
    
    # Poll for recovery
    recovered = False
    for _ in range(12): # Poll for 1 minute (12 * 5s)
        time.sleep(5)
        current_tasks = ecs.list_tasks(cluster=cluster_name, serviceName=service_name)['taskArns']
        if len(current_tasks) >= len(tasks):
            print("✅ Auto-Recovery Successful: Service brought a new task online to replace the failed node.")
            recovered = True
            break
            
    if not recovered:
        print("❌ Auto-Recovery Failed: Task was not replaced in the expected time window.")

if __name__ == "__main__":
    # Example execution:
    # simulate_ecs_task_termination('hireapp-cluster', 'hireapp-backend-service')
    print("Chaos Engine Loaded. Configure with AWS credentials to run.")
