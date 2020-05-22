module "delete_granules_workflow" {
  source = "../../tf-modules/workflow"

  prefix          = var.prefix
  name            = "DeleteGranules"
  workflow_config = module.cumulus.workflow_config
  system_bucket   = var.system_bucket
  tags            = local.tags

  state_machine_definition = <<JSON
{
  "Comment": "Delete a set of granules",
  "StartAt": "DeleteGranules",
  "TimeoutSeconds": 18000,
  "States": {
    "DeleteGranules": {
      "Parameters": {
        "cma": {
          "event.$": "$",
          "task_config": {
            "cumulus_message": {
              "outputs": [
                {
                  "source": "{$.granules}",
                  "destination": "{$.deleted_granules}"
                }
              ]
            }
          },
          "ReplaceConfig": {
            "FullMessage": true
          }
        }
      },
      "Type": "Task",
      "Resource": "${module.cumulus.delete_granules_task.task_arn}",
      "Retry": [
        {
          "ErrorEquals": [
            "Lambda.ServiceException",
            "Lambda.AWSLambdaException",
            "Lambda.SdkClientException"
          ],
          "IntervalSeconds": 2,
          "MaxAttempts": 6,
          "BackoffRate": 2
        }
      ],
      "Catch": [
        {
          "ErrorEquals": [
            "States.ALL"
          ],
          "ResultPath": "$.exception",
          "Next": "WorkflowFailed"
        }
      ],
      "End": true
    },
    "WorkflowFailed": {
      "Type": "Fail",
      "Cause": "Workflow failed"
    }
  }
}
JSON
}
