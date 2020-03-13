terraform {
  required_providers {
    aws = ">= 2.50.0"
  }
}

locals {
  destination_arn =  var.log_destination_arn != null ? var.log_destination_arn : var.log2elasticsearch_lambda_function_arn
}
