import { spawn } from 'child_process';
import { Connection, PublicUser, Session } from "./index";

let subprocess: any;
const HOST = 'ws://localhost:8777';
const startBroker = `
import telekinesis as tk
import asyncio

class Registry(dict):
    pass

async def main():
    broker = await tk.Broker().serve(port=${HOST.split(':')[2]})
    c = tk.Connection(tk.Session(), '${HOST}')
    reg = Registry()
    reg['echo'] = lambda x: x
    broker.entrypoint = await tk.Telekinesis(reg, c.session)._delegate('*')
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
    const echo = await (new PublicUser(HOST) as any).get('echo');
    expect(await echo('hello!')).toEqual('hello!');
  });
  it('handles large messages', async () => {
    const echo = await (new PublicUser(HOST) as any).get('echo');
    const largeMessage = Array(100000).fill(() => Math.random().toString(36).slice(3)).reduce((p, c) => p + c(), "")
    expect(await echo(largeMessage)).toEqual(largeMessage);
  });
  it('sends telekinesis objects', async () => {
    const echo = await (new PublicUser(HOST) as any).get('echo');
    const func = (x: number) => x + 1;
    expect(await echo(func)(1)).toEqual(2);
  });
  it('manipulates remote objects', async () => {
    const registry = await new PublicUser(HOST) as any;
    await registry.update({ test: 123 });
    expect(await registry.get('test')).toEqual(123);
  });
  it('receives pull updates when it subscribes', async () => {
    class TestChild {
      x: number;
      constructor() {
        this.x = 0;
      }
    }
    class TestParent {
      t: TestChild;
      constructor() {
        this.t = new TestChild();
      }
      incrementChild() {
        this.t.x += 1;
        return this;
      }
    }
    const server = await new PublicUser(HOST) as any;
    await server.update({ testParent: new TestParent() });
    const p = await (new PublicUser(HOST) as any).get('testParent');
    const c = await p.t._subscribe();
    await p.incrementChild().incrementChild().t;
    expect(c.x._last()).toEqual(2);
  })
});