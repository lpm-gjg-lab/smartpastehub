import net from "net";

const SOCKET_PATH =
  process.platform === "win32"
    ? "\\\\.\\pipe\\smartpastehub-ext"
    : "/tmp/smartpastehub-ext.sock";

let messageBuffer = Buffer.alloc(0);
let expectedLength = -1;

// Connect to running Electron instance
const client = net.createConnection(SOCKET_PATH);

client.on("error", (err) => {
  // Silent fail if Electron isn't running
  process.exit(0);
});

client.on("data", (data) => {
  // Send response back to browser extension
  const buf = Buffer.from(data);
  const lengthBuf = Buffer.alloc(4);
  lengthBuf.writeUInt32LE(buf.length, 0);
  process.stdout.write(lengthBuf);
  process.stdout.write(buf);
});

// Read from Chrome/Firefox
process.stdin.on("data", (chunk) => {
  messageBuffer = Buffer.concat([messageBuffer, chunk]);

  while (true) {
    if (expectedLength === -1) {
      if (messageBuffer.length < 4) return;
      expectedLength = messageBuffer.readUInt32LE(0);
      messageBuffer = messageBuffer.subarray(4);
    }

    if (messageBuffer.length < expectedLength) return;

    const message = messageBuffer.subarray(0, expectedLength);
    messageBuffer = messageBuffer.subarray(expectedLength);
    expectedLength = -1;

    // Forward to Electron app
    client.write(message);
  }
});
