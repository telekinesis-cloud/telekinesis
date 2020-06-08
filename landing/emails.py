from camarere import Node
from datetime import datetime
import asyncio

def log_email(*args, **kwargs):
    print('email', args, kwargs)
    with open('../../email.log', 'a') as f:
        f.write(' '.join(str(x) for x in (datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S\n'), args, kwargs)))

async def main():
    client = await Node(auth_file_path='root.pem', key_password=True).connect()
            
    service = await client.publish_service('register_email', log_email, 'Thank you for registering!')
            
    await service.run()

asyncio.run(main())
