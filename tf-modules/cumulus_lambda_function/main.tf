resource "aws_lambda_function" "task" {
  function_name    = "${var.prefix}-${var.function_name}"
  filename         = var.filename
  source_code_hash = filebase64sha256(var.filename)
  handler          = var.handler
  role             = var.role
  runtime          = var.runtime
  timeout          = var.timeout
  memory_size      = var.memory_size

  layers = var.layers

  publish = var.enable_versioning

  dynamic "environment" {
    for_each = length(var.environment_variables) == 0 ? [] : [1]
    content {
      variables = var.environment_variables
    }
  }

  dynamic "vpc_config" {
    for_each = length(var.subnet_ids) == 0 ? [] : [1]
    content {
      subnet_ids = var.subnet_ids
      security_group_ids = var.security_group_ids
    }
  }

  tags = var.tags
}
