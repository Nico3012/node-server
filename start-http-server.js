import { createSecureServer as createHttp2SecureServer, createServer as createHttp2Server } from "node:http2";
import { createServer as createHttp1SecureServer } from "node:https";
import { createServer as createHttp1Server } from "node:http";
import { readFile } from "node:fs/promises";

/**
 * @typedef Http2SecureServerOptions
 * @property {string} joinedAbsoluteCertPathname
 * @property {string} joinedAbsoluteKeyPathname
 * @property {number} port
 * @property {boolean} [allowHttp1]
 */

/**
 * @typedef Http1SecureServerOptions
 * @property {string} joinedAbsoluteCertPathname
 * @property {string} joinedAbsoluteKeyPathname
 * @property {number} port
 */

/**
 * @typedef Http2ServerOptions
 * @property {number} port
 */

/**
 * @typedef Http1ServerOptions
 * @property {number} port
 */

/**
 * @param {(request: import("node:http2").Http2ServerRequest | import("node:http").IncomingMessage, response: import("node:http2").Http2ServerResponse | import("node:http").ServerResponse<import("node:http").IncomingMessage> & { req: import("node:http").IncomingMessage; }) => undefined} handleHttpRequest
 * @param {Http2SecureServerOptions} http2SecureServerOptions
 * @returns {Promise<undefined>}
 */
export const startHttp2SecureServer = async (handleHttpRequest, http2SecureServerOptions) => {
    const http2SecureServer = createHttp2SecureServer({
        cert: await readFile(http2SecureServerOptions.joinedAbsoluteCertPathname),
        key: await readFile(http2SecureServerOptions.joinedAbsoluteKeyPathname),
        allowHTTP1: !!http2SecureServerOptions.allowHttp1
    }, handleHttpRequest);

    http2SecureServer.listen(http2SecureServerOptions.port);
};

/**
 * @param {(request: import("node:http2").Http2ServerRequest | import("node:http").IncomingMessage, response: import("node:http2").Http2ServerResponse | import("node:http").ServerResponse<import("node:http").IncomingMessage> & { req: import("node:http").IncomingMessage; }) => undefined} handleHttpRequest
 * @param {Http1SecureServerOptions} http1SecureServerOptions
 * @returns {Promise<undefined>}
 */
export const startHttp1SecureServer = async (handleHttpRequest, http1SecureServerOptions) => {
    const http1SecureServer = createHttp1SecureServer({
        cert: await readFile(http1SecureServerOptions.joinedAbsoluteCertPathname),
        key: await readFile(http1SecureServerOptions.joinedAbsoluteKeyPathname)
    }, handleHttpRequest);

    http1SecureServer.listen(http1SecureServerOptions.port);
};

/**
 * @param {(request: import("node:http2").Http2ServerRequest | import("node:http").IncomingMessage, response: import("node:http2").Http2ServerResponse | import("node:http").ServerResponse<import("node:http").IncomingMessage> & { req: import("node:http").IncomingMessage; }) => undefined} handleHttpRequest
 * @param {Http2ServerOptions} http2ServerOptions
 * @returns {undefined}
 */
export const startHttp2Server = (handleHttpRequest, http2ServerOptions) => {
    const http2Server = createHttp2Server(handleHttpRequest);

    http2Server.listen(http2ServerOptions.port, '127.0.0.1');
};

/**
 * @param {(request: import("node:http2").Http2ServerRequest | import("node:http").IncomingMessage, response: import("node:http2").Http2ServerResponse | import("node:http").ServerResponse<import("node:http").IncomingMessage> & { req: import("node:http").IncomingMessage; }) => undefined} handleHttpRequest
 * @param {Http1ServerOptions} http1ServerOptions
 * @returns {undefined}
 */
export const startHttp1Server = (handleHttpRequest, http1ServerOptions) => {
    const http1Server = createHttp1Server(handleHttpRequest);

    http1Server.listen(http1ServerOptions.port, '127.0.0.1');
};
