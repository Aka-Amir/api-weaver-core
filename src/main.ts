import { join } from "path";
import { ApiWeaver } from ".";

async function main() {
  try {
    const weaver = await ApiWeaver.createAsync({
      apiSpec: {
        type: "server",
        host: "127.0.0.1",
        path: "/docs-json",
        protocol: "http",
        port: 5200,
        auth: {
          type: "basic",
          password: "admin",
          username: "admin",
        },
      },
      outDirectory: join(process.cwd(), ".tmp", "generated"),
      outputName: "AppSDK",
    });
    await weaver.build();
  } catch (e) {
    console.log(e);
  }
}
void main();
