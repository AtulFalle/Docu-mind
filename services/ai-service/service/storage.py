from minio import Minio
from config import *

client = Minio(
    MINIO_HOST,
    access_key=MINIO_ACCESS_KEY,
    secret_key=MINIO_SECRET_KEY,
    secure=False
)

def download_file(bucket, key, local_path):
    client.fget_object(bucket, key, local_path)