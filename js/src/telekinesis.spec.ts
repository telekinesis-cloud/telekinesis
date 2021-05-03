import { spawn } from 'child_process';
import { Connection, PublicUser, Session } from "./index";

let subprocess: any;
const HOST = 'ws://localhost:8777';
const startBroker = `
import telekinesis as tk
import asyncio

async def main():
    broker = await tk.Broker().serve(port=${HOST.split(':')[2]})
    c = tk.Connection(tk.Session(), '${HOST}')
    broker.entrypoint = await tk.Telekinesis(lambda x: x, c.session)._delegate('*')
    lock = asyncio.Event()
    await lock.wait()

asyncio.run(main())
`

beforeAll(() => new Promise((resolve, reject) => {
  // jest.setTimeout(300000);
  subprocess = spawn('python', ['-c', startBroker])

  subprocess.stderr.on('data', (data: any) => {
    throw `${data}`;
  });
  setTimeout(() => resolve(true), 1000)
}))
afterAll(() => {
  subprocess.kill()
})

describe("Connection", () => {
  it("connects", async () => {
    const c = new Connection(new Session(), HOST);
    await c.connect()
    expect(c.brokerId).toBeTruthy();
  });
});
describe("Telekinesis", () => {
  it("echos", async () => {
    const echo = await new PublicUser(HOST) as any;
    expect(await echo('hello!')).toEqual('hello!');
  });
  it('handles large messages', async () => {
    const echo = await new PublicUser(HOST) as any;
    const largeMessage = Array(100000).fill(() => Math.random().toString(36).slice(3)).reduce((p, c) => p + c(), "")
    expect(await echo(largeMessage)).toEqual(largeMessage);
  })
  it('sends telekinesis objects', async () => {
    const echo = await new PublicUser(HOST) as any;
    const func = (x : number) => x+1;
    expect(await echo(func)(1)).toEqual(2);
  })
});