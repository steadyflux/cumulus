module "thin_egress_app" {
  # source = "../../tf-modules/cumulus-thin-egress-app"
  source = "github.com/yjpa7145/cumulus-distribution"

  distribution_url = var.distribution_url
  jwt_secret_name = var.thin_egress_jwt_secret_name
  log_api_gateway_to_cloudwatch = var.log_api_gateway_to_cloudwatch
  permissions_boundary_arn = var.permissions_boundary_arn
  prefix = var.prefix
  protected_buckets = [for k, v in var.buckets : v.name if v.type == "protected"]
  public_buckets = [for k, v in var.buckets : v.name if v.type == "public"]
  subnet_ids = var.subnet_ids
  system_bucket = var.system_bucket
  tags = local.tags
  urs_client_id = var.urs_client_id
  urs_client_password = var.urs_client_password
  urs_url = "https://uat.urs.earthdata.nasa.gov"
  vpc_id = var.vpc_id
}
