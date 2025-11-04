type DocumentationObjectType = {
  description: string;
  example: string;
  version: string;
  author: string;
  extra: Record<string, string>;
};

export class JSEntityBuilder {
  private _documentation: DocumentationObjectType = {
    description: "",
    example: "",
    version: "",
    author: "",
    extra: {},
  };

  setDescription(description: string): this {
    this._documentation.description = description;
    return this;
  }

  setExample(example: string): this {
    this._documentation.example = example;
    return this;
  }

  setAuthor(author: string) {
    this._documentation.author = author;
    return this;
  }

  setVersion(version: string) {
    this._documentation.version = version;
    return this;
  }

  setInfo(key: string, value: string) {
    this._documentation.extra[key] = value;
    return this;
  }

  public get jsDoc(): string {
    const jsDocLines: `* @${string} ${string}`[] = [];

    if (this._documentation.author) {
      jsDocLines.push(`* @author ${this._documentation.author}`);
    }
    if (this._documentation.description) {
      jsDocLines.push(`* @description ${this._documentation.description}`);
    }
    if (this._documentation.example) {
      jsDocLines.push(`* @example \`${this._documentation.example}\``);
    }
    if (this._documentation.version) {
      jsDocLines.push(`* @version ${this._documentation.version}`);
    }

    if (this._documentation.extra) {
      for (const [key, value] of Object.entries(this._documentation.extra)) {
        jsDocLines.push(`* @${key} ${value}`);
      }
    }

    if (jsDocLines.length) {
      return `\t/**\n${jsDocLines.join("\n")}\n */\n`;
    }

    return "";
  }
}
