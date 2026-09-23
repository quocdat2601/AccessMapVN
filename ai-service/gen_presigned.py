import boto3
from botocore.client import Config

s3 = boto3.client(
    's3',
    endpoint_url='http://localhost:9000',
    aws_access_key_id='minioadmin',
    aws_secret_access_key='minioadmin',
    region_name='ap-southeast-1',
    config=Config(signature_version='s3v4')
)

url = s3.generate_presigned_url(
    'get_object',
    Params={'Bucket': 'accessmap-media', 'Key': '7ba18a21-3c6f-4053-a140-0547376f2956.jpg'},
    ExpiresIn=3600
)

# The AI service runs inside Docker and resolves "minio" as the container hostname.
# Swap localhost:9000 -> minio:9000 so the URL is reachable from within the Docker network.
docker_url = url.replace('http://localhost:9000', 'http://minio:9000')
print(docker_url)
