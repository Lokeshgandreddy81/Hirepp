#!/bin/bash
# HIREAPP ECS ROLLBACK SCRIPT
# One command to instantly revert to the previous ECS Task Definition in AWS

CLUSTER=${1:-"hireapp-cluster"}
SERVICE=${2:-"hireapp-backend-service"}
REGION=${3:-"us-east-1"}

echo "🚨 Initiating Emergency Rollback for $SERVICE on $CLUSTER..."

# Get current and previous task definitions
CURRENT_TASK=$(aws ecs describe-services --cluster $CLUSTER --services $SERVICE --region $REGION --query 'services[0].taskDefinition' --output text)
echo "Currently running: $CURRENT_TASK"

# Assuming standard naming convention where we want the previous revision
# This simplifies finding the last active ID
FAMILY=$(echo $CURRENT_TASK | cut -d'/' -f2 | cut -d':' -f1)
REVISION=$(echo $CURRENT_TASK | cut -d':' -f2)
PREVIOUS_REVISION=$((REVISION - 1))

if [ "$PREVIOUS_REVISION" -lt "1" ]; then
    echo "❌ No previous revision found to rollback to!"
    exit 1
fi

PREVIOUS_TASK="$FAMILY:$PREVIOUS_REVISION"
echo "Rolling back to: $PREVIOUS_TASK"

# Force new deployment with the old task definition
aws ecs update-service --cluster $CLUSTER --service $SERVICE --task-definition $PREVIOUS_TASK --force-new-deployment --region $REGION > /dev/null

echo "✅ Rollback triggered. AWS ECS is now deploying the previous stable container."
echo "Monitor AWS Console for traffic swap..."
