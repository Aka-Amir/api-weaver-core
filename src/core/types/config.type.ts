import { ILogger } from "./logger.type";

export type ApiSpecBasicAuthType = {
  type: "basic";
  username: string;
  password: string;
};

export type ApiSpecBearerAuthType = {
  type: "bearer";
  token: string;
};

export type ApiSpecAuthType = ApiSpecBasicAuthType | ApiSpecBearerAuthType;

export type ApiSpecServerConfig = {
  type: "server";
  url: `${"http" | "https"}://${string}/${string}`;
  auth?: ApiSpecAuthType;
};

export type ApiSpecDiskConfig = {
  type: "disk";
  path: string;
};

export type ApiSpecStaticConfig = {
  type: "static";
  object: Record<string, unknown>;
};

export type ApiWeaverConfigType<
  API_SPEC extends
    | ApiSpecServerConfig
    | ApiSpecDiskConfig
    | ApiSpecStaticConfig,
> = {
  outDirectory: string;
  apiSpec: API_SPEC;
  outputName: string;
  logger?: ILogger;
};

export type ApiWeaverAsyncConfigType = ApiWeaverConfigType<
  ApiSpecServerConfig | ApiSpecDiskConfig
>;

export type ApiWeaverStaticConfigType =
  ApiWeaverConfigType<ApiSpecStaticConfig>;
