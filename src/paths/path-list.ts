import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

import { ClassBuilder } from "../core/utils/class-builder/class-builder";
import { ApiWeaverClass } from "../core/openapi-class";
import { FileWriter } from "../core/utils/file-writer/file-writer";
import { SchemaList } from "../schemas/schema-list";

import { ApiConfig } from "./@types/api-config";
import { CreatedModuleType } from "./@types/created-module.type";
import { Endpoint } from "./endpoint";
import { FileNameAdapter } from "../core/utils/convertToImport";

export class PathList extends ApiWeaverClass {
  private _pathsNodes: Record<string, Endpoint[]> = {};
  constructor(
    private paths: Record<string, Record<string, ApiConfig>>,
    private schemaObject: SchemaList
  ) {
    super();
  }

  public init() {
    for (const [path, providedMethods] of Object.entries(this.paths)) {
      this._pathsNodes[path] = this.createEndpoints(path, providedMethods);
    }
    return this;
  }

  public async build() {
    await this.preparePath();
    const builtClass: Record<string, ClassBuilder> = {};
    for (const [, endpoints] of Object.entries(this._pathsNodes)) {
      for (const item of endpoints) {
        const built = item.build(this.schemaObject);
        builtClass[built.className] = built;
      }
    }

    const modules: CreatedModuleType[] = [];

    for (const [classname, classObj] of Object.entries(builtClass)) {
      const classString = classObj.build();
      if (!existsSync(this.generatePath)) await mkdir(this.generatePath);
      const path = join(
        this.generatePath,
        FileNameAdapter.convertTitleToFilename(classname, "service")
      );
      await FileWriter.writeCode(path, classString);
      modules.push({
        name: classname,
        path,
      });
    }

    return modules;
  }

  public setGeneratePath(path: string): this {
    for (const endpoints of Object.values(this._pathsNodes)) {
      for (const endpoint of endpoints) {
        endpoint.setGeneratePath(path);
      }
    }
    return super.setGeneratePath(path);
  }

  private createEndpoints(
    path: string,
    data: Record<string, ApiConfig>
  ): Endpoint[] {
    const endpoints: Endpoint[] = [];
    for (const [method, info] of Object.entries(data)) {
      endpoints.push(new Endpoint(path, method, info));
    }
    return endpoints;
  }
}
