###############################################
# Smart Interview V2 Operational Hardening
# Production deployment/runtime controls
###############################################

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "ecs_cluster_name" {
  type    = string
  default = "hireapp-cluster"
}

variable "api_service_name" {
  type    = string
  default = "hireapp-backend-service"
}

variable "worker_service_name" {
  type    = string
  default = "hireapp-interview-worker-service"
}

variable "api_target_group_full_name" {
  type        = string
  description = "ALB target group full name used by ECS backend service."
}

variable "interview_queue_name" {
  type    = string
  default = "interview-processing-queue"
}

variable "interview_dlq_name" {
  type    = string
  default = "interview-processing-dlq"
}

variable "media_bucket_name" {
  type    = string
  default = "hireapp-prod-media"
}

resource "aws_sns_topic" "interview_ops_alerts" {
  name = "hireapp-interview-ops-alerts"
}

resource "aws_sqs_queue" "interview_processing_dlq" {
  name                      = var.interview_dlq_name
  message_retention_seconds = 1209600
}

resource "aws_sqs_queue" "interview_processing_queue" {
  name                       = var.interview_queue_name
  visibility_timeout_seconds = 300
  receive_wait_time_seconds  = 20
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.interview_processing_dlq.arn
    maxReceiveCount     = 5
  })
}

resource "aws_cloudwatch_metric_alarm" "interview_dlq_alarm" {
  alarm_name          = "hireapp-interview-dlq-depth"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 60
  statistic           = "Average"
  threshold           = 5
  alarm_description   = "DLQ has more than 5 interview processing messages."

  dimensions = {
    QueueName = aws_sqs_queue.interview_processing_dlq.name
  }

  alarm_actions = [aws_sns_topic.interview_ops_alerts.arn]
  ok_actions    = [aws_sns_topic.interview_ops_alerts.arn]
}

resource "aws_appautoscaling_target" "api_service_target" {
  max_capacity       = 10
  min_capacity       = 2
  resource_id        = "service/${var.ecs_cluster_name}/${var.api_service_name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "api_cpu_policy" {
  name               = "hireapp-api-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.api_service_target.resource_id
  scalable_dimension = aws_appautoscaling_target.api_service_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.api_service_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 60
    scale_in_cooldown  = 120
    scale_out_cooldown = 60
  }
}

resource "aws_appautoscaling_policy" "api_request_count_policy" {
  name               = "hireapp-api-request-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.api_service_target.resource_id
  scalable_dimension = aws_appautoscaling_target.api_service_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.api_service_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = var.api_target_group_full_name
    }
    target_value       = 1000
    scale_in_cooldown  = 120
    scale_out_cooldown = 60
  }
}

resource "aws_appautoscaling_target" "worker_service_target" {
  max_capacity       = 20
  min_capacity       = 1
  resource_id        = "service/${var.ecs_cluster_name}/${var.worker_service_name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "worker_queue_policy" {
  name               = "hireapp-worker-queue-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.worker_service_target.resource_id
  scalable_dimension = aws_appautoscaling_target.worker_service_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.worker_service_target.service_namespace

  target_tracking_scaling_policy_configuration {
    customized_metric_specification {
      metric_name = "ApproximateNumberOfMessagesVisible"
      namespace   = "AWS/SQS"
      statistic   = "Average"

      dimensions {
        name  = "QueueName"
        value = aws_sqs_queue.interview_processing_queue.name
      }
    }
    # 1 worker per ~200 visible queue messages
    target_value       = 200
    scale_in_cooldown  = 120
    scale_out_cooldown = 60
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "interview_video_retention" {
  bucket = var.media_bucket_name

  rule {
    id     = "interview-video-auto-delete-30-days"
    status = "Enabled"

    filter {
      prefix = "interview-videos/"
    }

    expiration {
      days = 30
    }
  }
}
