import { join } from "path";
import { ApiConfig } from "../paths/@types/api-config";
import { CreatedModuleType } from "../paths/@types/created-module.type";
import { PathList } from "../paths/path-list";
import { SchemaList } from "../schemas/schema-list";
import { ObjectSchemaType } from "../schemas/types/schema.type";
import { BaseBuilder } from "./base-builder/base-builder";
import { ClassBuilder } from "./utils/class-builder/class-builder";
import { MethodBuilder } from "./utils/class-builder/method-builder";
import { PropertyBuilder } from "./utils/class-builder/property-builder";
import { FileWriter } from "./utils/file-writer/file-writer";
import {
  ApiSpecDiskConfig,
  ApiSpecServerConfig,
  ApiSpecStaticConfig,
  ApiWeaverConfigType,
} from "./types/config.type";

import { get } from "https";
import { createWriteStream, existsSync } from "fs";
import { mkdtemp, readFile, unlink } from "fs/promises";
import { tmpdir } from "os";

export class ApiWeaver {
  private _paths: PathList;
  private _schemas: SchemaList;
  private _baseBuilder: BaseBuilder;
  private _sdkPath: string;
  private readonly _rootPath: string;

  public readonly version: string;
  constructor(config: ApiWeaverConfigType<ApiSpecStaticConfig>) {
    this.version = config.apiSpec.object["openapi"] as string;

    const components = config.apiSpec.object["components"] as Record<
      string,
      object
    >;
    this._schemas = new SchemaList()
      .setGeneratePath(join(config.outDirectory, "@types"))
      .init(components["schemas"] as Record<string, ObjectSchemaType>);

    this._paths = new PathList(
      config.apiSpec.object["paths"] as Record<
        string,
        Record<string, ApiConfig>
      >,
      this._schemas
    ).setGeneratePath(join(config.outDirectory, "api"));
    this._paths.init();

    this._sdkPath = join(config.outDirectory, "app.sdk.ts");
    this._rootPath = config.outDirectory;
    this._baseBuilder = new BaseBuilder().setGeneratePath(
      join(config.outDirectory, "@base")
    );
  }

  async build() {
    await this._baseBuilder.build();
    await this._schemas.write();
    const modules = await this._paths.build();
    const sdk = this.createSdk(modules).build();
    await FileWriter.writeCode(this._sdkPath, sdk);
  }

  private createSdk(createdModule: CreatedModuleType[]) {
    const className = "AppSDK";
    const sdk = new ClassBuilder(className)
      .addProperty(
        new PropertyBuilder("static _instance", className).setAccessModifier(
          "private"
        )
      )
      .addMethod(
        new MethodBuilder("static init")
          .addInput("baseUrl", "string", true)
          .addInput("httpModule", "IHttpClient", true)
          .addOutputType(className)
          .setContent(
            `
          if (!${className}._instance) {
          ${className}._instance = new ${className}(baseUrl, httpModule);
          }
          return ${className}._instance;
        `
          )
          .setAsync(false)
      );

    const constructorContent: string[] = [];

    for (const item of createdModule) {
      const name = [...item.name.split("")];
      name[0] = name[0].toLowerCase();
      const importStyleArray = item.path
        .replace(".ts", "")
        .replace(this._rootPath, ".");
      const varName = name.join("");
      sdk.addProperty(
        new PropertyBuilder(varName, item.name)
          .setAccessModifier("public")
          .setReadonlyState(true)
          .addDependency(item.name, importStyleArray)
      );

      const registerLine = `this.${varName} = new ${item.name}(baseUrl, httpModule);`;
      constructorContent.push(registerLine);
    }

    const ctorMethod = new MethodBuilder("constructor")
      .setAccessModifier("private")
      .addDependency("IHttpClient", "./@base/interfaces/http-client.interface")
      .addInput("baseUrl", "string", true)
      .addInput("httpModule", "IHttpClient", true)
      .setContent(constructorContent.join("\n"));
    sdk.addMethod(ctorMethod);

    sdk.addMethod(
      new MethodBuilder("static get services")
        .setAccessModifier("public")
        .addOutputType(className).setContent(`
          if(!this._instance) throw new Error("Module has not been initialized yet !")
          return this._instance;
        `)
    );
    return sdk;
  }

  public static async createAsync(
    config: ApiWeaverConfigType<ApiSpecServerConfig | ApiSpecDiskConfig>
  ) {
    let openApiObject: Record<string, unknown>;
    switch (config.apiSpec.type) {
      case "server":
        openApiObject = await this.loadSpecFromURL(config.apiSpec);
        break;
      case "disk":
        openApiObject = await this.loadSpecFromDisk(config.apiSpec);
        break;
      default:
        throw new Error("Invalid apiSpec type");
    }
    return new ApiWeaver({
      ...config,
      apiSpec: {
        type: "static",
        object: openApiObject,
      },
    });
  }

  private static async loadSpecFromURL(
    config: ApiSpecServerConfig
  ): Promise<Record<string, unknown>> {
    const tempDir = await mkdtemp(join(tmpdir(), "apiva-"));
    const outputPath = join(tempDir, "api-spec.json");
    let headers: Record<string, string> = {
      "User-Agent": "api-weaver/vite-plugin",
      Accept: "application/json",
    };

    if (config.auth) {
      switch (config.auth.type) {
        case "basic":
          const basicToken = Buffer.from(
            `${config.auth.username}:${config.auth.password}`
          ).toString("base64");
          headers["Authorization"] = `Basic ${basicToken}`;
          break;
        case "bearer":
          headers["Authorization"] = `Bearer ${config.auth.token}`;
          break;
        default:
          break;
      }
    }

    return new Promise<Record<string, unknown>>((resolve, reject) => {
      const file = createWriteStream(outputPath);
      get(
        {
          path: config.url,
          headers,
        },
        (response) => {
          response.pipe(file);
          file.on("finish", async () => {
            file.close();
            const fileContent = await readFile(outputPath, "utf-8");
            await unlink(outputPath).catch(() => {
              /* ignore */
            });
            resolve(JSON.parse(fileContent));
          });
        }
      ).on("error", async (err: any) => {
        try {
          await unlink(outputPath);
        } finally {
          reject(err);
        }
      });
    });
  }

  private static async loadSpecFromDisk(
    config: ApiSpecDiskConfig
  ): Promise<Record<string, unknown>> {
    if (!existsSync(config.path))
      throw new Error(`File not found: ${config.path}`);
    const fileContent = await readFile(config.path, "utf-8");
    return JSON.parse(fileContent);
  }
}
