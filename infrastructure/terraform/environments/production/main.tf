# Production Environment Terraform

provider "aws" {
  region = var.aws_region
}

module "vpc" {
  source = "../../modules/vpc"
  environment = "production"
  vpc_cidr = "10.0.0.0/16"
}

module "ecs_cluster" {
  source = "../../modules/ecs"
  environment = "production"
  vpc_id = module.vpc.vpc_id
  public_subnets = module.vpc.public_subnets
  private_subnets = module.vpc.private_subnets
}

module "s3_bucket" {
  source = "../../modules/s3"
  environment = "production"
  bucket_name = "hireapp-prod-media"
}

# Production MongoDB Atlas and CloudFront
