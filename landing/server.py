from camarere import Hub, Node
import asyncio
import json

client = Node(auth_file_path='root.pem', key_password=True)

server = Hub('0.0.0.0', root_pubkey=client.connection.public_key).start()

print('Camarere Hub started at', 'ws://0.0.0.0:3388')

loop = asyncio.get_event_loop()
loop.run_until_complete(server)
loop.run_forever()


