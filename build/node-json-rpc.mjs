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
  // Latched once the bridge can no longer reply, so a call made after
  // closure rejects instead of waiting on an event that never fires again.
  let closedError;
  const closeWith = (error) => {
    closedError ??= error;
    for (const { reject } of pending.values()) {
      reject(error);
    }
    pending.clear();
  };
  const lines = createInterface({ input: child.stdout });

  lines.on("line", (line) => {
    let message;
    try {
      message = JSON.parse(line);
    } catch (error) {
      child.kill();
      closeWith(
        new SyntaxError(`Bridge returned invalid JSON: ${error.message}`),
      );
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

  child.on("error", closeWith);

  child.on("exit", (code, signal) => {
    closeWith(
      new Error(
        `Bridge closed before replying (code=${code}, signal=${signal})`,
      ),
    );
  });

  // A write racing the child's exit fails with EPIPE; the exit handler
  // reports the closure, so the stream error itself carries nothing new.
  child.stdin.on("error", () => {});

  const send = (message) => {
    child.stdin.write(`${JSON.stringify(message)}\n`);
  };

  return {
    call(method, params = {}) {
      const id = nextIdentifier;
      nextIdentifier += 1;
      return new Promise((resolve, reject) => {
        if (closedError !== undefined) {
          reject(closedError);
          return;
        }
        pending.set(id, { resolve, reject });
        try {
          send({ jsonrpc: "2.0", id, method, params });
        } catch (error) {
          pending.delete(id);
          throw error;
        }
      });
    },

    notify(method, params = {}) {
      send({ jsonrpc: "2.0", method, params });
    },

    close() {
      closedError ??= new Error("Bridge closed by caller");
      lines.close();
      child.stdin.end();
      child.kill();
    },
  };
};
