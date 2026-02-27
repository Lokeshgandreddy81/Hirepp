# Staging Environment Terraform

provider "aws" {
  region = var.aws_region
}

module "vpc" {
  source = "../../modules/vpc"
  environment = "staging"
  vpc_cidr = "10.1.0.0/16"
}

module "ecs_cluster" {
  source = "../../modules/ecs"
  environment = "staging"
  vpc_id = module.vpc.vpc_id
  public_subnets = module.vpc.public_subnets
  private_subnets = module.vpc.private_subnets
}

module "s3_bucket" {
  source = "../../modules/s3"
  environment = "staging"
  bucket_name = "hireapp-staging-media"
}

# The MongoDB Atlas Provider could be configured here for staging
# The CloudFront Distribution could be configured here
