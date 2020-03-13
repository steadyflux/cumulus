output "discover_granules_task" {
  value = module.discover_granules_task
}

output "discover_pdrs_task" {
  value = merge(
    module.discover_pdrs_task,
    { task_log_group = aws_cloudwatch_log_group.discover_pdrs_task.name }
  )
}

output "fake_processing_task" {
  value = module.fake_processing_task
}

output "files_to_granules_task" {
  value = module.files_to_granules_task
}

output "hello_world_task" {
  value = module.hello_world_task
}

output "kinesis_fallback_topic_arn" {
  value = aws_sns_topic.kinesis_fallback.arn
}

output "kinesis_inbound_event_logger_lambda_function_arn" {
  value = aws_lambda_function.kinesis_inbound_event_logger.arn
}

output "manual_consumer_lambda_function_arn" {
  value = aws_lambda_function.manual_consumer.arn
}

output "message_consumer_lambda_function_arn" {
  value = aws_lambda_function.message_consumer.arn
}

output "move_granules_task" {
  value = module.move_granules_task
}

output "parse_pdr_task" {
  value = merge(
    module.parse_pdr_task,
    { task_log_group = aws_cloudwatch_log_group.parse_pdr_task.name }
  )
}

output "pdr_status_check_task" {
  value = module.pdr_status_check_task
}

output "post_to_cmr_task" {
  value = merge(
    module.post_to_cmr_task,
    { task_log_group = aws_cloudwatch_log_group.post_to_cmr_task.name }
  )
}

output "queue_granules_task" {
  value = module.queue_granules_task
}

output "queue_pdrs_task" {
  value = merge(
    module.queue_pdrs_task,
    { task_log_group = aws_cloudwatch_log_group.queue_pdrs_task.name }
  )
}

output "schedule_sf_lambda_function_arn" {
  value = aws_lambda_function.schedule_sf.arn
}

output "sf_sqs_report_task" {
  value = {
    task_arn = aws_lambda_function.sf_sqs_report_task.arn
  }
}

output "sf_semaphore_down_lambda_function_arn" {
  value = aws_lambda_function.sf_semaphore_down.arn
}

output "sqs_message_remover_lambda_function_arn" {
  value = aws_lambda_function.sqs_message_remover.arn
}

output "sqs2sfThrottle_lambda_function_arn" {
  value = aws_lambda_function.sqs2sfThrottle.arn
}

output "sync_granule_task" {
  value = merge(
    module.sync_granule_task,
    { task_log_group = aws_cloudwatch_log_group.sync_granule_task.name }
  )
}

output "step_role_arn" {
  value = aws_iam_role.step.arn
}

output "scaling_role_arn" {
  value = aws_iam_role.scaling.arn
}
