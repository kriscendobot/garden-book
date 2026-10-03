import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

export const startJsonRpcPeer = ({
  command,
  arguments: commandArguments,
  environment,
}) => {
  const child = spawn(command, commandArguments, {
    env: environment,
    stdio: ["pipe", "pipe", "inherit"],
  });
  const pending = new Map();
  let nextIdentifier = 1;
  const lines = createInterface({ input: child.stdout });

  lines.on("line", (line) => {
    let message;
    try {
      message = JSON.parse(line);
    } catch (error) {
      child.kill();
      for (const { reject } of pending.values()) {
        reject(
          new SyntaxError(`Bridge returned invalid JSON: ${error.message}`),
        );
      }
      pending.clear();
      return;
    }
    if (
      message === null ||
      typeof message !== "object" ||
      message.id === undefined ||
      !pending.has(message.id)
    ) {
      return;
    }
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) {
      reject(new Error(`Bridge RPC failed: ${JSON.stringify(message.error)}`));
    } else {
      resolve(message);
    }
  });

  child.on("error", (error) => {
    for (const { reject } of pending.values()) {
      reject(error);
    }
    pending.clear();
  });

  child.on("exit", (code, signal) => {
    const error = new Error(
      `Bridge closed before replying (code=${code}, signal=${signal})`,
    );
    for (const { reject } of pending.values()) {
      reject(error);
    }
    pending.clear();
  });

  const send = (message) => {
    child.stdin.write(`${JSON.stringify(message)}\n`);
  };

  return {
    call(method, params = {}) {
      const id = nextIdentifier;
      nextIdentifier += 1;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        send({ jsonrpc: "2.0", id, method, params });
      });
    },

    notify(method, params = {}) {
      send({ jsonrpc: "2.0", method, params });
    },

    close() {
      lines.close();
      child.stdin.end();
      child.kill();
    },
  };
};
