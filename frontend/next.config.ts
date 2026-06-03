import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(process.cwd()),
  webpack: (config, { isServer, webpack }) => {
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      {
        module: /@piplabs\/cdr-crypto\/dist\/wasm\/loader\.js/,
        message: /Critical dependency: the request of a dependency is an expression/,
      },
    ];

    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "node:module": false,
      };
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /^node:module$/,
          path.join(process.cwd(), "app/lib/node-module-stub.js"),
        ),
      );
    }
    return config;
  },
};

export default nextConfig;
